// Page-level typography and motion checks complement the full WebGL suites.
const {createRequire}=require('module');
const path=require('path'),fs=require('fs'),assert=require('assert');
const {chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
const origin='http://127.0.0.1:4173/';
const dir=path.resolve('qa-service-navigator');
async function check(page,label){
 const result=await page.evaluate(()=>({
  width:innerWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
  brand:[...document.querySelectorAll('.brand')].map(n=>({text:[...n.children].map(c=>c.textContent.trim()).join(' '),city:getComputedStyle(n.querySelector('.brand-city')).display,overflow:n.scrollWidth-n.clientWidth})),
  text:[...document.querySelectorAll('main h1,main h2,main h3,main p,.service-row')].filter(n=>n.getClientRects().length).map(n=>({text:n.textContent.trim(),overflow:n.scrollWidth-n.clientWidth,left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right})),
  fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)
 }));
 assert(result.overflow<=1,`${label}: page overflow ${result.overflow}`);
 for(const b of result.brand){assert.equal(b.text,'TI DENAILING KOSTANAY');assert.notEqual(b.city,'none');assert(b.overflow<=1);}
 for(const t of result.text){assert(t.overflow<=2,`${label}: text overflow ${t.text} ${t.overflow}`);assert(t.left>=-1&&t.right<=result.width+1,`${label}: text outside viewport ${t.text}`);}
 assert(result.fonts.some(f=>f.includes('Inter'))&&result.fonts.some(f=>f.includes('Manrope')),`${label}: local fonts not loaded`);
 return {label,...result};
}
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-webgl']});
 const reports=[];
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport,deviceScaleFactor:1});
   const page=await context.newPage(),errors=[],externalFonts=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(/fonts\.(googleapis|gstatic)\.com/.test(r.url()))externalFonts.push(r.url());});
   await page.goto(origin,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
   reports.push(await check(page,'home'));
   const works=page.locator('.works .section-heading > div');
   assert.equal(await works.evaluate(n=>getComputedStyle(n).opacity),'0','Below-fold reveal should await entry');
   await works.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.works .section-heading > div').classList.contains('motion-visible'));
   const samples=await works.evaluate(n=>new Promise(resolve=>{const values=[];const start=performance.now();function sample(){values.push(Number(getComputedStyle(n).opacity));if(performance.now()-start<850)requestAnimationFrame(sample);else resolve(values);}sample();}));
   assert(samples.some(n=>n>0&&n<1),'Section animation has no intermediate frames');
   assert(samples.at(-1)>.99,'Section animation did not finish');
   await page.screenshot({path:path.join(dir,`${viewport.width}-polish-works.png`)});
   await page.locator('#services').scrollIntoViewIfNeeded();await page.waitForTimeout(850);
   await page.screenshot({path:path.join(dir,`${viewport.width}-polish-services.png`)});
   const serviceSlugs=await page.locator('.service-row').evaluateAll(ns=>[...new Set(ns.map(n=>n.dataset.service))]);
   const restore=page.locator('.direction-column[data-column="restore"] .direction-column-link');
   await restore.click();await page.waitForURL('**/direction.html?direction=restore');await page.evaluate(()=>document.fonts.ready);
   reports.push(await check(page,'direction restore'));
   await page.screenshot({path:path.join(dir,`${viewport.width}-polish-direction.png`)});
   await page.getByRole('link',{name:'Выбрать услугу',exact:true}).click();await page.waitForTimeout(900);
   assert(await page.locator('.direction-service-card.motion-visible').count()>0);
   await page.locator('.direction-service-card').first().click();await page.waitForURL('**/service.html?service=*');await page.evaluate(()=>document.fonts.ready);
   reports.push(await check(page,'service via card'));
   await page.screenshot({path:path.join(dir,`${viewport.width}-polish-service.png`)});
   await page.getByRole('link',{name:'← Все услуги',exact:true}).click();await page.waitForURL('**/index.html#services');await page.waitForTimeout(850);
   assert(await page.locator('.direction-column-link').first().isVisible());
   for(const direction of ['preserve','tune']){
    await page.goto(origin+'direction.html?direction='+direction);await page.evaluate(()=>document.fonts.ready);reports.push(await check(page,'direction '+direction));
   }
   for(const slug of serviceSlugs){
    await page.goto(origin+'service.html?service='+encodeURIComponent(slug));await page.evaluate(()=>document.fonts.ready);reports.push(await check(page,'service '+slug));
   }
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.goto(origin);await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('.works .section-heading > div').evaluate(n=>getComputedStyle(n).opacity),'1');
   assert.equal(await page.locator('.works .section-heading > div').evaluate(n=>getComputedStyle(n).transform),'none');
   if(viewport.width<820){
    await page.getByRole('button',{name:'Открыть меню',exact:true}).click();
    await page.locator('.mobile-menu').getByRole('link',{name:'Контакты',exact:true}).click();
    assert.equal(await page.locator('.mobile-menu').getAttribute('aria-hidden'),'true');
   }else{
    await page.locator('.desktop-nav').getByRole('link',{name:'Контакты',exact:true}).click();
   }
   await page.waitForTimeout(150);
   const landing=await page.locator('#contacts').evaluate(n=>({y:n.getBoundingClientRect().top,end:document.documentElement.scrollHeight-scrollY-innerHeight}));assert(landing.y>=65&&(landing.y<=150||landing.end<2),'Anchor is obscured by fixed header: '+JSON.stringify(landing));
   await page.screenshot({path:path.join(dir,`${viewport.width}-polish-contact.png`)});
   reports.push(await check(page,'reduced motion contacts'));
   assert.equal(externalFonts.length,0,'Fonts must load from this site');
   assert.deepEqual(errors,[]);
   await context.close();
  }
  fs.writeFileSync(path.join(dir,'site-polish.json'),JSON.stringify(reports,null,2));
  console.log('PASS: local fonts, full wordmark, all service titles, section motion, reduced motion, navigation and viewport bounds at 1440x900 / 390x844');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
