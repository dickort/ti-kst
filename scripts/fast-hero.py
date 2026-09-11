"""Lossless AMG streaming, bounded marker labels and slightly faster camera.
Run after the standard site builder. Assertions prevent applying to drifted code.
Source GLBs are never modified; derived files are generated in _site/assets.
"""
from pathlib import Path
import json, runpy
prepare=runpy.run_path('scripts/pack-amg.py')['prepare']
config_path=Path('_site/hero-service-config.json')
config=json.loads(config_path.read_text())
if config.get('rig'):
    config['stream']=prepare('assets','_site/assets')
    config_path.write_text(json.dumps(config,indent=2))
p=Path('_site/hero-service-navigator.js')
s=p.read_text()
def rep(a,b):
 global s
 assert a in s,a[:100]
 s=s.replace(a,b,1)
rep("import {GLTFLoader}","import {loadPackedGLB} from './amg-asset-loader.js';\nimport {GLTFLoader}")
rep(" const config=window.TI_NAV_CONFIG||{rig:false,version:'local'};", " const config=window.TI_NAV_CONFIG||{rig:false,version:'local'};\n const quality=compact()?'mobile':'desktop';\n const assets=config.stream?.qualities?.[quality]||null;\n const MOTION_SCALE=.85; // 15% shorter, same trajectory and smooth easing.\n let cabinReady=false,cabinPromise=null,cabinIntent=0,cabinError=false;\n const startedAt=performance.now();")
rep("let markers=[],stats={frames:0,flights:0,lastFlightMs:0,rig:false};","let markers=[],stats={frames:0,flights:0,lastFlightMs:0,rig:false,firstModelMs:null,exterior:null,interior:null};")
rep("function area(){const r=stage.getBoundingClientRect(),c=compact();return {w:r.width,h:r.height,left:nav.direction?24:r.width*(c?.05:.37),right:r.width-(nav.direction&&!c?Math.min(386,r.width*.30)+40:22),top:c?22:38,bottom:r.height-34};}","""function area(){const r=stage.getBoundingClientRect(),c=compact();
  const copy=hero.querySelector('.hero-copy')?.getBoundingClientRect();
  const panelLeft=panel.hidden?r.width:panel.getBoundingClientRect().left-r.left;
  return {w:r.width,h:r.height,left:nav.direction?24:(c?r.width*.05:Math.min(r.width*.60,(copy?.right||r.width*.56)-r.left+12)),right:nav.direction&&!c?panelLeft-18:r.width-22,top:c?22:38,bottom:r.height-34};
 }""")
# Preserve elapsed time clamping; shorten only the durations.
s=s.replace('duration:animateViews?duration:1','duration:animateViews?Math.round(duration*MOTION_SCALE):1')
rep('start:performance.now()+delay,','start:performance.now()+(animateViews?delay*MOTION_SCALE:0),')
rep("function closeThen(action){pending=action;if(nav.phase==='closing')return;", """function closeThen(action){cabinIntent++;pending=action;if(nav.phase==='closing')return;
  if(doorProgress<.001&&!doorMotion){pending=null;nav.inside=false;nav.phase='ready';clearEffects();action();return;}""")
rep("function selectDirection(key){if(key!==null&&!MAP[key])return;", "function selectDirection(key){if(key!==null&&!MAP[key])return;cabinIntent++;")
a=s.index(' function openCabin(){');b=s.index(' function selectZone',a)
s=s[:a]+''' async function openCabin(){
  if(!nav.direction||!MAP[nav.direction]?.cabin.length)return;
  const intent=++cabinIntent;nav.inside=true;nav.zone=null;nav.service=null;cabinError=false;clearEffects();
  if(!rigReady){nav.phase='ready';renderUI();fly('handle');return;}
  if(!cabinReady){
   nav.phase='loading-cabin';renderUI();fly('handle',1350);
   try{await ensureCabin();}catch(error){
    console.error('TI cabin load:',error);
    if(intent===cabinIntent&&nav.inside){cabinError=true;nav.phase='cabin-error';renderUI();}return;
   }
   if(intent!==cabinIntent||!nav.inside)return;
  }
  nav.phase='opening';renderUI();fly('cabin',1900);
  animateDoor(1,1100,550,()=>{if(nav.phase!=='opening'||intent!==cabinIntent)return;nav.phase='ready';renderUI();});
 }
''' + s[b:]
rep("function selectZone(id){if(nav.phase==='closing')return;", "function selectZone(id){if(nav.phase==='closing'||nav.phase==='loading-cabin')return;")
rep("if(nav.phase==='closing')body=", "if(nav.phase==='loading-cabin')body='<p class=\"nav-note\">Подгружаем детальный салон · <span data-cabin-progress>0%</span></p><small>Кузов уже доступен. Дверь откроется после загрузки всех деталей интерьера.</small>';\n  else if(nav.phase==='cabin-error')body='<p class=\"nav-note\">Салон не загрузился. Машина остаётся доступна.</p>'+button('retry-cabin','','Повторить загрузку','nav-demo-button');\n  else if(nav.phase==='closing')body=")
rep("else if(a==='closer'&&rigReady){animateDoor(.09,350,0,()=>animateDoor(0,850));}","""else if(a==='retry-cabin')openCabin();
  else if(a==='closer'&&rigReady){
   const intent=++cabinIntent;b.disabled=true;const old=b.textContent;b.textContent='Подготовка…';
   ensureCabin().then(()=>{if(intent===cabinIntent&&nav.zone==='closers')animateDoor(.09,350,0,()=>animateDoor(0,850));})
    .catch(()=>{b.textContent='Не загрузилось — повторить';})
    .finally(()=>{b.disabled=false;if(b.textContent==='Подготовка…')b.textContent=old;});
  }""")
