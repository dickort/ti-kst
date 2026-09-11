import * as THREE from "https://esm.sh/three@0.169.0";

// Sculpted, lightweight web model inspired by the proportions and visual cues
// of the BMW M5 F90. Built specifically for the TI Detailing hero scene.
export function createM5F90Model() {
  const car = new THREE.Group();
  car.name = "TI_M5_F90_Sculpted_V2";

  const paint = new THREE.MeshPhysicalMaterial({
    name: "Paint M5 Graphite",
    color: 0x11151b,
    metalness: 0.86,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.055
  });
  const paintShadow = new THREE.MeshPhysicalMaterial({
    name: "Paint Shadow",
    color: 0x080a0d,
    metalness: 0.78,
    roughness: 0.23,
    clearcoat: 0.9
  });
  const black = new THREE.MeshStandardMaterial({ name: "Black Trim", color: 0x030405, metalness: 0.5, roughness: 0.25 });
  const satin = new THREE.MeshStandardMaterial({ name: "Shadow Chrome", color: 0x30353a, metalness: 0.96, roughness: 0.17 });
  const glass = new THREE.MeshPhysicalMaterial({
    name: "Glass",
    color: 0x0d1721,
    metalness: 0.04,
    roughness: 0.06,
    transparent: true,
    opacity: 0.84,
    transmission: 0.09,
    clearcoat: 0.75,
    side: THREE.DoubleSide
  });
  const tireMat = new THREE.MeshStandardMaterial({ name: "Tire", color: 0x030303, roughness: 0.9, metalness: 0.02 });
  const rimMat = new THREE.MeshStandardMaterial({ name: "M Rim", color: 0x343a40, roughness: 0.16, metalness: 0.98 });
  const discMat = new THREE.MeshStandardMaterial({ name: "Brake Disc", color: 0x7b8085, roughness: 0.28, metalness: 0.9 });
  const caliperMat = new THREE.MeshStandardMaterial({ name: "M Caliper", color: 0x174bc7, roughness: 0.28, metalness: 0.5 });
  const headlightMat = new THREE.MeshStandardMaterial({
    name: "Headlight",
    color: 0xe3efff,
    emissive: 0xc4dcff,
    emissiveIntensity: 1.55,
    roughness: 0.12,
    metalness: 0.05
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    name: "Brakelight",
    color: 0x7a060c,
    emissive: 0xff1730,
    emissiveIntensity: 1.25,
    roughness: 0.18
  });
  const signalMat = new THREE.MeshStandardMaterial({
    name: "Signallight",
    color: 0x6f3500,
    emissive: 0xff8c12,
    emissiveIntensity: 0.35,
    roughness: 0.2
  });

  const add = (mesh, name) => {
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    car.add(mesh);
    return mesh;
  };

  function loft(stations, radialSegments, material, name, sectionFn) {
    const positions = [];
    const indices = [];
    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      for (let j = 0; j < radialSegments; j++) {
        const a = (j / radialSegments) * Math.PI * 2;
        const p = sectionFn(s, a);
        positions.push(s.x, p.y, p.z);
      }
    }
    for (let i = 0; i < stations.length - 1; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const n = (j + 1) % radialSegments;
        const a = i * radialSegments + j;
        const b = (i + 1) * radialSegments + j;
        const c = (i + 1) * radialSegments + n;
        const d = i * radialSegments + n;
        indices.push(a, b, d, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    return add(mesh, name);
  }

  const bodyStations = [
    { x:-2.58, w:.67, cy:.76, ry:.36 },
    { x:-2.42, w:.86, cy:.78, ry:.43 },
    { x:-2.05, w:.95, cy:.80, ry:.48 },
    { x:-1.62, w:.99, cy:.81, ry:.50 },
    { x:-1.15, w:1.01, cy:.82, ry:.51 },
    { x:-.52,  w:1.015,cy:.83, ry:.52 },
    { x:.15,   w:1.02, cy:.84, ry:.52 },
    { x:.82,   w:1.01, cy:.85, ry:.51 },
    { x:1.36,  w:.99, cy:.86, ry:.50 },
    { x:1.88,  w:.95, cy:.86, ry:.47 },
    { x:2.28,  w:.87, cy:.83, ry:.43 },
    { x:2.56,  w:.69, cy:.78, ry:.34 }
  ];

  loft(bodyStations, 22, paint, "Sculpted body shell", (s, a) => {
    const c = Math.cos(a), sn = Math.sin(a);
    const sideBulge = 1 + 0.045 * Math.pow(Math.abs(sn), 2);
    const z = s.w * c * sideBulge;
    let y = s.cy + s.ry * sn;
    const floor = 0.30 + 0.045 * Math.pow(Math.abs(z) / Math.max(s.w, .001), 1.7);
    y = Math.max(y, floor);
    return { y, z };
  });

  // Sculpted bonnet and rear deck caps give the F90 its long-nose / short-deck stance.
  const hoodStations = [
    {x:.74,w:.79,y:1.17},{x:1.14,w:.84,y:1.20},{x:1.55,w:.86,y:1.22},{x:1.93,w:.84,y:1.20},{x:2.28,w:.76,y:1.13}
  ];
  const hoodPos=[]; const hoodIdx=[];
  hoodStations.forEach((s,i)=>{
    for(let j=0;j<9;j++){
      const t=j/8;
      const z=THREE.MathUtils.lerp(-s.w,s.w,t);
      const crown=.055*(1-Math.pow(Math.abs(z)/s.w,1.55));
      hoodPos.push(s.x,s.y+crown,z);
    }
    if(i<hoodStations.length-1){
      for(let j=0;j<8;j++){
        const a=i*9+j,b=(i+1)*9+j,c=(i+1)*9+j+1,d=i*9+j+1;
        hoodIdx.push(a,b,d,b,c,d);
      }
    }
  });
  const hoodGeo=new THREE.BufferGeometry(); hoodGeo.setAttribute("position",new THREE.Float32BufferAttribute(hoodPos,3)); hoodGeo.setIndex(hoodIdx); hoodGeo.computeVertexNormals();
  add(new THREE.Mesh(hoodGeo,paint),"Long sculpted bonnet");

  const cabinStations = [
    {x:-1.42,w:.70,cy:1.34,ry:.22},
    {x:-1.18,w:.76,cy:1.43,ry:.36},
    {x:-.78,w:.79,cy:1.48,ry:.42},
    {x:-.22,w:.80,cy:1.50,ry:.44},
    {x:.34,w:.79,cy:1.49,ry:.43},
    {x:.76,w:.75,cy:1.44,ry:.37},
    {x:1.10,w:.66,cy:1.33,ry:.24}
  ];
  loft(cabinStations, 18, paintShadow, "Cabin roof shell", (s,a)=>{
    const c=Math.cos(a),sn=Math.sin(a);
    return { y:s.cy+s.ry*sn, z:s.w*c };
  });

  function sideWindow(points, z, name) {
    const shape=new THREE.Shape();
    shape.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) shape.lineTo(points[i][0],points[i][1]);
    shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),glass);
    mesh.position.z=z;
    mesh.renderOrder=4;
    return add(mesh,name);
  }
  const frontSide=[[.05,1.22],[.70,1.35],[.91,1.62],[.54,1.76],[.02,1.79],[-.03,1.27]];
  const rearSide=[[-.10,1.27],[-.15,1.79],[-.70,1.76],[-1.10,1.60],[-1.31,1.25]];
  for(const z of [.805,-.805]){
    sideWindow(frontSide,z,`Front side glass ${z}`);
    sideWindow(rearSide,z,`Rear side glass ${z}`);
    const sign=Math.sign(z);
    const pillarMat=black;
    const mk=(w,h,x,y,rz,n)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.026),pillarMat);m.position.set(x,y,z+sign*.012);m.rotation.z=rz;add(m,n)};
    mk(.045,.52,-.07,1.50,0,`B pillar ${z}`);
    mk(.035,.48,.75,1.51,-.48,`A pillar ${z}`);
    mk(.035,.47,-1.07,1.48,.48,`C pillar ${z}`);
  }

  function thinBox(w,h,d,mat,x,y,z,rz=0,name="part") {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.rotation.z=rz;return add(m,name);
  }
  thinBox(.055,.58,1.48,glass,.86,1.48,0,-.50,"Windscreen");
  thinBox(.055,.54,1.43,glass,-1.18,1.46,0,.50,"Rear screen");
  thinBox(1.34,.045,1.45,black,-.18,1.90,0,0,"Shadowline roof panel");

  // Strong F90 front face: twin kidneys, thin lamps and large M intakes.
  function frontShape(points, material, name, x=2.575) {
    const shape=new THREE.Shape();
    shape.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) shape.lineTo(points[i][0],points[i][1]);
    shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);
    mesh.rotation.y=Math.PI/2;
    mesh.position.x=x;
    return add(mesh,name);
  }

  const kidneyR=[[.04,.72],[.38,.73],[.42,.84],[.40,1.08],[.34,1.18],[.07,1.18],[.01,1.06],[.01,.83]];
  const kidneyL=kidneyR.map(([z,y])=>[-z,y]);
  frontShape(kidneyR,satin,"Kidney grille right");
  frontShape(kidneyL,satin,"Kidney grille left");
  const innerR=[[.075,.76],[.34,.77],[.36,.85],[.35,1.13],[.29,1.15],[.10,1.15],[.055,1.05],[.055,.84]];
  frontShape(innerR,black,"Kidney core right",2.582);
  frontShape(innerR.map(([z,y])=>[-z,y]),black,"Kidney core left",2.582);
  for(const s of [-1,1]){
    for(let i=0;i<5;i++){
      const z=s*(.10+i*.055);
      thinBox(.026,.33,.014,satin,2.592,.95,z,0,`Kidney slat ${s}-${i}`);
    }
  }

  const lampR=[[.46,1.08],[.90,1.06],[.94,1.13],[.87,1.22],[.49,1.20],[.42,1.15]];
  const lampL=lampR.map(([z,y])=>[-z,y]);
  frontShape(lampR,black,"Headlamp housing R",2.584);
  frontShape(lampL,black,"Headlamp housing L",2.584);
  const sigR=[[.50,1.12],[.84,1.11],[.86,1.16],[.79,1.19],[.52,1.17]];
  frontShape(sigR,headlightMat,"Headlight R",2.592);
  frontShape(sigR.map(([z,y])=>[-z,y]),headlightMat,"Headlight L",2.592);
  thinBox(.035,.024,.33,headlightMat,2.598,1.145,.67,.03,"DRL R");
  thinBox(.035,.024,.33,headlightMat,2.598,1.145,-.67,-.03,"DRL L");
  thinBox(.036,.018,.08,signalMat,2.60,1.095,.90,0,"Signal R");
  thinBox(.036,.018,.08,signalMat,2.60,1.095,-.90,0,"Signal L");

  frontShape([[.48,.48],[.96,.50],[.94,.72],[.61,.76],[.49,.66]],black,"M intake R",2.59);
  frontShape([[-.48,.48],[-.96,.50],[-.94,.72],[-.61,.76],[-.49,.66]],black,"M intake L",2.59);
  frontShape([[-.34,.46],[.34,.46],[.42,.62],[.30,.72],[-.30,.72],[-.42,.62]],black,"Center lower intake",2.59);
  thinBox(.10,.045,1.86,black,2.53,.37,0,0,"Front splitter");

  // Hood power creases.
  for(const z of [-.34,.34]){
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(.78,1.22,z*.72),
      new THREE.Vector3(1.26,1.27,z*.86),
      new THREE.Vector3(1.78,1.27,z),
      new THREE.Vector3(2.24,1.17,z*1.08)
    ]);
    add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.009,6,false),satin),`Hood crease ${z}`);
  }

  // Side character lines and M mirrors.
  for(const z of [-1.012,1.012]){
    const sign=Math.sign(z);
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.10,1.03,z),
      new THREE.Vector3(-1.05,1.10,z+sign*.01),
      new THREE.Vector3(.15,1.13,z+sign*.015),
      new THREE.Vector3(1.45,1.14,z),
      new THREE.Vector3(2.13,1.06,z*0.97)
    ]);
    add(new THREE.Mesh(new THREE.TubeGeometry(curve,40,.009,6,false),satin),`Shoulder line ${z}`);
    thinBox(3.65,.10,.10,black,-.05,.40,z*.985,0,`Side skirt ${z}`);
    const mirror=new THREE.Mesh(new THREE.SphereGeometry(.19,20,12),paint);
    mirror.scale.set(1.35,.58,.88); mirror.position.set(.72,1.48,z+sign*.07); add(mirror,`M mirror ${z}`);
    thinBox(.12,.07,.055,black,.58,1.42,z,0,`Mirror stem ${z}`);
    for(const x of [-.92,.10,1.00]) thinBox(.018,.52,.016,black,x,.88,z+sign*.016,0,`Door seam ${z}-${x}`);
  }

  // Rear lamps, diffuser and quad exhausts.
  function rearShape(points, material, name, x=-2.575) {
    const shape=new THREE.Shape(); shape.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) shape.lineTo(points[i][0],points[i][1]); shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material); mesh.rotation.y=-Math.PI/2; mesh.position.x=x; return add(mesh,name);
  }
  const tailR=[[.46,1.01],[.93,1.03],[.90,1.16],[.56,1.20],[.43,1.13]];
  rearShape(tailR,brakeLightMat,"Brakelight R"); rearShape(tailR.map(([z,y])=>[-z,y]),brakeLightMat,"Brakelight L");
  rearShape([[-.83,.43],[.83,.43],[.92,.62],[.65,.72],[-.65,.72],[-.92,.62]],black,"Rear diffuser",-2.59);
  for(const z of [-.74,-.52,.52,.74]){
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.085,.095,.19,28),satin); pipe.rotation.z=Math.PI/2; pipe.position.set(-2.64,.44,z); add(pipe,"Quad exhaust");
  }
  thinBox(.06,.035,1.42,satin,-2.60,.72,0,0,"Rear bumper blade");

  // Wheels: larger, lower-profile, double-spoke M-style.
  function wheel(x,z,front=false){
    const g=new THREE.Group(); g.name=`M wheel ${x} ${z}`; g.position.set(x,.53,z);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.515,.515,.33,48),tireMat); tire.rotation.x=Math.PI/2; tire.castShadow=true; g.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.385,.385,.345,48),rimMat); rim.rotation.x=Math.PI/2; rim.castShadow=true; g.add(rim);
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.285,.285,.355,40),discMat); disc.rotation.x=Math.PI/2; g.add(disc);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      for(const off of [-.075,.075]){
        const spoke=new THREE.Mesh(new THREE.BoxGeometry(.29,.032,.365),rimMat);
        spoke.position.set(Math.cos(a)*.15+Math.cos(a+Math.PI/2)*off,Math.sin(a)*.15+Math.sin(a+Math.PI/2)*off,0);
        spoke.rotation.z=a; g.add(spoke);
      }
    }
    const cal=new THREE.Mesh(new THREE.BoxGeometry(.08,.23,.37),caliperMat); cal.position.set(front?.12:-.12,.03,0); g.add(cal);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.37,24),black); hub.rotation.x=Math.PI/2; g.add(hub);
    car.add(g);
  }
  for(const z of [-1.00,1.00]){ wheel(1.55,z,true); wheel(-1.55,z,false); }

  // Badge-like hood medallion, intentionally abstract rather than a texture/logo decal.
  const badge=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.014,32),satin); badge.rotation.z=Math.PI/2; badge.position.set(2.03,1.235,0); add(badge,"Hood badge");

  car.rotation.y = Math.PI; // face the same default direction as the previous scene model
  return car;
}
