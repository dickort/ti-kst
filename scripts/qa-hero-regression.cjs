// Full UI regression runs in the existing CI WebGL environment before deploy.
const {createRequire}=require('module');
const path=require('path'),fs=require('fs'),assert=require('assert'),{spawn}=require('child_process');
const {chromium}=createRequire(path.join(process.argv[2],'package.json'))('playwright');
const dir=path.resolve('qa-service-navigator');
const origin='http://127.0.0.1:4173/';
const settle=page=>page.waitForFunction(()=>window.__TI_NAV?.getState().modelReady&&!__TI_NAV.getState().moving&&__TI_NAV.getState().stats.firstModelMs!==null,null,{timeout:180000,polling:100});
async function fit(page,label){
 const result=await page.evaluate(()=>{
  const rect=n=>n.getBoundingClientRect().toJSON();
  const markers=[...document.querySelectorAll('.nav-marker')].filter(n=>getComputedStyle(n).visibility==='visible');
  const panel=document.querySelector('.nav-panel'),title=document.querySelector('.hero-copy');
  return {viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth-innerWidth,
   obstacles:[panel,title].filter(n=>n&&!n.hidden&&getComputedStyle(n).visibility!=='hidden').map(rect),
   markers:markers.map(n=>({text:n.textContent,rect:rect(n),overflow:n.scrollWidth-n.clientWidth,wrap:getComputedStyle(n.querySelector('span')).overflowWrap})),
   text:[...document.querySelectorAll('.nav-panel h2,.nav-panel-scroll,.nav-zone-row,.nav-service-choices button')].filter(n=>n.getClientRects().length).map(n=>({text:n.textContent,overflow:n.scrollWidth-n.clientWidth}))};
 });
 const overlap=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
 fs.writeFileSync(path.join(dir,`${result.viewport.width}-latest-layout.json`),JSON.stringify({label,...result},null,2));
 assert(result.overflow<=1,`${label} ${result.viewport.width}: page horizontal overflow ${result.overflow}px`);
 for(const m of result.markers){
  const r=m.rect;assert(m.overflow<=2,label+': overflowing label '+m.text);
  assert(r.left>=0&&r.right<=result.viewport.width&&r.top>=0&&r.bottom<=result.viewport.height,label+': label outside viewport');
  if(result.viewport.width>=820)assert.equal(m.wrap,'normal',label+': split words');
  for(const obstacle of result.obstacles)assert(!overlap(r,obstacle),label+': marker covers title or panel');
 }
 for(let i=0;i<result.markers.length;i++)for(let j=i+1;j<result.markers.length;j++)assert(!overlap(result.markers[i].rect,result.markers[j].rect),label+': overlapping markers');
 result.text.forEach(n=>assert(n.overflow<=2,label+': panel text overflow '+n.text));
 return result;
}
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const xvfb=spawn('Xvfb',[':96','-screen','0','1920x1080x24','-nolisten','tcp'],{stdio:'ignore'});
 await new Promise(r=>setTimeout(r,500));
 const browser=await chromium.launch({headless:false,env:{...process.env,DISPLAY:':96'},args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const report=[];
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport,deviceScaleFactor:1});
   const page=await context.newPage(),errors=[],checks=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>Object.defineProperty(window,'devicePixelRatio',{get:()=>.125}));
   await page.goto(origin,{waitUntil:'load'});await settle(page);
   assert.equal(await page.locator('.nav-marker').count(),3);checks.push(await fit(page,'home'));
   await page.locator('.nav-motion').click();
   // Use actual car markers, not direct state mutation or just panel links.
   for(const direction of ['preserve','restore','tune']){
    await page.locator(`[data-nav-marker="${direction}"]`).click();await settle(page);
    const zones=await page.locator('.nav-marker').evaluateAll(ns=>ns.map(n=>n.dataset.navMarker));
    for(const zone of zones.filter(z=>z!=='cabin')){
     await page.locator(`[data-nav-marker="${zone}"]`).click();await settle(page);
     const state=await page.evaluate(()=>__TI_NAV.getState());
     assert.equal(state.zone,zone);assert.equal(state.doorProgress,0);
     assert.equal(state.cabinReady,direction==='tune', 'Cabin should load only after explicit interior entry');
     checks.push(await fit(page,direction+'/'+zone));
     const href=await page.locator('.nav-primary').getAttribute('href');
     assert(href.includes('service.html?service='));
     await page.locator('.nav-back').click();await settle(page);
    }
    if(zones.includes('cabin')){
     await page.locator('[data-nav-marker="cabin"]').click();await settle(page);
     assert((await page.evaluate(()=>__TI_NAV.getState())).doorProgress>.99);
     checks.push(await fit(page,direction+'/cabin'));
     const cabinZones=await page.locator('.nav-marker').evaluateAll(ns=>ns.map(n=>n.dataset.navMarker));
     for(const zone of cabinZones){
      await page.locator(`[data-nav-marker="${zone}"]`).click();await settle(page);checks.push(await fit(page,direction+'/'+zone));
      await page.locator('.nav-back').click();await settle(page);
     }
     await page.locator('.nav-back').click();await settle(page);
     assert.equal((await page.evaluate(()=>__TI_NAV.getState())).doorProgress,0);
    }
    await page.locator('.nav-close').click();await settle(page);assert.equal(await page.locator('.nav-marker').count(),3);
   }
   assert.deepEqual(errors,[]);report.push({viewport,checks,errors});await context.close();
  }
  // A failed lazy cabin download leaves the door shut and supports retry.
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>Object.defineProperty(window,'devicePixelRatio',{get:()=>.125}));
  await page.goto(origin,{waitUntil:'load'});await settle(page);await page.locator('.nav-motion').click();
  await page.locator('[data-nav-marker="tune"]').click();await settle(page);
  await page.route('**/*_interior.*',route=>route.fulfill({status:503,body:'temporary failure'}));
  await page.locator('[data-nav-marker="cabin"]').click();
  await page.locator('[data-nav-action="retry-cabin"]').waitFor();
  assert.equal((await page.evaluate(()=>__TI_NAV.getState())).doorProgress,0);
  await page.unroute('**/*_interior.*');await page.locator('[data-nav-action="retry-cabin"]').click();await settle(page);
  assert((await page.evaluate(()=>__TI_NAV.getState())).doorProgress>.99);
  await page.locator('.nav-close').click();await settle(page);assert.equal((await page.evaluate(()=>__TI_NAV.getState())).doorProgress,0);
  await page.close();
  // Gzip outage must fall back to the byte-identical raw exterior.
  const fallback=await browser.newPage({viewport:{width:390,height:844}});
  await fallback.addInitScript(()=>Object.defineProperty(window,'devicePixelRatio',{get:()=>.125}));
  await fallback.route('**/*_exterior.*.gz',route=>route.fulfill({status:404,body:'missing gzip'}));
  await fallback.goto(origin,{waitUntil:'load'});await settle(fallback);
  const raw=await fallback.evaluate(()=>__TI_NAV.getState());assert(raw.stats.exterior.fallback&&raw.stats.exterior.url.endsWith('.glb'));assert(!raw.cabinReady);
  await fallback.close();
  fs.writeFileSync(path.join(dir,'hero-regression.json'),JSON.stringify({report,cabinRetry:true,gzipFallback:true},null,2));
  console.log('PASS all car markers, all cabin zones, panel/title bounds, returns, cabin retry, gzip fallback.');
 }finally{await browser.close();xvfb.kill();}
})().catch(error=>{console.error(error);process.exitCode=1});
