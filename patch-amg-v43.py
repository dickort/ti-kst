from pathlib import Path
import re

path = Path('premium-car.js')
text = path.read_text(encoding='utf-8')

# Desktop hero is much larger in pixels than mobile. Keep the same lighter GLB,
# but render it at native CSS resolution to avoid GPU-bound guided motion.
text = text.replace(
    'renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.15 : 1.25));',
    'renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.10 : 1.0));'
)
text = text.replace(
    'renderer.shadowMap.enabled = true;',
    'renderer.shadowMap.enabled = false;'
)
text = text.replace(
    'keyLight.castShadow = true;',
    'keyLight.castShadow = false;'
)

# Larger front-facing opening composition.
text = text.replace(
    'let targetDistance = mobile() ? 7.35 : 6.65;',
    'let targetDistance = mobile() ? 7.20 : 6.30;'
)
text = text.replace(
    'let targetCameraY = mobile() ? 2.15 : 2.28;',
    'let targetCameraY = mobile() ? 2.15 : 2.22;'
)
text = text.replace(
    'let targetLookY = mobile() ? 0.73 : 0.80;',
    'let targetLookY = mobile() ? 0.73 : 0.78;'
)

# Desktop framing moves the car left by the camera/look target instead of
# physically resizing the whole stage when the service panel opens.
old_targets = '''      preserve: {
        x: isMobile ? 0.02 : -0.10,
        y: isMobile ? 2.10 : 2.22,
        lookX: 0.06,
        lookY: isMobile ? 0.72 : 0.78
      },
      restore: {
        x: isMobile ? 0.08 : 0.16,
        y: isMobile ? 2.18 : 2.34,
        lookX: -0.02,
        lookY: isMobile ? 0.76 : 0.82
      },
      tune: {
        x: isMobile ? 0.14 : 0.28,
        y: isMobile ? 2.08 : 2.20,
        lookX: -0.08,
        lookY: isMobile ? 0.72 : 0.78
      }'''
new_targets = '''      preserve: {
        x: isMobile ? 0.02 : 0.02,
        y: isMobile ? 2.10 : 2.18,
        lookX: isMobile ? 0.06 : 0.46,
        lookY: isMobile ? 0.72 : 0.77
      },
      restore: {
        x: isMobile ? 0.08 : 0.06,
        y: isMobile ? 2.18 : 2.24,
        lookX: isMobile ? -0.02 : 0.43,
        lookY: isMobile ? 0.76 : 0.80
      },
      tune: {
        x: isMobile ? 0.14 : 0.10,
        y: isMobile ? 2.08 : 2.16,
        lookX: isMobile ? -0.08 : 0.40,
        lookY: isMobile ? 0.72 : 0.76
      }'''
if old_targets not in text:
    raise SystemExit('AMG v43: direction target block not found')
text = text.replace(old_targets, new_targets, 1)

text = text.replace(
    'distance: isMobile ? 6.55 : 5.72,',
    'distance: isMobile ? 6.45 : 5.48,'
)
text = text.replace(
    'duration: isMobile ? 1480 : 1650',
    'duration: isMobile ? 1500 : 1850'
)

# Close returns to the same larger front composition.
text = text.replace(
    'distance: isMobile ? 7.35 : 6.65,',
    'distance: isMobile ? 7.20 : 6.30,'
)
text = text.replace(
    'cameraY: isMobile ? 2.15 : 2.28,',
    'cameraY: isMobile ? 2.15 : 2.22,'
)
text = text.replace(
    'lookY: isMobile ? 0.73 : 0.80,',
    'lookY: isMobile ? 0.73 : 0.78,'
)

