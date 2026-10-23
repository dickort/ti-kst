import * as THREE from 'three';
// Original poster artwork rendered from the same licensed-status demo model.
// No third-party photos, extra car downloads, or customer portfolio claims.
export function addStudioPosters(renderer,scene,model){
 const posterScene=new THREE.Scene();posterScene.background=new THREE.Color('#10171f');posterScene.environment=scene.environment;
 posterScene.add(new THREE.HemisphereLight(0xe2edff,0x4c5360,2));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,6,5);posterScene.add(key);
 const car=model.clone(true);car.traverse(n=>{if(!n.isMesh)return;n.castShadow=false;n.receiveShadow=false;n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();});posterScene.add(car);
 const target=new THREE.WebGLRenderTarget(512,512),cam=new THREE.PerspectiveCamera(34,1,.1,50),pixels=new Uint8Array(512*512*4),oldTarget=renderer.getRenderTarget();
 target.texture.colorSpace=THREE.SRGBColorSpace;
 const group=new THREE.Group();group.name='automotivePosters';scene.add(group);
 for(const [i,eye] of [[6,3,7],[7,2,0],[-6,3,-7]].entries()){
  car.traverse(n=>{if(!n.isMesh)return;for(const m of Array.isArray(n.material)?n.material:[n.material])if(/Carpaint|Satin_Metallic_(Blue|Dark|Black)|__roof|__spoiler/.test(m.name))m.color.set(['#a32938','#8c9aa8','#204d44'][i]);});
  cam.position.set(...eye);cam.lookAt(0,.65,0);renderer.setRenderTarget(target);renderer.render(posterScene,cam);renderer.readRenderTargetPixels(target,0,0,512,512,pixels);
  const raw=document.createElement('canvas');raw.width=raw.height=512;const ctx=raw.getContext('2d'),im=ctx.createImageData(512,512);for(let y=0;y<512;y++)im.data.set(pixels.subarray((511-y)*2048,(512-y)*2048),y*2048);ctx.putImageData(im,0,0);
  const c=document.createElement('canvas');c.width=640;c.height=840;const g=c.getContext('2d');g.fillStyle=['#181e28','#d3d0c8','#142d2a'][i];g.fillRect(0,0,640,840);g.fillStyle=i===1?'#17202a':'#e0e6e9';g.font='14px Arial';g.fillText('TI / AUTOMOTIVE STUDIES',42,55);g.font='bold 68px Arial';g.fillText(['GRAND','PURE','NIGHT'][i],38,150);g.fillText(['TOURING','FORM','DRIVE'][i],38,220);g.drawImage(raw,0,238,640,540);g.font='13px Arial';g.fillText('MERCEDES-AMG GT 63 S   /   0'+(i+1),42,807);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const frame=new THREE.Mesh(new THREE.PlaneGeometry(2.30,3.04),new THREE.MeshStandardMaterial({color:'#080c10',roughness:.5}));frame.position.set(-4.3+i*4.3,2.9,8.90);frame.rotation.y=Math.PI;group.add(frame);
  const print=new THREE.Mesh(new THREE.PlaneGeometry(2.16,2.90),new THREE.MeshStandardMaterial({map:tex,roughness:.8,metalness:0}));print.position.set(-4.3+i*4.3,2.9,8.87);print.rotation.y=Math.PI;group.add(print);
 }
 renderer.setRenderTarget(oldTarget);target.dispose();car.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose();});return group;
}
