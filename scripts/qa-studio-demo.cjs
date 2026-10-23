const {createRequire}=require('module'),path=require('path'),fs=require('fs'),assert=require('assert');
const req=process.argv[2]?createRequire(path.resolve(process.argv[2],'package.json')):require;
const {chromium}=req('playwright');
(async()=>{
 const base=(process.env.PAGES_URL||'http://127.0.0.1:4173/').replace(/\/?$/,'/');
 const url=base+'demo/studio/',out=path.resolve('qa-service-navigator');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.STUDIO_CHROMIUM?{executablePath:process.env.STUDIO_CHROMIUM}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const report={base,url,checks:[]};
 try{
 const api=await browser.newContext();
 let available=false;
 for(let attempt=0;attempt<8;attempt++){
  const r=await api.request.get(url);
  if(r.ok()&&(await r.text()).includes('studio-material-v5')){available=true;break;}
  await new Promise(resolve=>setTimeout(resolve,10000));
 }
 assert(available,'Deployed studio HTML must be available');
 for(const asset of ['','assets/amg_driver_cabin_desktop_v3.glb','assets/amg_driver_cabin_mobile_v3.glb','demo/studio/studio.js']){
  const r=await api.request.get(base+asset);assert(r.ok(),asset+' HTTP '+r.status());
  if(asset.endsWith('.glb'))assert.equal((await r.body()).subarray(0,4).toString(),'glTF');
  if(!asset)assert((await r.text()).includes('hero'),'Original homepage remains available');
 }
 await api.close();
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce',deviceScaleFactor:1,hasTouch:viewport.width<801}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/.test(m.text()))errors.push(m.text());});page.on('response',r=>{if(/\.glb/.test(r.url()))requests.push({url:r.url(),status:r.status()});});
  // Reduce only the raster workload on CI's software GPU, retaining all geometry.
  await page.addInitScript(()=>Object.defineProperty(window,'devicePixelRatio',{get:()=>.5}));
  await page.goto(url);await page.waitForFunction(()=>window.__STUDIO?.state.ready,null,{timeout:120000});
  const ready=await page.evaluate(()=>({stats:__STUDIO.stats,state:__STUDIO.state,camera:__STUDIO.camera}));
  const protectedSurfaces=await page.evaluate(()=>[__STUDIO.surfaceAt(0,0),__STUDIO.surfaceAt(.65,-.5),__STUDIO.surfaceAt(.85,-2.3)]);
  const swatches=await page.locator('[data-color]').evaluateAll(ns=>ns.map(n=>n.dataset.color));
  for(const color of swatches){
   await page.evaluate(c=>document.querySelector('[data-color="'+c+'"]').click(),color);
   const actual=await page.evaluate(()=>({paint:[__STUDIO.surfaceAt(0,-.5),__STUDIO.surfaceAt(.3,-.5),__STUDIO.surfaceAt(.3,-2.3)],protected:[__STUDIO.surfaceAt(0,0),__STUDIO.surfaceAt(.65,-.5),__STUDIO.surfaceAt(.85,-2.3)]}));
   assert(actual.paint.every(x=>x.painted&&x.color===color.slice(1)),'Actual roof and spoiler material colors');
   assert.deepEqual(actual.protected,protectedSurfaces,'Glass, chrome and lower carbon unchanged');
  }
  for(const view of [0,1,2,3,4]){
   await page.evaluate(v=>document.querySelector('[data-view="'+v+'"]').click(),view);await page.waitForFunction(()=>!__STUDIO.moving);
   assert((await page.evaluate(()=>__STUDIO.projectedBounds())).every(v=>Math.abs(v[0])<.98&&Math.abs(v[1])<.98),'Whole-car preset clipping');
  }
  const orbitBefore=await page.evaluate(()=>__STUDIO.camera),rect=await page.locator('canvas').boundingBox();
  if(viewport.width>800){await page.mouse.move(rect.x+rect.width*.4,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.6,rect.y+rect.height*.55,{steps:5});await page.mouse.up();}
  else{const cd=await page.context().newCDPSession(page),x=rect.x+rect.width*.4,y=rect.y+rect.height*.5;await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+60,y:y+10}]});await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  const orbitAfter=await page.evaluate(()=>__STUDIO.camera);assert.notDeepEqual(orbitBefore,orbitAfter,'Pointer/touch orbit works');
  await page.evaluate(()=>scrollTo(0,70));assert.deepEqual(await page.evaluate(()=>__STUDIO.camera),orbitAfter,'Page scroll does not move camera');await page.evaluate(()=>scrollTo(0,0));

  assert(ready.stats.bytes>8000000);assert.equal(requests.length,1);assert.equal(requests[0].status,200);
  const act=async selector=>{if(viewport.width<801)await page.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();scrollTo(0,scrollY+r.top-document.querySelector('.visual').clientHeight-20)},selector);await page.locator(selector).click();};
  await act('[data-finish="matte"]');assert.equal(await page.evaluate(()=>__STUDIO.state.finish),'matte');
  await act('[data-finish="chrome"]');assert.equal(await page.evaluate(()=>__STUDIO.materials[0].metalness),1);
  await page.evaluate(()=>{const s=document.querySelector('#zone');s.value='side';s.dispatchEvent(new Event('change'));});
  await act('[data-film="color"]');await page.waitForFunction(()=>!__STUDIO.moving);
  assert.equal(await page.evaluate(()=>__STUDIO.state.film),'color');
  assert.notDeepEqual(await page.evaluate(()=>__STUDIO.camera),ready.camera);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);

  assert.equal(swatches.length,15,'Expanded palette');
  await page.evaluate(()=>{document.querySelector('#custom-color').value='#ec7f31';document.querySelector('#custom-color').dispatchEvent(new Event('input'));});
  assert.equal(await page.evaluate(()=>__STUDIO.materials[0].color),'ec7f31');
  for(const z of ['hood','side','roof','rear','all']){
   await page.selectOption('#polish-zone',z);await page.locator('#polish').fill('100');
   assert.equal(await page.evaluate(()=>__STUDIO.state.polishZone),z);
  }
  await page.evaluate(()=>document.querySelector('#door-toggle').click());await page.waitForFunction(()=>!__STUDIO.moving);
  assert.equal(await page.evaluate(()=>__STUDIO.doorProgress),1);
  for(const service of ['clean','leather','trim','ambient']){
   await page.evaluate(v=>document.querySelector('[data-cabin="'+v+'"]').click(),service);await page.waitForFunction(()=>!__STUDIO.moving);
   assert.equal(await page.evaluate(()=>__STUDIO.state.cabin),service);
  }
  await page.selectOption('#leather-color','#805335');
  assert((await page.evaluate(()=>__STUDIO.cabinMaterials)).every(m=>m.color==='805335'));
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'studio-cabin-'+viewport.width+'.png')});
  await page.evaluate(()=>document.querySelector('#exterior').click());await page.waitForFunction(()=>!__STUDIO.moving);
  assert.equal(await page.evaluate(()=>__STUDIO.doorProgress),0);


  assert.equal(await page.evaluate(()=>__STUDIO.serviceCount),28);
  const catalogue=[];
  for(const dir of ['preserve','restore','tune']){
   await page.selectOption('#service-direction',dir);
   const ids=await page.locator('#service-choice option').evaluateAll(ns=>ns.map(n=>n.value));
   for(const id of ids){await page.selectOption('#service-choice',id);assert.equal(await page.evaluate(()=>__STUDIO.state.service),id);catalogue.push(id);}
  }
  assert.equal(new Set(catalogue).size,28);
  await page.evaluate(()=>document.querySelector('[data-cabin="ambient"]').click());
  await page.selectOption('#ambient-color','#ba66ff');await page.locator('#ambient-power').fill('85');
  assert.deepEqual(await page.evaluate(()=>__STUDIO.ambient),{active:1,power:.85,color:'ba66ff',lightCount:2});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'studio-ambient-'+viewport.width+'.png')});
  await page.evaluate(()=>document.querySelector('#reset').click());
  assert.equal(await page.evaluate(()=>__STUDIO.ambient.active),0);
  assert.equal(errors.length,0);await page.screenshot({path:path.join(out,'studio-'+viewport.width+'.png')});
  report.checks.push({viewport,requests,errors,stats:await page.evaluate(()=>__STUDIO.stats),pass:true});await page.close();
 }
 fs.writeFileSync(path.join(out,'studio-public.json'),JSON.stringify(report,null,2));console.log('PASS deployed studio + homepage, GLB/JS, all body colors including roof/spoiler, protected materials, desktop/mobile orbit, presets, film, polish zones, 28 TI services, embedded ambient lighting, cabin materials and driver door:',url);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
