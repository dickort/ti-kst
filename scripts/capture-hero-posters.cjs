const {createRequire}=require('module');
const fs=require('fs');
const path=require('path');
const {spawn,spawnSync}=require('child_process');

const dependencyRoot=process.argv[2];
const baseUrl=process.argv[3]||'http://127.0.0.1:4173/';
const shouldServe=!process.argv[3];
if(!dependencyRoot)throw new Error('Usage: node scripts/capture-hero-posters.cjs <playwright-deps> [url]');

const req=createRequire(path.join(dependencyRoot,'package.json'));
const {chromium}=req('playwright');
const variants=[
 {name:'desktop',width:1440,height:900},
 {name:'mobile',width:390,height:844},
];

(async()=>{
 let server=null;
 if(shouldServe){
  server=spawn('python3',['-m','http.server','4173','--directory','_site'],{stdio:'ignore'});
  for(let attempt=0;attempt<50;attempt++){
   try{if((await fetch(baseUrl)).ok)break;}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
   if(attempt===49)throw new Error('Local preview server did not start');
  }
 }
 const browser=await chromium.launch({
  headless:true,
  args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
 });
 try{
  for(const variant of variants){
   const page=await browser.newPage({viewport:{width:variant.width,height:variant.height},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(baseUrl,{waitUntil:'networkidle',timeout:180000});
   await page.waitForFunction(
    ()=>window.__TI_NAV?.getState().modelReady&&window.__TI_NAV.getState().stats.firstModelMs!==null,
    null,{timeout:180000,polling:100},
   );
   await page.waitForTimeout(250);
   const capture=await page.evaluate(()=>{
    const canvas=document.querySelector('.nav-canvas');
    return {width:canvas.width,height:canvas.height,state:window.__TI_NAV.getState()};
   });
   if(errors.length)throw new Error(`${variant.name}: ${errors.join('; ')}`);
   await page.addStyleTag({content:`
    html,body,main,.hero,.stage-wrap{background:transparent!important;background-image:none!important}
    body>*:not(main),main>*:not(.hero),.hero>*:not(.stage-wrap),.stage-wrap>*:not(.nav-canvas){display:none!important}
    .nav-canvas{opacity:1!important}
   `});
   const png=await page.locator('#stageWrap').screenshot({type:'png',omitBackground:true});
   const encoder=spawnSync('python3',['-c',`from PIL import Image\nimport io,sys\nim=Image.open(io.BytesIO(sys.stdin.buffer.read()))\nim.save(sys.stdout.buffer,format='WEBP',lossless=True,method=6)`],{input:png,maxBuffer:8*1024*1024});
   if(encoder.status!==0)throw new Error(`Lossless WebP encoder failed: ${encoder.stderr}`);
   const output=path.resolve('assets',`amg-hero-poster-${variant.name}.webp`);
   fs.writeFileSync(output,encoder.stdout);
   console.log(JSON.stringify({variant:variant.name,output,width:capture.width,height:capture.height,bytes:encoder.stdout.length,firstModelMs:Math.round(capture.state.stats.firstModelMs)}));
   await page.close();
  }
 }finally{await browser.close();server?.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
