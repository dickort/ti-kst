from pathlib import Path
import re

path = Path('premium-car.js')
text = path.read_text(encoding='utf-8')

# Final TI hero finish: satin black body, blackout glass, graphite wheels,
# TI lime calipers, smoother body normals, neutral premium studio highlights,
# and no blinking FX.

# Merge body vertices before recalculating normals so decimated triangles do not
# read as separate facets under the studio lights.
if 'BufferGeometryUtils.js' not in text:
    text = text.replace(
        'import { GLTFLoader } from "https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js";',
        'import { GLTFLoader } from "https://esm.sh/three@0.169.0/examples/jsm/loaders/GLTFLoader.js";\nimport { mergeVertices } from "https://esm.sh/three@0.169.0/examples/jsm/utils/BufferGeometryUtils.js";',
        1
    )

old_body = '''          if (isBodyPaint) {
            if (node.geometry?.attributes?.position) {
              node.geometry.computeVertexNormals();
              if (node.geometry.attributes.normal) node.geometry.attributes.normal.needsUpdate = true;
            }
            material.flatShading = false;
            material.color?.set(0x010101);
            if ("metalness" in material) material.metalness = 0.22;
            if ("roughness" in material) material.roughness = 0.70;
            if ("clearcoat" in material) material.clearcoat = 0.08;
            if ("clearcoatRoughness" in material) material.clearcoatRoughness = 0.72;
            material.needsUpdate = true;
          }'''
new_body = '''          if (isBodyPaint) {
            if (node.geometry?.attributes?.position) {
              try {
                node.geometry = mergeVertices(node.geometry, 0.00008);
              } catch (error) {
                console.debug("AMG body merge skipped", error);
              }
              node.geometry.computeVertexNormals();
              if (node.geometry.attributes.normal) node.geometry.attributes.normal.needsUpdate = true;
            }
            material.flatShading = false;
            material.color?.set(0x030303);
            if ("metalness" in material) material.metalness = 0.46;
            if ("roughness" in material) material.roughness = 0.40;
            if ("clearcoat" in material) material.clearcoat = 0.30;
            if ("clearcoatRoughness" in material) material.clearcoatRoughness = 0.34;
            material.needsUpdate = true;
          }'''
if old_body not in text:
    raise SystemExit('Final hero: v46 body material block not found')
text = text.replace(old_body, new_body, 1)

old_glass = '''          if (isCabinGlass) {
            if (node.geometry?.attributes?.position) node.geometry.computeVertexNormals();
            material.color?.set(0x030406);
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
            if ("transmission" in material) material.transmission = 0;
            if ("metalness" in material) material.metalness = 0.18;
            if ("roughness" in material) material.roughness = 0.20;
            material.needsUpdate = true;
          }'''
new_glass = '''          if (isCabinGlass) {
            if (node.geometry?.attributes?.position) node.geometry.computeVertexNormals();
            material.color?.set(0x010205);
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
            if ("transmission" in material) material.transmission = 0;
            if ("metalness" in material) material.metalness = 0.32;
            if ("roughness" in material) material.roughness = 0.12;
            material.needsUpdate = true;
          }'''
if old_glass not in text:
    raise SystemExit('Final hero: v46 glass material block not found')
text = text.replace(old_glass, new_glass, 1)

# Graphite wheels + TI lime calipers. The lime is now a restrained brand accent,
# not a large surface competing with the body.
needle = '''          if (isCabinGlass) {
            if (node.geometry?.attributes?.position) node.geometry.computeVertexNormals();
            material.color?.set(0x010205);
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
            if ("transmission" in material) material.transmission = 0;
            if ("metalness" in material) material.metalness = 0.32;
            if ("roughness" in material) material.roughness = 0.12;
            material.needsUpdate = true;
          }
'''
accent = needle + '''
          const isTiRim = /(^|\\s)(Rims|Rims_2)(\\s|$)/i.test(identity);
          const isTiCaliper = /(^|\\s)Brakes(\\s|$)/i.test(identity);

          if (isTiRim) {
            material.color?.set(0x202428);
            if ("metalness" in material) material.metalness = 0.90;
            if ("roughness" in material) material.roughness = 0.24;
            material.needsUpdate = true;
          }

          if (isTiCaliper) {
            material.color?.set(0xd8ff3e);
            if ("metalness" in material) material.metalness = 0.32;
            if ("roughness" in material) material.roughness = 0.30;
            material.needsUpdate = true;
          }
'''
text = text.replace(needle, accent, 1)

# Remove click-triggered blinking entirely. Static lamp materials remain intact.
text = text.replace('    flashParkingLights();\n', '', 1)
text = text.replace('      createParkingLightFx();\n', '', 1)
text = text.replace('    updateParkingLights(now);\n', '', 1)

# Remove the blue gaming-like rim accent and replace it with a clean cool-white
# contour light. Brand lime stays only as a small reflected accent.
text = text.replace(
    'const rimLight = new THREE.SpotLight(0x7995ff, 88, 28, Math.PI / 4.2, 0.65, 1.25);',
    'const rimLight = new THREE.SpotLight(0xe7edf2, 72, 28, Math.PI / 4.2, 0.65, 1.25);',
    1
)

# Studio-light polish: broad neutral strips create controlled satin highlights,
# while the lime strip remains subtle and brand-specific.
light_anchor = '''  const stripLight = new THREE.RectAreaLight(0xd8ff3e, 4.8, 2.1, 0.42);
  stripLight.position.set(3.2, 1.25, -1.3);
  stripLight.lookAt(0, 0.8, 0);
  scene.add(stripLight);
'''
light_replacement = '''  const stripLight = new THREE.RectAreaLight(0xd8ff3e, 1.65, 2.1, 0.42);
  stripLight.position.set(3.2, 1.25, -1.3);
  stripLight.lookAt(0, 0.8, 0);
  scene.add(stripLight);

  const studioTop = new THREE.RectAreaLight(0xffffff, 4.4, 5.4, 0.52);
  studioTop.position.set(0.3, 5.8, 1.4);
  studioTop.rotation.x = -Math.PI / 2.6;
  studioTop.lookAt(0, 0.82, 0.35);
  scene.add(studioTop);

  const studioSide = new THREE.RectAreaLight(0xf0f3f5, 2.45, 4.2, 0.42);
  studioSide.position.set(-3.8, 2.9, 1.1);
  studioSide.lookAt(-0.2, 0.9, 0.2);
  scene.add(studioSide);

  const studioFront = new THREE.RectAreaLight(0xffffff, 2.0, 2.8, 0.32);
  studioFront.position.set(2.9, 2.0, 4.6);
  studioFront.lookAt(0, 0.75, 0.65);
  scene.add(studioFront);
'''
if light_anchor not in text:
    raise SystemExit('Final hero: strip light block not found')
text = text.replace(light_anchor, light_replacement, 1)

path.write_text(text, encoding='utf-8')
print('Final hero patch applied: satin black AMG, graphite rims, TI lime calipers, neutral studio light, no blinking')
