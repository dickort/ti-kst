import * as THREE from "https://esm.sh/three@0.169.0";
import { RoundedBoxGeometry } from "https://esm.sh/three@0.169.0/examples/jsm/geometries/RoundedBoxGeometry.js";

export function createM5F90Model() {
  const car = new THREE.Group();
  car.name = "TI_Custom_M5_F90";

  const paint = new THREE.MeshPhysicalMaterial({
    name: "Paint M5 Graphite",
    color: 0x101318,
    metalness: 0.82,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.07
  });
  const paintDark = new THREE.MeshPhysicalMaterial({
    name: "Paint Shadow",
    color: 0x080a0d,
    metalness: 0.78,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1
  });
  const black = new THREE.MeshStandardMaterial({ name: "Black Trim", color: 0x050607, metalness: 0.55, roughness: 0.28 });
  const satin = new THREE.MeshStandardMaterial({ name: "Dark Chrome", color: 0x25292d, metalness: 0.92, roughness: 0.2 });
  const glass = new THREE.MeshPhysicalMaterial({
    name: "Glass",
    color: 0x101820,
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.12,
    transparent: true,
    opacity: 0.82,
    clearcoat: 0.7,
    side: THREE.DoubleSide
  });
  const rubber = new THREE.MeshStandardMaterial({ name: "Tire", color: 0x050505, roughness: 0.82, metalness: 0.03 });
  const rimMat = new THREE.MeshStandardMaterial({ name: "M Rim", color: 0x393e43, roughness: 0.18, metalness: 0.95 });
  const brakeMat = new THREE.MeshStandardMaterial({ name: "Brake Disc", color: 0x777b7f, roughness: 0.3, metalness: 0.88 });
  const caliperMat = new THREE.MeshStandardMaterial({ name: "M Caliper", color: 0x2548d8, roughness: 0.35, metalness: 0.45 });
  const headlight = new THREE.MeshStandardMaterial({
    name: "Headlight",
    color: 0xdcecff,
    emissive: 0xbdd8ff,
    emissiveIntensity: 1.35,
    roughness: 0.18,
    metalness: 0.08
  });
  const brakelight = new THREE.MeshStandardMaterial({
    name: "Brakelight",
    color: 0x7b080d,
    emissive: 0xff1828,
    emissiveIntensity: 1.15,
    roughness: 0.22,
    metalness: 0.04
  });
  const signallight = new THREE.MeshStandardMaterial({
    name: "Signallight",
    color: 0x7a3f00,
    emissive: 0xff9b19,
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

  const rbox = (w, h, d, radius, material, x, y, z, rx = 0, ry = 0, rz = 0, name = "Part") => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 5, radius), material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    return add(mesh, name);
  };

  const box = (w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0, name = "Part") => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    return add(mesh, name);
  };

  const cyl = (rt, rb, h, seg, material, x, y, z, rx = 0, ry = 0, rz = 0, name = "Part") => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    return add(mesh, name);
  };

  rbox(4.96, 0.58, 1.90, 0.18, paint, 0, 0.72, 0, 0, 0, 0, "M5 lower body");
  rbox(4.62, 0.38, 1.84, 0.16, paint, -0.02, 1.00, 0, 0, 0, 0, "M5 shoulder body");
  rbox(1.56, 0.18, 1.78, 0.08, paint, 1.63, 1.20, 0, 0, 0, -0.025, "Long bonnet");
  rbox(1.08, 0.18, 1.72, 0.08, paint, -1.95, 1.17, 0, 0, 0, 0.02, "Rear deck");
  rbox(4.35, 0.14, 1.92, 0.06, paintDark, -0.05, 0.42, 0, 0, 0, 0, "Underbody shadow");

  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.35, 1.15);
  cabinShape.lineTo(-0.98, 1.68);
  cabinShape.quadraticCurveTo(-0.72, 1.83, -0.35, 1.84);
  cabinShape.lineTo(0.42, 1.83);
  cabinShape.quadraticCurveTo(0.72, 1.80, 0.92, 1.58);
  cabinShape.lineTo(1.22, 1.15);
  cabinShape.closePath();
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
    depth: 1.58,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.045,
    bevelSegments: 3,
    steps: 1
  });
  cabinGeo.translate(0, 0, -0.79);
  add(new THREE.Mesh(cabinGeo, paint), "F90 cabin shell");

  const makeWindowShape = (points, sideZ, name) => {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(p => shape.lineTo(p[0], p[1]));
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), glass);
    mesh.position.z = sideZ;
    mesh.renderOrder = 3;
    return add(mesh, name);
  };
  const frontWindow = [[0.02,1.27],[0.73,1.60],[0.48,1.76],[-0.02,1.77],[-0.07,1.29]];
  const rearWindow = [[-0.13,1.29],[-0.18,1.77],[-0.73,1.74],[-1.17,1.28]];
  [0.835, -0.835].forEach((z, i) => {
    makeWindowShape(frontWindow, z, `Front side glass ${i}`);
    makeWindowShape(rearWindow, z, `Rear side glass ${i}`);
    box(0.055, 0.50, 0.035, black, -0.10, 1.52, z, 0, 0, 0, `B pillar ${i}`);
    box(0.035, 0.48, 0.04, black, 0.68, 1.53, z, 0, 0, -0.42, `A pillar ${i}`);
    box(0.035, 0.48, 0.04, black, -0.94, 1.49, z, 0, 0, 0.42, `C pillar ${i}`);
  });

  rbox(0.78, 0.045, 1.48, 0.02, glass, 0.78, 1.53, 0, 0, 0, -0.48, "Windscreen");
  rbox(0.72, 0.045, 1.46, 0.02, glass, -1.03, 1.50, 0, 0, 0, 0.48, "Rear glass");
  rbox(1.35, 0.055, 1.52, 0.025, black, -0.22, 1.86, 0, 0, 0, 0, "Shadowline roof");

  const grilleX = 2.50;
  rbox(0.075, 0.48, 0.39, 0.13, satin, grilleX, 0.90, 0.225, 0, 0, 0, "Kidney grille frame R");
  rbox(0.075, 0.48, 0.39, 0.13, satin, grilleX, 0.90, -0.225, 0, 0, 0, "Kidney grille frame L");
  rbox(0.082, 0.39, 0.31, 0.10, black, grilleX + 0.018, 0.90, 0.225, 0, 0, 0, "Kidney grille core R");
  rbox(0.082, 0.39, 0.31, 0.10, black, grilleX + 0.018, 0.90, -0.225, 0, 0, 0, "Kidney grille core L");
  for (const centerZ of [0.225, -0.225]) {
    for (let i = -2; i <= 2; i++) {
      box(0.09, 0.32, 0.014, satin, grilleX + 0.055, 0.90, centerZ + i * 0.052, 0, 0, 0, "Kidney vertical slat");
    }
  }
  rbox(0.08, 0.21, 0.62, 0.06, black, 2.51, 0.57, 0.70, 0, 0, 0, "Right bumper intake");
  rbox(0.08, 0.21, 0.62, 0.06, black, 2.51, 0.57, -0.70, 0, 0, 0, "Left bumper intake");
  rbox(0.08, 0.20, 0.70, 0.06, black, 2.52, 0.56, 0, 0, 0, 0, "Center bumper intake");
  box(0.12, 0.06, 1.86, black, 2.46, 0.37, 0, 0, 0, 0, "M front splitter");

  [-0.64, 0.64].forEach((z, side) => {
    rbox(0.085, 0.17, 0.58, 0.045, black, 2.50, 1.14, z, 0, 0, 0, `Headlamp housing ${side}`);
    rbox(0.092, 0.105, 0.50, 0.03, headlight, 2.545, 1.15, z, 0, 0, 0, `Headlight ${side}`);
    box(0.098, 0.025, 0.19, headlight, 2.56, 1.17, z - 0.13, 0, 0, 0.02, `DRL bar A ${side}`);
    box(0.098, 0.025, 0.19, headlight, 2.56, 1.13, z + 0.13, 0, 0, -0.02, `DRL bar B ${side}`);
    box(0.099, 0.022, 0.09, signallight, 2.565, 1.08, z + (z > 0 ? 0.20 : -0.20), 0, 0, 0, `Signallight ${side}`);
  });

  [-0.66, 0.66].forEach((z, side) => {
    rbox(0.085, 0.16, 0.55, 0.04, brakelight, -2.50, 1.08, z, 0, 0, 0, `Brakelight ${side}`);
    box(0.09, 0.035, 0.29, brakelight, -2.545, 1.12, z - Math.sign(z) * 0.12, 0, 0, 0, `Tail light signature ${side}`);
  });
  rbox(0.12, 0.25, 1.72, 0.06, black, -2.48, 0.52, 0, 0, 0, 0, "Rear diffuser");
  box(0.18, 0.05, 1.54, satin, -2.50, 0.69, 0, 0, 0, 0, "Rear bumper blade");
  for (const z of [-0.69, -0.48, 0.48, 0.69]) {
    cyl(0.085, 0.095, 0.18, 28, satin, -2.57, 0.43, z, 0, 0, Math.PI / 2, "Quad exhaust");
  }

  [0.965, -0.965].forEach((z, side) => {
    box(3.45, 0.11, 0.11, black, -0.05, 0.43, z, 0, 0, 0, `Side skirt ${side}`);
    box(3.86, 0.025, 0.018, satin, 0.02, 1.09, z + Math.sign(z) * 0.015, 0, 0, 0, `Shoulder line ${side}`);
    for (const x of [-0.96, 0.13, 1.03]) {
      box(0.025, 0.55, 0.014, black, x, 0.93, z + Math.sign(z) * 0.02, 0, 0, 0, `Door seam ${side}`);
    }
    rbox(0.27, 0.045, 0.035, 0.018, satin, 0.52, 1.05, z + Math.sign(z) * 0.028, 0, 0, 0, `Front handle ${side}`);
    rbox(0.27, 0.045, 0.035, 0.018, satin, -0.58, 1.05, z + Math.sign(z) * 0.028, 0, 0, 0, `Rear handle ${side}`);
    rbox(0.30, 0.13, 0.18, 0.05, paint, 0.76, 1.49, z + Math.sign(z) * 0.05, 0, Math.sign(z) * 0.12, 0, `Mirror ${side}`);
    box(0.12, 0.08, 0.05, black, 0.62, 1.43, z, 0, 0, 0, `Mirror stem ${side}`);
    box(0.21, 0.09, 0.025, black, 1.17, 0.99, z + Math.sign(z) * 0.03, 0, 0, -0.10, `M fender vent ${side}`);
  });

  function addWheel(x, z, steer = 0) {
    const wheel = new THREE.Group();
    wheel.name = `Wheel ${x} ${z}`;
    wheel.position.set(x, 0.50, z);
    wheel.rotation.y = steer * Math.sign(z);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.34, 48, 1), rubber);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    wheel.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.355, 48, 1), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    wheel.add(rim);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.365, 48, 1), brakeMat);
    disc.rotation.x = Math.PI / 2;
    wheel.add(disc);

    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(new RoundedBoxGeometry(0.29, 0.038, 0.05, 3, 0.015), rimMat);
      spoke.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, z > 0 ? 0.185 : -0.185);
      spoke.rotation.z = a;
      wheel.add(spoke);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.385, 32), black);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);

    const caliper = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.22, 0.075, 3, 0.025), caliperMat);
    caliper.position.set(0.16, 0.02, z > 0 ? 0.19 : -0.19);
    wheel.add(caliper);

    car.add(wheel);
  }
  addWheel(1.57, 0.98, -0.03);
  addWheel(1.57, -0.98, -0.03);
  addWheel(-1.53, 0.98, 0);
  addWheel(-1.53, -0.98, 0);

  [-0.36, 0.36].forEach((z, i) => {
    box(1.05, 0.018, 0.025, satin, 1.66, 1.30, z, 0, 0, -0.02, `Bonnet crease ${i}`);
  });
  rbox(0.68, 0.055, 1.56, 0.025, paintDark, -2.02, 1.30, 0, 0, 0, 0.04, "M rear lip spoiler");

  rbox(1.55, 0.50, 1.24, 0.12, black, -0.22, 1.28, 0, 0, 0, 0, "Interior core");
  rbox(0.38, 0.56, 0.48, 0.09, black, 0.32, 1.25, 0.42, 0, 0, -0.08, "Driver seat");
  rbox(0.38, 0.56, 0.48, 0.09, black, 0.32, 1.25, -0.42, 0, 0, -0.08, "Passenger seat");

  car.userData.model = "Custom web model inspired by BMW M5 F90 proportions";
  return car;
}
