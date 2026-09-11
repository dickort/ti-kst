const {createRequire}=require('module');
const path=require('path'),fs=require('fs'),assert=require('assert'),{spawn}=require('child_process');
const req=createRequire(path.join(process.argv[2],'package.json'));
const {chromium}=req('playwright');
(async()=>{
 const dir=path.resolve('qa-service-navigator');fs.mkdirSync(dir,{recursive:true});
 const xvfbPath=['/usr/bin/Xvfb','/usr/local/bin/Xvfb'].find(fs.existsSync);let xvfb=null;
 if(xvfbPath){xvfb=spawn(xvfbPath,[':97','-screen','0','1920x1080x24','-nolisten','tcp'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,500));}
 const browser=await chromium.launch({headless:!xvfb,env:xvfb?{...process.env,DISPLAY:':97'}:process.env,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const report=[];
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:900},deviceScaleFactor:1});
   const page=await context.newPage(),requests=[],errors=[];
   page.on('request',r=>{if(r.url().includes('/assets/'))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
   // Software GPU only: change raster size, NOT meshes, textures or shaders.
   await page.addInitScript(()=>Object.defineProperty(window,'devicePixelRatio',{get:()=>.125}));
   await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
   const settle=()=>page.waitForFunction(()=>window.__TI_NAV?.getState().modelReady&&!__TI_NAV.getState().moving&&__TI_NAV.getState().stats.firstModelMs!==null,null,{timeout:180000,polling:100});
   await settle();const first=await page.evaluate(()=>__TI_NAV.getState());
   assert(first.streaming&&first.rigReady&&!first.cabinReady,'Initial render must use exact exterior only');
   assert(!requests.some(u=>u.includes('_interior.')),'Heavy interior was requested during initial load');
   assert.equal(requests.filter(u=>u.includes('_exterior.')).length,1,'Preload and loader must share one fetch');
   assert(!requests.some(u=>u.includes('_v3.glb')),'Full original model must not be downloaded at startup');
   assert(first.stats.exterior.url.endsWith('.gz'),'Expected native gzip loading');
   if(width===1440){
    const labels=await page.locator('.nav-marker').evaluateAll(ns=>ns.map(n=>{const span=n.querySelector('span'),r=n.getBoundingClientRect(),cs=getComputedStyle(span);return {text:span.textContent,nowrap:cs.whiteSpace,scroll:n.scrollWidth,client:n.clientWidth,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
    labels.forEach(n=>{assert.equal(n.nowrap,'nowrap');assert(n.scroll<=n.client+2);assert(n.left>=-1&&n.right<=width+1,`Label outside ${width}px viewport: ${JSON.stringify(n)}`);});
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];assert(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`Measured labels overlap at ${width}px: ${JSON.stringify([a,b])}`);}
   }
   await page.locator('.nav-motion').click();
   await page.locator('.direction-tab[data-direction="tune"]').click();await settle();
   // A delayed download must not reopen the door after navigating away.
   await page.route('**/*_interior.*',async route=>{await new Promise(r=>setTimeout(r,900));await route.continue();});
   await page.locator('[data-nav-action="zone"][data-value="cabin"]').click();
   await page.waitForFunction(()=>__TI_NAV.getState().phase==='loading-cabin',null,{timeout:10000,polling:50});
   assert.equal((await page.evaluate(()=>__TI_NAV.getState())).doorProgress,0,'Door opened before interior loaded');
   await page.evaluate(()=>__TI_NAV.selectDirection('preserve'));await settle();
   await page.waitForFunction(()=>__TI_NAV.getState().cabinReady,null,{timeout:120000,polling:100});
   const cancelled=await page.evaluate(()=>__TI_NAV.getState());assert.equal(cancelled.direction,'preserve');assert.equal(cancelled.doorProgress,0);assert(!cancelled.inside);
   await page.evaluate(()=>__TI_NAV.selectDirection('tune'));await settle();
   await page.locator('[data-nav-action="zone"][data-value="cabin"]').click();await settle();
   const opened=await page.evaluate(()=>__TI_NAV.getState());assert(opened.cabinReady&&opened.doorProgress>.99);
   assert.equal(requests.filter(u=>u.includes('_interior.')).length,1,'Interior must be reused across entries');
   assert.equal(errors.length,0,JSON.stringify(errors));
   report.push({viewport:width,first,opened,requests,errors});await context.close();
  }
  // Older browser path: identical raw GLB, not a lower-quality fallback.
  const fallback=await browser.newPage({viewport:{width:390,height:844}});
  await fallback.addInitScript(()=>{globalThis.DecompressionStream=undefined;Object.defineProperty(window,'devicePixelRatio',{get:()=>.125});});
  await fallback.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await fallback.waitForFunction(()=>window.__TI_NAV?.getState().stats.firstModelMs!==null&&__TI_NAV?.getState().modelReady,null,{timeout:120000,polling:100});
  const raw=await fallback.evaluate(()=>__TI_NAV.getState());assert(raw.stats.exterior.url.endsWith('.glb'));report.push({rawFallback:true,state:raw});await fallback.close();
  fs.writeFileSync(path.join(dir,'lossless-streaming-results.json'),JSON.stringify(report,null,2));console.log('PASS lossless streaming, deferred cabin, cancellation, reuse, intrinsic label layout, raw fallback.');
 }finally{await browser.close();xvfb?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
