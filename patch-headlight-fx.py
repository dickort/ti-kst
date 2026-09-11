from pathlib import Path

path = Path('premium-car.js')
text = path.read_text(encoding='utf-8')

marker = "  const directionAngles = {"
if marker not in text:
    raise SystemExit('directionAngles marker not found')

if 'const parkingFx = [];' not in text:
    text = text.replace(
        "  const parkingLightMaterials = new Map();\n  let parkingFlashStartedAt = -Infinity;",
        "  const parkingLightMaterials = new Map();\n  const parkingFx = [];\n  let parkingFxGroup = null;\n  let parkingFlashStartedAt = -Infinity;",
        1
    )

fx_code = '''  function createParkingLightFx() {
    if (parkingFxGroup) carRig.remove(parkingFxGroup);
    parkingFx.length = 0;
    parkingFxGroup = new THREE.Group();

    const entries = [
      { x:  2.45, y: 0.72, z:  0.64, color: 0xf3f8ff },
      { x:  2.45, y: 0.72, z: -0.64, color: 0xf3f8ff },
      { x: -2.45, y: 0.72, z:  0.64, color: 0xff273a },
      { x: -2.45, y: 0.72, z: -0.64, color: 0xff273a }
    ];

    entries.forEach((item) => {
      const mat = new THREE.MeshBasicMaterial({
        color: item.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.065, 18, 10), mat);
      glow.position.set(item.x, item.y, item.z);
      glow.renderOrder = 30;

      const light = new THREE.PointLight(item.color, 0, 2.8, 2);
      light.position.copy(glow.position);

      parkingFxGroup.add(glow, light);
      parkingFx.push({ glow, light });
    });

    carRig.add(parkingFxGroup);
  }

  function updateParkingFx(now) {
    if (!parkingFx.length) return;
    const elapsed = now - parkingFlashStartedAt;
    let pulse = 0;
    if (elapsed >= 0 && elapsed < 900) {
      const bell = (center, width) => Math.exp(-Math.pow((elapsed - center) / width, 2));
      pulse = Math.max(bell(120, 72), bell(430, 88));
    }
    parkingFx.forEach(({ glow, light }) => {
      glow.material.opacity = pulse * 0.96;
      glow.scale.setScalar(0.7 + pulse * 1.05);
      light.intensity = pulse * 13;
    });
  }

'''

if 'function createParkingLightFx()' not in text:
    text = text.replace(marker, fx_code + marker, 1)

if 'createParkingLightFx();' not in text:
    text = text.replace('      carRig.add(carModel);', '      carRig.add(carModel);\n      createParkingLightFx();', 1)

if 'updateParkingFx(now);' not in text:
    text = text.replace('    updateParkingLights(now);', '    updateParkingLights(now);\n    updateParkingFx(now);', 1)

path.write_text(text, encoding='utf-8')
print('premium-car.js patched: robust light glow FX added')
