import * as THREE from 'three';
export function setupColorWheel({state,onChange}){
 const wheel=document.querySelector('#color-wheel'),marker=document.querySelector('#hue-marker'),sat=document.querySelector('#color-saturation'),light=document.querySelector('#color-lightness');
 let hue=200;
 const sync=()=>{const c=new THREE.Color(state.color),hsl=c.getHSL({},THREE.SRGBColorSpace);if(hsl.s>.001)hue=hsl.h*360;sat.value=Math.round(hsl.s*100);light.value=Math.round(hsl.l*100);marker.style.transform=`rotate(${hue}deg)`;wheel.style.setProperty('--selected-color',state.color);wheel.setAttribute('aria-valuenow',String(Math.round(hue)));wheel.setAttribute('aria-valuetext',`${Math.round(hue)} градусов, ${state.color}`);document.querySelector('#wheel-hex').textContent=state.color.toUpperCase();};
 const apply=()=>{if(!state.ready)return;state.color='#'+new THREE.Color().setHSL(hue/360,+sat.value/100,+light.value/100,THREE.SRGBColorSpace).getHexString();onChange();sync();};
 const point=e=>{const r=wheel.getBoundingClientRect();hue=(Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*180/Math.PI+450)%360;apply();};
 wheel.addEventListener('pointerdown',e=>{if(!state.ready)return;e.preventDefault();wheel.setPointerCapture(e.pointerId);point(e);});
 wheel.addEventListener('pointermove',e=>{if(wheel.hasPointerCapture(e.pointerId))point(e);});
 wheel.addEventListener('pointerup',e=>{if(wheel.hasPointerCapture(e.pointerId))wheel.releasePointerCapture(e.pointerId);});
 wheel.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)||!state.ready)return;e.preventDefault();hue=e.key==='Home'?0:e.key==='End'?359:(hue+(['ArrowRight','ArrowUp'].includes(e.key)?1:-1)*(e.shiftKey?10:3)+360)%360;apply();});
 sat.oninput=light.oninput=apply;sync();return sync;
}
