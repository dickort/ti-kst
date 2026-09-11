from pathlib import Path

path = Path('premium-car.js')
text = path.read_text(encoding='utf-8')

repls = []

repls.append((
"""  const parkingLightMaterials = new Map();
  let parkingFlashStartedAt = -Infinity;
  let lastParkingFlashAt = -Infinity;""",
"""  const parkingLightMaterials = new Map();
  const parkingFx = [];
  let parkingFxGroup = null;
  let parkingFlashStartedAt = -Infinity;
  let lastParkingFlashAt = -Infinity;"""
))

repls.append((
"""  function registerParkingLightMaterial(material) {
    if (!material || !/^(Headlight|Brakelight)$/i.test(material.name || '')) return;""",
"""  function registerParkingLightMaterial(material, nodeName = '') {
    const lightIdentity = `${material?.name || ''} ${nodeName || ''}`;
    if (!material || !/(headlight|brakelight|signallight)/i.test(lightIdentity)) return;"""
))

repls.append((
"""  function flashParkingLights() {
    if (reducedMotion || !parkingLightMaterials.size) return;""",
"""  function flashParkingLights() {
    if (reducedMotion || (!parkingLightMaterials.size && !parkingFx.length)) return;"""
))

insert_after = """  function updateParkingLights(now) {
    if (!parkingLightMaterials.size) return;
    const elapsed = now - parkingFlashStartedAt;
    let pulse = 0;

    if (elapsed >= 0 && elapsed < 900) {
      const bell = (center, width) => Math.exp(-Math.pow((elapsed - center) / width, 2));
      pulse = Math.max(bell(120, 68), bell(420, 82));
    }

    parkingLightMaterials.forEach(({ material, baseIntensity }) => {
      material.emissiveIntensity = baseIntensity + pulse * 6.4;
    });
  }"""

if insert_after not in text:
    raise SystemExit('Could not find updateParkingLights block')

fx_code = insert_after + """

  function createParkingLightFx(bounds) {
    if (!bounds || bounds.isEmpty()) return;
    if (parkingFxGroup) carRig.remove(parkingFxGroup);
    parkingFx.length = 0;
    parkingFxGroup = new THREE.Group();

    const size = bounds.getSize(new THREE.Vector3());
    const y = bounds.min.y + size.y * 0.43;
    const z = size.z * 0.34;
    const radius = Math.max(0.035, Math.min(0.07, size.z * 0.028));
    const positions = [
      { x: bounds.max.x + radius * 0.2, z: z, color: 0xe9f3ff },
      { x: bounds.max.x + radius * 0.2, z: -z, color: 0xe9f3ff },
      { x: bounds.min.x - radius * 0.2, z: z, color: 0xff2032 },
      { x: bounds.min.x - radius * 0.2, z: -z, color: 0xff2032 }
    ];

    positions.forEach((item) => {
      const material = new THREE.MeshBasicMaterial({
        color: item.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 12), material);
      glow.position.set(item.x, y, item.z);
      glow.renderOrder = 20;

      const light = new THREE.PointLight(item.color, 0, 2.4, 2);
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
      glow.material.opacity = pulse * 0.92;
      glow.scale.setScalar(0.72 + pulse * 0.78);
      light.intensity = pulse * 11;
    });
  }"""
text = text.replace(insert_after, fx_code, 1)

repls.append((
"""          registerParkingLightMaterial(material);""",
"""          registerParkingLightMaterial(material, node.name || '');"""
))

repls.append((
"""      carModel.position.x -= center.x;
      carModel.position.z -= center.z;
      carModel.position.y -= bounds.min.y;
      carRig.add(carModel);""",
"""      carModel.position.x -= center.x;
      carModel.position.z -= center.z;
      carModel.position.y -= bounds.min.y;
      bounds = new THREE.Box3().setFromObject(carModel);
      createParkingLightFx(bounds);
      carRig.add(carModel);"""
))

repls.append((
"""    updateParkingLights(now);""",
"""    updateParkingLights(now);
    updateParkingFx(now);"""
))

for old, new in repls:
    if old not in text:
        raise SystemExit(f'Patch target not found:\n{old[:180]}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('premium-car.js patched: robust headlight/brakelight/signallight flash + glow')
