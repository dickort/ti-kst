import * as THREE from 'three';

// All examples are illustrative. Equipment diagrams do not assert AMG compatibility.
const hood=[0,1.03,1.45],side=[.92,.70,.12],glass=[0,1.22,.58],seat=[.40,.82,-.35];
const entry=(kind,focus,eye,before,after,note='Визуальный пример. Возможность и результат работы определяются после осмотра.')=>({kind,focus,eye,before,after,note});
export const demonstrations={
 'ppf':entry('film',hood,[2.5,3.3,4.1],'Поверхность без плёнки','Прозрачный защитный слой','Край плёнки условно приподнят, чтобы показать прозрачный слой. Это не испытание защиты.'),
 'windshield-film':entry('glassfilm',glass,[2.7,2.3,3.5],'Стекло без защитного слоя','Защитная плёнка на стекле','Край слоя усилен для наглядности; оптические свойства зависят от материала.'),
 'protective-polish':entry('swirls',hood,[2.3,3,3.7],'Мелкая риска и рассеянный блик','Более ровный лак и чёткие отражения'),
 'protective-coating':entry('coating',hood,[2.3,3,3.7],'Вода растекается по поверхности','Капли собираются на покрытии','Условная демонстрация смачивания, не расчёт химических свойств состава.'),
 'radiator-mesh':entry('mesh',[0,.5,2.55],[2.4,1.4,4.5],'Открытые ячейки решётки','Дополнительная защитная сетка','Схема установки; размер ячейки и крепления подбираются отдельно.'),
 'anticorrosion':entry('underbody',[1,.35,1.2],[3.7,1.3,3.5],'Открытый металл образца днища','Защитный слой на образце','Вынесенный образец слоёв днища. Не модель реальной коррозии этого автомобиля.'),
 'detailing-wash':entry('dirt',side,[4.4,1.9,2.7],'Дорожная плёнка и загрязнения','Очищенная поверхность'),
 'body-polish':entry('swirls',hood,[2.3,3,3.7],'Круговые риски и царапины в свете','Удаление мелкой риски, ясный блик','Показаны поверхностные дефекты лака. Глубокие повреждения полировкой не устраняются.'),
 'pdr':entry('dent',side,[3.9,1.65,1.65],'Вмятина и искривлённое отражение','Восстановленная геометрия детали','Деформация геометрии модели. Применимость PDR зависит от повреждения и состояния ЛКП.'),
 'paint':entry('paint',side,[3.9,1.65,1.65],'Краска, грунт и оголённый металл','Восстановленное цветное покрытие'),
 'chips':entry('chips',hood,[2.3,3,3.7],'Локальные сколы и царапины','Локально восстановленные участки','Схема локальной коррекции; возможность работы без окраса проверяется при осмотре.'),
 'glass-repair':entry('crack',glass,[2.5,2.4,3.3],'Скол с лучевыми трещинами','Заполненный скол, остаточный след','След ремонта может оставаться. Это не обещание полного исчезновения трещины.'),
 'interior-clean':entry('clean',seat,[2.1,1.75,.05],'Пятна на сиденье и обивке','Очищенная фактура материала'),
 'leather':entry('leather',seat,[2.1,1.75,.05],'Потёртая кожа и мелкие трещины','Восстановленный цвет и поверхность'),
 'plastic':entry('plastic',[.3,.95,.45],[1.6,1.35,-.25],'Царапины на отделке панели','Восстановленная поверхность пластика'),
 'soundproof':entry('layers',[1.6,.83,-.4],[4.5,1.9,.7],'Металл дверной панели','Вибродемпфер и звукопоглощающий слой','Разнесённая схема слоёв рядом с дверью. Эффективность в децибелах здесь не моделируется.'),
 'anti-chrome':entry('chrome',hood,[3.3,1.5,4.3],'Хромированная отделка','Тёмная отделка элементов'),
 'tint':entry('tint',glass,[4.1,2,1.2],'Исходная отделка стекла','Более тёмное стекло','Визуальная примерка, не образец светопропускания.'),
 'steering':entry('steering',[.36,1,.42],[1.5,1.35,-.15],'Исходная обивка руля','Новая отделка и контрастная строчка','Пример отделки. Материал и рисунок шва согласовываются индивидуально.'),
 'interior-trim':entry('trim',seat,[2.1,1.75,.05],'Исходная обивка','Коньячная кожа и контрастные швы'),
 'alarm':entry('alarm',side,[4.4,2.2,2.7],'Охранный комплекс не показан','Блок и датчики охранного комплекса','Условная схема размещения, без воспроизведения схем подключения и конкретной модели.'),
 'closers':entry('closer',[.9,.85,-.2],[3.1,1.5,.5],'Прикрываем дверь → доводчик дотягивает замок','Дверь закрыта без хлопка','Два этапа: дверь прикрывают, затем доводчик подтягивает замок. Иллюстрация движения; совместимость проверяется отдельно.'),
 'ambient':entry('ambient',[.3,.95,.3],[3.2,1.8,-.8],'Подсветка выключена','Свет в панели, дверях и нишах'),
 'steps':entry('step',[1.1,.28,0],[4.2,1.5,2.2],'Порог убран','Подножка выдвинута','Условная схема механизма. Не подтверждает возможность установки на этот AMG.'),
 'dashcam':entry('camera',[0,1.28,.64],[1.7,1.65,2.0],'Без дополнительного устройства','Регистратор за лобовым стеклом','Стекло временно показано прозрачнее, чтобы рассмотреть крепление. Корпус иллюстративный, не конкретная модель.'),
 'towbar':entry('hitch',[0,.4,-2.8],[2.9,1.5,-4.7],'Без дополнительного оборудования','Сцепной узел и розетка','Схема оборудования. Допустимость установки и нагрузки не заявляются.'),
 'forged-wheels':entry('wheel',[1.4,.55,1.55],[4.4,1.6,3.8],'Исходный вид колеса','Образец пятиспицевого диска','Отдельный образец дизайна рядом с колесом. Размеры и совместимость подбираются по каталогу.'),
 'suspension':entry('spring',[1.4,.65,1.55],[4.4,1.6,3.8],'Исходное состояние схемы','Пружина и амортизатор','Вынесенная схема узла. Реальная подвеска не вскрыта; изменение клиренса не обещается.')
};
// Installation services open on the installed result; repairs open on the defect.
for(const slug of ['ppf','windshield-film','protective-coating','radiator-mesh','anticorrosion','soundproof','anti-chrome','tint','interior-trim','alarm','ambient','steps','dashcam','towbar','forged-wheels','suspension'])demonstrations[slug].preview=1;
const kinds=['none','swirls','paint','chips','dirt','film','coating','crack','glassfilm','clean','leather','plastic','trim','steering','tint','chrome','dent'];
export function createServiceEffects({scene,model,paints,invalidate,setDoorFraction,setAmbientFraction,inspectionLight}){
 const scratchCanvas=document.createElement('canvas');scratchCanvas.width=scratchCanvas.height=1024;const cx=scratchCanvas.getContext('2d');cx.fillStyle='#000';cx.fillRect(0,0,1024,1024);let seed=4127;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<200;i++){cx.strokeStyle='rgba(255,255,255,'+(.4+random()*.5)+')';cx.lineWidth=1.1+random()*.8;cx.beginPath();const a=random()*Math.PI*2;cx.arc(random()*1024,random()*1024,30+random()*220,a,a+.2+random()*.9);cx.stroke();}
 for(let i=0;i<35;i++){const x=random()*1024,y=random()*1024;cx.strokeStyle='rgba(255,255,255,.7)';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+20+random()*110,y+(random()-.5)*40);cx.stroke();}
 const scratches=new THREE.CanvasTexture(scratchCanvas);scratches.wrapS=scratches.wrapT=THREE.RepeatWrapping;scratches.anisotropy=4;
 const u={demoScratches:{value:scratches},demoKind:{value:0},demoProgress:{value:0},demoFocus:{value:new THREE.Vector3()},demoRadius:{value:.40}};
 let active=null,progress=0,shaderCount=0,dent=null,inspectionState=null;const driver=model.getObjectByName('driverDoor'),rest=driver?.quaternion.clone();
 const group=new THREE.Group();group.name='illustrative-service-equipment';scene.add(group);
 const equipment={};const paintSet=new Set(paints),visited=new Set();
 // Keep every pre-existing shader hook (paint zones and cabin diffuser).
 model.traverse(mesh=>{if(!mesh.isMesh)return;for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
  if(visited.has(m))continue;visited.add(m);
  const type=paintSet.has(m)?1:/^(Glass|Rear_glass)$/.test(m.name)?2:/Leather|Alcantara/.test(m.name)?3:/Plastic|Dash|Satin_Interior/.test(m.name)?4:/^(Chrome|Chrome_2|Aluminum)$/.test(m.name)?5:/Stitch/.test(m.name)?6:/Steering/.test(m.name)?7:0;
  if(!type)continue;
  const previous=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m);
  m.onBeforeCompile=shader=>{previous(shader);shaderCount++;Object.assign(shader.uniforms,u);
   shader.vertexShader='varying vec3 demoWorld; varying vec3 demoWorldNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\ndemoWorld=(modelMatrix*vec4(transformed,1.)).xyz;demoWorldNormal=normalize(mat3(modelMatrix)*objectNormal);');
   shader.fragmentShader=`varying vec3 demoWorld;varying vec3 demoWorldNormal;uniform sampler2D demoScratches;uniform float demoKind;uniform float demoProgress;uniform vec3 demoFocus;uniform float demoRadius;
    float demoHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float demoNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(demoHash(i),demoHash(i+vec2(1,0)),f.x),mix(demoHash(i+vec2(0,1)),demoHash(i+vec2(1,1)),f.x),f.y);}
    float demoLine(float distance,float width){return 1.-smoothstep(width,width+max(fwidth(distance),.0008),distance);}
    `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    vec3 dn=abs(normalize(demoWorldNormal));vec2 duv=dn.y>dn.x&&dn.y>dn.z?demoWorld.xz:(dn.x>dn.z?demoWorld.zy:demoWorld.xy);
    vec2 localUV=abs(demoFocus.x)>.7?(demoWorld-demoFocus).zy:(demoWorld-demoFocus).xz;
    float remaining=1.-demoProgress;
    float scratch=0.;float relief=0.;float metalExposure=0.;
    ${type===1?`
    if(demoKind==1.){
     scratch=texture2D(demoScratches,duv*.8).r*remaining;
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.44),scratch*.65);roughnessFactor=mix(roughnessFactor,.43,remaining*.5);relief=scratch*.0007;
    }
    if(demoKind==2.){
     float edge=length(localUV/vec2(.44,.24))+(demoNoise(localUV*35.)-.5)*.22;
     float layers=(1.-smoothstep(.9,1.04,edge))*remaining;
     float primer=(1.-smoothstep(.69,.78,edge))*remaining;
     metalExposure=(1.-smoothstep(.48,.58,edge))*remaining;
     float region=step(abs(demoWorld.x-demoFocus.x),.22);
     layers*=region;primer*=region;metalExposure*=region;
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.45,.43,.37),layers);
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.19,.20),primer);
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.59,.62)*( .96+.04*sin(localUV.x*700.)),metalExposure);
     roughnessFactor=mix(roughnessFactor,.57,layers);roughnessFactor=mix(roughnessFactor,.42,metalExposure);relief=layers*.0008;
    }
    if(demoKind==3.){vec2 p=duv*28.,cell=floor(p);float chip=(1.-smoothstep(.04,.11,length(fract(p)-.5)))*step(.72,demoHash(cell))*remaining;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.32),chip);roughnessFactor=mix(roughnessFactor,.7,chip);relief=chip*.001;}
    if(demoKind==4.){float dirt=smoothstep(.28,.68,demoNoise(duv*8.)*.7+demoNoise(duv*39.)*.3)*remaining;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.13,.07),dirt*.8);roughnessFactor=mix(roughnessFactor,.92,dirt);}
    if(demoKind==5.){float sheet=step(.78,demoWorld.z)*step(.82,demoWorld.y)*step(demoWorld.y,1.4)*step(abs(demoWorld.x),.87);roughnessFactor=mix(roughnessFactor,.10,sheet*demoProgress);float rim=demoLine(abs(abs(demoWorld.x)-.82),.004)*sheet;diffuseColor.rgb+=vec3(.15,.24,.26)*rim*demoProgress;}
    if(demoKind==6.){roughnessFactor=mix(roughnessFactor,.12,demoProgress);}
    `:''}
    ${type===2?`
    if(demoKind==7.){vec2 q=(demoWorld-demoFocus).xy;float r=length(q),a=atan(q.y,q.x);float ray=demoLine(abs(sin(a*4.+sin(r*42.)*.16))*r,.0018)*(1.-smoothstep(.10,.27,r));float core=1.-smoothstep(.007,.020,r);scratch=max(ray,core)*(1.-demoProgress*.88);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.7,.76,.8),scratch);relief=scratch*.001;}
    if(demoKind==8.){roughnessFactor=mix(roughnessFactor,.08,demoProgress);float rim=demoLine(abs(abs(demoWorld.x)-.57),.004);diffuseColor.rgb+=vec3(.18,.25,.3)*rim*demoProgress;}
    if(demoKind==14.)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.001,.002,.003),demoProgress);
    `:''}
    ${type===3||type===4||type===7?`
    if(demoKind==9.&&${type===3?'true':'false'}){float seatArea=1.-smoothstep(.25,.70,length(demoWorld-vec3(.40,.68,-.12)));float stain=smoothstep(.40,.70,demoNoise(duv*13.))*remaining*seatArea;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.105,.04),stain*.60);roughnessFactor=mix(roughnessFactor,.96,stain);}
    if((demoKind==10.&&${type===3?'true':'false'})||(demoKind==11.&&${type===4?'true':'false'})){
     float wear=demoNoise(duv*20.);float lines=demoLine(abs(sin((duv.x+sin(duv.y*17.)*.025)*190.)),.055)*step(.5,wear);
     scratch=(lines*.8+smoothstep(.66,.8,wear)*.45)*remaining;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.38,.31,.23),scratch);roughnessFactor=mix(roughnessFactor,.92,scratch);relief=scratch*.0007;
    }
    if(demoKind==12.&&${type===3?'true':'false'})diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.216,.087,.036),demoProgress);
    if(demoKind==13.){float zone=1.-smoothstep(.27,.40,length(demoWorld-vec3(.38,1.05,.40)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.19,.065,.025),zone*demoProgress);}
    `:''}
    ${type===5?'if(demoKind==15.){diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.008,.012,.018),demoProgress);roughnessFactor=mix(roughnessFactor,.26,demoProgress);}':''}
    ${type===6?'if(demoKind==12.||demoKind==13.)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.6,.34,.14),demoProgress);':''}
   `);
   if(type===1)shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\nmaterial.clearcoat*=1.-metalExposure;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.65,metalExposure);');
   // Surface-gradient bump mapping makes marks respond to the active studio lights.
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);vec3 rx=cross(dpdy,normal),ry=cross(normal,dpdx);float det=dot(dpdx,rx);
    normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*rx+dFdy(relief)*ry));
   `);
  };m.customProgramCacheKey=()=>cache()+'-service-v1-'+type;m.needsUpdate=true;
 }});
 const mat=(color,metalness=.2,roughness=.45)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const steel=mat('#a0adb5',.85,.27),black=mat('#19212b',.2,.58),blue=mat('#7198b0',.5,.38),rubber=mat('#292a29',0,.96);
 function box(g,p,s,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...s),m);o.position.set(...p);g.add(o);return o;}
 function tube(g,points,r,m){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const o=new THREE.Mesh(new THREE.TubeGeometry(path,48,r,8,false),m);g.add(o);return o;}
 function sphere(g,p,r,m){const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,10),m);o.position.set(...p);g.add(o);return o;}
 function make(kind){const g=new THREE.Group();g.name='service-'+kind;g.visible=false;group.add(g);equipment[kind]=g;return g;}
 // Lifted film edges are explanatory cutaways, sampled against the actual surface.
 for(const kind of ['film','glassfilm']){
  const g=make(kind),count=18,vertices=[],valid=[],indices=[];
  for(let row=0;row<=count;row++)for(let col=0;col<=count;col++){
   const u=col/count,v=row/count;
   const origin=kind==='film'?new THREE.Vector3((u-.5)*1.5,3,.9+v*1.15):new THREE.Vector3((u-.5)*1.1,1.07+v*.34,4);
   const direction=kind==='film'?new THREE.Vector3(0,-1,0):new THREE.Vector3(0,0,-1);
   const hit=new THREE.Raycaster(origin,direction).intersectObject(model,true).find(h=>{const m=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material;return kind==='film'?paintSet.has(m):m.name==='Glass';});
   valid.push(!!hit);const point=hit?.point.clone()||origin;
   const lift=.009+Math.pow(Math.max(0,(u-.68)/.32),2)*Math.pow(Math.max(0,(v-.66)/.34),2)*.14;
   if(kind==='film')point.y+=lift;else point.z+=lift;vertices.push(...point.toArray());
  }
  for(let row=0;row<count;row++)for(let col=0;col<count;col++){const a=row*(count+1)+col,b=a+1,c=a+count+1,d=c+1;if([a,b,c,d].every(i=>valid[i]))indices.push(a,c,b,b,c,d);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const sheet=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({color:'#b2d8df',metalness:0,roughness:.16,clearcoat:1,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));g.add(sheet);
  for(const edge of [Array.from({length:count+1},(_,i)=>i),Array.from({length:count+1},(_,i)=>i*(count+1)+count),Array.from({length:count+1},(_,i)=>count*(count+1)+i)]){const points=edge.filter(i=>valid[i]).map(i=>vertices.slice(i*3,i*3+3));if(points.length>2)tube(g,points,.003,new THREE.MeshBasicMaterial({color:'#b2d8df',transparent:true,opacity:.7}));}
 }
 {
 const g=make('dent');const diffuser=new THREE.Mesh(new THREE.PlaneGeometry(.07,1.5),new THREE.MeshBasicMaterial({color:new THREE.Color(2,2.2,2.5)}));diffuser.position.set(3,1.2,-1.05);diffuser.lookAt(.92,.70,.12);g.add(diffuser);
 }
 {
 const g=make('mesh');g.position.set(0,.5,2.55);for(let i=-10;i<=10;i++)box(g,[i*.068,0,0],[.008,.28,.009],black);for(let i=-2;i<=2;i++)box(g,[0,i*.065,0],[1.4,.008,.009],black);
 }
 {
 const g=make('layers');g.position.set(1.8,.83,-.45);box(g,[0,0,0],[.025,.65,1.05],steel);box(g,[.18,0,0],[.04,.62,1.0],blue);box(g,[.38,0,0],[.08,.58,.95],rubber);
 for(let z=-.4;z<=.4;z+=.1)box(g,[.21,0,z],[.005,.60,.008],steel);
 }
 {
 const g=make('underbody');g.position.set(1.3,.38,1.2);box(g,[0,0,0],[.05,.45,.65],steel);const coat=box(g,[.04,0,0],[.035,.43,.63],rubber);coat.userData.result=true;
 }
 {
 const g=make('step');g.position.set(.95,.23,0);box(g,[.1,0,0],[.32,.06,1.8],steel);for(let z=-.8;z<=.8;z+=.12)box(g,[.1,.033,z],[.29,.008,.028],rubber);box(g,[-.1,-.07,-.6],[.3,.04,.05],black);box(g,[-.1,-.07,.6],[.3,.04,.05],black);
 }
 {
 const g=make('camera');const windshield=new THREE.Raycaster(new THREE.Vector3(0,1.28,4),new THREE.Vector3(0,0,-1)).intersectObject(model,true).find(h=>h.point.z>0&&(Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material).name==='Glass');g.position.copy(windshield?.point||new THREE.Vector3(0,1.28,.7));g.position.z-=.065;demonstrations.dashcam.focus=g.position.toArray();box(g,[0,0,0],[.20,.10,.08],black);box(g,[-.015,0,-.043],[.14,.065,.006],new THREE.MeshBasicMaterial({color:'#536b76'}));sphere(g,[.08,.025,-.047],.007,new THREE.MeshBasicMaterial({color:'#d74b41'}));sphere(g,[.045,0,.055],.034,steel);sphere(g,[.045,0,.075],.024,mat('#14293c',.6,.08));box(g,[0,.09,-.02],[.035,.10,.025],steel);
 }
 {
 const g=make('hitch');g.position.set(0,.3,-2.55);tube(g,[[0,0,0],[0,0,-.28],[0,.13,-.40]],.035,steel);sphere(g,[0,.17,-.40],.055,steel);box(g,[.16,0,-.24],[.09,.12,.06],black);
 }
 {
 const g=make('wheel');g.position.set(1.55,.57,1.55);const ring=new THREE.Mesh(new THREE.TorusGeometry(.35,.035,10,48),steel);ring.rotation.y=Math.PI/2;g.add(ring);sphere(g,[0,0,0],.085,steel);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const spoke=box(g,[0,Math.cos(a)*.19,Math.sin(a)*.19],[.055,.34,.045],steel);spoke.rotation.x=a;}
 }
 {
 const g=make('spring');g.position.set(1.55,.7,1.55);box(g,[0,0,0],[.04,.68,.04],steel);const pts=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*12;pts.push([Math.cos(a)*.12,-.28+i/160*.56,Math.sin(a)*.12]);}tube(g,pts,.022,blue);box(g,[0,-.31,0],[.3,.035,.3],black);box(g,[0,.31,0],[.3,.035,.3],black);
 }
 {
 const g=make('alarm');g.position.set(1.35,.9,.1);box(g,[0,0,0],[.08,.25,.32],black);for(const p of [[0,.38,.45],[0,-.25,-.6]]){sphere(g,p,.06,blue);tube(g,[[0,0,0],p],.008,steel);}sphere(g,[.05,.06,.08],.025,new THREE.MeshBasicMaterial({color:'#6cc5c1'}));
 }
 {
 const g=make('coating');g.position.set(...hood);const dropMat=new THREE.MeshPhysicalMaterial({color:'#aac9dc',roughness:.08,metalness:.1,clearcoat:1,transparent:true,opacity:.7});
 for(let i=0;i<24;i++){const x=((i*17)%23)/23*1.2-.6,z=((i*11)%19)/19*.8-.4;const ray=new THREE.Raycaster(new THREE.Vector3(x,3,hood[2]+z),new THREE.Vector3(0,-1,0));const h=ray.intersectObject(model,true).find(h=>paintSet.has(Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material));if(!h)continue;const o=sphere(g,h.point.clone().sub(g.position).toArray(),.022+(i%3)*.005,dropMat);o.userData.drop=true;}
 }
 // A real displacement of existing paint geometry, with original data restored on exit.
 function prepareDent(){
  const saved=driver?.quaternion.clone();if(driver)driver.quaternion.copy(rest);model.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(4,side[1],side[2]),new THREE.Vector3(-1,0,0));const hit=ray.intersectObject(model,true).find(h=>paintSet.has(Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material));
  const center=hit?.point||new THREE.Vector3(...side);const records=[];let count=0;
  model.traverse(mesh=>{if(!mesh.isMesh||!paintSet.has(mesh.material))return;const source=mesh.geometry,p=source.attributes.position,normal=source.attributes.normal,indices=[],weights=[],v=new THREE.Vector3();
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);const d=v.distanceTo(center);if(d<.36&&Math.abs(v.x-center.x)<.18){indices.push(i);weights.push(Math.pow(1-d*d/(.36*.36),3));}}
   if(!indices.length)return;
   // GLB uses quantized attributes: convert this affected mesh to floats before displacement,
   // otherwise moving below the original quantization range wraps unsigned coordinates.
   mesh.geometry=source.clone();const positions=new Float32Array(p.count*3),normals=new Float32Array(p.count*3);
   for(let i=0;i<p.count;i++){positions.set([p.getX(i),p.getY(i),p.getZ(i)],i*3);normals.set([normal.getX(i),normal.getY(i),normal.getZ(i)],i*3);}
   mesh.geometry.setAttribute('position',new THREE.BufferAttribute(positions.slice(),3));mesh.geometry.setAttribute('normal',new THREE.BufferAttribute(normals.slice(),3));
   const localDirection=new THREE.Vector3(1,0,0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld.clone().invert()));const toWorld=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),toLocal=toWorld.clone().invert();
   const gradients=[],worldNormals=[],ranges=[];
   for(const id of indices){const v=new THREE.Vector3().fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld).sub(center),q=1-v.lengthSq()/(.36*.36);gradients.push(v.multiplyScalar(-6*q*q/(.36*.36)));worldNormals.push(new THREE.Vector3().fromBufferAttribute(normal,id).applyMatrix3(toWorld).normalize());const last=ranges.at(-1);if(last&&last.start+last.count===id*3)last.count+=3;else ranges.push({start:id*3,count:3});}
   mesh.geometry.computeBoundingSphere();mesh.geometry.boundingSphere.radius+=localDirection.length()*.045;
   mesh.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);mesh.geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
   records.push({mesh,source,positions,normals,indices,weights,localDirection,worldMatrix:mesh.matrixWorld.clone(),gradients,worldNormals,toLocal,ranges});count+=indices.length;
  });if(driver)driver.quaternion.copy(saved);model.updateMatrixWorld(true);return {center,records,count,maxDepth:.045};
 }
 function deform(amount){
  if(!dent||dent.amount===amount)return;dent.amount=amount;
  const n=new THREE.Vector3(),depth=dent.maxDepth*amount;
  for(const r of dent.records){
   const p=r.mesh.geometry.attributes.position,normals=r.mesh.geometry.attributes.normal;
   for(let j=0;j<r.indices.length;j++){
    const id=r.indices[j],offset=id*3,d=r.weights[j]*depth;
    p.setXYZ(id,r.positions[offset]-r.localDirection.x*d,r.positions[offset+1]-r.localDirection.y*d,r.positions[offset+2]-r.localDirection.z*d);
    if(amount){const grad=r.gradients[j];n.copy(r.worldNormals[j]);n.x/=1-depth*grad.x;n.y+=depth*grad.y*n.x;n.z+=depth*grad.z*n.x;n.applyMatrix3(r.toLocal).normalize();normals.setXYZ(id,n.x,n.y,n.z);}
    else normals.setXYZ(id,r.normals[offset],r.normals[offset+1],r.normals[offset+2]);
   }
   // Upload only changed contiguous vertex ranges; bounds already include the full dent.
   for(const attribute of [p,normals]){attribute.clearUpdateRanges();for(const range of r.ranges)attribute.addUpdateRange(range.start,range.count);attribute.needsUpdate=true;}
  }
 }
 function clear(){if(active?.kind==='dent')deform(0);if(inspectionState){inspectionLight.position.copy(inspectionState.position);inspectionLight.quaternion.copy(inspectionState.quaternion);Object.assign(inspectionLight,{width:inspectionState.width,height:inspectionState.height,intensity:inspectionState.intensity});inspectionState=null;}active=null;u.demoKind.value=0;Object.values(equipment).forEach(g=>g.visible=false);invalidate();}
 function apply(value){progress=THREE.MathUtils.clamp(value,0,1);u.demoProgress.value=progress;if(!active)return;const kind=active.kind;
  if(kind==='dent')deform(1-progress);
  for(const [key,g] of Object.entries(equipment)){g.visible=key===kind&&(key==='dent'||key==='layers'||key==='underbody'||key==='coating'||progress>.001);if(!g.visible)continue;
   if(key==='layers')g.children.forEach((o,i)=>o.visible=i===0||progress>.02);
   if(key==='underbody')g.children.forEach(o=>{if(o.userData.result)o.visible=progress>.02;});
   if(key==='step')g.position.x=.95+progress*.24;
   if(key==='coating')g.children.forEach(o=>o.scale.set(2.3-progress*1.3,.25+progress*.65,2.3-progress*1.3));
   if(['mesh','camera','hitch','wheel','spring','alarm'].includes(key))g.scale.setScalar((.85+.15*progress)*(g.userData.previewScale||1));
  }
  if(kind==='closer')setDoorFraction(progress===1?0:progress<.55?THREE.MathUtils.lerp(.32,.035,progress/.55):THREE.MathUtils.lerp(.035,0,(progress-.55)/.45));
  if(kind==='ambient')setAmbientFraction(progress);
  invalidate();
 }
 function select(slug){clear();active=demonstrations[slug];if(!active)throw new Error('Missing service demonstration: '+slug);u.demoKind.value=kinds.indexOf(active.kind);u.demoFocus.value.set(...active.focus);if(active.kind==='dent'){if(inspectionLight){inspectionState={position:inspectionLight.position.clone(),quaternion:inspectionLight.quaternion.clone(),width:inspectionLight.width,height:inspectionLight.height,intensity:inspectionLight.intensity};inspectionLight.position.set(3,1.2,-1.05);inspectionLight.lookAt(.92,.70,.12);inspectionLight.width=.07;inspectionLight.height=1.5;inspectionLight.intensity=9;}dent??=prepareDent();u.demoFocus.value.copy(dent.center);}apply(0);return active;}
 return {select,apply,clear,demonstrations,group,setLightMode(mode){if(inspectionState){const factor=mode==='inspection'?1:.18;inspectionState.intensity=4*factor;inspectionLight.intensity=9*factor;}},get status(){return {kind:active?.kind||null,initialProgress:active?.preview||0,progress,shaderCount,displacedVertices:active?.kind==='dent'?dent?.count:0,actualDentDisplacement:active?.kind==='dent'?Math.max(0,...dent.records.map(r=>{const p=r.mesh.geometry.attributes.position;let max=0;for(const i of r.indices){const delta=new THREE.Vector3(p.getX(i)-r.positions[i*3],p.getY(i)-r.positions[i*3+1],p.getZ(i)-r.positions[i*3+2]).applyMatrix3(new THREE.Matrix3().setFromMatrix4(r.worldMatrix));max=Math.max(max,delta.length());}return max;})):0,maxDentDepth:active?.kind==='dent'?dent.maxDepth*(1-progress):0,equipment:Object.entries(equipment).filter(([,g])=>g.visible).map(([k])=>k)};}};
}
