import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={ready:false,color:'#62747e',finish:'gloss',film:'none',zone:'hood',polish:0,view:0,motion:!reduced.matches};
const stats={tier:innerWidth<801||navigator.connection?.saveData?'mobile':'desktop',frames:0,adaptive:false};
const uniforms={film:{value:0},zone:{value:0},polish:{value:0},polishing:{value:0}};
let renderer,scene,camera,model,raf=0,progress=0,target=0,visible=true,lastFrame=0,slow=0;
const paints=[];
const viewport=$('#viewport'),canvas=$('canvas'),status=$('#status');
window.__STUDIO={state,stats,get moving(){return Math.abs(target-progress)>.001},get camera(){return camera?.position.toArray()},get materials(){return paints.map(m=>({name:m.name,map:!!m.map,roughness:m.roughness,metalness:m.metalness}))}};
all('[data-view]').forEach(b=>b.disabled=true);
function fallback(message){state.ready=false;cancelAnimationFrame(raf);raf=0;document.body.classList.add('fallback');$('#poster').hidden=false;canvas.hidden=true;$('#controls').disabled=true;all('[data-view]').forEach(b=>b.disabled=true);$('#motion').disabled=true;status.textContent=message;$('#scroll-hint').textContent='';stats.error=message;metrics();}
function metrics(){$('#metrics').textContent=JSON.stringify(stats,null,2);}
function invalidate(){if(!raf&&visible&&!document.hidden&&renderer&&state.ready)raf=requestAnimationFrame(render);}
const points=[{eye:[6.3,3.2,7.8],at:[0,.75,0]},{eye:[8.4,2.6,.3],at:[0,.7,0]},{eye:[2.8,3.6,4.5],at:[0,.95,1.25]}];
function positionCamera(){
 const p=Math.max(0,Math.min(2,progress)),i=Math.min(1,Math.floor(p)),t=p-i;
 const a=new THREE.Vector3(...points[i].eye),b=new THREE.Vector3(...points[i+1].eye),look=new THREE.Vector3(...points[i].at).lerp(new THREE.Vector3(...points[i+1].at),t);
 const sphericalA=new THREE.Spherical().setFromVector3(a),sphericalB=new THREE.Spherical().setFromVector3(b);
 camera.position.setFromSpherical(new THREE.Spherical(THREE.MathUtils.lerp(sphericalA.radius,sphericalB.radius,t),THREE.MathUtils.lerp(sphericalA.phi,sphericalB.phi,t),THREE.MathUtils.lerp(sphericalA.theta,sphericalB.theta,t)));
 if(innerWidth<801)camera.position.sub(look).multiplyScalar(1.18+.25*Math.max(0,1-Math.abs(p-1))).add(look);
 camera.lookAt(look);
 // Reserve the upper third for editorial copy without moving scene geometry.
 camera.setViewOffset(viewport.clientWidth,viewport.clientHeight,0,-viewport.clientHeight*.035,viewport.clientWidth,viewport.clientHeight);
}
function render(now){raf=0;if(!visible||document.hidden||!state.ready)return;
 const delta=target-progress,alpha=1-Math.exp(-Math.min(lastFrame?now-lastFrame:16,80)/220);progress=state.motion?progress+delta*alpha:target;if(Math.abs(delta)<.001)progress=target;
 positionCamera();
 const start=performance.now();renderer.render(scene,camera);stats.lastRenderSubmitMs=+(performance.now()-start).toFixed(2);stats.frames++;
 if(lastFrame&&Math.abs(delta)>.01){if(now-lastFrame>40)slow++;if(slow>8&&!stats.adaptive){renderer.setPixelRatio(Math.max(.75,renderer.getPixelRatio()*.7));stats.adaptive=true;stats.pixelRatio=renderer.getPixelRatio();}}
 lastFrame=now;
 if(Math.abs(target-progress)>.001)invalidate();else{lastFrame=0;metrics();}
}
function resize(){if(!renderer)return;renderer.setSize(viewport.clientWidth,viewport.clientHeight,false);camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();invalidate();}
function chooseView(value){document.body.dataset.sceneView=value;state.view=value;target=value;all('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.view===value)));uniforms.polishing.value=value===2?1:0;invalidate();}
function update(){
 const finishes={gloss:[.17,.42,1],matte:[.72,.08,.02],satin:[.38,.24,.18],chrome:[.065,1,.08]};
 const [r,m,c]=finishes[state.finish];paints.forEach(p=>{p.color.set(state.color);p.roughness=r;p.metalness=m;p.clearcoat=c;p.clearcoatRoughness=.12;});
 uniforms.film.value=['none','clear','matte','color'].indexOf(state.film);uniforms.zone.value=['hood','side','all'].indexOf(state.zone);uniforms.polish.value=state.polish/100;
 $('#polish-value').textContent=state.polish+'%';invalidate();
}
function paint(original){
 const m=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(m,original);
 m.clearcoat=1;m.clearcoatRoughness=.12;m.envMapIntensity=.65;
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
 const wall=matte('#dedfda'),floor=matte('#bfc2ba'),dark=matte('#35403c');
 const box=(x,y,z,w,h,d,mat)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);room.add(o);return o;};
 box(0,-.08,0,22,.15,22,floor);box(0,2.7,-5.5,20,5.5,.15,wall);box(-7,2.7,0,.15,5.5,12,wall);
 box(0,.12,-5.35,20,.22,.08,dark);
 // Architectural reveals and a restrained equipment bench at the perimeter.
 for(let x=-6;x<8;x+=2)box(x,2.7,-5.39,.014,5.2,.02,matte('#b8beb6'));
 box(-4.6,.55,-4.7,2.4,1.1,.65,dark);box(-4.6,1.13,-4.7,2.5,.05,.72,matte('#8b958b'));
 for(let i=0;i<4;i++){box(-5.4+i*.5,.55,-4.34,.015,.88,.015,matte('#6b776d'));box(-5.17+i*.5,.85,-4.33,.18,.02,.03,matte('#adb7ac'));}
 const bottle=matte('#768b75');for(let i=0;i<3;i++){box(-5.2+i*.23,1.28,-4.7,.09,.26,.09,bottle);box(-5.2+i*.23,1.43,-4.7,.04,.06,.04,dark);}
 const led=new THREE.MeshBasicMaterial({color:new THREE.Color(3.8,3.8,3.6)});
 for(const x of [-3,0,3]){box(x,4.7,0,1.35,.08,5,dark);box(x,4.64,0,1.23,.025,4.88,led);}
 for(const x of [-3.4,3.4]){box(x,2.5,-5.33,1.3,2.8,.06,led);}
 scene.add(new THREE.HemisphereLight(0xffffff,0x6f786b,.85));
 RectAreaLightUniformsLib.init();
 for(const x of [-3,3]){const l=new THREE.RectAreaLight(0xffffff,3,3,5);l.position.set(x,4.3,1);l.lookAt(0,0,0);scene.add(l);}
 const key=new THREE.DirectionalLight(0xfff9ea,1.1);key.position.set(4,6,6);scene.add(key);
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
 scene=new THREE.Scene();scene.background=new THREE.Color('#e4e6e0');scene.fog=new THREE.Fog('#e4e6e0',15,32);
 camera=new THREE.PerspectiveCamera(36,1,.1,70);room();resize();
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
 stats.originalPaintMaps=[];
 model.traverse(n=>{if(!n.isMesh)return;
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
 scene.add(model);update();positionCamera();
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
function motionUI(){$('#motion').setAttribute('aria-pressed',String(state.motion));$('#motion').textContent='Движение камеры: '+(state.motion?'вкл.':'выкл.');$('#scroll-hint').textContent=state.motion&&innerWidth>800?'Листайте вниз — рассмотрите ближе ↓':'Выберите ракурс кнопками';}
$('#motion').onclick=()=>{state.motion=!state.motion;motionUI();invalidate();};reduced.addEventListener('change',e=>{state.motion=!e.matches;motionUI();invalidate();});
window.addEventListener('scroll',()=>{if(!state.ready||!state.motion||innerWidth<801)return;const rect=$('#journey').getBoundingClientRect();target=THREE.MathUtils.clamp(-rect.top/(rect.height-innerHeight),0,1)*2;state.view=Math.round(target);document.body.dataset.sceneView=state.view;uniforms.polishing.value=target>1.65?1:0;all('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.view===state.view)));invalidate();},{passive:true});
new ResizeObserver(()=>{resize();motionUI();}).observe(viewport);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)invalidate();}).observe(viewport);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)invalidate();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('3D остановлено · обновите страницу для повторной загрузки');});
motionUI();requestAnimationFrame(()=>requestAnimationFrame(boot));
