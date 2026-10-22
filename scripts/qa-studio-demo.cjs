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
  if(r.ok()&&(await r.text()).includes('studio-v2')){available=true;break;}
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
  const page=await browser.newPage({viewport,reducedMotion:'reduce',deviceScaleFactor:1}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(/\.glb/.test(r.url()))requests.push({url:r.url(),status:r.status()});});
  // Reduce only the raster workload on CI's software GPU, retaining all geometry.
  await page.addInitScript(()=>Object.defineProperty(window,'devicePixelRatio',{get:()=>.5}));
  await page.goto(url);await page.waitForFunction(()=>window.__STUDIO?.state.ready,null,{timeout:120000});
  const ready=await page.evaluate(()=>({stats:__STUDIO.stats,state:__STUDIO.state,camera:__STUDIO.camera}));
  assert(ready.stats.bytes>8000000);assert.equal(requests.length,1);assert.equal(requests[0].status,200);
  const act=async selector=>{if(viewport.width<801)await page.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();scrollTo(0,scrollY+r.top-document.querySelector('.visual').clientHeight-20)},selector);await page.locator(selector).click();};
  await act('[data-finish="matte"]');assert.equal(await page.evaluate(()=>__STUDIO.state.finish),'matte');
  await act('[data-finish="chrome"]');assert.equal(await page.evaluate(()=>__STUDIO.materials[0].metalness),1);
  await page.evaluate(()=>{const s=document.querySelector('#zone');s.value='side';s.dispatchEvent(new Event('change'));});
  await act('[data-film="color"]');await page.waitForFunction(()=>!__STUDIO.moving);
  assert.equal(await page.evaluate(()=>__STUDIO.state.film),'color');
  assert.notDeepEqual(await page.evaluate(()=>__STUDIO.camera),ready.camera);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(errors.length,0);await page.screenshot({path:path.join(out,'studio-'+viewport.width+'.png')});
  report.checks.push({viewport,requests,errors,stats:await page.evaluate(()=>__STUDIO.stats),pass:true});await page.close();
 }
 fs.writeFileSync(path.join(out,'studio-public.json'),JSON.stringify(report,null,2));console.log('PASS deployed studio + homepage, GLB/JS, desktop/mobile materials, film and camera:',url);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
