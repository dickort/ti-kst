const {createRequire}=require('module');
const path=require('path'),fs=require('fs'),assert=require('assert'),{spawn}=require('child_process');
const req=createRequire(path.join(process.argv[2],'package.json'));
const {chromium}=req('playwright');
(async()=>{
 const dir=path.resolve('qa-service-navigator');fs.mkdirSync(dir,{recursive:true});fs.cpSync('_site',path.join(dir,'site'),{recursive:true});
 const xvfb=spawn('Xvfb',[':98','-screen','0','1920x1080x24','-nolisten','tcp'],{stdio:'ignore'});process.on('exit',()=>xvfb.kill());await new Promise(r=>setTimeout(r,650));
 const browser=await chromium.launch({headless:false,env:{...process.env,DISPLAY:':98'},args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const results=[];
 const ready=async page=>{await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:60000});await page.bringToFront();await page.waitForFunction(()=>window.__TI_NAV&&['true','error','no-webgl'].includes(document.querySelector('.hero').dataset.navReady),{timeout:60000});};
 const settle=async page=>page.waitForFunction(()=>!__TI_NAV.getState().moving,{timeout:60000,polling:100});
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER:',e.message);});
  // CI uses software rasterization, not a user GPU. Lower only the WebGL
  // drawing-buffer ratio during motion tests; DOM viewport stays unchanged.
  // Native-resolution stills are captured separately below. No FPS claim.
  await page.addInitScript(()=>Object.defineProperty(window,'devicePixelRatio',{get:()=>.25,configurable:true}));
  await ready(page);
  const mode=await page.locator('.hero').getAttribute('data-nav-ready');assert(['true','no-webgl'].includes(mode),'3D failed: '+mode);
  assert.equal(await page.locator('.nav-marker').count(),3);assert.equal(await page.locator('canvas').count(),1);
  await page.evaluate(()=>{window.navSamples=[];window.recordNav=true;function sample(){if(!window.recordNav)return;navSamples.push(__TI_NAV.getState());requestAnimationFrame(sample);}requestAnimationFrame(sample);});
  await page.locator('.direction-tab[data-direction="tune"]').click();
  try{await settle(page);}catch(error){const debug=await page.evaluate(()=>({hidden:document.hidden,state:__TI_NAV.getState(),samples:window.navSamples}));fs.writeFileSync(path.join(dir,`${viewport.width}-failure.json`),JSON.stringify({debug,errors},null,2));console.log('STALLED',JSON.stringify({...debug,samples:debug.samples.slice(-5)}));throw error;}
  const samples=await page.evaluate(()=>{window.recordNav=false;return window.navSamples;});const moving=samples.filter(s=>s.moving),unique=new Set(moving.map(s=>s.camera.map(v=>v.toFixed(4)).join(',')));
  fs.writeFileSync(path.join(dir,`${viewport.width}-camera.json`),JSON.stringify({drawingBufferRatio:.25,samples,errors},null,2));
  assert(unique.size>=8,'Too few distinct intermediate camera frames: '+unique.size);const first=samples[0].camera,last=samples[samples.length-1].camera;assert(Math.hypot(...last.map((v,i)=>v-first[i]))>.5,'Camera did not travel');
  console.log('CAMERA_QA',JSON.stringify({viewport,mode,intermediateFrames:unique.size,errors}));assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(await page.locator('.nav-marker').count(),5);
  await page.locator('[data-nav-action="zone"][data-value="blackpack"]').click();await settle(page);assert((await page.locator('.nav-panel h2').innerText()).includes('Антихром'));
  await page.locator('[data-nav-action="chrome"][data-value="off"]').click();await page.locator('[data-nav-action="chrome"][data-value="on"]').click();
  await page.locator('[data-nav-action="back"]').click();await page.locator('[data-nav-action="zone"][data-value="cabin"]').click();await settle(page);
  const inside=await page.evaluate(()=>__TI_NAV.getState());
  if(inside.rigReady){assert(inside.doorProgress>.99);assert.equal(inside.markerCount,4);}else assert((await page.locator('.nav-panel').innerText()).includes('3D-просмотр салона пока недоступен'));
  await page.evaluate(()=>{__TI_NAV.selectDirection('preserve');__TI_NAV.selectDirection('restore');__TI_NAV.selectDirection('tune');});await settle(page);const end=await page.evaluate(()=>__TI_NAV.getState());assert.equal(end.direction,'tune');assert.equal(end.doorProgress,0);assert(!end.inside);
  const rects=await page.locator('.nav-marker').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}));for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Markers overlap');}
  assert.equal(errors.length,0,JSON.stringify(errors));await page.close();
  // Native drawing resolution, no DPR override: inspect actual materials/layout.
  // Disable guided movement through its real UI only for these static shots.
  const still=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});still.on('pageerror',e=>errors.push(e.message));await ready(still);await still.screenshot({path:path.join(dir,`${viewport.width}-home.png`)});await still.locator('.nav-motion').click();
  await still.locator('.direction-tab[data-direction="tune"]').click();await settle(still);await still.screenshot({path:path.join(dir,`${viewport.width}-tune.png`)});
  await still.locator('[data-nav-action="zone"][data-value="blackpack"]').click();await settle(still);await still.screenshot({path:path.join(dir,`${viewport.width}-anti-chrome.png`)});
  await still.locator('[data-nav-action="back"]').click();await still.locator('[data-nav-action="zone"][data-value="cabin"]').click();await settle(still);await still.screenshot({path:path.join(dir,`${viewport.width}-cabin.png`)});await still.close();
  assert.equal(errors.length,0,JSON.stringify(errors));results.push({viewport,webgl:mode==='true',rig:inside.rigReady,motionDrawingBufferRatio:.25,nativeResolutionStills:true,intermediateFrames:unique.size,errors,state:end});
 }
 await browser.close();xvfb.kill();fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
