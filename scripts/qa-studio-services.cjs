const {createRequire}=require('module'),path=require('path'),assert=require('assert');
const req=process.argv[2]?createRequire(path.resolve(process.argv[2],'package.json')):require;
const {chromium}=req('playwright');
(async()=>{
 const browser=await chromium.launch({...(process.env.STUDIO_CHROMIUM?{executablePath:process.env.STUDIO_CHROMIUM}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:844},reducedMotion:'no-preference'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(window,'devicePixelRatio',{get:()=>.25}));
  await page.goto((process.env.PAGES_URL||'http://127.0.0.1:4173/').replace(/\/?$/,'/')+'demo/studio/');
  await page.waitForFunction(()=>window.__STUDIO?.state.ready,null,{timeout:120000});
  const samples=await page.evaluate(async()=>{
   const nativeRAF=window.requestAnimationFrame;let clock=performance.now();
   window.requestAnimationFrame=callback=>nativeRAF(()=>callback(clock+=100));
   try{
    document.querySelector('#service-cards a[href$="=closers"]').click();
    const rows=[];for(let i=0;i<40;i++){await new Promise(requestAnimationFrame);rows.push({door:__STUDIO.doorProgress,progress:__STUDIO.demonstration.progress,caption:document.querySelector('#demo-caption').textContent});}
    return rows;
   }finally{window.requestAnimationFrame=nativeRAF;}
  });
  assert(samples.some(s=>s.door>.035&&s.door<.32),'Door approaches latch automatically');
  assert(samples.some(s=>s.door>0&&s.door<=.035),'Soft-close pull is a distinct final stage');
  assert(samples.some(s=>s.caption.includes('Доводчик подтягивает')));
  await page.waitForFunction(()=>!__STUDIO.moving,null,{timeout:120000});
  assert.equal(await page.evaluate(()=>__STUDIO.doorProgress),0);
  assert.equal(await page.evaluate(()=>__STUDIO.state.doorOpen),false);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!__STUDIO.state.motion);
  await page.evaluate(()=>document.querySelector('#service-cards a[href$="=closers"]').click());
  assert.equal(await page.evaluate(()=>__STUDIO.moving),false);
  assert.equal(await page.evaluate(()=>__STUDIO.doorProgress),.32);
  await page.locator('[data-view="2"]').click();assert.equal(await page.evaluate(()=>__STUDIO.state.service),'body-polish');
  assert.equal(await page.evaluate(()=>__STUDIO.demonstration.progress),0);
  assert.deepEqual(errors,[]);console.log('PASS automatic two-stage closer, fully latched state, reduced motion and polish shortcut');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
