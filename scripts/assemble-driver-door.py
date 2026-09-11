"""Enable the verified original-object rig only when BOTH v3 GLBs are present.
Run after the stable hero polish, before browser cache busting.
"""
from pathlib import Path
import os, struct, json, hashlib
files = [Path('assets') / ('amg_driver_cabin_' + q + '_v3.glb') for q in ('desktop', 'mobile')]
status = {'version': 3, 'enabled': False, 'files': []}
def read_glb(path):
    data=path.read_bytes()
    if len(data)<28 or struct.unpack_from('<III',data)!=(0x46546C67,2,len(data)):
        raise ValueError(f'{path}: not a complete GLB 2.0 file')
    length,kind=struct.unpack_from('<II',data,12)
    if kind!=0x4E4F534A or 20+length>len(data):raise ValueError(f'{path}: bad JSON chunk')
    doc=json.loads(data[20:20+length]);names={n.get('name') for n in doc.get('nodes',[])}
    if not {'driverDoor','interiorCabin'}.issubset(names):raise ValueError(f'{path}: missing original door/cabin rig')
    if doc.get('asset',{}).get('extras',{}).get('driverSide')!='+X':raise ValueError(f'{path}: unverified driver side')
    animations={a.get('name') for a in doc.get('animations',[])}
    if not {'DriverDoor_Open','DriverDoor_Close'}.issubset(animations):raise ValueError(f'{path}: missing door animation clips')
    for buf in doc.get('buffers',[]):
        if 'uri' in buf:raise ValueError(f'{path}: external buffer not permitted')
    for im in doc.get('images',[]):
        if 'bufferView' not in im:raise ValueError(f'{path}: missing packed image resource')
    return {'path':str(path),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'embeddedImages':len(doc.get('images',[])),'animations':sorted(animations)}
if not all(p.is_file() for p in files):
    status['reason']='Awaiting both amg_driver_cabin_*_v3.glb files in assets; stable hero unchanged.'
    Path('driver-door-status.json').write_text(json.dumps(status,indent=2));print(status['reason']);raise SystemExit(0)
for path in files:status['files'].append(read_glb(path))
version=os.environ.get('GITHUB_SHA','local-driver-v3')
premium=Path('premium-car.js');text=premium.read_text(encoding='utf-8')
if 'mountDriverDoorExperience' in text:raise SystemExit('Refusing to apply driver-door integration twice')
text=f'import {{ mountDriverDoorExperience }} from "./hero-driver-door.js?v={version}";\n'+text
needle='  const modelUrl = "./assets/mercedes_amg_gt63s_mobile.glb";'
assert needle in text,'Stable model URL changed; reconcile the integration first'
text=text.replace(needle,'  let interiorExperience = null;\n  const modelUrl = mobile()\n'+f'    ? "./assets/amg_driver_cabin_mobile_v3.glb?v={version}"\n'+f'    : "./assets/amg_driver_cabin_desktop_v3.glb?v={version}";',1)
start=text.index('      carModel.traverse((node) => {');end=text.index('      let bounds = new THREE.Box3().setFromObject(carModel);',start)
# v3 has baked normals/UVs. Do not re-merge its quantized geometry or overwrite
# original cabin textures with the exterior model's material substitutions.
text=text[:start]+'''      carModel.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = false;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.filter(Boolean).forEach(material => {
          material.flatShading = false;
          if (/^(Glass|Rear_glass)$/.test(material.name || '')) {
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
            if ('transmission' in material) material.transmission = 0;
          }
        });
      });

'''+text[end:]
needle='      carRig.add(carModel);';assert text.count(needle)==1
text=text.replace(needle,needle+'''
      interiorExperience = mountDriverDoorExperience({
        model: carModel, camera, canvas, stage,
        pauseExterior: cancelGuidedMotion,
        getExteriorTarget: () => new THREE.Vector3(currentLookX, currentLookY, 0)
      });
      stage.dataset.doorRig = 'v3';
      window.__TI_DRIVER_DOOR = interiorExperience;
''',1)
r=text.index('  function render() {');a=text.index('    if (motionTween)',r);b=text.index('    renderer.render(scene, camera);',a)
text=text[:a]+'    if (!interiorExperience?.isActive()) {\n'+text[a:b]+'    }\n    interiorExperience?.update(now);\n'+text[b:]
text=text.replace('    renderer.render(scene, camera);\n    updateHotspots();','    renderer.render(scene, camera);\n    if (!interiorExperience?.isActive()) updateHotspots();',1)
premium.write_text(text,encoding='utf-8')
module=Path('hero-driver-door.js');s=module.read_text().replace("'./driver-door-controller-v3.js'",f"'./driver-door-controller-v3.js?v={version}'");module.write_text(s)
# Remove the invisible procedural renderer instead of paying for two GPU scenes.
app=Path('app.js');s=app.read_text(encoding='utf-8');marker='// ---------------------------------------------------------------------------\n// Procedural 3D concept car.'
assert marker in s,'Legacy render block changed'
s=s.split(marker,1)[0];s='\n'.join(line for line in s.split('\n') if not line.startswith('import * as THREE'))
s=s.replace('  targetRotation = direction.angle;\n','').replace('  targetCameraDistance = 8.0;\n','').replace('  targetCameraDistance = 9.4;\n','')
s+='''\n// Preserve deep-links without a second WebGL renderer.
const hashDirection = location.hash.replace('#', '');
if (directions[hashDirection]) setTimeout(() => selectDirection(hashDirection), 600);
'''
assert 'new THREE.' not in s and 'targetCameraDistance' not in s and 'targetRotation' not in s
app.write_text(s,encoding='utf-8')
css=Path('styles.css');css.write_text(css.read_text(encoding='utf-8')+'\n'+Path('hero-driver-door.css').read_text(encoding='utf-8'),encoding='utf-8')
status['enabled']=True;status['reason']='Verified v3 assets loaded; original door/cabin enabled after Restore or Tuning selection.'
Path('driver-door-status.json').write_text(json.dumps(status,indent=2));print('Driver-door v3 integrated: original rig, source interior, single camera/render owner.')
