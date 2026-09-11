from pathlib import Path
import re

path = Path('premium-car.js')
text = path.read_text(encoding='utf-8')

text = text.replace(
    'import { GLTFLoader } from "https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js";',
    'import { createM5F90Model } from "./m5-f90-model-v2.js";'
)

credit_pattern = re.compile(r'''  const credit = document\.createElement\("a"\);\n  credit\.className = "model-credit";\n  credit\.href = "https://github\.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept";\n  credit\.target = "_blank";\n  credit\.rel = "noopener";\n  credit\.textContent = "3D asset · CarConcept · CC BY 4\.0";\n  stage\.appendChild\(credit\);''')
text, count = credit_pattern.subn(
'''  const credit = document.createElement("div");
  credit.className = "model-credit";
  credit.textContent = "Custom 3D · M5 F90 · sculpted web model";
  stage.appendChild(credit);''',
    text,
    count=1
)
if count != 1:
    raise SystemExit('Could not patch model credit')

loader_pattern = re.compile(r'''  const loader = new GLTFLoader\(\);\n  const modelUrl = "https://raw\.githubusercontent\.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/GLB/CarConcept\.glb";\n\n  loader\.load\(.*?\n  \);\n\n  const anchorMap = \{''', re.S)

replacement = '''  try {
    loading.textContent = "Building M5 F90";
    carModel = createM5F90Model();
    carModel.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.filter(Boolean).forEach((material) => {
          if (/paint/i.test(material.name || "")) {
            material.color?.set(0x101318);
            if ("metalness" in material) material.metalness = Math.max(material.metalness ?? 0, 0.76);
            if ("roughness" in material) material.roughness = 0.17;
            if ("clearcoat" in material) material.clearcoat = 1;
            if ("clearcoatRoughness" in material) material.clearcoatRoughness = 0.07;
            material.needsUpdate = true;
          }
        });
    });

    let bounds = new THREE.Box3().setFromObject(carModel);
    const size = bounds.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.z);
    const scale = 5.15 / Math.max(longest, 0.001);
    carModel.scale.setScalar(scale);
    bounds = new THREE.Box3().setFromObject(carModel);
    const center = bounds.getCenter(new THREE.Vector3());
    carModel.position.x -= center.x;
    carModel.position.z -= center.z;
    carModel.position.y -= bounds.min.y;
    carRig.add(carModel);

    stage.classList.remove("premium-loading");
    stage.classList.add("premium-ready");
    Object.values(hotspots).forEach(el => {
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    });
  } catch (error) {
    console.warn("Custom M5 F90 model could not build; procedural fallback remains active.", error);
    stage.classList.remove("premium-loading");
    canvas.remove();
    loading.remove();
    credit.remove();
    Object.values(hotspots).forEach(el => el.remove());
  }

  const anchorMap = {'''

text, count = loader_pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not replace external GLTF loader block')

old_anchors = '''  const anchorMap = {
    preserve: new THREE.Vector3(0.82, 0.9, -1.45),
    restore: new THREE.Vector3(-0.72, 1.08, 0.18),
    tune: new THREE.Vector3(0.9, 0.48, 1.42)
  };'''
new_anchors = '''  const anchorMap = {
    preserve: new THREE.Vector3(1.42, 1.20, -0.72),
    restore: new THREE.Vector3(-0.30, 1.57, 0.69),
    tune: new THREE.Vector3(-1.44, 0.56, 0.94)
  };'''
if old_anchors not in text:
    raise SystemExit('Could not patch hotspot anchors')
text = text.replace(old_anchors, new_anchors, 1)

path.write_text(text, encoding='utf-8')
print('premium-car.js patched: sculpted custom M5 F90 v2 enabled')
