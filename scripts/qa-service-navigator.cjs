const {createRequire}=require('module');
const path=require('path'),fs=require('fs'),assert=require('assert'),{spawn}=require('child_process');
const req=createRequire(path.join(process.argv[2],'package.json'));
const {chromium}=req('playwright');
(async()=>{
 const dir=path.resolve('qa-service-navigator');fs.mkdirSync(dir,{recursive:true});fs.cpSync('_site',path.join(dir,'site'),{recursive:true});
 const config=JSON.parse(fs.readFileSync('_site/hero-service-config.json','utf8'));
 const xvfb=spawn('Xvfb',[':98','-screen','0','1920x1080x24','-nolisten','tcp'],{stdio:'ignore'});process.on('exit',()=>xvfb.kill());await new Promise(r=>setTimeout(r,650));
 const browser=await chromium.launch({headless:false,env:{...process.env,DISPLAY:':98'},args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const results=[];
 // The model load callback precedes its first rendered frame. Measure only
 // after real projection/layout, not freshly-created buttons at left:0/top:0.
 // JS waitForFunction takes predicate, argument, options (three parameters).
 const ready=async page=>{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle',timeout:120000});await page.bringToFront();
  await page.waitForFunction(()=>window.__TI_NAV&&['true','error','no-webgl'].includes(document.querySelector('.hero').dataset.navReady),null,{timeout:120000,polling:100});
  assert.equal(await page.locator('.hero').getAttribute('data-nav-ready'),'true','Actual WebGL model must load');
  await page.waitForFunction(()=>__TI_NAV.getState().stats.frames>0&&[...document.querySelectorAll('.nav-marker')].every(n=>n.style.transform.includes('translate3d')),null,{timeout:120000,polling:100});
 };
 const settle=async page=>page.waitForFunction(()=>!__TI_NAV.getState().moving,null,{timeout:180000,polling:100});
 const fit=async(page,label)=>{
  const report=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('.nav-marker,.nav-zone-row,.nav-service-choices button,.nav-demo-button,.nav-primary,.nav-panel h2,.nav-panel-scroll')];
   return nodes.filter(n=>n.getClientRects().length).map(n=>({text:n.textContent.trim(),class:n.className,client:n.clientWidth,scroll:n.scrollWidth,rect:n.getBoundingClientRect().toJSON()}));
  });
  for(const n of report)assert(n.scroll<=n.client+2,`${label}: text escapes ${n.class}: ${n.text}`);
  const markers=report.filter(n=>String(n.class).includes('nav-marker')).map(n=>n.rect);
  for(let i=0;i<markers.length;i++)for(let j=i+1;j<markers.length;j++){const a=markers[i],b=markers[j];assert(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${label}: overlapping markers`);}
  return report;
 };
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER:',e.message);});
  // Only the raster buffer is smaller on the CI software GPU; all geometry,
  // actual door animation, textures and shaders are retained. Native stills follow.
  await page.addInitScript(()=>Object.defineProperty(window,'devicePixelRatio',{get:()=>.125,configurable:true}));
  await ready(page);assert.equal(await page.locator('.nav-marker').count(),3);assert.equal(await page.locator('canvas').count(),1);
  assert.equal(await page.evaluate(()=>__TI_NAV.getState().rigReady),config.rig,'Uploaded original door rig must be enabled');
  const title=await page.locator('#heroTitle').evaluate(n=>({font:parseFloat(getComputedStyle(n).fontSize),client:n.clientWidth,scroll:n.scrollWidth}));
  assert(title.font>=(viewport.width>819?85:34),'Large hero title regressed');assert(title.scroll<=title.client+2,'Hero title overflows its container');await fit(page,'home');
  await page.evaluate(()=>{window.navSamples=[];window.recordNav=true;function sample(){if(!window.recordNav)return;navSamples.push(__TI_NAV.getState());requestAnimationFrame(sample);}requestAnimationFrame(sample);});
  await page.locator('.direction-tab[data-direction="tune"]').click();
  try{await settle(page);}catch(error){fs.writeFileSync(path.join(dir,`${viewport.width}-failure.json`),JSON.stringify({state:await page.evaluate(()=>__TI_NAV.getState()),errors},null,2));throw error;}
  const samples=await page.evaluate(()=>{window.recordNav=false;return window.navSamples;}),moving=samples.filter(s=>s.moving),unique=new Set(moving.map(s=>s.camera.map(v=>v.toFixed(4)).join(',')));
  assert(unique.size>=8,'Too few intermediate camera frames: '+unique.size);const first=samples[0].camera,last=samples[samples.length-1].camera;assert(Math.hypot(...last.map((v,i)=>v-first[i]))>.5,'Camera did not travel');
  fs.writeFileSync(path.join(dir,`${viewport.width}-camera.json`),JSON.stringify({drawingBufferRatio:.125,samples,errors},null,2));await fit(page,'tuning');assert.equal(await page.locator('.nav-marker').count(),5);
  await page.locator('.nav-motion').click();await page.locator('[data-nav-action="zone"][data-value="blackpack"]').click();await settle(page);assert((await page.locator('.nav-panel h2').innerText()).includes('Антихром'));
  await page.locator('[data-nav-action="chrome"][data-value="off"]').click();await page.locator('[data-nav-action="chrome"][data-value="on"]').click();await fit(page,'anti-chrome');
  await page.locator('[data-nav-action="back"]').click();await settle(page);await page.locator('.nav-motion').click();
  await page.evaluate(()=>{window.doorSamples=[];window.recordDoor=true;function sample(){if(!recordDoor)return;doorSamples.push(__TI_NAV.getState().doorProgress);requestAnimationFrame(sample);}requestAnimationFrame(sample);});
  await page.locator('[data-nav-action="zone"][data-value="cabin"]').click();await settle(page);
  const inside=await page.evaluate(()=>__TI_NAV.getState()),doorFrames=await page.evaluate(()=>{recordDoor=false;return doorSamples;});
  if(config.rig){assert(inside.rigReady&&inside.doorProgress>.99&&inside.inside,'Driver door did not open');assert(doorFrames.some(v=>v>.03&&v<.97),'Door skipped intermediate angles');assert.equal(inside.markerCount,4);}
  else assert((await page.locator('.nav-panel').innerText()).includes('3D-просмотр салона пока недоступен'));
  await fit(page,'open cabin');await page.locator('.nav-motion').click();
  await page.locator('[data-nav-action="zone"][data-value="steering"]').click();await settle(page);await fit(page,'steering');await page.locator('[data-nav-action="back"]').click();await settle(page);
  await page.evaluate(()=>{__TI_NAV.selectDirection('preserve');__TI_NAV.selectDirection('restore');__TI_NAV.selectDirection('tune');});await settle(page);const end=await page.evaluate(()=>__TI_NAV.getState());assert.equal(end.direction,'tune');assert.equal(end.doorProgress,0);assert(!end.inside);await fit(page,'rapid switch');
  assert.equal(errors.length,0,JSON.stringify(errors));await page.close();
  const still=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});still.on('pageerror',e=>errors.push(e.message));await ready(still);await still.screenshot({path:path.join(dir,`${viewport.width}-home.png`)});await still.locator('.nav-motion').click();
  await still.locator('.direction-tab[data-direction="tune"]').click();await settle(still);await fit(still,'native tuning');await still.screenshot({path:path.join(dir,`${viewport.width}-tune.png`)});
  await still.locator('[data-nav-action="zone"][data-value="cabin"]').click();await settle(still);const nativeDoor=await still.evaluate(()=>__TI_NAV.getState());if(config.rig)assert(nativeDoor.doorProgress>.99);await fit(still,'native cabin');await still.screenshot({path:path.join(dir,`${viewport.width}-cabin.png`)});
  await still.locator('[data-nav-action="home"]').first().click();await settle(still);assert.equal((await still.evaluate(()=>__TI_NAV.getState())).doorProgress,0);await fit(still,'native returned home');await still.screenshot({path:path.join(dir,`${viewport.width}-returned-home.png`)});await still.close();
  assert.equal(errors.length,0,JSON.stringify(errors));results.push({viewport,webgl:true,rig:inside.rigReady,doorOpened:inside.doorProgress,doorIntermediateFrames:doorFrames.filter(v=>v>0&&v<1).length,title,motionDrawingBufferRatio:.125,nativeResolutionStills:true,intermediateFrames:unique.size,errors,state:end});console.log('PASS_VIEWPORT',JSON.stringify(results.at(-1)));
 }
 await browser.close();xvfb.kill();fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
