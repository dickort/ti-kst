import * as THREE from 'three';
// Deterministic local textures: no additional downloads or replacement of source maps.
export function grainTexture(kind,size=256){
 const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d'),data=ctx.createImageData(size,size);let seed=4127;
 const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let n=128+(random()-.5)*(kind==='plaster'?28:45);
  if(kind==='stone')n=145+Math.sin(x*.035+y*.02)*5+(random()-.5)*16;
  if(kind==='leather')n=125+Math.sin(x*.55+Math.sin(y*.4))*13+(random()-.5)*25;
  if(kind==='perforated'&&Math.hypot(x%16-8,y%16-8)<2.3)n=35;
  if(kind==='carbon')n=95+((Math.floor(x/8)+Math.floor(y/8))%2?35:0)+Math.sin((Math.floor(y/8)%2?x:y)*2)*13;
  const i=(y*size+x)*4;data.data[i]=data.data[i+1]=data.data[i+2]=n;data.data[i+3]=255;
 }
 ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
export function ensureSurfaceUV(mesh){
 if(mesh.geometry.attributes.uv)return;
 const g=mesh.geometry.clone(),p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
  uv[i*2]=(ax>ay&&ax>az?p.getZ(i):p.getX(i))*8;
  uv[i*2+1]=(ay>ax&&ay>az?p.getZ(i):p.getY(i))*8;
 }
 g.setAttribute('uv',new THREE.BufferAttribute(uv,2));mesh.geometry=g;
}
export function detailCabin(mesh,material,textures){
 const m=material.clone(),name=m.name;ensureSurfaceUV(mesh);
 if(/Leather/.test(name)){m.color.set('#161a1e');m.roughness=.57;m.metalness=0;m.bumpMap=/Perforated/.test(name)?textures.perforated:textures.leather;m.bumpScale=.0018;m.roughnessMap=textures.leather;}
 if(/Alcantara/.test(name)){m.color.set('#24282d');m.roughness=.96;m.metalness=0;m.bumpMap=textures.fabric;m.bumpScale=.0012;}
 if(/Matte_Plastic|Dash/.test(name)){m.color.set('#181d23');m.roughness=.66;m.metalness=0;m.bumpMap=textures.fabric;m.bumpScale=.00065;}
 if(/Carbon_Fiber_Interior/.test(name)){m.color.set('#41474d');m.map=textures.carbon;m.bumpMap=textures.carbon;m.bumpScale=.0007;m.roughness=.3;m.metalness=.35;}
 if(/Satin_Interior|Aluminum|Chrome/.test(name)){m.color.set('#8c99a7');m.roughness=.3;m.metalness=.82;}
 if(/Display/.test(name)){m.emissiveMap=m.map;m.emissive.set('#ffffff');m.emissiveIntensity=.45;m.roughness=.25;m.metalness=.05;}
 if(/Stitch/.test(name)){m.color.set('#b2b4b5');m.roughness=.9;}
 return m;
}