# Layout uses measured labels rather than an assumed fixed pill width.
rep("function updateMarkers(){if(!modelReady)return;const a=area(),layout=calloutLayout(markers.length,a,compact());", "function updateMarkers(){if(!modelReady)return;const a=area(),layout=calloutLayout(markers.length,a,compact()),placed=[];")
rep("const p=layout[i];b.style.transform=", """const p={...layout[i]},w=b.offsetWidth,h=b.offsetHeight,pad=8;
   p.x=THREE.MathUtils.clamp(p.x,a.left+w/2+pad,a.right-w/2-pad);
   p.y=THREE.MathUtils.clamp(p.y,a.top+h/2+pad,a.bottom-h/2-pad);
   const overlaps=q=>placed.some(v=>Math.abs(q.x-v.x)<(w+v.w)/2+pad&&Math.abs(q.y-v.y)<(h+v.h)/2+pad);
   if(overlaps(p)){
    const candidates=placed.flatMap(v=>[v.y+(v.h+h)/2+pad,v.y-(v.h+h)/2-pad]).sort((x,y)=>Math.abs(x-p.y)-Math.abs(y-p.y));
    for(const y of candidates){const q={x:p.x,y};if(y-h/2>=a.top&&y+h/2<=a.bottom&&!overlaps(q)){p.y=y;break;}}
   }
   placed.push({x:p.x,y:p.y,w,h});b.style.transform=""")
