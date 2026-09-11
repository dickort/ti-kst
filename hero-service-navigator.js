import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {MAP,VIEWS,ease,shortest,resolveZone,calloutLayout,serviceNote,UNSHOWN_TUNING} from './hero-nav-data.mjs';
import {services} from './hero-service-catalog.mjs';

// One renderer and one owner of the camera; never run the legacy hero alongside.
const hero=document.querySelector('.hero');
if(hero){
 hero.dataset.navBoot='poster';
 // Give the lightweight same-model poster one paint before WebGL setup can
 // occupy the main thread. Model and module preloads have already started.
 requestAnimationFrame(()=>requestAnimationFrame(()=>mountServiceNavigator(hero)));
}
export function mountServiceNavigator(hero){
 const stage=hero.querySelector('#stageWrap'),compact=()=>innerWidth<820;
 const config=window.TI_NAV_CONFIG||{rig:false,version:'local'};
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nav={direction:null,zone:null,inside:false,service:null,phase:'ready'};
 let renderer=null,model=null,door=null,doorRest=null,doorProgress=0,doorMotion=null;
 let flight=null,pending=null,raf=0,dirty=true,visible=true,lastTime=0,disposed=false;
 let blackpack=true,tinted=true,rigReady=false,modelReady=false,loadingToken=0;
 let markers=[],stats={frames:0,flights:0,lastFlightMs:0,rig:false};
 const chromeMaterials=[],glassMaterials=[];
 const point=new THREE.Vector3(),look=new THREE.Vector3(0,.65,0);
 const camera=new THREE.PerspectiveCamera(34,1,.05,90);
 let frameX=.68;
 camera.position.set(0,1.95,6.9);camera.lookAt(look);
 hero.classList.add('nav-enabled');stage.classList.remove('premium-loading','premium-ready');
 stage.querySelectorAll('canvas,.hotspot,.premium-hotspot,.premium-car-loading,.model-credit').forEach(n=>n.remove());
 const poster=stage.querySelector('.nav-poster'),posterImage=poster?.querySelector('img');
 const canvas=document.createElement('canvas');canvas.className='nav-canvas';canvas.setAttribute('aria-label','Mercedes-AMG: вращение перетаскиванием, масштаб колесом или двумя пальцами');stage.append(canvas);
 const loading=document.createElement('div');loading.className='nav-loading';loading.setAttribute('role','status');loading.textContent='Загружаем Mercedes · 0%';stage.append(loading);
 const wires=document.createElementNS('http://www.w3.org/2000/svg','svg');wires.classList.add('nav-wires');wires.setAttribute('aria-hidden','true');stage.append(wires);
 const markerLayer=document.createElement('div');markerLayer.className='nav-markers';stage.append(markerLayer);
 const panel=document.createElement('aside');panel.className='nav-panel';panel.hidden=true;panel.setAttribute('aria-label','Услуги выбранной зоны');hero.append(panel);
 const breadcrumb=document.createElement('div');breadcrumb.className='nav-breadcrumb';breadcrumb.hidden=true;hero.append(breadcrumb);
 const announcement=document.createElement('div');announcement.className='nav-sr';announcement.setAttribute('aria-live','polite');hero.append(announcement);
 const motionButton=document.createElement('button');motionButton.type='button';motionButton.className='nav-motion';motionButton.textContent='Анимация: вкл.';motionButton.setAttribute('aria-pressed','true');hero.append(motionButton);
 let animateViews=true;
 motionButton.onclick=()=>{animateViews=!animateViews;motionButton.textContent=animateViews?'Анимация: вкл.':'Анимация: выкл.';motionButton.setAttribute('aria-pressed',String(animateViews));};
 const scene=new THREE.Scene(),rig=new THREE.Group();rig.position.y=.10;scene.add(rig);
 let sceneEnvironment=null,ambientGroup=null;
 const materialCache=new Map();
 function world(values){return model?model.localToWorld(new THREE.Vector3(...values)):new THREE.Vector3(...values).multiplyScalar(1.48);}
 function area(){const r=stage.getBoundingClientRect(),c=compact();return {w:r.width,h:r.height,left:nav.direction?24:r.width*(c?.05:.37),right:r.width-(nav.direction&&!c?Math.min(386,r.width*.30)+40:22),top:c?22:38,bottom:r.height-34};}
 function invalidate(){dirty=true;if(!raf&&visible&&!document.hidden&&!disposed)raf=requestAnimationFrame(tick);}
 function targetFor(name){const preset=VIEWS[name]||VIEWS.home;const target=world(preset.target),eye=world(preset.eye);
  if(compact())eye.sub(target).multiplyScalar(nav.inside?1.26:1.18).add(target);
  return {eye,target,x:compact()?.5:(nav.direction?.36:.69)};
 }
 function fly(name,duration=1650){const dest=targetFor(name),a=new THREE.Spherical().setFromVector3(camera.position.clone().sub(look));
  const b=new THREE.Spherical().setFromVector3(dest.eye.clone().sub(dest.target));b.theta=shortest(a.theta,b.theta);
  flight={a,b,from:look.clone(),to:dest.target,x0:frameX,x1:dest.x,start:performance.now(),duration:animateViews?duration:1};stats.flights++;invalidate();
 }
 function manualStart(){flight=null;invalidate();}
 function animateDoor(to,duration=1050,delay=0,done=null){if(!door){done?.();return;}
  doorMotion={from:doorProgress,to,start:performance.now()+delay,duration:animateViews?duration:1,done};invalidate();
 }
 function clearEffects(){setChrome(true);setTint(true);if(ambientGroup)ambientGroup.visible=false;}
 function setChrome(on){blackpack=on;chromeMaterials.forEach(m=>{m.color.set(on?0x050505:0xa8a8a8);m.metalness=on?.24:.95;m.roughness=on?.24:.19;m.envMapIntensity=on?.5:1;});invalidate();}
 function setTint(on){tinted=on;glassMaterials.forEach(m=>{m.color.set(on?0x080808:0x343434);m.opacity=1;m.transparent=false;m.depthWrite=true;});invalidate();}
 function applyDirection(key){clearEffects();nav.direction=key;nav.zone=null;nav.inside=false;nav.service=null;nav.phase='ready';
  document.querySelectorAll('.direction-tab').forEach(b=>{const yes=b.dataset.direction===key;b.classList.toggle('active',yes);b.setAttribute('aria-selected',String(yes));});
  renderUI();fly(key||'home');
 }
 function closeThen(action){pending=action;if(nav.phase==='closing')return;
  nav.phase='closing';flight=null;clearEffects();renderUI();
  animateDoor(0,900,0,()=>{const action=pending;pending=null;nav.phase='ready';nav.inside=false;action?.();});
 }
 function selectDirection(key){if(key!==null&&!MAP[key])return;
  if(nav.inside||doorProgress>.001||doorMotion)closeThen(()=>applyDirection(key));else applyDirection(key);
 }
 function openCabin(){nav.inside=true;nav.zone=null;nav.service=null;clearEffects();
  if(!rigReady){nav.phase='ready';renderUI();fly('handle');return;}
  nav.phase='opening';renderUI();fly('cabin',1900);
  animateDoor(1,1100,550,()=>{if(nav.phase!=='opening')return;nav.phase='ready';renderUI();});
 }
 function selectZone(id){if(nav.phase==='closing')return;const z=resolveZone(nav.direction,id,nav.inside);if(!z)return;
  if(z.interior){openCabin();return;}
  clearEffects();nav.zone=id;nav.service=z.services[0]||null;renderUI();
  if(!nav.inside||rigReady)fly(z.view,1550);
  if(z.effect==='ambient'&&ambientGroup){ambientGroup.visible=true;invalidate();}
 }
 function back(){if(nav.zone){clearEffects();nav.zone=null;nav.service=null;renderUI();fly(nav.inside&&rigReady?'cabin':nav.direction);}
  else if(nav.inside)closeThen(()=>applyDirection(nav.direction));else selectDirection(null);
 }
 function button(action,value,text,classes=''){return `<button type="button" class="${classes}" data-nav-action="${action}" data-value="${escape(value)}">${escape(text)}</button>`;}
 function zoneList(zones){return zones.map((z,i)=>button('zone',z.id,`${String(i+1).padStart(2,'0')}  ${z.label}  ↗`,'nav-zone-row')).join('');}
 function renderUI(){hero.classList.toggle('nav-drilled',!!nav.direction);hero.classList.toggle('nav-interior',nav.inside);hero.classList.toggle('nav-service-selected',!!nav.zone);
  panel.hidden=!nav.direction;breadcrumb.hidden=!nav.direction;
  if(!nav.direction){setMarkers(Object.entries(MAP).map(([id,d])=>({id,label:d.label,anchor:d.anchor,main:true})));invalidate();return;}
  const d=MAP[nav.direction],z=resolveZone(nav.direction,nav.zone,nav.inside),s=services[nav.service];
  const zones=nav.inside?d.cabin:d.zones;
  breadcrumb.innerHTML=button('home','','← Направления')+`<span>/ ${escape(d.label)}${nav.inside?' / Салон':''}</span>`;
  let body='';
  if(nav.phase==='closing')body='<p class="nav-note">Закрываем дверь и возвращаемся к автомобилю…</p>';
  else if(nav.phase==='opening')body='<p class="nav-note">Открываем водительскую дверь…</p>';
  else if(z&&s){
   body=`<div class="nav-service-choices">${z.services.map(slug=>button('service',slug,services[slug].title,slug===nav.service?'selected':'')).join('')}</div><h2>${escape(s.title)}</h2><p>${escape(s.lead)}</p>`;
   if(z.effect==='chrome')body+=`<div class="nav-demo">${button('chrome','on','Антихром','selected')}${button('chrome','off','Хром')}</div><small>Визуальное сравнение отделки. При выходе возвращается антихром.</small>`;
   if(z.effect==='tint')body+=`<div class="nav-demo">${button('tint','on','Тёмная','selected')}${button('tint','off','Светлее')}</div><small>Условный пример оттенка, не показатель светопропускаемости плёнки.</small>`;
   if(z.closer&&rigReady)body+=button('closer','','Показать мягкое закрывание','nav-demo-button')+'<small>Демонстрация механики, не модель конкретного комплекта доводчиков.</small>';
   if(z.effect==='ambient'&&rigReady)body+='<small>Демонстрационная световая линия; схема установки подбирается отдельно.</small>';
   const note=serviceNote(nav.service);if(note)body+=`<p class="nav-note">${escape(note)}</p>`;
   body+=`<a class="nav-primary" href="./service.html?service=${encodeURIComponent(nav.service)}">Подробнее об услуге ↗</a>`;
  }else{
   body=`<h2>${nav.inside?'Салон. В деталях.':escape(d.label)}</h2><p>${nav.inside?'Выберите элемент интерьера.':escape(d.intro)}</p>`;
   if(nav.inside&&!rigReady)body+='<p class="nav-note">3D-просмотр салона пока недоступен. Описания услуг можно открыть ниже.</p>';
   body+=`<div class="nav-zone-list">${zoneList(zones)}</div>`;
   if(!nav.inside&&nav.direction==='tune')body+=`<details class="nav-other"><summary>Другое оборудование и услуги</summary>${UNSHOWN_TUNING.map(slug=>`<a href="./service.html?service=${slug}">${escape(services[slug]?.title||slug)} ↗</a>`).join('')}</details>`;
   if(!nav.inside)body+=`<a class="nav-all" href="./direction.html?direction=${nav.direction}">Все услуги направления ↗</a>`;
  }
  panel.innerHTML=`<div class="nav-panel-top"><span>${d.index} / ${nav.inside?'ИНТЕРЬЕР':'УСЛУГИ ПО ЗОНАМ'}</span>${button('home','','×','nav-close')}</div><div class="nav-panel-scroll">${body}</div>${button('back','',nav.zone?'← К зонам':nav.inside?'← Закрыть дверь':'← Выбрать направление','nav-back')}`;
  panel.querySelector('.nav-close')?.setAttribute('aria-label','Закрыть выбранное направление');
  setMarkers(nav.phase!=='ready'||(nav.inside&&!rigReady)?[]:zones);
  announcement.textContent=s?.title||(nav.inside?'Услуги салона':d.label);invalidate();
 }
 function setMarkers(zones){markerLayer.replaceChildren();wires.replaceChildren();markers=[];
  zones.forEach((z,i)=>{const b=document.createElement('button');b.type='button';b.className='nav-marker'+(z.id===nav.zone?' selected':'');
   b.dataset.navMarker=z.id;b.setAttribute('aria-label',z.label);b.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b><span>${escape(z.label)}</span>`;
   b.addEventListener('pointerdown',e=>e.stopPropagation());b.onclick=e=>{e.stopPropagation();z.main?selectDirection(z.id):selectZone(z.id);};markerLayer.append(b);
   const line=document.createElementNS(wires.namespaceURI,'line'),dot=document.createElementNS(wires.namespaceURI,'circle');dot.setAttribute('r','3');wires.append(line,dot);markers.push({z,b,line,dot});
  });
 }
 function updateMarkers(){if(!modelReady)return;const a=area(),layout=calloutLayout(markers.length,a,compact());
  markers.forEach(({z,b,line,dot},i)=>{let anchor;
   if(z.onDoor&&door){anchor=new THREE.Vector3(...z.anchor).sub(new THREE.Vector3(.546,.480,.588));door.localToWorld(anchor);}else anchor=world(z.anchor);
   anchor.project(camera);const x=(anchor.x*.5+.5)*a.w,y=(-anchor.y*.5+.5)*a.h;
   const good=anchor.z>-1&&anchor.z<1&&x>0&&x<a.w&&y>0&&y<a.h;
   const p=layout[i];b.style.transform=`translate3d(${p.x}px,${p.y}px,0) translate(-50%,-50%)`;
   line.style.display=dot.style.display=good?'':'none';line.setAttribute('x1',p.x);line.setAttribute('y1',p.y);line.setAttribute('x2',x);line.setAttribute('y2',y);dot.setAttribute('cx',x);dot.setAttribute('cy',y);
  });
 }
 function onPanelClick(e){const b=e.target.closest('[data-nav-action]');if(!b)return;const {navAction:a,value:v}=b.dataset;
  if(a==='home')selectDirection(null);else if(a==='back')back();else if(a==='zone')selectZone(v);
  else if(a==='service'){const z=resolveZone(nav.direction,nav.zone,nav.inside);if(z?.services.includes(v)){nav.service=v;renderUI();}}
  else if(a==='chrome'||a==='tint'){a==='chrome'?setChrome(v==='on'):setTint(v==='on');b.parentElement.querySelectorAll('button').forEach(el=>el.classList.toggle('selected',el===b));}
  else if(a==='closer'&&rigReady){animateDoor(.09,350,0,()=>animateDoor(0,850));}
 }
 panel.addEventListener('click',onPanelClick);breadcrumb.addEventListener('click',onPanelClick);
 const onDirection=e=>selectDirection(e.detail?.key??null);window.addEventListener('ti:navigate-direction',onDirection);
 const onEscape=e=>{if(e.key==='Escape'&&nav.direction){e.preventDefault();e.stopImmediatePropagation();back();}};document.addEventListener('keydown',onEscape,true);
 // Pointer events belong to the canvas only. Floating marker labels cannot
 // cancel a flight by accidentally entering the drag handler.
 const pointers=new Map();let pinch=0;
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;manualStart();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});
 canvas.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const sph=new THREE.Spherical().setFromVector3(camera.position.clone().sub(look));
  if(pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)sph.radius*=pinch/Math.max(1,dist);pinch=dist;}
  else{sph.theta-=dx*.006;sph.phi=THREE.MathUtils.clamp(sph.phi-dy*.004,.28,1.49);}
  sph.radius=THREE.MathUtils.clamp(sph.radius,nav.inside?1.1:2.2,13);camera.position.setFromSpherical(sph).add(look);camera.lookAt(look);invalidate();
 });
 function release(e){pointers.delete(e.pointerId);pinch=0;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!pointers.size)canvas.classList.remove('dragging');}
 canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);pinch=0;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();manualStart();const v=camera.position.clone().sub(look),r=THREE.MathUtils.clamp(v.length()*Math.exp(THREE.MathUtils.clamp(e.deltaY,-200,200)*.0012),nav.inside?1.1:2.2,13);camera.position.copy(v.setLength(r).add(look));invalidate();},{passive:false});

 function studio(){
  RectAreaLightUniformsLib.init();scene.add(new THREE.HemisphereLight(0xffffff,0x111111,.65));
  const top=new THREE.RectAreaLight(0xffffff,5.2,5.6,1.4);top.position.set(0,5.8,1.3);top.lookAt(0,.7,0);scene.add(top);
  const side=new THREE.RectAreaLight(0xffffff,3.8,1.3,3.8);side.position.set(3.9,2.3,1.6);side.lookAt(0,.8,.1);scene.add(side);
  const front=new THREE.DirectionalLight(0xffffff,1.25);front.position.set(-2,2.4,5);scene.add(front);
  // Neutral, physically reflected LED panels instead of a blue point-light tint.
  const room=new THREE.Scene();room.add(new THREE.Mesh(new THREE.BoxGeometry(18,12,18),new THREE.MeshBasicMaterial({color:0x121212,side:THREE.BackSide})));
  const ledMat=new THREE.MeshBasicMaterial({color:new THREE.Color(6,6,6),side:THREE.DoubleSide});
  const fixtures=[[-2.4,5,0,.16,5.6,'top'],[0,5,0,.16,5.6,'top'],[2.4,5,0,.16,5.6,'top'],[4.7,2.5,.4,.22,4,'side'],[-4.7,2.5,.4,.22,4,'side'],[0,2.9,5.8,5.4,.22,'front']];
  fixtures.forEach(([x,y,z,w,h,kind])=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),ledMat);mesh.position.set(x,y,z);mesh.lookAt(0,.8,0);if(kind==='top')mesh.rotation.set(-Math.PI/2,0,0);room.add(mesh);});
  const pmrem=new THREE.PMREMGenerator(renderer);sceneEnvironment=pmrem.fromScene(room,.035,.1,40);scene.environment=sceneEnvironment.texture;pmrem.dispose();
  room.traverse(n=>{if(n.isMesh)n.geometry.dispose();});ledMat.dispose();
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(3.0,3.08,.13,80),new THREE.MeshStandardMaterial({color:0x101010,metalness:.35,roughness:.6}));platform.position.y=.02;scene.add(platform);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3.015,.008,6,96),new THREE.MeshBasicMaterial({color:0x737373}));ring.rotation.x=Math.PI/2;ring.position.y=.09;scene.add(ring);
  const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=128;const ctx=texCanvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,10,64,64,61);grad.addColorStop(0,'rgba(0,0,0,.9)');grad.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.0,5.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(texCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.091;scene.add(shadow);
 }
 function processMaterial(original,context){const cacheKey=original.uuid+':'+context;if(materialCache.has(cacheKey))return materialCache.get(cacheKey);
  let m=original.clone();const name=m.name||'',exterior=context!=='cabin';
  const body=exterior&&/(carpaint|graphite paint|satin_metallic_(blue|dark|black)|blue_plastic)/i.test(name);
  const trim=exterior&&/^(Chrome(_2)?|Aluminum|Satin_Metallic|Gray_line)$/i.test(name);
  if(body||trim){if(!m.isMeshPhysicalMaterial){const p=new THREE.MeshPhysicalMaterial();p.name=m.name;m=p;}
   m.color.set(0x050505);m.metalness=body?.28:.24;m.roughness=body?.26:.24;m.clearcoat=body?.55:.18;m.clearcoatRoughness=.18;m.map=null;m.vertexColors=false;m.emissive.set(0);if(trim)chromeMaterials.push(m);
  }
  if(/^Rims(_2)?$/i.test(name)){m.color.set(0x252525);m.metalness=.82;m.roughness=.3;}
  if(/^Brakes$/i.test(name)){m.color.set(0xd8ff3e);m.metalness=.3;m.roughness=.38;}
  if(exterior&&/^(Glass|Rear_glass)$/i.test(name)){m.color.set(0x080808);m.transparent=false;m.opacity=1;m.depthWrite=true;m.metalness=.2;m.roughness=.12;if('transmission'in m)m.transmission=0;glassMaterials.push(m);}
  if(exterior&&/^Headlight_glass$/i.test(name)){m.color.set(0xdddddd);m.transparent=true;m.opacity=.12;m.depthWrite=false;m.metalness=0;m.roughness=.055;if('transmission'in m)m.transmission=0;}
  if(/^(Front_DRL|Headlight)$/i.test(name)){m.color.set(0xeaeaea);m.emissive.set(0xffffff);m.emissiveIntensity=.7;m.metalness=.12;m.roughness=.18;}
  if(/^(Tail_lights|Brakelight)$/i.test(name)){m.color.set(0x4c0303);m.emissive.set(0x850404);m.emissiveIntensity=.45;}
  m.flatShading=false;m.envMapIntensity=body?.7:trim?.5:1.0;m.needsUpdate=true;materialCache.set(cacheKey,m);return m;
 }
 function addAmbient(){ambientGroup=new THREE.Group();model.add(ambientGroup);
  const mat=new THREE.LineBasicMaterial({color:0xd8ff3e,transparent:true,opacity:.75});
  const points=[[-.38,.624,.45],[-.2,.646,.43],[0,.65,.41],[.22,.64,.39],[.40,.612,.40]].map(p=>new THREE.Vector3(...p));ambientGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),mat));ambientGroup.visible=false;
 }
 function posterReady(){hero.dataset.posterReady='true';}
 if(posterImage?.complete&&posterImage.naturalWidth)posterReady();else posterImage?.addEventListener('load',posterReady,{once:true});
 async function loadModel(){const token=++loadingToken;loading.hidden=false;modelReady=false;stage.classList.remove('nav-model-ready','nav-first-frame','nav-handoff-complete');hero.dataset.firstFrame='false';hero.dataset.navReady='loading';
  const url=config.rig?`./assets/amg_driver_cabin_${compact()?'mobile':'desktop'}_v3.glb?v=${encodeURIComponent(config.version)}`:'./assets/mercedes_amg_gt63s_mobile.glb';
  const loader=new GLTFLoader();
  try{const gltf=await loader.loadAsync(url,e=>{if(e.total)loading.textContent=`Загружаем Mercedes · ${Math.round(e.loaded/e.total*100)}%`;});if(token!==loadingToken||disposed)return;
   model=gltf.scene;const verified=gltf.asset?.extras?.driverSide==='+X'&&!!model.getObjectByName('driverDoor')&&!!model.getObjectByName('interiorCabin');
   if(config.rig&&!verified)throw new Error('AMG driver/cabin rig validation failed');
   // The old exterior asset was exported after a +90-degree Y rotation.
   // Undo it once; all service anchors then use the same +Z source convention.
   if(!verified)model.rotation.y=-Math.PI/2;
   model.traverse(n=>{if(!n.isMesh)return;let parent=n,inCabin=false;while(parent){if(parent.name==='interiorCabin')inCabin=true;parent=parent.parent;}
    const context=inCabin?'cabin':n.name.startsWith('door__')?'door':'exterior';
    n.material=Array.isArray(n.material)?n.material.map(m=>processMaterial(m,context)):processMaterial(n.material,context);
    if(!n.geometry.attributes.normal)n.geometry.computeVertexNormals();n.castShadow=false;n.receiveShadow=false;
   });
   const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
   if(!Number.isFinite(size.length())||size.length()<.01||size.length()>100)throw new Error('Invalid decoded model scale');
   model.scale.setScalar(5.15/Math.max(size.x,size.z));box.setFromObject(model);const center=box.getCenter(new THREE.Vector3());model.position.x-=center.x;model.position.z-=center.z;model.position.y-=box.min.y;rig.add(model);model.updateWorldMatrix(true,true);
   door=verified?model.getObjectByName('driverDoor'):null;doorRest=door?.quaternion.clone();rigReady=!!door;stats.rig=rigReady;if(rigReady)addAmbient();
   modelReady=true;hero.dataset.navReady='true';hero.dataset.doorRig=rigReady?'v3':'unavailable';loading.hidden=true;stage.classList.add('nav-model-ready');
   const t=targetFor(nav.direction||'home');camera.position.copy(t.eye);look.copy(t.target);frameX=t.x;camera.lookAt(look);renderUI();resize();
  }catch(error){console.error('TI 3D load:',error);loading.innerHTML='<span>3D временно недоступно. Услуги доступны в меню.</span> <button type="button">Повторить</button>';loading.querySelector('button').onclick=loadModel;hero.dataset.navReady='error';rigReady=false;renderUI();}
 }
 function resize(){if(!renderer)return;const a=area();renderer.setSize(Math.max(1,a.w),Math.max(1,a.h),false);camera.aspect=Math.max(1,a.w)/Math.max(1,a.h);camera.updateProjectionMatrix();wires.setAttribute('viewBox',`0 0 ${a.w} ${a.h}`);if(modelReady){camera.updateMatrixWorld();scene.updateMatrixWorld();updateMarkers();}invalidate();}
 function tick(now){raf=0;if(disposed||!visible||document.hidden)return;
  if(flight){const m=flight,t=Math.min(1,Math.max(0,(now-m.start)/m.duration)),e=ease(t);look.lerpVectors(m.from,m.to,e);const s=new THREE.Spherical(THREE.MathUtils.lerp(m.a.radius,m.b.radius,e),THREE.MathUtils.lerp(m.a.phi,m.b.phi,e),THREE.MathUtils.lerp(m.a.theta,m.b.theta,e));camera.position.setFromSpherical(s).add(look);frameX=THREE.MathUtils.lerp(m.x0,m.x1,e);camera.lookAt(look);dirty=true;if(t===1){stats.lastFlightMs=now-m.start;flight=null;}}
  if(doorMotion&&door){const m=doorMotion,t=Math.min(1,Math.max(0,(now-m.start)/m.duration));doorProgress=THREE.MathUtils.lerp(m.from,m.to,ease(t));door.quaternion.copy(doorRest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-62*Math.PI/180*doorProgress));dirty=true;if(t===1){doorMotion=null;m.done?.();}}
  if(dirty&&renderer){const a=area();camera.setViewOffset(a.w,a.h,(.5-frameX)*a.w,0,a.w,a.h);camera.updateMatrixWorld();scene.updateMatrixWorld();renderer.render(scene,camera);updateMarkers();stats.frames++;if(modelReady&&!stage.classList.contains('nav-first-frame')){stage.classList.add('nav-first-frame');hero.dataset.firstFrame='true';setTimeout(()=>{if(modelReady)stage.classList.add('nav-handoff-complete');},450);}dirty=false;}
  lastTime=now;if(flight||doorMotion||pointers.size)raf=requestAnimationFrame(tick);
 }
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);window.addEventListener('resize',resize);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)invalidate();},{threshold:.01});observer.observe(hero);
 const onVisibility=()=>{if(!document.hidden)invalidate();};document.addEventListener('visibilitychange',onVisibility);
 try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,compact()?1.1:1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.shadowMap.enabled=false;studio();resize();loadModel();}
 catch(error){console.warn('TI WebGL unavailable',error);loading.textContent='Выберите направление — все услуги доступны без 3D.';hero.dataset.navReady='no-webgl';}
 renderUI();
 // Diagnostics expose only scene state, never customer data or credentials.
 window.__TI_NAV={selectDirection,selectZone,back,openCabin,close:()=>selectDirection(null),getState:()=>({...nav,rigReady,modelReady,doorProgress,moving:!!flight||!!doorMotion,camera:camera.position.toArray(),look:look.toArray(),markerCount:markers.length,stats:{...stats}})};
 return window.__TI_NAV;
}
