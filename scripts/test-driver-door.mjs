// Real Three.js math + jsdom state tests; NOT a GPU or FPS benchmark.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const dependencies=process.argv[2];if(!dependencies)throw new Error('Pass a temporary npm prefix containing three and jsdom');
const threeURL=pathToFileURL(path.resolve(dependencies,'node_modules/three/build/three.module.js')).href;
const THREE=await import(threeURL);
const {JSDOM}=await import(pathToFileURL(path.resolve(dependencies,'node_modules/jsdom/lib/api.js')).href);
const encodeModule=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
const controllerSource=(await fs.readFile('driver-door-controller-v3.js','utf8')).replace("'https://esm.sh/three@0.169.0'",JSON.stringify(threeURL));
const controllerURL=encodeModule(controllerSource);
const {createDriverDoorController}=await import(controllerURL);
let now=0;Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
function fixture(){
 const model=new THREE.Group();model.scale.setScalar(1.747);model.rotation.y=-.58;
 const door=new THREE.Group();door.name='driverDoor';door.position.set(.546,.48,.588);
 const handle=new THREE.Object3D();handle.position.set(.053,-.025,-.82);door.add(handle);
 const cabin=new THREE.Group();cabin.name='interiorCabin';model.add(door,cabin);
 const camera=new THREE.PerspectiveCamera(31,1.7,.1,80);camera.position.set(0,2.22,6.30);
 const target=new THREE.Vector3(0,.78,0);camera.lookAt(target);model.updateMatrixWorld(true);
 return {model,door,handle,camera,target};
}
const report={rendererTest:false,tests:[]};
{
 const{model,door,handle,camera,target}=fixture();const initial=camera.position.clone(),hinge=door.getWorldPosition(new THREE.Vector3()),closedLocal=handle.position.clone();
 const controller=createDriverDoorController({model,camera,initialTarget:target});controller.open();now=900;controller.update(now);
 assert.equal(controller.getState().state,'opening');assert(camera.position.distanceTo(initial)>.01);assert(controller.getState().doorProgress>0&&controller.getState().doorProgress<1);
 now=2000;controller.update(now);assert.equal(controller.getState().state,'open');assert(Math.abs(door.rotation.y-THREE.MathUtils.degToRad(-62))<1e-6);
 model.updateMatrixWorld(true);assert(door.getWorldPosition(new THREE.Vector3()).distanceTo(hinge)<1e-9);
 assert(closedLocal.clone().applyQuaternion(door.quaternion).x>closedLocal.x,'door must open outward on +X');
 controller.focus('wheel');now=2400;controller.update(now);const manualEye=camera.position.clone();controller.onManualInput();now=3900;controller.update(now);assert(camera.position.distanceTo(manualEye)<1e-9);
 controller.close();now=6600;controller.update(now);assert.equal(controller.getState().state,'closed');assert(camera.position.distanceTo(initial)<1e-8);
 report.tests.push('Camera interpolation, -62 degree driver-door rotation, invariant hinge, manual interruption, exact return');
}
{
 now=0;const{model,camera,target}=fixture(),controller=createDriverDoorController({model,camera,initialTarget:target});
 controller.open();now=800;controller.update(now);controller.close();now=3500;controller.update(now);assert.equal(controller.getState().state,'closed');assert.equal(controller.getState().doorProgress,0);
 controller.open();now=5600;controller.update(now);controller.close();now=6000;controller.update(now);controller.open();now=8400;controller.update(now);assert.equal(controller.getState().state,'open');
 report.tests.push('Close during opening and reopen during closing');
}
{
 const dom=new JSDOM(await fs.readFile('index.html','utf8'),{url:'https://example.test/ti-kst/'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.MutationObserver=dom.window.MutationObserver;globalThis.requestAnimationFrame=fn=>{fn(now);return 1;};
 const stage=document.getElementById('stageWrap'),canvas=document.getElementById('carCanvas');canvas.setPointerCapture=()=>{};canvas.hasPointerCapture=()=>false;canvas.releasePointerCapture=()=>{};
 const featureSource=(await fs.readFile('hero-driver-door.js','utf8')).replace("'https://esm.sh/three@0.169.0'",JSON.stringify(threeURL)).replace(/'\.\/driver-door-controller-v3\.js(?:\?[^']*)?'/,JSON.stringify(controllerURL));
 const{mountDriverDoorExperience}=await import(encodeModule(featureSource));
 for(const width of [1440,390]){
  Object.defineProperty(window,'innerWidth',{configurable:true,value:width});const{model,camera,target}=fixture();let paused=0,exteriorClicks=0;
  const experience=mountDriverDoorExperience({model,camera,canvas,stage,pauseExterior:()=>{paused++;},getExteriorTarget:()=>target});const entry=document.querySelector('.interior-entry');assert(entry.hidden);
  document.querySelectorAll('.direction-tab').forEach(b=>b.classList.toggle('active',b.dataset.direction==='restore'));
  await new Promise(resolve=>setTimeout(resolve,0));assert(!entry.hidden);document.getElementById('directionPanel').classList.add('open');
  now=0;entry.click();assert(experience.isActive());assert.equal(paused,1);now=950;experience.update(now);assert(experience.getState().doorProgress>0);
  now=2000;experience.update(now);assert.equal(experience.getState().state,'open');assert.equal(document.querySelectorAll('.interior-services a').length,7);
  const tune=document.querySelector('.direction-tab[data-direction="tune"]'),counter=()=>exteriorClicks++;tune.addEventListener('click',counter);
  tune.click();assert.equal(exteriorClicks,0,'direction must be queued until closure');now=4900;experience.update(now);assert(!experience.isActive());assert.equal(exteriorClicks,1);
  assert(!document.querySelector('.hero').classList.contains('interior-active'));tune.removeEventListener('click',counter);experience.dispose();document.querySelectorAll('.direction-tab').forEach(b=>b.classList.remove('active'));
  report.tests.push(`DOM controls, seven service links, queued direction and cleanup at ${width}px (jsdom, no layout render)`);
 }
 dom.window.close();
}
await fs.writeFile('driver-door-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