# Material pass: deep matte black body, opaque dark glass, and smooth normals
# on the decimated body mesh. The GLB deliberately has no normals after web
# decimation, so computing shared vertex normals removes the visible facets.
material_pattern = re.compile(r'''        materials\.filter\(Boolean\)\.forEach\(\(material\) => \{\n          registerParkingLightMaterial\(material, node\.name \|\| ""\);\n\n          if \(/\(paint\|carpaint\)/i\.test\(`\$\{material\.name \|\| ""\} \$\{node\.name \|\| ""\}`\)\) \{.*?          \}\n\n          if \(/glass/i\.test\(`\$\{material\.name \|\| ""\} \$\{node\.name \|\| ""\}`\)\) \{.*?          \}\n        \}\);''', re.S)
material_replacement = '''        materials.filter(Boolean).forEach((material) => {
          registerParkingLightMaterial(material, node.name || "");

          const identity = `${material.name || ""} ${node.name || ""}`;
          const isBodyPaint = /(carpaint|graphite paint|satin_metallic_blue|satin_metallic_dark|satin_metallic_black)/i.test(identity);
          const isCabinGlass = /^(Glass|Rear_glass)$/i.test(material.name || "");

          if (isBodyPaint) {
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
          }

          if (isCabinGlass) {
            if (node.geometry?.attributes?.position) node.geometry.computeVertexNormals();
            material.color?.set(0x030406);
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
            if ("transmission" in material) material.transmission = 0;
            if ("metalness" in material) material.metalness = 0.18;
            if ("roughness" in material) material.roughness = 0.20;
            material.needsUpdate = true;
          }
        });'''
text, count = material_pattern.subn(material_replacement, text, count=1)
if count != 1:
    raise SystemExit('AMG v43: material block not found')

text = text.replace(
    'const scale = 5.72 / Math.max(longest, 0.001);',
    'const scale = 6.08 / Math.max(longest, 0.001);'
)

# Screen-space hotspot layout with collision avoidance. On desktop labels are
# roughly 170-190 px wide, so raw 3D projections must not be used directly.
hotspot_pattern = re.compile(r'''  function updateHotspots\(\) \{.*?\n  \}\n\n  function resize\(\) \{''', re.S)
hotspot_replacement = '''  function updateHotspots() {
    if (!carModel || !stage.classList.contains("premium-ready")) return;
    const rect = stage.getBoundingClientRect();
    const isMobile = mobile();
    const panelOpen = document.getElementById("directionPanel")?.classList.contains("open");
    const points = [];

    Object.entries(anchorMap).forEach(([name, anchor]) => {
      projected.copy(anchor);
      carRig.localToWorld(projected);
      projected.project(camera);
      const x = (projected.x * 0.5 + 0.5) * rect.width;
      const y = (-projected.y * 0.5 + 0.5) * rect.height;
      const visible = projected.z < 1 && x > 0 && x < rect.width && y > 0 && y < rect.height;
      if (visible) points.push({ name, x, y });
      else {
        hotspots[name].style.opacity = "0";
        hotspots[name].style.pointerEvents = "none";
      }
    });

    const gapX = isMobile ? 54 : 188;
    const gapY = isMobile ? 54 : 58;
    for (let iteration = 0; iteration < 7; iteration++) {
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i];
          const b = points[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (Math.abs(dx) < gapX && Math.abs(dy) < gapY) {
            const sx = dx === 0 ? (i < j ? -1 : 1) : Math.sign(dx);
            const sy = dy === 0 ? (i % 2 === 0 ? -1 : 1) : Math.sign(dy);
            const pushX = (gapX - Math.abs(dx)) * 0.5 + 4;
            const pushY = (gapY - Math.abs(dy)) * 0.22 + 2;
            a.x += sx * pushX;
            b.x -= sx * pushX;
            a.y += sy * pushY;
            b.y -= sy * pushY;
          }
        }
      }
    }

    const rightEdge = !isMobile && panelOpen
      ? Math.max(360, rect.width - 475)
      : rect.width - (isMobile ? 34 : 95);

    points.forEach(({ name, x, y }) => {
      const element = hotspots[name];
      const safeX = THREE.MathUtils.clamp(x, isMobile ? 30 : 88, rightEdge);
      const safeY = THREE.MathUtils.clamp(y, isMobile ? 35 : 55, rect.height - (isMobile ? 35 : 60));
      element.style.left = `${safeX}px`;
      element.style.top = `${safeY}px`;
      element.style.opacity = "1";
      element.style.pointerEvents = "auto";
    });
  }

  function resize() {'''
text, count = hotspot_pattern.subn(hotspot_replacement, text, count=1)
if count != 1:
    raise SystemExit('AMG v43: hotspot function not found')

# The resize path has its own pixel ratio assignment.
text = text.replace(
    'renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.15 : 1.25));',
    'renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.10 : 1.0));'
)

path.write_text(text, encoding='utf-8')
print('AMG v43 patch applied: desktop motion, matte black, dark glass, smooth normals, hotspot collision avoidance')