# Improve oblique texture sampling without changing any image bytes.
rep("m.flatShading=false;m.envMapIntensity=", "for(const key of ['map','normalMap','roughnessMap','metalnessMap']){const tex=m[key];if(tex)tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}\n  m.flatShading=false;m.envMapIntensity=")
a=s.index(' async function loadModel()');b=s.index(' function resize()',a)
s=s[:a]+''' function processMeshes(root){
  root.traverse(n=>{if(!n.isMesh)return;let parent=n,inCabin=false;while(parent){if(parent.name==='interiorCabin')inCabin=true;parent=parent.parent;}
   const context=inCabin?'cabin':n.name.startsWith('door__')?'door':'exterior';
   n.material=Array.isArray(n.material)?n.material.map(m=>processMaterial(m,context)):processMaterial(n.material,context);
   if(!n.geometry.attributes.normal)n.geometry.computeVertexNormals();n.castShadow=false;n.receiveShadow=false;
  });
 }
 async function ensureCabin(){
  if(cabinReady)return;
  if(cabinPromise)return cabinPromise;
  if(!assets||!modelReady||!rigReady)throw new Error('Cabin rig unavailable');
  cabinPromise=(async()=>{
   const {gltf,metrics}=await loadPackedGLB(assets.interior,p=>{const el=panel.querySelector('[data-cabin-progress]');if(el)el.textContent=p+'%';});
   if(disposed)return;
   if(gltf.asset?.extras?.loadPart!=='interior'||gltf.asset?.extras?.driverSide!=='+X')throw new Error('Invalid cabin chunk');
   const sourceDoor=gltf.scene.getObjectByName('driverDoor'),sourceCabin=gltf.scene.getObjectByName('interiorCabin');
   const targetCabin=model.getObjectByName('interiorCabin');
   if(!sourceDoor||!sourceCabin||!targetCabin)throw new Error('Cabin assembly groups missing');
   processMeshes(gltf.scene);
   // add(), not attach(): both chunks retain identical original local frames.
   // Existing exterior transforms and the hinge never move during assembly.
   for(const child of [...sourceDoor.children])door.add(child);
   for(const child of [...sourceCabin.children])targetCabin.add(child);
   model.updateWorldMatrix(true,true);cabinReady=true;stats.interior=metrics;
   if(!ambientGroup)addAmbient();invalidate();
  })().catch(error=>{cabinPromise=null;throw error;});
  return cabinPromise;
 }
 async function loadModel(){const token=++loadingToken;loading.hidden=false;modelReady=false;hero.dataset.navReady='loading';
  try{
   let gltf;
   if(assets){const result=await loadPackedGLB(assets.exterior,p=>loading.textContent=`Загружаем Mercedes · ${p}%`);gltf=result.gltf;stats.exterior=result.metrics;}
   else{
    const url=config.rig?`./assets/amg_driver_cabin_${quality}_v3.glb?v=${encodeURIComponent(config.files?.find(f=>f.name.includes(quality))?.sha256||'v3')}`:'./assets/mercedes_amg_gt63s_mobile.glb';
    gltf=await new GLTFLoader().loadAsync(url,e=>{if(e.total)loading.textContent=`Загружаем Mercedes · ${Math.round(e.loaded/e.total*100)}%`;});
   }
   if(token!==loadingToken||disposed)return;
   model=gltf.scene;const verified=gltf.asset?.extras?.driverSide==='+X'&&!!model.getObjectByName('driverDoor')&&!!model.getObjectByName('interiorCabin');
   if(config.rig&&!verified)throw new Error('AMG driver/cabin rig validation failed');
   if(!verified){const exterior=model;exterior.rotation.y=-Math.PI/2;model=new THREE.Group();model.add(exterior);}
   processMeshes(model);
   const reference=gltf.asset?.extras?.referenceBounds;
   const box=reference?new THREE.Box3(new THREE.Vector3(...reference.min),new THREE.Vector3(...reference.max)):new THREE.Box3().setFromObject(model);
   const size=box.getSize(new THREE.Vector3());
   if(!Number.isFinite(size.length())||size.length()<.01||size.length()>100)throw new Error('Invalid decoded model scale');
   const scale=5.15/Math.max(size.x,size.z),center=box.getCenter(new THREE.Vector3());
   model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
   rig.add(model);model.updateWorldMatrix(true,true);
   door=verified?model.getObjectByName('driverDoor'):null;doorRest=door?.quaternion.clone();rigReady=!!door;cabinReady=verified&&!assets;stats.rig=rigReady;
   if(cabinReady)addAmbient();
   modelReady=true;hero.dataset.navReady='true';hero.dataset.doorRig=rigReady?'v3':'unavailable';loading.hidden=true;stage.classList.add('nav-model-ready');
   // Download started before PMREM setup. Keep exactly the same LED environment.
   if(!sceneEnvironment)studio();
   const t=targetFor(nav.direction||'home');flight=null;camera.position.copy(t.eye);look.copy(t.target);frameX=t.x;camera.lookAt(look);renderUI();resize();
   if(nav.inside&&MAP[nav.direction]?.cabin.length)openCabin();
  }catch(error){console.error('TI 3D load:',error);loading.innerHTML='<span>3D временно недоступно. Услуги доступны в меню.</span> <button type="button">Повторить</button>';loading.querySelector('button').onclick=loadModel;hero.dataset.navReady='error';rigReady=false;renderUI();}
 }
''' + s[b:]
rep('renderer.shadowMap.enabled=false;studio();resize();loadModel();','renderer.shadowMap.enabled=false;resize();loadModel();')
rep('renderer.render(scene,camera);updateMarkers();stats.frames++;dirty=false;', 'renderer.render(scene,camera);updateMarkers();stats.frames++;if(modelReady&&stats.firstModelMs===null)stats.firstModelMs=performance.now()-startedAt;dirty=false;')
rep('const resizeObserver=new ResizeObserver(resize);','document.fonts?.ready.then(()=>invalidate());\n const resizeObserver=new ResizeObserver(resize);')
rep('...nav,rigReady,modelReady,doorProgress,','...nav,rigReady,modelReady,cabinReady,quality,streaming:!!assets,doorProgress,')
rep('moving:!!flight||!!doorMotion,','moving:!!flight||!!doorMotion||nav.phase===\'loading-cabin\',')
p.write_text(s)

# Content-hashed asset paths survive CSS-only deployments.
html=Path('_site/index.html').read_text()
start=html.index('<script>window.TI_NAV_CONFIG=');end=html.index('</script>',start)+len('</script>')
html=html[:start]+html[end:]
early='<script>window.TI_NAV_CONFIG='+json.dumps(config,separators=(',',':'))+';</script>'
early+="""<script>(function(){var q=innerWidth<820?'mobile':'desktop';var a=window.TI_NAV_CONFIG.stream?.qualities?.[q]?.exterior;if(!a)return;var gz=false;try{new DecompressionStream('gzip');gz=true;}catch(e){}var l=document.createElement('link');l.rel='preload';l.as='fetch';l.crossOrigin='anonymous';l.href=gz?a.gzip:a.url;document.head.appendChild(l);})();</script>"""
html=html.replace('</head>',early+'\n</head>',1)
Path('_site/index.html').write_text(html)
css=Path('_site/styles.css')
css.write_text(css.read_text()+"""
@media(min-width:820px){
 .hero.nav-enabled .nav-marker{display:inline-flex;width:max-content;min-width:max-content;max-width:none;flex-wrap:nowrap;white-space:nowrap;box-sizing:border-box}
 .hero.nav-enabled .nav-marker b{width:33px;min-width:33px;flex:0 0 33px;box-sizing:border-box}
 .hero.nav-enabled .nav-marker span{display:block;flex:0 0 auto;min-width:max-content;white-space:nowrap;overflow-wrap:normal;word-break:normal;hyphens:none;line-height:1.3}
}
.nav-note [data-cabin-progress]{font-variant-numeric:tabular-nums}
""")
print(json.dumps({'losslessStreaming':bool(config.get('stream')),'cameraDurationFactor':.85,'interiorLoad':'on-demand','sourceGeometry':'unchanged'}))
