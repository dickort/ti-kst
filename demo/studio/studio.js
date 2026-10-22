import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={ready:false,color:'#62747e',finish:'gloss',film:'none',zone:'hood',polish:0,view:0,motion:!reduced.matches};
const stats={tier:innerWidth<801||navigator.connection?.saveData?'mobile':'desktop',frames:0,adaptive:false};
const uniforms={film:{value:0},zone:{value:0},polish:{value:0},polishing:{value:0}};
let renderer,scene,camera,model,controls,flight=null,interacting=false,raf=0,visible=true,lastFrame=0,slow=0;
const paints=[];
const viewport=$('#viewport'),canvas=$('canvas'),status=$('#status');
window.__STUDIO={state,stats,get moving(){return !!flight},get camera(){return camera?.position.toArray()},get materials(){return paints.map(m=>({name:m.name,color:m.color.getHexString(),map:!!m.map,roughness:m.roughness,metalness:m.metalness}))}};
all('[data-view]').forEach(b=>b.disabled=true);
function fallback(message){state.ready=false;cancelAnimationFrame(raf);raf=0;document.body.classList.add('fallback');$('#poster').hidden=false;canvas.hidden=true;$('#controls').disabled=true;all('[data-view]').forEach(b=>b.disabled=true);$('#motion').disabled=true;status.textContent=message;$('#scroll-hint').textContent='';stats.error=message;metrics();}
function metrics(){$('#metrics').textContent=JSON.stringify(stats,null,2);}
function invalidate(){if(!raf&&visible&&!document.hidden&&renderer&&state.ready)raf=requestAnimationFrame(render);}
const points=[
 {eye:[6.3,3.2,7.8],at:[0,.75,0]},
 {eye:[8.4,2.6,.3],at:[0,.7,0]},
 {eye:[3.5,5.5,6],at:[0,.9,.45]},
 {eye:[-6.2,3.2,-7.8],at:[0,.75,0]},
 {eye:[.1,12.8,-1],at:[0,.7,0]}
];
function preset(value){
 const p=points[value],at=new THREE.Vector3(...p.at),eye=new THREE.Vector3(...p.eye);
 if(model){
  const bounds=new THREE.Box3().setFromObject(model),test=camera.clone();
  const corners=[bounds.min.x,bounds.max.x].flatMap(x=>[bounds.min.y,bounds.max.y].flatMap(y=>[bounds.min.z,bounds.max.z].map(z=>new THREE.Vector3(x,y,z))));
  for(let i=0;i<3;i++){
   test.position.copy(eye);test.lookAt(at);test.updateMatrixWorld();
   const projected=corners.map(v=>v.clone().project(test));
   const fit=Math.max(...projected.map(v=>Math.max(Math.abs(v.x)/.87,v.y/(innerWidth<801?.87:.70),-v.y/(innerWidth<801?.87:.68))));
   eye.sub(at).multiplyScalar(fit).add(at);
  }
 }
 return {eye,at};
}
function setupControls(){
 controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.enablePan=false;
 controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI/2-.08;
 controls.minDistance=3;controls.maxDistance=22;controls.rotateSpeed=.65;controls.zoomSpeed=.75;
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
 const begin=performance.now();renderer.render(scene,camera);stats.lastRenderSubmitMs=+(performance.now()-begin).toFixed(2);stats.frames++;
 if((flight||interacting)&&lastFrame&&now-lastFrame>40&&now-lastFrame<300){slow++;if(slow>8&&!stats.adaptive){renderer.setPixelRatio(Math.max(.75,renderer.getPixelRatio()*.7));stats.adaptive=true;stats.pixelRatio=renderer.getPixelRatio();}}
 lastFrame=flight||interacting?now:0;if(flight)invalidate();else metrics();
}
function resize(){
 if(!renderer)return;renderer.setSize(viewport.clientWidth,viewport.clientHeight,false);camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();
 camera.setViewOffset(viewport.clientWidth,viewport.clientHeight,0,-viewport.clientHeight*.035,viewport.clientWidth,viewport.clientHeight);
 if(controls)controls.maxDistance=Math.max(22,8/camera.aspect);invalidate();
}
function chooseView(value){
 if(!controls)return;document.body.dataset.sceneView=value;state.view=value;
 const p=preset(value);all('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.view===value)));
 if(state.motion&&state.ready){
  const a=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)),b=new THREE.Spherical().setFromVector3(p.eye.clone().sub(p.at));
  b.theta=a.theta+Math.atan2(Math.sin(b.theta-a.theta),Math.cos(b.theta-a.theta));
  flight={a,b,fromAt:controls.target.clone(),at:p.at,start:performance.now()};
 }else{flight=null;camera.position.copy(p.eye);controls.target.copy(p.at);controls.update();}
 uniforms.polishing.value=value===2?1:0;invalidate();
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
 uniforms.film.value=['none','clear','matte','color'].indexOf(state.film);uniforms.zone.value=['hood','side','all'].indexOf(state.zone);uniforms.polish.value=state.polish/100;
 $('#polish-value').textContent=state.polish+'%';invalidate();
}
function paint(original){
 const m=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(m,original);
 m.clearcoat=1;m.clearcoatRoughness=.12;m.envMapIntensity=1.1;
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 studioPosition;varying vec3 studioNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nstudioPosition=(modelMatrix*vec4(transformed,1.0)).xyz;studioNormal=normalize(mat3(modelMatrix)*objectNormal);');
  shader.fragmentShader='varying vec3 studioPosition;varying vec3 studioNormal;\nuniform float film;uniform float zone;uniform float polish;uniform float polishing;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float hood=step(.78,studioPosition.z)*step(.82,studioPosition.y)*step(studioPosition.y,1.4)*step(abs(studioPosition.x),.87)*smoothstep(.35,.65,normalize(studioNormal).y);
   float side=step(.82,abs(studioPosition.x))*step(studioPosition.y,1.45)*smoothstep(.35,.65,abs(normalize(studioNormal).x));
   float mask=zone<.5?hood:(zone<1.5?side:1.);
   if(film>.5&&film<1.5)roughnessFactor=mix(roughnessFactor,.11,mask);
   if(film>1.5&&film<2.5)roughnessFactor=mix(roughnessFactor,.66,mask);
   if(film>2.5){diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.32,.22),mask);roughnessFactor=mix(roughnessFactor,.3,mask);}
   if(polishing>.5){
    float done=1.-smoothstep(-1.+polish*2.-.025,-1.+polish*2.+.025,studioPosition.x);
    roughnessFactor=mix(roughnessFactor,mix(.68,.12,done),hood);
   }
  `);
 };
 m.customProgramCacheKey=()=> 'studio-zones-v2';paints.push(m);return m;
}
function room(){
 const room=new THREE.Group();scene.add(room);
 const matte=c=>new THREE.MeshStandardMaterial({color:c,roughness:.86});
 const wall=matte('#292e34'),floor=matte('#20252c'),dark=matte('#171c22');
 const box=(x,y,z,w,h,d,mat)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);room.add(o);return o;};
 box(0,-.08,0,44,.15,44,floor);box(0,4,-18,40,8,.15,wall);box(-18,4,0,.15,8,40,wall);box(18,4,0,.15,8,40,wall);box(0,4,18,40,8,.15,wall);
 box(0,.12,-17.85,40,.22,.08,dark);
 // Architectural reveals and a restrained equipment bench at the perimeter.
 for(let x=-12;x<14;x+=3)box(x,4,-17.89,.025,8,.02,matte('#444b54'));
 box(-11,.55,-12,2.4,1.1,.65,dark);box(-11,1.13,-12,2.5,.05,.72,matte('#8b958b'));
 for(let i=0;i<4;i++){box(-11.8+i*.5,.55,-11.64,.015,.88,.015,matte('#6b776d'));box(-11.57+i*.5,.85,-11.63,.18,.02,.03,matte('#adb7ac'));}
 const bottle=matte('#768b75');for(let i=0;i<3;i++){box(-11.6+i*.23,1.28,-12,.09,.26,.09,bottle);box(-11.6+i*.23,1.43,-12,.04,.06,.04,dark);}
 const led=new THREE.MeshBasicMaterial({color:new THREE.Color(3.8,3.8,3.6)});
 for(const x of [-4,4]){box(x,4.7,0,1.35,.08,6,dark);box(x,4.64,0,1.23,.025,5.88,led);}
 for(const x of [-6,6]){box(x,3,-10,1.3,4,.06,led);}
 scene.add(new THREE.HemisphereLight(0xdde9ff,0x657182,1.5));
 RectAreaLightUniformsLib.init();
 for(const x of [-3,3]){const l=new THREE.RectAreaLight(0xffffff,8,3,5);l.position.set(x,4.3,1);l.lookAt(0,0,0);scene.add(l);}
 const key=new THREE.DirectionalLight(0xfff9ea,2.1);key.position.set(4,6,6);scene.add(key);
 // Capture the lit studio: unlit standard walls would produce black chrome reflections.
 const env=new THREE.PMREMGenerator(renderer);scene.environment=env.fromScene(scene,.04,.1,60).texture;env.dispose();
 // Soft contact shadow: a static visual cue, not a ray-traced floor reflection.
 const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),g=cx.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'rgba(20,28,20,.48)');g.addColorStop(.6,'rgba(20,28,20,.28)');g.addColorStop(1,'rgba(20,28,20,0)');cx.fillStyle=g;cx.fillRect(0,0,128,128);
 const s=new THREE.Mesh(new THREE.PlaneGeometry(3.9,6.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));s.rotation.x=-Math.PI/2;s.position.y=.009;scene.add(s);
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
 // Reuse the already public model; retain windshield, which is classified as cabin.
 const hiddenCabin=[];model.traverse(n=>{if(n.name.startsWith('cabin__')&&n.name!=='cabin__Glass')hiddenCabin.push(n);});
 hiddenCabin.forEach(n=>n.removeFromParent());
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.scale.multiplyScalar(5.15/Math.max(size.x,size.z));
 box.setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y-=box.min.y;
 model.updateMatrixWorld(true);stats.originalPaintMaps=[];stats.surfaceMapping=[];
 model.traverse(n=>{if(!n.isMesh)return;
 if(n.name==='exterior__Black_gloss'||n.name==='exterior__Gray_line'){n.material=splitPaintSurface(n,n.material,'roof');return;}
 if(n.name==='exterior__Carbon_Fiber_Glossy'){n.material=splitPaintSurface(n,n.material,'spoiler');return;}
 const transform=m=>{
  if(/^(Carpaint|Satin_Metallic_(Blue|Dark|Black)|Blue_plastic)$/i.test(m.name)){stats.originalPaintMaps.push({name:m.name,map:!!m.map});return paint(m);}
  m=m.clone();
  if(/^(Glass|Rear_glass)$/i.test(m.name)){m.color.set('#152025');m.transparent=false;m.opacity=1;m.depthWrite=true;m.metalness=.3;m.roughness=.16;}
  if(/^Headlight_glass$/i.test(m.name)){m.transparent=true;m.opacity=.12;m.depthWrite=false;m.roughness=.08;}
  if(/^Front_DRL$/i.test(m.name)){m.emissive.set('#ffffff');m.emissiveIntensity=1.4;}
  return m;
 };
 n.material=Array.isArray(n.material)?n.material.map(transform):transform(n.material);
 });
 scene.add(model);
 window.__STUDIO.surfaceAt=(x,z)=>{const hits=new THREE.Raycaster(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0)).intersectObject(model,true);const h=hits[0];if(!h)return null;const m=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material;return {mesh:h.object.name,material:m.name,color:m.color.getHexString(),painted:paints.includes(m),point:h.point.toArray()};};
 window.__STUDIO.projectedBounds=()=>{camera.updateMatrixWorld();const b=new THREE.Box3().setFromObject(model);return [b.min.x,b.max.x].flatMap(x=>[b.min.y,b.max.y].flatMap(y=>[b.min.z,b.max.z].map(z=>new THREE.Vector3(x,y,z).project(camera).toArray())));};
 update();positionCamera();
 status.textContent='Подготовка первого кадра…';const compile=performance.now();await renderer.compileAsync(scene,camera);stats.shaderCompileMs=+(performance.now()-compile).toFixed(1);
 const first=performance.now();renderer.render(scene,camera);stats.firstRenderSubmitMs=+(performance.now()-first).toFixed(1);stats.triangles=renderer.info.render.triangles;
 state.ready=true;$('#poster').hidden=true;$('#controls').disabled=false;all('[data-view]').forEach(b=>b.disabled=false);status.textContent='MERCEDES-AMG GT 63 S · 3D';document.body.dataset.ready='true';metrics();invalidate();
 }catch(e){console.error('Studio:',e);fallback('3D недоступно · показано статичное изображение');}
}
all('[data-color]').forEach(b=>b.onclick=()=>{state.color=b.dataset.color;$('#color-name').textContent=b.dataset.name;all('[data-color]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();});
for(const key of ['finish','film'])all('[data-'+key+']').forEach(b=>b.onclick=()=>{state[key]=b.dataset[key];if(key==='film'&&state.film!=='none'){chooseView(state.zone==='side'?1:state.zone==='hood'?2:0);uniforms.polishing.value=0;}if(key==='finish')uniforms.polishing.value=0;all('[data-'+key+']').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));update();});
$('#zone').onchange=e=>{state.zone=e.target.value;chooseView(state.zone==='side'?1:state.zone==='hood'?2:0);uniforms.polishing.value=0;update();};
$('#polish').oninput=e=>{state.polish=+e.target.value;chooseView(2);update();};
all('[data-view]').forEach(b=>b.onclick=()=>chooseView(+b.dataset.view));
$('#reset').onclick=()=>{all('[data-color]')[0].click();all('[data-finish]')[0].click();all('[data-film]')[0].click();$('#zone').value=state.zone='hood';$('#polish').value=state.polish=0;chooseView(0);update();};
function motionUI(){$('#motion').setAttribute('aria-pressed',String(state.motion));$('#motion').textContent='Плавные переходы: '+(state.motion?'вкл.':'выкл.');$('#scroll-hint').textContent=innerWidth>800?'Потяните, чтобы вращать · колесо — масштаб':'Вращайте пальцем · два пальца — масштаб';}
$('#motion').onclick=()=>{state.motion=!state.motion;motionUI();if(!state.motion&&flight){camera.position.setFromSpherical(flight.b).add(flight.at);controls.target.copy(flight.at);controls.update();flight=null;}invalidate();};
reduced.addEventListener('change',e=>{state.motion=!e.matches;motionUI();if(e.matches&&flight){const value=state.view;flight=null;chooseView(value);}invalidate();});
new ResizeObserver(()=>{resize();motionUI();}).observe(viewport);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)invalidate();}).observe(viewport);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)invalidate();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('3D остановлено · обновите страницу для повторной загрузки');});
motionUI();requestAnimationFrame(()=>requestAnimationFrame(boot));
