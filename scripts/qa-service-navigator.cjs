const {createRequire}=require('module');
const path=require('path'),fs=require('fs'),assert=require('assert');
const req=createRequire(path.join(process.argv[2],'package.json'));
const {chromium}=req('playwright');
(async()=>{
 const dir=path.resolve('qa-service-navigator');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const results=[];
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.__TI_NAV&&document.querySelector('.hero').dataset.navReady,{timeout:60000});
  const mode=await page.locator('.hero').getAttribute('data-nav-ready');
  assert(['true','no-webgl'].includes(mode),'3D failed: '+mode);
  assert.equal(await page.locator('.nav-marker').count(),3);
  assert.equal(await page.locator('canvas').count(),1);
  await page.screenshot({path:path.join(dir,`${viewport.width}-home.png`)});
  await page.locator('.direction-tab[data-direction="tune"]').click();
  await page.waitForTimeout(210);
  const before=await page.evaluate(()=>__TI_NAV.getState());
  await page.waitForTimeout(600);
  const mid=await page.evaluate(()=>__TI_NAV.getState());
  assert(before.moving&&mid.moving,'Camera transition was instant');
  assert(Math.hypot(...mid.camera.map((v,i)=>v-before.camera[i]))>.02,'Camera did not move');
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.nav-marker').count(),5);
  await page.screenshot({path:path.join(dir,`${viewport.width}-tune.png`)});
  await page.locator('[data-nav-action="zone"][data-value="blackpack"]').click();await page.waitForTimeout(1700);
  assert((await page.locator('.nav-panel h2').innerText()).includes('Антихром'));
  await page.locator('[data-nav-action="chrome"][data-value="off"]').click();
  await page.locator('[data-nav-action="chrome"][data-value="on"]').click();
  await page.screenshot({path:path.join(dir,`${viewport.width}-anti-chrome.png`)});
  await page.locator('[data-nav-action="back"]').click();
  await page.locator('[data-nav-action="zone"][data-value="cabin"]').click();await page.waitForTimeout(2200);
  const inside=await page.evaluate(()=>__TI_NAV.getState());
  if(inside.rigReady){assert(inside.doorProgress>.99);assert.equal(inside.markerCount,4);}
  else assert((await page.locator('.nav-panel').innerText()).includes('3D-просмотр салона пока недоступен'));
  await page.screenshot({path:path.join(dir,`${viewport.width}-cabin.png`)});
  await page.evaluate(()=>{__TI_NAV.selectDirection('preserve');__TI_NAV.selectDirection('restore');__TI_NAV.selectDirection('tune');});
  await page.waitForTimeout(3500);const end=await page.evaluate(()=>__TI_NAV.getState());
  assert.equal(end.direction,'tune');assert.equal(end.doorProgress,0);assert(!end.inside);
  const rects=await page.locator('.nav-marker').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Markers overlap');}
  assert.equal(errors.length,0,JSON.stringify(errors));
  results.push({viewport,webgl:mode==='true',rig:inside.rigReady,errors,state:end});await page.close();
 }
 await browser.close();fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
