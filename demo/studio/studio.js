import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={ready:false,color:'#62747e',finish:'gloss',film:'none',zone:'hood',polish:0,view:0,motion:!reduced.matches,polishZone:'all',doorOpen:false,cabin:null,leather:'#24252a'};
const stats={tier:innerWidth<801||navigator.connection?.saveData?'mobile':'desktop',frames:0,adaptive:false};
const uniforms={film:{value:0},zone:{value:0},polish:{value:0},polishing:{value:0},polishZone:{value:2}};
let renderer,scene,camera,model,controls,flight=null,interacting=false,raf=0,visible=true,lastFrame=0,slow=0;
const paints=[],leathers=[];let door,doorRest,doorMotion=null,doorProgress=0,ambient;
const viewport=$('#viewport'),canvas=$('canvas'),status=$('#status');
window.__STUDIO={state,stats,get moving(){return !!flight||!!doorMotion},get doorProgress(){return doorProgress},get cabinMaterials(){return leathers.map(m=>({name:m.name,color:m.color.getHexString(),roughness:m.roughness}))},get camera(){return camera?.position.toArray()},get materials(){return paints.map(m=>({name:m.name,color:m.color.getHexString(),map:!!m.map,roughness:m.roughness,metalness:m.metalness}))}};
all('[data-view]').forEach(b=>b.disabled=true);
function fallback(message){state.ready=false;cancelAnimationFrame(raf);raf=0;document.body.classList.add('fallback');$('#poster').hidden=false;canvas.hidden=true;$('#controls').disabled=true;all('[data-view]').forEach(b=>b.disabled=true);$('#motion').disabled=true;status.textContent=message;$('#scroll-hint').textContent='';stats.error=message;metrics();}
function metrics(){$('#metrics').textContent=JSON.stringify(stats,null,2);}
function invalidate(){if(!raf&&visible&&!document.hidden&&renderer&&state.ready)raf=requestAnimationFrame(render);}
const points=[
 {eye:[6.3,3.2,7.8],at:[0,.75,0]},
 {eye:[8.4,2.6,.3],at:[0,.7,0]},
 {eye:[3.5,5.5,6],at:[0,.9,.45]},
 {eye:[-6.2,3.2,-7.8],at:[0,.75,0]},
 {eye:[.1,12.8,-1],at:[0,.7,0]},
 {eye:[3.6,1.85,-1.4],at:[.20,.85,.15]},
 {eye:[10,7,14],at:[0,2,0]}
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
 if(value===5&&innerWidth<801)eye.sub(at).multiplyScalar(1.45).add(at);
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
 raf=0;if(!visible||document.hidden||!state.ready)return;
 if(flight){
  const f=flight,t=Math.min(1,(now-f.start)/700),e=t*t*(3-2*t);
  controls.target.lerpVectors(f.fromAt,f.at,e);
  const a=new THREE.Spherical(THREE.MathUtils.lerp(f.a.radius,f.b.radius,e),THREE.MathUtils.lerp(f.a.phi,f.b.phi,e),THREE.MathUtils.lerp(f.a.theta,f.b.theta,e));
  camera.position.setFromSpherical(a).add(controls.target);controls.update();
  if(t===1)flight=null;
 }
 if(doorMotion){const t=Math.min(1,(now-doorMotion.start)/700),e=t*t*(3-2*t);doorProgress=THREE.MathUtils.lerp(doorMotion.from,doorMotion.to,e);door.quaternion.copy(doorRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-62*Math.PI/180*doorProgress));if(t===1)doorMotion=null;}
 const begin=performance.now();renderer.render(scene,camera);stats.lastRenderSubmitMs=+(performance.now()-begin).toFixed(2);stats.frames++;
 if((flight||interacting)&&lastFrame&&now-lastFrame>40&&now-lastFrame<300){slow++;if(slow>8&&!stats.adaptive){renderer.setPixelRatio(Math.max(.75,renderer.getPixelRatio()*.7));stats.adaptive=true;stats.pixelRatio=renderer.getPixelRatio();}}
 lastFrame=flight||interacting?now:0;if(flight||doorMotion)invalidate();else metrics();
}
function resize(){
 if(!renderer)return;renderer.setSize(viewport.clientWidth,viewport.clientHeight,false);camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();
 camera.setViewOffset(viewport.clientWidth,viewport.clientHeight,0,-viewport.clientHeight*.035,viewport.clientWidth,viewport.clientHeight);
 if(controls)controls.maxDistance=Math.max(22,8/camera.aspect);invalidate();
}
function chooseView(value){
 if(!controls)return;document.body.dataset.sceneView=value;state.view=value;
 if(value===5)setDoor(true);
 const p=preset(value);all('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.view===value)));
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
function update(){
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
 const wall=material('#454a50'),floor=material('#363b41'),dark=material('#151c24'),metal=material('#7f8994',.32,.7),rubber=material('#14181c');
 const box=(x,y,z,w,h,d,mat)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);studio.add(o);return o;};
 // Interior-facing planes make the near wall a cutaway when orbiting outside the room.
 const panel=(x,y,z,w,h,angle,mat)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);o.position.set(x,y,z);o.rotation.y=angle;studio.add(o);return o;};
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
 const grout=material('#242b32');for(let x=-6;x<=6;x+=2)box(x,.002,0,.014,.005,18,grout);
 for(let z=-8;z<=8;z+=2)box(0,.002,z,14,.005,.014,grout);
 box(0,.006,-5,5,.015,.22,dark);for(let x=-2.4;x<2.5;x+=.12)box(x,.017,-5,.035,.01,.20,metal);
 // Wall panels, service line and vertical inspection lights.
 const led=new THREE.MeshBasicMaterial({color:new THREE.Color(3.2,3.3,3.5)}),warm=new THREE.MeshBasicMaterial({color:new THREE.Color(2.4,1.8,1.15)});
 for(const x of [-6.96,6.96]){const angle=x<0?Math.PI/2:-Math.PI/2;for(let z=-7;z<=7;z+=2){panel(x,2.6,z,1.96,4.7,angle,material(z%4===0?'#343b44':'#3e454e'));}panel(x+(x<0?.02:-.02),.5,0,18,.7,angle,dark);}
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
 for(let i=0;i<6;i++){box(-5.85,1.32,-3.8+i*.28,.13,.32,.13,material(i%2?'#789083':'#a0aaba'));box(-5.85,1.52,-3.8+i*.28,.07,.08,.07,dark);}
 const reel=new THREE.Mesh(new THREE.TorusGeometry(.34,.075,8,32),rubber);reel.rotation.y=Math.PI/2;reel.position.set(-6.65,2.1,3);studio.add(reel);
 // Mobile detailing cart and vacuum, kept outside the car orbit.
 box(5,.7,-4,1.0,.10,.65,metal);box(5,.25,-4,1,.10,.65,dark);
 for(const x of [4.56,5.44])for(const z of [-4.27,-3.73]){box(x,.5,z,.035,.85,.035,metal);const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.06,12),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.10,z);studio.add(wheel);}
 box(5,.88,-4,.4,.25,.3,material('#8c795f'));box(5.6,.45,2,.55,.8,.55,metal);
 // Typographic signs are part of the architecture, not floating UI.
 function sign(text,x,y,z,w,h,angle){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#19212a';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#e7edf2';ctx.font='500 94px Arial';ctx.textAlign='center';ctx.fillText(text,512,158);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;panel(x,y,z,w,h,angle,new THREE.MeshBasicMaterial({map:texture}));}
 sign('ТИ / DETAILING',0,3.5,8.96,6,1.5,Math.PI);sign('01 / SURFACE LAB',-6.92,3.6,0,3.8,.95,Math.PI/2);sign('ENTRY / 01',0,5.05,-8.94,3.2,.7,0);
 scene.add(new THREE.HemisphereLight(0xdde9ff,0x687483,1.65));RectAreaLightUniformsLib.init();
 for(const x of [-3.4,3.4]){const l=new THREE.RectAreaLight(0xffffff,7,2.4,6);l.position.set(x,4.6,.4);l.lookAt(0,.5,0);scene.add(l);}
 const entrance=new THREE.RectAreaLight(0xc9dfff,5,6,4);entrance.position.set(0,2.2,-8.8);entrance.lookAt(0,1,0);scene.add(entrance);
 const key=new THREE.DirectionalLight(0xfff5e9,1.8);key.position.set(4,6,6);scene.add(key);
 const env=new THREE.PMREMGenerator(renderer);scene.environment=env.fromScene(scene,.06,.1,60).texture;env.dispose();
 const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),g=cx.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'rgba(8,12,18,.65)');g.addColorStop(.6,'rgba(8,12,18,.35)');g.addColorStop(1,'rgba(8,12,18,0)');cx.fillStyle=g;cx.fillRect(0,0,128,128);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.9,6.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;scene.add(shadow);
 stats.room='architectural bay / open sectional gate / inspection lights / cabinetry';
}
async function boot(){
 try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,stats.tier==='mobile'?1.25:1.5));stats.pixelRatio=renderer.getPixelRatio();
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
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
 model.traverse(n=>{if(!n.isMesh)return;
 if(n.name==='exterior__Black_gloss'||n.name==='exterior__Gray_line'){n.material=splitPaintSurface(n,n.material,'roof');return;}
 if(n.name==='exterior__Carbon_Fiber_Glossy'){n.material=splitPaintSurface(n,n.material,'spoiler');return;}
 const cabin=n.name.startsWith('cabin__');
 const transform=m=>{
  if((cabin||n.name.startsWith('door__'))&&/^(Leather_Black|Leather_Perforated|Alcantara_Black)$/.test(m.name)){m=m.clone();m.userData.baseColor=m.color.clone();m.userData.baseRoughness=m.roughness;leathers.push(m);return m;}
  if(cabin&&m.name!=='Glass')return m.clone();
  if(/^(Carpaint|Satin_Metallic_(Blue|Dark|Black)|Blue_plastic)$/i.test(m.name)){stats.originalPaintMaps.push({name:m.name,map:!!m.map});return paint(m);}
  m=m.clone();
  if(/^(Glass|Rear_glass)$/i.test(m.name)){m.color.set('#152025');m.transparent=false;m.opacity=1;m.depthWrite=true;m.metalness=.3;m.roughness=.16;}
  if(/^Headlight_glass$/i.test(m.name)){m.transparent=true;m.opacity=.12;m.depthWrite=false;m.roughness=.08;}
  if(/^Front_DRL$/i.test(m.name)){m.emissive.set('#ffffff');m.emissiveIntensity=1.4;}
  return m;
 };
 n.material=Array.isArray(n.material)?n.material.map(transform):transform(n.material);
 });
 scene.add(model);door=model.getObjectByName('driverDoor');doorRest=door?.quaternion.clone();stats.doorRig=!!door;stats.cabinMaterials=leathers.length;
 ambient=new THREE.Group();const glow=new THREE.MeshBasicMaterial({color:0x65b9ff});for(const x of [-.42,.42]){const strip=new THREE.Mesh(new THREE.BoxGeometry(.012,.012,.65),glow);strip.position.set(x,.60,.04);ambient.add(strip);}model.add(ambient);ambient.visible=false;
 const cabinLight=new THREE.PointLight(0xe6efff,2.5,3,2);cabinLight.position.set(0,1.6,0);scene.add(cabinLight);
 window.__STUDIO.surfaceAt=(x,z)=>{const hits=new THREE.Raycaster(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0)).intersectObject(model,true);const h=hits[0];if(!h)return null;const m=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material;return {mesh:h.object.name,material:m.name,color:m.color.getHexString(),painted:paints.includes(m),point:h.point.toArray()};};
 window.__STUDIO.projectedBounds=()=>{camera.updateMatrixWorld();const b=new THREE.Box3().setFromObject(model);return [b.min.x,b.max.x].flatMap(x=>[b.min.y,b.max.y].flatMap(y=>[b.min.z,b.max.z].map(z=>new THREE.Vector3(x,y,z).project(camera).toArray())));};
 update();positionCamera();
 status.textContent='Подготовка первого кадра…';const compile=performance.now();await renderer.compileAsync(scene,camera);stats.shaderCompileMs=+(performance.now()-compile).toFixed(1);
 const first=performance.now();renderer.render(scene,camera);stats.firstRenderSubmitMs=+(performance.now()-first).toFixed(1);stats.triangles=renderer.info.render.triangles;
 state.ready=true;$('#poster').hidden=true;$('#controls').disabled=false;all('[data-view]').forEach(b=>b.disabled=false);status.textContent='MERCEDES-AMG GT 63 S · 3D';document.body.dataset.ready='true';metrics();invalidate();
 }catch(e){console.error('Studio:',e);fallback('3D недоступно · показано статичное изображение');}
}
all('[data-color]').forEach(b=>b.onclick=()=>{state.color=b.dataset.color;$('#color-name').textContent=b.dataset.name;all('[data-color]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();});
for(const key of ['finish','film'])all('[data-'+key+']').forEach(b=>b.onclick=()=>{state[key]=b.dataset[key];if(key==='film'&&state.film!=='none'){chooseView(({side:1,hood:2,roof:4,rear:3,all:0})[state.zone]);uniforms.polishing.value=0;}if(key==='finish')uniforms.polishing.value=0;all('[data-'+key+']').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();});
$('#zone').onchange=e=>{state.zone=e.target.value;chooseView(({side:1,hood:2,roof:4,rear:3,all:0})[state.zone]);uniforms.polishing.value=0;update();};
const zoneView=z=>({hood:2,side:1,roof:4,rear:3,all:0}[z]);
$('#polish-zone').onchange=e=>{state.polishZone=e.target.value;uniforms.polishing.value=1;chooseView(zoneView(state.polishZone));update();};
$('#polish').oninput=e=>{state.polish=+e.target.value;uniforms.polishing.value=1;update();};
$('#custom-color').oninput=e=>{state.color=e.target.value;$('#color-name').textContent=state.color;all('[data-color]').forEach(n=>n.setAttribute('aria-pressed','false'));update();};
all('[data-view]').forEach(b=>b.onclick=()=>chooseView(+b.dataset.view));
$('#reset').onclick=()=>{setDoor(false);setCabin(null);uniforms.polishing.value=0;$('#polish-zone').value=state.polishZone='all';all('[data-color]')[0].click();all('[data-finish]')[0].click();all('[data-film]')[0].click();$('#zone').value=state.zone='hood';$('#polish').value=state.polish=0;chooseView(0);update();};

function setDoor(open){
 if(!door)return;state.doorOpen=open;$('#door-toggle').setAttribute('aria-pressed',String(open));$('#door-toggle').textContent=open?'Закрыть водительскую дверь':'Открыть водительскую дверь';
 if(state.motion){doorMotion={from:doorProgress,to:open?1:0,start:performance.now()};}else{doorMotion=null;doorProgress=open?1:0;door.quaternion.copy(doorRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-62*Math.PI/180*doorProgress));}invalidate();
}
function setCabin(service){
 state.cabin=service;const text={clean:'Химчистка: сиденья, ковролин и обивка. Выделена зона работ; результат чистки зависит от состояния материала.',leather:'Уход за кожей: очистка и защитный состав. Показан более мягкий матовый финиш сидений.',trim:'Перетяжка: примерка цвета кожаных поверхностей. Выберите оттенок ниже.',ambient:'Контурная подсветка: эскиз расположения световых линий в салоне.'};
 $('#cabin-description').textContent=text[service]||'Откройте дверь и рассмотрите доступные услуги салона.';
 leathers.forEach(m=>{m.color.copy(m.userData.baseColor);m.roughness=m.userData.baseRoughness;m.emissive.set(0);if(service==='trim')m.color.set(state.leather);if(service==='leather')m.roughness=.65;if(service==='clean'){m.emissive.set('#1b3441');m.emissiveIntensity=.35;}});
 if(ambient)ambient.visible=service==='ambient';all('[data-cabin]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cabin===service)));if(service)chooseView(5);invalidate();
}
$('#door-toggle').onclick=()=>{setDoor(!state.doorOpen);if(state.doorOpen)chooseView(1);else if(state.view===5)chooseView(0);};
all('[data-cabin]').forEach(b=>b.onclick=()=>setCabin(b.dataset.cabin));
$('#leather-color').onchange=e=>{state.leather=e.target.value;setCabin('trim');};
$('#exterior').onclick=()=>{setCabin(null);setDoor(false);chooseView(0);};

function motionUI(){$('#motion').setAttribute('aria-pressed',String(state.motion));$('#motion').textContent='Плавные переходы: '+(state.motion?'вкл.':'выкл.');$('#scroll-hint').textContent=innerWidth>800?'Потяните, чтобы вращать · колесо — масштаб':'Вращайте пальцем · два пальца — масштаб';}
$('#motion').onclick=()=>{state.motion=!state.motion;motionUI();if(!state.motion&&flight){camera.position.setFromSpherical(flight.b).add(flight.at);controls.target.copy(flight.at);controls.update();flight=null;}invalidate();};
reduced.addEventListener('change',e=>{state.motion=!e.matches;motionUI();if(e.matches&&flight){const value=state.view;flight=null;chooseView(value);}invalidate();});
new ResizeObserver(()=>{resize();motionUI();}).observe(viewport);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)invalidate();}).observe(viewport);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)invalidate();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('3D остановлено · обновите страницу для повторной загрузки');});
motionUI();requestAnimationFrame(()=>requestAnimationFrame(boot));
