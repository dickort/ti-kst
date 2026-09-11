import * as THREE from 'https://esm.sh/three@0.169.0';
import { createDriverDoorController } from './driver-door-controller-v3.js';

/** Uses the existing renderer and verified original-object door rig. */
export function mountDriverDoorExperience({ model, camera, canvas, stage, pauseExterior, getExteriorTarget }) {
  const hero=stage.closest('.hero'),panel=document.getElementById('directionPanel');
  if(!hero||!panel||!model.getObjectByName('driverDoor')||!model.getObjectByName('interiorCabin'))return null;
  let active=false,queue=null,returnPanelOpen=false,focusBefore=null,lastPinch=null;
  const listeners=[],pointers=new Map(),target=new THREE.Vector3();
  const bind=(el,event,fn,options)=>{el.addEventListener(event,fn,options);listeners.push(()=>el.removeEventListener(event,fn,options));};
  const entry=document.createElement('button');entry.type='button';entry.className='interior-entry';
  entry.textContent='Открыть водительскую дверь  ↗';entry.setAttribute('aria-controls','driverInteriorPanel');entry.hidden=true;
  panel.insertBefore(entry,document.getElementById('panelServices'));
  const ui=document.createElement('aside');ui.id='driverInteriorPanel';ui.className='driver-interior-panel';ui.hidden=true;
  ui.setAttribute('aria-labelledby','driverInteriorHeading');
  ui.innerHTML=`
    <button type="button" class="interior-close" aria-label="Закрыть дверь и вернуться к автомобилю">×</button>
    <p class="interior-kicker">ИНТЕРЬЕР · MERCEDES-AMG</p>
    <h2 id="driverInteriorHeading">Внимание<br>к деталям.</h2>
    <p class="interior-status" role="status" aria-live="polite">Открываем водительскую дверь…</p>
    <div class="interior-views" aria-label="Ракурсы салона">
      <button type="button" data-cabin-view="interior">Общий вид</button>
      <button type="button" data-cabin-view="seat">Сиденье</button>
      <button type="button" data-cabin-view="wheel">Руль</button>
      <button type="button" data-cabin-view="door">Карта двери</button>
    </div>
    <nav class="interior-services" aria-label="Услуги для салона">
      <a href="./service.html?service=interior-clean">Химчистка салона <span>↗</span></a>
      <a href="./service.html?service=leather">Восстановление кожи <span>↗</span></a>
      <a href="./service.html?service=plastic">Восстановление пластика <span>↗</span></a>
      <a href="./service.html?service=steering">Перешив руля <span>↗</span></a>
      <a href="./service.html?service=interior-trim">Перешив элементов салона <span>↗</span></a>
      <a href="./service.html?service=soundproof">Шумоизоляция <span>↗</span></a>
      <a href="./service.html?service=ambient">Амбиентная подсветка <span>↗</span></a>
    </nav>
    <button class="interior-return" type="button">Закрыть дверь · к автомобилю</button>`;
  hero.append(ui);
  const status=ui.querySelector('.interior-status'),closeButton=ui.querySelector('.interior-close');
  const viewButtons=[...ui.querySelectorAll('[data-cabin-view]')];
  // Target bridge avoids adding a second orbit controller/render loop.
  const controls={target:getExteriorTarget().clone(),enableDamping:false};
  function frameView(view){
    if(window.innerWidth<=1180)return view;
    const direction=view.target.clone().sub(view.eye).normalize();
    const screenRight=direction.clone().cross(camera.up).normalize();
    const fraction=Math.min(.38,(ui.offsetWidth+26)/Math.max(stage.clientWidth,1));
    const extent=view.eye.distanceTo(view.target)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect;
    view.target.addScaledVector(screenRight,extent*fraction);return view;
  }
  function setHiddenHotspots(hidden){stage.querySelectorAll('.premium-hotspot').forEach(el=>{el.style.visibility=hidden?'hidden':'';el.style.pointerEvents=hidden?'none':'';});}
  function syncEntry(){const selected=document.querySelector('.direction-tab.active')?.dataset.direction;entry.hidden=active||!['restore','tune'].includes(selected);}
  function finish(){
    active=false;ui.hidden=true;hero.classList.remove('interior-active');canvas.classList.remove('interior-dragging');
    entry.setAttribute('aria-expanded','false');setHiddenHotspots(false);
    if(returnPanelOpen&&!queue)panel.classList.add('open');
    const next=queue;queue=null;syncEntry();
    if(next)requestAnimationFrame(()=>next.click());else if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});
  }
  const controller=createDriverDoorController({model,camera,controls,initialTarget:getExteriorTarget(),frameView,
    onStateChange({state}){
      status.textContent=state==='opening'?'Открываем водительскую дверь…':state==='closing'?'Закрываем дверь…':'Выберите деталь или поверните камеру';
      viewButtons.forEach(btn=>{btn.disabled=state!=='open';});if(state==='closed'&&active)finish();
    }
  });
  function open(){
    if(active)return;pauseExterior();controls.target.copy(getExteriorTarget());
    returnPanelOpen=panel.classList.contains('open');focusBefore=document.activeElement;active=true;
    entry.setAttribute('aria-expanded','true');panel.classList.remove('open');hero.classList.add('interior-active');ui.hidden=false;
    setHiddenHotspots(true);viewButtons.forEach(btn=>{btn.disabled=true;});model.updateWorldMatrix(true,true);
    controller.open({compact:window.innerWidth<=1180});closeButton.focus({preventScroll:true});
  }
  function close(){if(!active)return;pointers.clear();lastPinch=null;controller.close();}
  bind(entry,'click',event=>{event.stopPropagation();open();});bind(closeButton,'click',close);bind(ui.querySelector('.interior-return'),'click',close);
  for(const button of viewButtons)bind(button,'click',()=>{viewButtons.forEach(el=>el.classList.toggle('active',el===button));controller.focus(button.dataset.cabinView,{compact:window.innerWidth<=1180});});
  // The next direction is queued until closure. Two controllers never write
  // camera transforms in the same frame.
  bind(document,'click',event=>{if(!active)return;const button=event.target.closest('.direction-tab');if(!button)return;event.preventDefault();event.stopImmediatePropagation();queue=button;close();},true);
  bind(document,'keydown',event=>{if(!active||event.key!=='Escape')return;event.preventDefault();event.stopImmediatePropagation();close();},true);
  bind(canvas,'pointerdown',event=>{
    if(!active||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();event.stopImmediatePropagation();if(controller.getState().state==='closing')return;
    controller.onManualInput();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);canvas.classList.add('interior-dragging');lastPinch=null;
  },true);
  bind(canvas,'pointermove',event=>{
    if(!active)return;event.stopImmediatePropagation();const last=pointers.get(event.pointerId);if(!last)return;event.preventDefault();
    const dx=event.clientX-last.x,dy=event.clientY-last.y;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});target.copy(controls.target);
    const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));const scale=model.getWorldScale(new THREE.Vector3()).x;
    if(pointers.size===2){const[a,b]=[...pointers.values()],length=Math.hypot(a.x-b.x,a.y-b.y);if(lastPinch&&length>1)spherical.radius*=lastPinch/length;lastPinch=length;}
    else{spherical.theta-=dx*.006;spherical.phi=THREE.MathUtils.clamp(spherical.phi+dy*.005,.40,1.55);}
    spherical.radius=THREE.MathUtils.clamp(spherical.radius,.9*scale,6*scale);camera.position.setFromSpherical(spherical).add(target);camera.lookAt(target);
  },true);
  const release=event=>{if(!active)return;event.stopImmediatePropagation();pointers.delete(event.pointerId);lastPinch=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(!pointers.size)canvas.classList.remove('interior-dragging');};
  bind(canvas,'pointerup',release,true);bind(canvas,'pointercancel',release,true);
  bind(canvas,'wheel',event=>{
    if(!active)return;event.preventDefault();event.stopImmediatePropagation();if(controller.getState().state==='closing')return;
    controller.onManualInput();target.copy(controls.target);const offset=camera.position.clone().sub(target),scale=model.getWorldScale(new THREE.Vector3()).x;
    const length=THREE.MathUtils.clamp(offset.length()*Math.exp(event.deltaY*.001),.9*scale,6*scale);offset.setLength(length);camera.position.copy(target).add(offset);camera.lookAt(target);
  },{capture:true,passive:false});
  const observer=new MutationObserver(syncEntry);document.querySelectorAll('.direction-tab').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));syncEntry();
  return {isActive:()=>active,update:now=>{if(active)controller.update(now);},open,close,getState:()=>({active,...controller.getState()}),
    dispose(){listeners.forEach(remove=>remove());observer.disconnect();controller.dispose();active=false;entry.remove();ui.remove();hero.classList.remove('interior-active');setHiddenHotspots(false);}
  };
}
