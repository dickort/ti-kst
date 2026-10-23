import {createServiceEffects,demonstrations} from './service-effects.js';
import {setupColorWheel} from './color-wheel.js';
import {addStudioPosters} from './poster-art.js';
import {grainTexture,ensureSurfaceUV,detailCabin} from './surface-detail.js';
import {services} from './services.mjs';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={ready:false,color:'#62747e',finish:'gloss',film:'none',zone:'hood',polish:0,view:0,motion:!reduced.matches,polishZone:'all',doorOpen:false,cabin:null,leather:'#24252a',service:null,ambientColor:'#65b9ff',ambientPower:70,lighting:'inspection'};
const stats={tier:innerWidth<801||navigator.connection?.saveData?'mobile':'desktop',frames:0,adaptive:false};
const uniforms={film:{value:0},zone:{value:0},polish:{value:0},polishing:{value:0},polishZone:{value:2}};
const workingLights=[];let lampMaterial,environmentTarget,cubeTarget;
let serviceEffects,serviceMotion=null;let renderer,scene,camera,model,controls,flight=null,interacting=false,drawing=false,raf=0,visible=true,lastFrame=0,slow=0;
const paints=[],leathers=[],plastics=[],chromes=[],windows=[];const textures={leather:grainTexture('leather'),perforated:grainTexture('perforated'),fabric:grainTexture('fabric'),carbon:grainTexture('carbon')};const ambience={active:{value:0},color:{value:new THREE.Color('#65b9ff')},power:{value:.7},inverse:{value:new THREE.Matrix4()}};let door,doorRest,doorMotion=null,doorProgress=0,ambient;
const viewport=$('#viewport'),canvas=$('canvas'),status=$('#status');
window.__STUDIO={state,stats,get loop(){return {raf,visible,drawing}},get demonstration(){return serviceEffects?.status},get moving(){return !!flight||!!doorMotion||!!serviceMotion},get doorProgress(){return doorProgress},get serviceCount(){return Object.keys(services).length},get ambient(){return {active:ambience.active.value,power:ambience.power.value,color:ambience.color.value.getHexString(),lightCount:ambient?.children.length}},get cabinMaterials(){return leathers.map(m=>({name:m.name,color:m.color.getHexString(),roughness:m.roughness}))},get camera(){return camera?.position.toArray()},get materials(){return paints.map(m=>({name:m.name,color:m.color.getHexString(),map:!!m.map,roughness:m.roughness,metalness:m.metalness}))}};
all('[data-view]').forEach(b=>b.disabled=true);
function fallback(message){$('#color-wheel').setAttribute('aria-disabled','true');$('#color-wheel').tabIndex=-1;state.ready=false;cancelAnimationFrame(raf);raf=0;document.body.classList.add('fallback');$('#poster').hidden=false;canvas.hidden=true;$('#controls').disabled=true;all('[data-view]').forEach(b=>b.disabled=true);$('#motion').disabled=true;$('#economy').disabled=true;status.textContent=message;$('#scroll-hint').textContent='';stats.error=message;metrics();}
function metrics(){$('#metrics').textContent=JSON.stringify(stats,null,2);}
function invalidate(){if(!drawing&&!raf&&visible&&!document.hidden&&renderer&&state.ready)raf=requestAnimationFrame(render);}
const points=[
 {eye:[6.3,3.2,7.8],at:[0,.75,0]},
 {eye:[8.4,2.6,.3],at:[0,.7,0]},
 {eye:[3.5,5.5,6],at:[0,.9,.45]},
 {eye:[-6.2,3.2,-7.8],at:[0,.75,0]},
 {eye:[.1,12.8,-1],at:[0,.7,0]},
 {eye:[3.6,1.85,-1.4],at:[.20,.85,.15]},
 {eye:[10,7,14],at:[0,2,0]},
 {eye:[3,1.7,-.7],at:[.42,1,.45]},
 {eye:[2.8,1.65,-1.5],at:[.25,.8,-.3]}
];
function preset(value){
 const p=points[value],at=new THREE.Vector3(...p.at),eye=new THREE.Vector3(...p.eye);
 if(model&&value<5){
  const bounds=new THREE.Box3().setFromObject(model),test=camera.clone();
  const corners=[bounds.min.x,bounds.max.x].flatMap(x=>[bounds.min.y,bounds.max.y].flatMap(y=>[bounds.min.z,bounds.max.z].map(z=>new THREE.Vector3(x,y,z))));
  for(let i=0;i<3;i++){
   test.position.copy(eye);test.lookAt(at);test.updateMatrixWorld();
   const projected=corners.map(v=>v.clone().project(test));
   const fit=Math.max(...projected.map(v=>Math.max(Math.abs(v.x)/.87,v.y/(innerWidth<801?.87:.70),-v.y/(innerWidth<801?.87:.68))));
   eye.sub(at).multiplyScalar(fit).add(at);
  }
 }
 if(value>=5&&value!==6&&innerWidth<801)eye.sub(at).multiplyScalar(1.45).add(at);
 if(value===6&&innerWidth<801)eye.sub(at).multiplyScalar(1.25).add(at);
 return {eye,at};
}
function setupControls(){
 controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.enablePan=false;
 controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI/2-.08;
 controls.minDistance=1.1;controls.maxDistance=22;controls.rotateSpeed=.65;controls.zoomSpeed=.75;
 controls.addEventListener('start',()=>{interacting=true;flight=null;state.view='free';all('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));});
 controls.addEventListener('change',invalidate);controls.addEventListener('end',()=>{interacting=false;lastFrame=0;});
 canvas.tabIndex=0;canvas.setAttribute('aria-label','Вращение автомобиля: потяните мышью или пальцем. Масштаб: колесо или два пальца. Клавиши стрелок — вращение, плюс и минус — масштаб, Home — общий вид.');
 canvas.addEventListener('keydown',e=>{
  if(!state.ready||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;
  e.preventDefault();if(e.key==='Home'){chooseView(0);return;}flight=null;
  const a=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  if(e.key==='ArrowLeft')a.theta-=.12;if(e.key==='ArrowRight')a.theta+=.12;
  if(e.key==='ArrowUp')a.phi-=.08;if(e.key==='ArrowDown')a.phi+=.08;
  if(e.key==='+'||e.key==='=')a.radius*=.9;if(e.key==='-')a.radius*=1.1;
  a.phi=THREE.MathUtils.clamp(a.phi,controls.minPolarAngle,controls.maxPolarAngle);
  a.radius=THREE.MathUtils.clamp(a.radius,controls.minDistance,controls.maxDistance);
  camera.position.setFromSpherical(a).add(controls.target);controls.update();invalidate();
 });
}
function positionCamera(){const p=preset(0);camera.position.copy(p.eye);controls.target.copy(p.at);controls.update();}
function render(now){
 raf=0;if(!visible||document.hidden||!state.ready)return;drawing=true;
 try{
 if(flight){
  const f=flight,t=Math.min(1,(now-f.start)/700),e=t*t*(3-2*t);
  controls.target.lerpVectors(f.fromAt,f.at,e);
  const a=new THREE.Spherical(THREE.MathUtils.lerp(f.a.radius,f.b.radius,e),THREE.MathUtils.lerp(f.a.phi,f.b.phi,e),THREE.MathUtils.lerp(f.a.theta,f.b.theta,e));
  camera.position.setFromSpherical(a).add(controls.target);controls.update();
  if(t===1)flight=null;
 }
 if(doorMotion){const d=doorMotion;d.elapsed+=Math.max(0,now-d.last);d.last=now;const t=Math.min(1,d.elapsed/d.duration),e=t*t*(3-2*t);doorProgress=THREE.MathUtils.lerp(doorMotion.from,doorMotion.to,e);door.quaternion.copy(doorRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-62*Math.PI/180*doorProgress));if(t===1){doorMotion=null;renderer.shadowMap.needsUpdate=true;}}
 if(serviceMotion){const d=serviceMotion;d.elapsed+=Math.max(0,now-d.last);d.last=now;const t=Math.min(1,d.elapsed/2200);setComparison(t*t*(3-2*t));if(t===1){serviceMotion=null;$('#demo-play').textContent='Повторить';}}
 const begin=performance.now();renderer.render(scene,camera);stats.lastRenderSubmitMs=+(performance.now()-begin).toFixed(2);stats.frames++;
 // Count genuinely slow frames too; the former <300ms gate excluded stalled GPUs.
 if((flight||doorMotion||serviceMotion||interacting)&&lastFrame){
  const gap=now-lastFrame;
  slow=gap>250?3:gap>50?slow+1:Math.max(0,slow-1);
  if(slow>=3&&renderer.getPixelRatio()>.6){
   renderer.setPixelRatio(Math.max(.6,renderer.getPixelRatio()*.75));
   stats.adaptive=true;stats.pixelRatio=renderer.getPixelRatio();slow=0;
  }
 }
 }catch(error){console.error('Studio render failed',error);fallback('Не удалось продолжить 3D · обновите страницу');}
 finally{drawing=false;}
 lastFrame=flight||doorMotion||serviceMotion||interacting?now:0;if(flight||doorMotion||serviceMotion)invalidate();else metrics();
}
function resize(){
 if(!renderer)return;renderer.setSize(viewport.clientWidth,viewport.clientHeight,false);camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();
 camera.setViewOffset(viewport.clientWidth,viewport.clientHeight,0,-viewport.clientHeight*.035,viewport.clientWidth,viewport.clientHeight);
 if(controls)controls.maxDistance=Math.max(22,8/camera.aspect);invalidate();
}
function chooseView(value){
 if(!controls)return;document.body.dataset.sceneView=value;state.view=value;
 if(value>=5&&value!==6)setDoor(true);
 const p=preset(value);all('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.view===value)));
 flyTo(p);
}
function flyTo(p){
 if(state.motion&&state.ready){
  const a=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)),b=new THREE.Spherical().setFromVector3(p.eye.clone().sub(p.at));
  b.theta=a.theta+Math.atan2(Math.sin(b.theta-a.theta),Math.cos(b.theta-a.theta));
  flight={a,b,fromAt:controls.target.clone(),at:p.at,start:performance.now()};
 }else{flight=null;camera.position.copy(p.eye);controls.target.copy(p.at);controls.update();}
 invalidate();
}
function splitPaintSurface(mesh,material,region){
 const g=mesh.geometry.clone(),position=g.attributes.position,normal=g.attributes.normal,index=g.index;
 const keep=[],painted=[],v=new THREE.Vector3(),n=new THREE.Vector3(),normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
 for(let i=0;i<(index?index.count:position.count);i+=3){
  const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);v.set(0,0,0);n.set(0,0,0);
  for(const id of ids){v.add(new THREE.Vector3().fromBufferAttribute(position,id));if(normal)n.add(new THREE.Vector3().fromBufferAttribute(normal,id));}
  v.multiplyScalar(1/3).applyMatrix4(mesh.matrixWorld);n.applyMatrix3(normalMatrix).normalize();
  const selected=region==='roof'?v.y>1.30&&v.z> -1.41&&v.z<.33&&Math.abs(v.x)<.64&&n.y>.35:v.y>1.07&&v.z< -2.18&&Math.abs(v.x)<.71;
  (selected?painted:keep).push(...ids);
 }
 if(!painted.length){g.dispose();return material.clone();}
 g.setIndex(keep.concat(painted));g.clearGroups();g.addGroup(0,keep.length,0);g.addGroup(keep.length,painted.length,1);mesh.geometry=g;
 const coating=paint(material);coating.name=material.name+'__'+region;
 stats.surfaceMapping.push({mesh:mesh.name,source:material.name,region,paintedTriangles:painted.length/3,preservedTriangles:keep.length/3});
 return [material.clone(),coating];
}
const syncWheel=setupColorWheel({state,onChange:()=>{$('#color-name').textContent=state.color;all('[data-color]').forEach(n=>n.setAttribute('aria-pressed','false'));update();}});
function update(){
 syncWheel();
 for(const key of ['finish','film'])all('[data-'+key+']').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===state[key])));
 const finishes={gloss:[.17,.42,1],matte:[.72,.08,.02],satin:[.38,.24,.18],chrome:[.065,1,.08]};
 const [r,m,c]=finishes[state.finish];paints.forEach(p=>{p.color.set(state.color);p.roughness=r;p.metalness=m;p.clearcoat=c;p.clearcoatRoughness=.12;});
 uniforms.film.value=['none','clear','matte','color'].indexOf(state.film);uniforms.zone.value=['hood','side','all','roof','rear'].indexOf(state.zone);uniforms.polish.value=state.polish/100;uniforms.polishZone.value=['hood','side','all','roof','rear'].indexOf(state.polishZone);
 $('#polish-value').textContent=state.polish+'%';invalidate();
}
function paint(original){
 const m=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(m,original);
 m.clearcoat=1;m.clearcoatRoughness=.12;m.envMapIntensity=1.1;
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 studioPosition;varying vec3 studioNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nstudioPosition=(modelMatrix*vec4(transformed,1.0)).xyz;studioNormal=normalize(mat3(modelMatrix)*objectNormal);');
  shader.fragmentShader='varying vec3 studioPosition;varying vec3 studioNormal;\nuniform float film;uniform float zone;uniform float polish;uniform float polishing;uniform float polishZone;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float hood=step(.78,studioPosition.z)*step(.82,studioPosition.y)*step(studioPosition.y,1.4)*step(abs(studioPosition.x),.87)*smoothstep(.35,.65,normalize(studioNormal).y);
   float side=step(.82,abs(studioPosition.x))*step(studioPosition.y,1.45)*smoothstep(.35,.65,abs(normalize(studioNormal).x));
   float roof=step(1.30,studioPosition.y)*smoothstep(.35,.65,normalize(studioNormal).y);
   float rear=step(studioPosition.z,-1.65);
   float mask=zone<.5?hood:(zone<1.5?side:(zone<2.5?1.:(zone<3.5?roof:rear)));
   float polishMask=polishZone<.5?hood:(polishZone<1.5?side:(polishZone<2.5?1.:(polishZone<3.5?roof:rear)));
   if(film>.5&&film<1.5)roughnessFactor=mix(roughnessFactor,.11,mask);
   if(film>1.5&&film<2.5)roughnessFactor=mix(roughnessFactor,.66,mask);
   if(film>2.5){diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.32,.22),mask);roughnessFactor=mix(roughnessFactor,.3,mask);}
   if(polishing>.5){
    float done=1.-smoothstep(-1.+polish*2.-.025,-1.+polish*2.+.025,studioPosition.x);
    roughnessFactor=mix(roughnessFactor,mix(.68,.12,done),polishMask);
   }
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
   if(polishing>.5){float cleared=1.-smoothstep(-1.+polish*2.-.025,-1.+polish*2.+.025,studioPosition.x);material.clearcoatRoughness=mix(material.clearcoatRoughness,mix(.65,.10,cleared),polishMask);}
  `);
 };
 m.customProgramCacheKey=()=> 'studio-zones-v4';paints.push(m);return m;
}
function room(){
 const studio=new THREE.Group();scene.add(studio);
 const material=(color,roughness=.72,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const wall=material('#363a3e'),floor=new THREE.MeshPhysicalMaterial({color:'#595a59',roughness:.43,metalness:.12,clearcoat:.25,clearcoatRoughness:.4}),dark=material('#151c24'),metal=material('#7f8994',.32,.7),rubber=material('#14181c');
 const plaster=grainTexture('plaster'),stone=grainTexture('stone');plaster.repeat.set(5,3);stone.repeat.set(12,14);wall.bumpMap=plaster;wall.bumpScale=.025;wall.roughnessMap=plaster;floor.bumpMap=stone;floor.bumpScale=.008;floor.roughnessMap=stone;
 const box=(x,y,z,w,h,d,mat)=>{const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.025,w/5,h/5,d/5)),mat);o.position.set(x,y,z);o.castShadow=h>.05;o.receiveShadow=true;studio.add(o);return o;};
 // Interior-facing planes make the near wall a cutaway when orbiting outside the room.
 const panel=(x,y,z,w,h,angle,mat)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);o.position.set(x,y,z);o.rotation.y=angle;o.receiveShadow=true;studio.add(o);return o;};
 box(0,-.10,0,22,.18,26,floor);
 const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(14,18),dark);ceiling.rotation.x=Math.PI/2;ceiling.position.y=5.9;studio.add(ceiling);
 panel(-7,2.8,0,18,5.6,Math.PI/2,wall);panel(7,2.8,0,18,5.6,-Math.PI/2,wall);
 panel(0,2.8,9,14,5.6,Math.PI,wall);
 // Rear facade with a real open doorway; daylight courtyard is visible beyond it.
 panel(-5,2.8,-9,4,5.6,0,wall);panel(5,2.8,-9,4,5.6,0,wall);panel(0,5,-9,6,1.2,0,wall);
 box(-3.12,2.2,-8.95,.18,4.4,.22,metal);box(3.12,2.2,-8.95,.18,4.4,.22,metal);
 box(0,4.5,-8.95,6.4,.22,.3,metal);
 for(let i=0;i<6;i++)box(0,4.68,-8.6+i*.34,6,.07,.30,material('#5e6872',.45,.4));
 box(0,-.08,-16,17,.12,14,material('#89929a'));panel(0,2.8,-22,24,5.6,0,new THREE.MeshBasicMaterial({color:'#a9bdcd',fog:false}));
 for(const x of [-5,5]){box(x,.5,-12,.6,1,.6,dark);box(x,1.3,-12,.08,1.1,.08,metal);}
 // Large-format concrete tiles and a recessed wash-bay drain.
 const grout=material('#46494a');for(let x=-6;x<=6;x+=2)box(x,.002,0,.005,.005,18,grout);
 for(let z=-8;z<=8;z+=2)box(0,.002,z,14,.005,.005,grout);
 box(0,.006,-5,5,.015,.22,dark);for(let x=-2.4;x<2.5;x+=.12)box(x,.017,-5,.035,.01,.20,metal);
 // Wall panels, service line and vertical inspection lights.
 const led=lampMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(5.8,6,6.3)});
 for(const x of [-6.96,6.96]){const angle=x<0?Math.PI/2:-Math.PI/2;for(let z=-7;z<=7;z+=2){panel(x,2.6,z,1.96,4.7,angle,wall);}panel(x+(x<0?.02:-.02),.5,0,18,.7,angle,dark);}
 for(const x of [-6.8,6.8])for(const z of [-5,0,5]){panel(x,2.6,z,.07,3.5,x<0?Math.PI/2:-Math.PI/2,led);}
 // Suspended rectangular luminaires: dark housings, luminous undersides, suspension rods.
 for(const z of [-3.2,1.2,5.6])for(const x of [-2.65,2.65]){
  for(const dx of [-.96,.96])box(x+dx,5.15,z,.14,.10,2.8,dark);
  for(const dz of [-1.30,1.30])box(x,5.15,z+dz,2.1,.10,.14,dark);
  for(const dx of [-.96,.96])box(x+dx,5.085,z,.065,.022,2.65,led);
  for(const dz of [-1.30,1.30])box(x,5.085,z+dz,1.94,.022,.065,led);
  for(const dz of [-1,1])box(x,5.53,z+dz,.015,.7,.015,metal);
 }
 // Workshop storage with drawers, countertop, bottles and hose reel.
 for(let i=0;i<5;i++){
  box(-6,.55,-4+i*1.0,1.25,1.1,.95,dark);box(-6,1.13,-4+i*1.0,1.35,.06,1,metal);
  for(let y=.25;y<1;y+=.24){box(-5.36,y,-4+i,.025,.20,.88,material('#333d48'));box(-5.33,y+.04,-4+i,.035,.025,.28,metal);}
 }

 const cylinder=(x,y,z,r,h,mat)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;studio.add(o);return o;};
 const tube=(coords,r,mat)=>{const curve=new THREE.CatmullRomCurve3(coords.map(p=>new THREE.Vector3(...p)));const o=new THREE.Mesh(new THREE.TubeGeometry(curve,40,r,8,false),mat);o.castShadow=true;studio.add(o);return o;};
 // Bottles with necks, trigger heads and labels instead of block placeholders.
 const labelMat=material('#d4d7d1');
 for(let i=0;i<6;i++){const z=-3.8+i*.28;const bottleMat=material(i%2?'#49685a':'#63717c',.33,.05);cylinder(-5.85,1.32,z,.065,.32,bottleMat);cylinder(-5.85,1.52,z,.027,.08,dark);cylinder(-5.85,1.33,z,.066,.12,labelMat);box(-5.82,1.57,z,.13,.035,.04,dark);}
 // Hose on its wall reel, with a curved hanging return and brass coupling.
 const reel=new THREE.Mesh(new THREE.CylinderGeometry(.30,.30,.20,32),dark);reel.rotation.z=Math.PI/2;reel.position.set(-6.6,2.1,3);studio.add(reel);
 for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.25+i*.012,.018,8,40),rubber);ring.rotation.y=Math.PI/2;ring.position.set(-6.47,2.1,3);studio.add(ring);}
 tube([[-6.45,2.05,3.25],[-6.35,.8,3.3],[-6.15,.18,3.55],[-5.8,.20,3.8],[-5.7,.65,3.7]],.022,rubber);
 cylinder(-5.7,.70,3.7,.036,.14,material('#947c44',.3,.8));
 // Stainless extractor, hose, castors and trolley with folded microfibres.
 cylinder(5.5,.47,2,.30,.65,metal);cylinder(5.5,.83,2,.32,.12,dark);
 tube([[5.5,.85,2],[5.05,.7,2.4],[4.9,.15,2.3],[5.1,.10,1.5],[5.4,.5,1.35]],.045,rubber);
 for(const x of [5.27,5.73])for(const z of [1.8,2.2])cylinder(x,.10,z,.08,.10,dark);
 box(5,.7,-4,1.0,.045,.65,metal);box(5,.25,-4,1,.045,.65,dark);
 for(const x of [4.56,5.44])for(const z of [-4.27,-3.73]){box(x,.5,z,.025,.85,.025,metal);const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.05,16),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.10,z);studio.add(wheel);}
 for(let i=0;i<3;i++)box(5,.77+i*.035,-4,.42,.035,.32,material(i%2?'#606d79':'#9b8f7b'));
 cylinder(4.73,.88,-4,.06,.3,dark);
 // Service outlets and wall-mounted inspection equipment.
 for(const z of [-3,0,3]){box(-6.91,1.5,z,.05,.16,.12,labelMat);box(-6.87,1.5,z,.015,.075,.055,dark);}
 for(const x of [-3.18,3.18]){box(x,3,-8.72,.07,3,.06,metal);box(x,1.1,-8.72,.12,.25,.10,dark);}
 // Typographic signs are part of the architecture, not floating UI.
 function sign(text,x,y,z,w,h,angle){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#19212a';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#e7edf2';ctx.font='500 94px Arial';ctx.textAlign='center';ctx.fillText(text,512,158);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;panel(x,y,z,w,h,angle,new THREE.MeshBasicMaterial({map:texture}));}
 sign('ТИ / DETAILING',0,5.1,8.96,4.3,.7,Math.PI);sign('01 / SURFACE LAB',-6.92,3.6,0,3.8,.95,Math.PI/2);sign('ENTRY / 01',0,5.05,-8.94,3.2,.7,0);
 scene.add(new THREE.HemisphereLight(0xdde9ff,0x50515a,.85));RectAreaLightUniformsLib.init();
 for(const z of [1.2])for(const x of [-2.65,2.65]){const l=new THREE.RectAreaLight(0xf3f6ff,4,1.94,2.65);l.position.set(x,5.06,z);l.lookAt(x,0,z);scene.add(l);workingLights.push(l);}

 const entrance=new THREE.RectAreaLight(0xc9dfff,5,6,4);entrance.position.set(0,2.2,-8.8);entrance.lookAt(0,1,0);scene.add(entrance);
 const key=new THREE.DirectionalLight(0xfff5e9,1.8);key.position.set(3.5,4.5,4);key.castShadow=true;key.shadow.mapSize.setScalar(stats.tier==='mobile'?1024:2048);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:25});key.shadow.bias=-.0002;key.shadow.normalBias=.02;key.shadow.radius=4;scene.add(key);
 updateEnvironment();
 const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),g=cx.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'rgba(8,12,18,.65)');g.addColorStop(.6,'rgba(8,12,18,.35)');g.addColorStop(1,'rgba(8,12,18,0)');cx.fillStyle=g;cx.fillRect(0,0,128,128);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.9,6.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;scene.add(shadow);
 stats.shadows=true;stats.room='architectural bay / open sectional gate / inspection lights / cabinetry';
}
async function boot(){
 try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
 stats.softwareRenderer=!!debug&&/SwiftShader|llvmpipe|software|Microsoft Basic Render/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
 renderer.setPixelRatio(Math.min(devicePixelRatio,stats.softwareRenderer?.5:stats.tier==='mobile'?1:1.25));stats.pixelRatio=renderer.getPixelRatio();
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 scene=new THREE.Scene();scene.background=new THREE.Color('#20252c');scene.fog=new THREE.Fog('#20252c',18,40);
 camera=new THREE.PerspectiveCamera(36,1,.1,70);setupControls();room();resize();
 status.textContent='Загрузка экстерьера…';
 const url=stats.tier==='mobile'?new URL('../../assets/amg_driver_cabin_mobile_v3.glb',import.meta.url):new URL('../../assets/amg_driver_cabin_desktop_v3.glb',import.meta.url);
 const start=performance.now(),response=await fetch(url);if(!response.ok)throw new Error('HTTP '+response.status);
 const buffer=await response.arrayBuffer();stats.downloadMs=+(performance.now()-start).toFixed(1);stats.bytes=buffer.byteLength;
 status.textContent='Декодирование геометрии…';const decode=performance.now();
 const gltf=await new GLTFLoader().parseAsync(buffer,url.href);stats.decodeMs=+(performance.now()-decode).toFixed(1);
 model=gltf.scene;
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.scale.multiplyScalar(5.15/Math.max(size.x,size.z));
 box.setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y-=box.min.y;
 model.updateMatrixWorld(true);stats.originalPaintMaps=[];stats.surfaceMapping=[];
 model.traverse(n=>{if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=n.name.startsWith('cabin__');
 if(n.name==='exterior__Black_gloss'||n.name==='exterior__Gray_line'){n.material=splitPaintSurface(n,n.material,'roof');return;}
 if(n.name==='exterior__Carbon_Fiber_Glossy'){n.material=splitPaintSurface(n,n.material,'spoiler');return;}
 const cabin=n.name.startsWith('cabin__');
 const transform=m=>{
  if((cabin||n.name.startsWith('door__'))&&/^(Leather_Black|Leather_Perforated|Alcantara_Black)$/.test(m.name)){m=detailCabin(n,m,textures);m.userData.baseColor=m.color.clone();m.userData.baseRoughness=m.roughness;leathers.push(m);return m;}
  if((cabin||n.name.startsWith('door__'))&&/Matte_Plastic_Interior|Satin_Interior|Carbon_Fiber_Interior|Stitch|Dash|Display|Steering_wheel/.test(m.name)){m=detailCabin(n,m,textures);if(/Plastic|Dash/.test(m.name))plastics.push(m);return m;}
  if(cabin&&m.name!=='Glass')return detailCabin(n,m,textures);
  if(/^(Carpaint|Satin_Metallic_(Blue|Dark|Black)|Blue_plastic)$/i.test(m.name)){stats.originalPaintMaps.push({name:m.name,map:!!m.map});return paint(m);}
  m=m.clone();
  if(/^(Chrome|Chrome_2|Aluminum)$/.test(m.name)){m.userData.original=m.color.clone();chromes.push(m);}
  if(/^(Glass|Rear_glass)$/i.test(m.name)){m.color.set('#152025');m.transparent=false;m.opacity=1;m.depthWrite=true;m.metalness=.3;m.roughness=.16;windows.push(m);}
  if(/^Headlight_glass$/i.test(m.name)){m.transparent=true;m.opacity=.12;m.depthWrite=false;m.roughness=.08;}
  if(/^Front_DRL$/i.test(m.name)){m.emissive.set('#ffffff');m.emissiveIntensity=1.4;}
  return m;
 };
 n.material=Array.isArray(n.material)?n.material.map(transform):transform(n.material);
 });
 scene.add(model);renderer.shadowMap.needsUpdate=true;door=model.getObjectByName('driverDoor');doorRest=door?.quaternion.clone();stats.doorRig=!!door;stats.cabinMaterials=leathers.length;
 ambience.inverse.value.copy(model.matrixWorld).invert();ambient=new THREE.Group();model.add(ambient);
 for(const x of [-.25,.25]){const light=new THREE.PointLight(state.ambientColor,.25,.8,2);light.position.set(x,.38,.22);ambient.add(light);}ambient.visible=false;
 model.traverse(n=>{if(!n.isMesh||!(n.name.startsWith('cabin__')||n.name.startsWith('door__')))return;
 for(const m of Array.isArray(n.material)?n.material:[n.material]){if(!/Leather|Satin_Interior|Matte_Plastic|Dash/.test(m.name))continue;
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{ambienceActive:ambience.active,ambienceColor:ambience.color,ambiencePower:ambience.power,interiorInverse:ambience.inverse});
  shader.vertexShader='varying vec3 cabinPosition;uniform mat4 interiorInverse;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ncabinPosition=(interiorInverse*modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader='varying vec3 cabinPosition;uniform float ambienceActive;uniform float ambiencePower;uniform vec3 ambienceColor;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float dash=step(.34,cabinPosition.z)*step(cabinPosition.z,.54)*step(abs(cabinPosition.x),.48);
   float doorBand=step(.455,abs(cabinPosition.x))*step(-.5,cabinPosition.z)*step(cabinPosition.z,.36);
   float dashHeight=.593+.045*abs(cabinPosition.x);
   float doorHeight=.555+.07*cabinPosition.z;
   float diffuser=dash*(1.-smoothstep(.0015,.004,abs(cabinPosition.y-dashHeight)))+doorBand*(1.-smoothstep(.0015,.004,abs(cabinPosition.y-doorHeight)));
   float bounce=dash*exp(-abs(cabinPosition.y-dashHeight)*65.)+doorBand*exp(-abs(cabinPosition.y-doorHeight)*65.);
   totalEmissiveRadiance+=ambienceColor*ambienceActive*ambiencePower*(diffuser*2.8+bounce*.15);
  `);
 };m.customProgramCacheKey=()=> 'cabin-diffuser-v1';}
 });
 const cabinLight=new THREE.PointLight(0xe6efff,.65,3,2);cabinLight.position.set(0,1.6,0);scene.add(cabinLight);
 window.__STUDIO.surfaceAt=(x,z)=>{const hits=new THREE.Raycaster(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0)).intersectObject(model,true);const h=hits[0];if(!h)return null;const m=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material;return {mesh:h.object.name,material:m.name,color:m.color.getHexString(),painted:paints.includes(m),point:h.point.toArray()};};
 window.__STUDIO.samplePixels=()=>{renderer.render(scene,camera);const gl=renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const sampled=[];for(let i=0;i<pixels.length;i+=128)sampled.push(pixels[i],pixels[i+1],pixels[i+2]);return sampled;};
 window.__STUDIO.projectedBounds=()=>{camera.updateMatrixWorld();const b=new THREE.Box3().setFromObject(model);return [b.min.x,b.max.x].flatMap(x=>[b.min.y,b.max.y].flatMap(y=>[b.min.z,b.max.z].map(z=>new THREE.Vector3(x,y,z).project(camera).toArray())));};
 serviceEffects=createServiceEffects({scene,model,paints,invalidate,inspectionLight:workingLights[0],setDoorFraction:value=>{doorMotion=null;doorProgress=value;state.doorOpen=value>0;$('#door-toggle').setAttribute('aria-pressed',String(state.doorOpen));$('#door-toggle').textContent=state.doorOpen?'Закрыть водительскую дверь':'Открыть водительскую дверь';door?.quaternion.copy(doorRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-62*Math.PI/180*value));renderer.shadowMap.needsUpdate=true;},setAmbientFraction:value=>{ambience.active.value=value;ambient.visible=value>0;}});
 update();positionCamera();addStudioPosters(renderer,scene,model);stats.posters=3;updateEnvironment();
 status.textContent='Подготовка первого кадра…';const compile=performance.now();await renderer.compileAsync(scene,camera);stats.shaderCompileMs=+(performance.now()-compile).toFixed(1);
 const first=performance.now();renderer.render(scene,camera);stats.firstRenderSubmitMs=+(performance.now()-first).toFixed(1);stats.triangles=renderer.info.render.triangles;
 state.ready=true;$('#economy').disabled=false;$('#poster').hidden=true;$('#controls').disabled=false;all('[data-view]').forEach(b=>b.disabled=false);status.textContent='MERCEDES-AMG GT 63 S · 3D';document.body.dataset.ready='true';metrics();invalidate();
 }catch(e){console.error('Studio:',e);fallback('3D недоступно · показано статичное изображение');}
}
all('[data-color]').forEach(b=>b.onclick=()=>{state.color=b.dataset.color;$('#color-name').textContent=b.dataset.name;all('[data-color]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();});
for(const key of ['finish','film'])all('[data-'+key+']').forEach(b=>b.onclick=()=>{state[key]=b.dataset[key];if(key==='film'&&state.film!=='none'){chooseView(({side:1,hood:2,roof:4,rear:3,all:0})[state.zone]);uniforms.polishing.value=0;}if(key==='finish')uniforms.polishing.value=0;all('[data-'+key+']').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();});
$('#zone').onchange=e=>{state.zone=e.target.value;chooseView(({side:1,hood:2,roof:4,rear:3,all:0})[state.zone]);uniforms.polishing.value=0;update();};
const zoneView=z=>({hood:2,side:1,roof:4,rear:3,all:0}[z]);
$('#polish-zone').onchange=e=>{state.polishZone=e.target.value;uniforms.polishing.value=1;chooseView(zoneView(state.polishZone));update();};
$('#polish').oninput=e=>{state.polish=+e.target.value;uniforms.polishing.value=1;update();};

all('[data-view]').forEach(b=>b.onclick=()=>chooseView(+b.dataset.view));
$('#reset').onclick=()=>{exitDemo();state.service=null;serviceOptions(true);$('#service-title').textContent='28 услуг ТИ';$('#service-lead').textContent='Выберите услугу для сравнения до / после.';$('#service-mode').textContent='';chromes.forEach(m=>m.color.copy(m.userData.original));windows.forEach(m=>m.color.set('#152025'));setDoor(false);setCabin(null);uniforms.polishing.value=0;$('#polish-zone').value=state.polishZone='all';all('[data-color]')[0].click();all('[data-finish]')[0].click();all('[data-film]')[0].click();$('#zone').value=state.zone='hood';$('#polish').value=state.polish=0;chooseView(0);update();};

function setDoor(open){
 if(!door)return;if(state.doorOpen===open&&(doorMotion||doorProgress===(open?1:0)))return;if(!state.motion)renderer.shadowMap.needsUpdate=true;state.doorOpen=open;$('#door-toggle').setAttribute('aria-pressed',String(open));$('#door-toggle').textContent=open?'Закрыть водительскую дверь':'Открыть водительскую дверь';
 if(state.motion){doorMotion={from:doorProgress,to:open?1:0,start:performance.now(),duration:open?1150:1350,elapsed:0,last:performance.now()};}else{doorMotion=null;doorProgress=open?1:0;door.quaternion.copy(doorRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-62*Math.PI/180*doorProgress));}invalidate();
}
function setCabin(service){
 state.cabin=service;const text={clean:'Химчистка: сиденья, ковролин и обивка. Выделена зона работ; результат чистки зависит от состояния материала.',leather:'Уход за кожей: очистка и защитный состав. Показан более мягкий матовый финиш сидений.',trim:'Перетяжка: примерка цвета кожаных поверхностей. Выберите оттенок ниже.',ambient:'Встроенные световые полосы панели и дверных карт, отражённый свет и подсветка ног. Выберите цвет и яркость.',plastic:'Восстановление пластика: показана зона отделки панели и дверей. Технология зависит от повреждения.',steering:'Перешив руля: показана зона работ. Материал и рисунок строчки подбираются индивидуально.',sound:'Шумоизоляция: двери, пол и арки. Скрытые слои под обивкой здесь не моделируются.'};
 $('#cabin-description').textContent=text[service]||'Откройте дверь и рассмотрите доступные услуги салона.';
 leathers.forEach(m=>{m.color.copy(m.userData.baseColor);m.roughness=m.userData.baseRoughness;m.emissive.set(0);if(service==='trim')m.color.set(state.leather);if(service==='leather')m.roughness=.65;});
 ambience.active.value=service==='ambient'?1:0;if(ambient)ambient.visible=service==='ambient';plastics.forEach(m=>{m.emissive.set('#000000');});all('[data-cabin]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cabin===service)));if(service)chooseView(service==='steering'?7:['leather','trim','clean'].includes(service)?8:5);invalidate();
}
$('#door-toggle').onclick=()=>{setDoor(!state.doorOpen);if(state.doorOpen)chooseView(1);else if(state.view===5)chooseView(0);};
all('[data-cabin]').forEach(b=>b.onclick=()=>{const slug={clean:'interior-clean',leather:'leather',trim:'interior-trim',plastic:'plastic',steering:'steering',sound:'soundproof',ambient:'ambient'}[b.dataset.cabin];showService(slug);setComparison(1);});
$('#leather-color').onchange=e=>{state.leather=e.target.value;exitDemo();state.service=null;setCabin('trim');};
$('#ambient-color').onchange=e=>{if(state.service!=='ambient'){showService('ambient');setComparison(1);}state.ambientColor=e.target.value;ambience.color.value.set(state.ambientColor);ambient?.children.forEach(l=>l.color.set(state.ambientColor));setCabin('ambient');};
$('#ambient-power').oninput=e=>{if(state.service!=='ambient'){showService('ambient');setComparison(1);}state.ambientPower=+e.target.value;ambience.power.value=state.ambientPower/100;ambient?.children.forEach(l=>l.intensity=.35*state.ambientPower/100);setCabin('ambient');};
$('#exterior').onclick=()=>{exitDemo();state.service=null;setCabin(null);setDoor(false);chooseView(0);};


const cabinServices={'interior-clean':'clean',leather:'leather',plastic:'plastic',steering:'steering','interior-trim':'trim',soundproof:'sound',ambient:'ambient'};
function setComparison(value){
 if(!serviceEffects||!state.service)return;serviceEffects.apply(value);$('#demo-range').value=Math.round(value*100);$('#demo-percent').textContent=Math.round(value*100)+'%';
 $('#demo-before').setAttribute('aria-pressed',String(value===0));$('#demo-after').setAttribute('aria-pressed',String(value===1));
 $('#demo-caption').textContent=value===0?demonstrations[state.service].before:value===1?demonstrations[state.service].after:'Сравнение · '+Math.round(value*100)+'%';
}
function exitDemo(){serviceMotion=null;serviceEffects?.clear();document.body.classList.remove('service-active');$('#demo-overlay').hidden=true;}
function focusService(slug){
 const d=demonstrations[slug],at=new THREE.Vector3(...d.focus),eye=new THREE.Vector3(...d.eye);
 if(innerWidth<801)eye.sub(at).multiplyScalar(cabinServices[slug] ? .9 : .70).add(at);
 state.view='service';all('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));flyTo({eye,at});
}
function showService(slug){
 if(!state.ready)return;const item=services[slug];serviceMotion=null;serviceEffects.clear();state.service=slug;state.film='none';uniforms.polishing.value=0;
 $('#service-direction').value=item.direction;serviceOptions();$('#service-choice').value=slug;
 $('#service-title').textContent=item.title;$('#service-lead').textContent=item.lead;$('#service-link').href='../../service.html?service='+encodeURIComponent(slug);
 chromes.forEach(m=>m.color.copy(m.userData.original));windows.forEach(m=>m.color.set('#152025'));
 setCabin(cabinServices[slug]||null);if(slug==='interior-trim')leathers.forEach(m=>m.color.copy(m.userData.baseColor));setDoor(!!cabinServices[slug]);
 const d=serviceEffects.select(slug);$('#service-mode').textContent=d.note;
 $('#demo-title').textContent=item.title;$('#demo-overlay').hidden=false;document.body.classList.add('service-active');$('#demo-play').textContent='Показать результат';setComparison(0);focusService(slug);update();
}
$('#demo-range').oninput=e=>{serviceMotion=null;setComparison(+e.target.value/100);$('#demo-play').textContent='Показать результат';};
for(const [id,value] of [['demo-before',0],['demo-after',1]])$('#'+id).onclick=()=>{serviceMotion=null;setComparison(value);};
$('#demo-play').onclick=()=>{if(!state.service)return;if(serviceMotion){serviceMotion=null;$('#demo-play').textContent='Продолжить';return;}if(!state.motion){setComparison(1);return;}setComparison(0);serviceMotion={elapsed:0,last:performance.now()};$('#demo-play').textContent='Пауза';invalidate();};
$('#demo-focus').onclick=()=>{if(state.service)focusService(state.service);};
$('#demo-close').onclick=()=>{exitDemo();state.service=null;setCabin(null);setDoor(false);chooseView(0);};
function serviceOptions(empty=false){const direction=$('#service-direction').value;$('#service-choice').replaceChildren(...Object.entries(services).filter(([,s])=>s.direction===direction).map(([id,s])=>new Option(s.title,id)));if(empty){const option=new Option('Выберите услугу…','',true,true);option.disabled=true;$('#service-choice').prepend(option);$('#service-choice').value='';}}
$('#service-direction').onchange=()=>{serviceOptions();showService($('#service-choice').value);};$('#service-choice').onchange=e=>showService(e.target.value);serviceOptions(true);
$('#service-title').textContent='28 услуг ТИ';$('#service-lead').textContent='Выберите направление и услугу из каталога существующего сайта.';$('#service-mode').textContent='Для каждой услуги: крупный план и сравнение до / после. Скрытые узлы показаны схемами.';


function updateEnvironment(){
 const restore=model?.visible,demoVisible=serviceEffects?.group.visible;if(model)model.visible=false;if(serviceEffects)serviceEffects.group.visible=false;
 cubeTarget??=new THREE.WebGLCubeRenderTarget(stats.tier==='mobile'?128:256,{type:THREE.HalfFloatType});
 const capture=new THREE.CubeCamera(.1,60,cubeTarget);capture.position.set(0,.85,0);capture.update(renderer,scene);
 const pmrem=new THREE.PMREMGenerator(renderer),next=pmrem.fromCubemap(cubeTarget.texture);pmrem.dispose();environmentTarget?.dispose();environmentTarget=next;scene.environment=next.texture;
 if(model)model.visible=restore;if(serviceEffects)serviceEffects.group.visible=demoVisible;stats.reflectionCaptures=(stats.reflectionCaptures||0)+1;stats.reflectionOrigin=[0,.85,0];
}
function setStudioLight(mode){
 if(!state.ready)return;state.lighting=mode;const factor=mode==='inspection'?1:.18;
 lampMaterial.color.setRGB(5.8*factor,6*factor,6.3*factor);
 workingLights.forEach((l,i)=>l.intensity=(i<6?4:3)*factor);serviceEffects?.setLightMode(mode);
 all('[data-light]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.light===mode)));
 updateEnvironment();renderer.shadowMap.needsUpdate=true;invalidate();
}
all('[data-light]').forEach(b=>b.onclick=()=>setStudioLight(b.dataset.light));
for(const [key,title] of [['preserve','Сохранить'],['restore','Восстановить'],['tune','Тюнинг']]){
 const article=document.createElement('article');article.className='service-card';const heading=document.createElement('h3');heading.textContent=title;article.append(heading);
 for(const [id,service] of Object.entries(services).filter(([,s])=>s.direction===key)){const a=document.createElement('a');a.href='../../service.html?service='+encodeURIComponent(id);a.textContent=service.title;a.onclick=e=>{if(!state.ready)return;e.preventDefault();showService(id);$('#journey').scrollIntoView({behavior:'instant'});};article.append(a);}$('#service-cards').append(article);
}

function motionUI(){$('#motion').setAttribute('aria-pressed',String(state.motion));$('#motion').textContent='Плавные переходы: '+(state.motion?'вкл.':'выкл.');$('#scroll-hint').textContent=innerWidth>800?'Потяните, чтобы вращать · колесо — масштаб':'Вращайте пальцем · два пальца — масштаб';}
$('#economy').onclick=()=>{if(!renderer||!state.ready)return;const enabled=$('#economy').getAttribute('aria-pressed')!=='true';$('#economy').setAttribute('aria-pressed',String(enabled));$('#economy').textContent='Лёгкий режим: '+(enabled?'вкл.':'выкл.');renderer.setPixelRatio(Math.min(devicePixelRatio,enabled?.5:stats.softwareRenderer?.5:stats.tier==='mobile'?1:1.25));stats.pixelRatio=renderer.getPixelRatio();slow=0;invalidate();};
$('#motion').onclick=()=>{state.motion=!state.motion;motionUI();if(!state.motion&&serviceMotion){serviceMotion=null;setComparison(1);}if(!state.motion&&flight){camera.position.setFromSpherical(flight.b).add(flight.at);controls.target.copy(flight.at);controls.update();flight=null;}invalidate();};
reduced.addEventListener('change',e=>{state.motion=!e.matches;motionUI();if(e.matches&&serviceMotion){serviceMotion=null;setComparison(1);}if(e.matches&&flight){const value=state.view;flight=null;if(value==='service')focusService(state.service);else chooseView(value);}invalidate();});
new ResizeObserver(()=>{resize();motionUI();}).observe(viewport);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)invalidate();}).observe(viewport);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)invalidate();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('3D остановлено · обновите страницу для повторной загрузки');});
motionUI();requestAnimationFrame(()=>requestAnimationFrame(boot));
