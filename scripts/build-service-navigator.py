"""Build the service navigator without running the obsolete scene patch chain.
The deployed directory contains one renderer. Original service copy is reused.
The new source-object door rig is enabled only after validating both v3 assets.
"""
from pathlib import Path
import hashlib, json, os, re, shutil, struct
root=Path('.'); out=Path('_site'); version=os.environ.get('GITHUB_SHA','local-services-v1')
if out.exists(): shutil.rmtree(out)
out.mkdir()
for p in root.iterdir():
    if p.is_file() and p.suffix in {'.html','.css','.js','.mjs','.svg','.ico','.json'}:
        shutil.copy2(p,out/p.name)
shutil.copytree(root/'assets',out/'assets')
source=(root/'app.js').read_text(encoding='utf-8')
prefix=source[:source.index('const header =')]
prefix='\n'.join(line for line in prefix.splitlines() if not line.startswith('import '))
(out/'hero-service-catalog.mjs').write_text(prefix+'\nexport {directions,services};\n',encoding='utf-8')
legacy='// ---------------------------------------------------------------------------\n// Procedural 3D concept car.'
assert legacy in source, 'Reconcile app.js before building: legacy scene boundary changed'
app=source.split(legacy,1)[0]
app='\n'.join(line for line in app.splitlines() if not line.startswith('import * as THREE'))
select='''function selectDirection(key) {
  if (!directions[key]) return;
  activeDirection = key;
  window.__TI_PENDING_DIR = key;
  window.dispatchEvent(new CustomEvent('ti:navigate-direction', {detail:{key}}));
}'''
app,n=re.subn(r'function selectDirection\(key\) \{.*?\n\}',lambda m:select,app,count=1,flags=re.S)
assert n==1
close='''function closeDirection() {
  activeDirection = null;
  window.__TI_PENDING_DIR = null;
  window.dispatchEvent(new CustomEvent('ti:navigate-direction', {detail:{key:null}}));
}'''
app,n=re.subn(r'function closeDirection\(\) \{.*?\n\}',lambda m:close,app,count=1,flags=re.S)
assert n==1 and 'new THREE.' not in app and 'setAnimationLoop' not in app
app+='\nconst hashDirection=location.hash.slice(1);\nif(directions[hashDirection])setTimeout(()=>selectDirection(hashDirection),600);\n'
(out/'app.js').write_text(app,encoding='utf-8')
files=[out/'assets'/f'amg_driver_cabin_{q}_v3.glb' for q in ('desktop','mobile')]
config={'version':version,'rig':False,'files':[]}
if all(f.is_file() for f in files):
    for p in files:
        b=p.read_bytes(); assert struct.unpack_from('<III',b)==(0x46546c67,2,len(b)),f'{p}: bad GLB'
        n,t=struct.unpack_from('<II',b,12); assert t==0x4e4f534a
        doc=json.loads(b[20:20+n]); names={x.get('name') for x in doc['nodes']}
        assert {'driverDoor','interiorCabin'}<=names,f'{p}: incorrect rig'
        assert doc['asset'].get('extras',{}).get('driverSide')=='+X',f'{p}: unknown driver side'
        assert all('bufferView' in i for i in doc.get('images',[])),f'{p}: unpacked textures'
        config['files'].append({'name':p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
    config['rig']=True
(out/'hero-service-config.json').write_text(json.dumps(config,indent=2),encoding='utf-8')
# Normalize the old exterior wrapper, not its geometry. Service coordinates
# remain +Z-forward for both assets. This is done on the generated module only.
js=(out/'hero-service-navigator.js').read_text(encoding='utf-8')
needle='if(!verified)model.rotation.y=-Math.PI/2;'
assert needle in js
js=js.replace(needle,'if(!verified){const exterior=model;exterior.rotation.y=-Math.PI/2;model=new THREE.Group();model.add(exterior);}',1)
js=js.replace('return window.__TI_NAV;','if(MAP[window.__TI_PENDING_DIR])selectDirection(window.__TI_PENDING_DIR);\n return window.__TI_NAV;',1)
js=js.replace("hero.dataset.navReady='no-webgl';","hero.dataset.navReady='no-webgl';markerLayer.style.display='none';wires.style.display='none';",1)
(out/'hero-service-navigator.js').write_text(js,encoding='utf-8')
css=(root/'styles.css').read_text(encoding='utf-8')
for name in ('typography-overrides.css','section-motion.css','hero-service-navigator.css'):
    css+='\n'+(root/name).read_text(encoding='utf-8')
(out/'styles.css').write_text(css,encoding='utf-8')
html=(root/'index.html').read_text(encoding='utf-8').replace('class="hero"','class="hero nav-enabled"',1)
needle='<script type="module" src="./app.js"></script>'
assert needle in html,'Source index must contain its canonical app.js tag'
tags='<script>window.TI_NAV_CONFIG='+json.dumps(config,separators=(',',':'))+';</script>\n'
tags+='  <script src="./navigation-overrides.js"></script>\n  <script type="module" src="./app.js"></script>\n  <script src="./section-motion.js"></script>\n  <script type="module" src="./hero-service-navigator.bundle.js"></script>'
html=html.replace(needle,tags,1)
(out/'index.html').write_text(html,encoding='utf-8')
for p in out.glob('*.html'):
    text=p.read_text(encoding='utf-8')
    text=re.sub(r'((?:src|href)="\./[^"?]+\.(?:css|js))"',lambda m:m[1]+'?v='+version+'"',text)
    p.write_text(text,encoding='utf-8')
assert 'src="./premium-car.js' not in (out/'index.html').read_text()
print(json.dumps({'navigator':'active','driverDoor':config['rig'],'legacyRenderer':'removed','version':version}))
