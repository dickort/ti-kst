const {createRequire}=require('module');
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const req=createRequire(path.join(process.argv[2],'package.json'));
const {chromium}=req('playwright');

(async()=>{
 const output=path.resolve('qa-service-navigator');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const report=[];
 try{
  for(const viewport of [{width:1440,height:900,limit:70000},{width:390,height:844,limit:30000}]){
   const context=await browser.newContext({viewport,deviceScaleFactor:1});
   const page=await context.newPage(),requests=[],errors=[];
   page.on('request',request=>requests.push(request.url()));
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*_exterior.*',async route=>{
    // Longer than a cold software-WebGL bootstrap: the poster must remain the
    // complete visual fallback even while the renderer and network are busy.
    await new Promise(resolve=>setTimeout(resolve,9000));
    await route.continue();
   });
   await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>{
    const image=document.querySelector('.nav-poster img');
    return image?.complete&&image.naturalWidth>0;
   },null,{timeout:5000,polling:25});
   const placeholder=await page.evaluate(()=>{
    const hero=document.querySelector('.hero'),stage=document.querySelector('#stageWrap');
    const picture=document.querySelector('.nav-poster'),image=picture.querySelector('img'),canvas=document.querySelector('.nav-canvas');
    const stageRect=stage.getBoundingClientRect(),posterRect=picture.getBoundingClientRect();
    const resource=performance.getEntriesByName(image.currentSrc).at(-1);
    const moduleLink=document.querySelector('link[rel="modulepreload"][href*="hero-service-navigator.bundle.js"]');
    const moduleScript=document.querySelector('script[type="module"][src*="hero-service-navigator.bundle.js"]');
    return {
     elapsed:performance.now(),source:new URL(image.currentSrc).pathname,
     natural:[image.naturalWidth,image.naturalHeight],decodedBytes:resource?.decodedBodySize||0,
     responseEnd:resource?.responseEnd||0,posterOpacity:Number(getComputedStyle(picture).opacity),
     canvasOpacity:canvas?Number(getComputedStyle(canvas).opacity):0,posterReady:hero.dataset.posterReady||null,navBoot:hero.dataset.navBoot||null,
     navReady:hero.dataset.navReady||null,firstFrame:hero.dataset.firstFrame||null,
     stage:[stageRect.width,stageRect.height],poster:[posterRect.width,posterRect.height],
     modulePreloaded:!!moduleLink&&new URL(moduleLink.href).href===new URL(moduleScript.src).href,
    };
   });
   assert(placeholder.responseEnd>0&&placeholder.responseEnd<1500,`Poster response was not early: ${placeholder.responseEnd}ms`);
   assert.equal(placeholder.posterOpacity,1,'Poster must remain fully visible before the first 3D frame');
   assert.equal(placeholder.canvasOpacity,0,'Blank WebGL canvas must not cover the poster');
   assert.notEqual(placeholder.firstFrame,'true','Delayed model produced a frame before its response');
   assert.equal(placeholder.navBoot,'poster','WebGL boot must yield the first paint to the poster');
   assert(placeholder.source.endsWith(viewport.width===390?'amg-hero-poster-mobile.webp':'amg-hero-poster-desktop.webp'));
   assert(placeholder.decodedBytes>0&&placeholder.decodedBytes<=viewport.limit,`Poster is too heavy: ${placeholder.decodedBytes}`);
   assert(Math.abs(placeholder.stage[0]-placeholder.poster[0])<1&&Math.abs(placeholder.stage[1]-placeholder.poster[1])<1,'Poster does not reserve the stage dimensions');
   assert(placeholder.modulePreloaded,'Renderer module preload must match the executed module URL');
   assert.equal(requests.filter(url=>url.includes('amg-hero-poster-')).length,1,'Responsive poster must make one image request');
   assert(!requests.some(url=>url.includes('_interior.')),'Cabin must remain lazy during the initial view');
   await page.screenshot({path:path.join(output,`${viewport.width}-instant-poster.png`),fullPage:false});
   await page.waitForFunction(()=>window.__TI_NAV?.getState().modelReady&&window.__TI_NAV.getState().stats.firstModelMs!==null,null,{timeout:180000,polling:100});
   try{
    await page.waitForFunction(()=>{
     const poster=document.querySelector('.nav-poster'),canvas=document.querySelector('.nav-canvas');
     return Number(getComputedStyle(poster).opacity)<.05&&Number(getComputedStyle(canvas).opacity)>.95;
    },null,{timeout:5000,polling:50});
   }catch(error){
    const diagnostic=await page.evaluate(()=>{
     const stage=document.querySelector('#stageWrap'),poster=document.querySelector('.nav-poster'),canvas=document.querySelector('.nav-canvas');
     return {stageClass:stage.className,poster:getComputedStyle(poster).opacity,canvas:getComputedStyle(canvas).opacity,posterTransition:getComputedStyle(poster).transitionDuration,canvasTransition:getComputedStyle(canvas).transitionDuration,animations:document.getAnimations().map(a=>({time:a.currentTime,state:a.playState}))};
    });
    throw new Error(`First-frame transition stalled: ${JSON.stringify(diagnostic)}; ${error.message}`);
   }
   const ready=await page.evaluate(()=>({
    posterOpacity:Number(getComputedStyle(document.querySelector('.nav-poster')).opacity),
    canvasOpacity:Number(getComputedStyle(document.querySelector('.nav-canvas')).opacity),
    state:window.__TI_NAV.getState(),
   }));
   assert(ready.posterOpacity<.05&&ready.canvasOpacity>.95,`Poster did not crossfade to the real 3D frame: ${JSON.stringify(ready)}`);
   assert(ready.state.rigReady&&!ready.state.cabinReady,'Exterior-first rig changed during the handoff');
   assert.equal(errors.length,0,JSON.stringify(errors));
   report.push({viewport,placeholder,ready,requests:requests.filter(url=>/hero-poster|_exterior\.|navigator\.bundle/.test(url))});
   await context.close();
  }
  fs.writeFileSync(path.join(output,'instant-hero-results.json'),JSON.stringify(report,null,2));
  console.log('PASS instant same-model poster, responsive preload, first-frame crossfade and lazy cabin.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
