import * as THREE from 'https://esm.sh/three@0.169.0';

/** Original-object AMG v3 rig. Shares the hero render loop; never cuts geometry. */
export function createDriverDoorController({ model, camera, controls = null, initialTarget = null, frameView = view => view, onStateChange = () => {}, requestRender = () => {} }) {
  if (!model || !camera) throw new TypeError('model and camera are required');
  const door = model.getObjectByName('driverDoor');
  const cabin = model.getObjectByName('interiorCabin');
  if (!door || !cabin) throw new Error('Use the original-object v3 driverDoor/interiorCabin GLB, not the old exterior asset.');
  // +X is the driver side: verified from steering-wheel object Mesh.299.
  const closeQuaternion = door.quaternion.clone();
  const axis = new THREE.Vector3(0, 1, 0);
  const openAngle = THREE.MathUtils.degToRad(-62);
  const tmpQuaternion = new THREE.Quaternion();
  const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
  const ease = value => { const t = clamp(value, 0, 1); return t*t*t*(t*(t*6-15)+10); };
  const shortest = (from, to) => from + Math.atan2(Math.sin(to-from), Math.cos(to-from));
  const look = controls?.target?.clone() || initialTarget?.clone() || model.localToWorld(new THREE.Vector3(0,.45,.08));
  let viewMotion = null, doorMotion = null, progress = 0, state = 'closed', returnView = null;
  let dampingBefore = controls?.enableDamping, disposed = false;
  const sourcePresets = {
    interior: { eye:[2.40,1.20,-.08], target:[.14,.48,.13] },
    seat: { eye:[1.99,1.15,-.55], target:[.21,.50,-.03] },
    wheel: { eye:[2.01,1.21,.14], target:[.26,.62,.31] },
    door: { eye:[1.88,1.11,-1.01], target:[.95,.45,.36] }
  };
  function setState(next) { if(state===next)return; state=next; onStateChange({state,doorProgress:progress}); }
  function worldPoint(values) { model.updateWorldMatrix(true,false); return model.localToWorld(new THREE.Vector3(...values)); }
  function captureView() { return {eye:camera.position.clone(),target:(controls?.target||look).clone()}; }
  function stopCamera() { viewMotion=null; if(controls && dampingBefore!==undefined)controls.enableDamping=dampingBefore; }
  function moveCamera(destination,duration=1850,delay=0) {
    const from=captureView();
    const a=new THREE.Spherical().setFromVector3(from.eye.clone().sub(from.target));
    const b=new THREE.Spherical().setFromVector3(destination.eye.clone().sub(destination.target));
    b.theta=shortest(a.theta,b.theta);
    if(controls){if(!viewMotion)dampingBefore=controls.enableDamping;controls.enableDamping=false;}
    viewMotion={from,destination,a,b,start:performance.now()+delay,duration};requestRender();
  }
  function focus(zone='interior',{compact=false}={}) {
    if(disposed||!sourcePresets[zone])return;
    if(state==='closed'||state==='closing'){open({compact});return;}
    const preset=sourcePresets[zone],target=worldPoint(preset.target),eye=worldPoint(preset.eye);
    if(compact)eye.sub(target).multiplyScalar(1.2).add(target);
    moveCamera(frameView({eye,target}),1350);
  }
  function open({compact=false}={}) {
    if(disposed||state==='open'||state==='opening')return;
    if(state==='closed')returnView=captureView();
    const preset=sourcePresets.interior,target=worldPoint(preset.target),eye=worldPoint(preset.eye);
    if(compact)eye.sub(target).multiplyScalar(1.2).add(target);
    cabin.visible=true;
    doorMotion={from:progress,to:1,start:performance.now()+650,duration:1100};
    moveCamera(frameView({eye,target}),1850);setState('opening');
  }
  function close() {
    if(disposed||state==='closed'||state==='closing')return;
    doorMotion={from:progress,to:0,start:performance.now(),duration:1050};
    if(returnView)moveCamera(returnView,1850,700);
    setState('closing');requestRender();
  }
  function update(now=performance.now()) {
    if(disposed)return false;
    if(doorMotion){
      const t=clamp((now-doorMotion.start)/doorMotion.duration,0,1);
      progress=lerp(doorMotion.from,doorMotion.to,ease(t));
      tmpQuaternion.setFromAxisAngle(axis,openAngle*progress);door.quaternion.copy(closeQuaternion).multiply(tmpQuaternion);
      if(t>=1)doorMotion=null;
    }
    if(viewMotion){
      const m=viewMotion,t=clamp((now-m.start)/m.duration,0,1),e=ease(t);
      look.lerpVectors(m.from.target,m.destination.target,e);
      const spherical=new THREE.Spherical(lerp(m.a.radius,m.b.radius,e),lerp(m.a.phi,m.b.phi,e),lerp(m.a.theta,m.b.theta,e));
      camera.position.setFromSpherical(spherical).add(look);if(controls)controls.target.copy(look);camera.lookAt(look);
      if(t>=1)stopCamera();
    }
    if(!doorMotion&&!viewMotion){if(state==='opening')setState('open');if(state==='closing')setState('closed');}
    return !!doorMotion||!!viewMotion;
  }
  const onManualStart=()=>stopCamera();controls?.addEventListener?.('start',onManualStart);
  return {
    open,close,focus,update,
    toggle:options=>state==='closed'||state==='closing'?open(options):close(),
    onManualInput:stopCamera,getTarget:()=>look.clone(),
    getState:()=>({state,doorProgress:progress,moving:!!doorMotion||!!viewMotion}),
    dispose(){stopCamera();doorMotion=null;controls?.removeEventListener?.('start',onManualStart);door.quaternion.copy(closeQuaternion);disposed=true;}
  };
}
