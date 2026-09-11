"""Build the layered navigator with one renderer and verified source-object rig."""
from pathlib import Path
import hashlib, json, os, re, shutil, struct
root=Path('.'); out=Path('_site'); version=os.environ.get('GITHUB_SHA','local-services-v1')
if out.exists(): shutil.rmtree(out)
out.mkdir()
for p in root.iterdir():
    if p.name in {'package.json','package-lock.json','vite.config.mjs'}: continue
    if p.is_file() and p.suffix in {'.html','.css','.js','.mjs','.svg','.ico','.json'}: shutil.copy2(p,out/p.name)
shutil.copytree(root/'assets',out/'assets')
source=(root/'app.js').read_text(encoding='utf-8')
prefix=source[:source.index('const header =')]
prefix='\n'.join(line for line in prefix.splitlines() if not line.startswith('import '))
(out/'hero-service-catalog.mjs').write_text(prefix+'\nexport {directions,services};\n',encoding='utf-8')
legacy='// ---------------------------------------------------------------------------\n// Procedural 3D concept car.'
assert legacy in source, 'Reconcile the legacy scene boundary in app.js first'
app=source.split(legacy,1)[0]
app='\n'.join(line for line in app.splitlines() if not line.startswith('import * as THREE'))
select='''function selectDirection(key) {
  if (!directions[key]) return;
  activeDirection = key;
  window.__TI_PENDING_DIR = key;
  window.dispatchEvent(new CustomEvent('ti:navigate-direction', {detail:{key}}));
}'''
app,n=re.subn(r'function selectDirection\(key\) \{.*?\n\}',lambda m:select,app,count=1,flags=re.S);assert n==1
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
js=(out/'hero-service-navigator.js').read_text(encoding='utf-8')
def replace(old,new):
    global js
    assert old in js, 'Renderer integration target changed: '+old[:100]
    js=js.replace(old,new,1)
replace('if(!verified)model.rotation.y=-Math.PI/2;','if(!verified){const exterior=model;exterior.rotation.y=-Math.PI/2;model=new THREE.Group();model.add(exterior);}')
replace('return window.__TI_NAV;','if(MAP[window.__TI_PENDING_DIR])selectDirection(window.__TI_PENDING_DIR);\n return window.__TI_NAV;')
replace("hero.dataset.navReady='no-webgl';","hero.dataset.navReady='no-webgl';markerLayer.style.display='none';wires.style.display='none';")
# One RAF heartbeat; actual GPU draws stay demand-based.
replace('function invalidate(){dirty=true;if(!raf&&visible&&!document.hidden&&!disposed)raf=requestAnimationFrame(tick);}','function invalidate(){dirty=true;}')
replace('function tick(now){raf=0;if(disposed||!visible||document.hidden)return;','function tick(now){if(disposed)return;raf=requestAnimationFrame(tick);if(!visible||document.hidden)return;')
replace('lastTime=now;if(flight||doorMotion||pointers.size)raf=requestAnimationFrame(tick);','lastTime=now;')
replace('renderUI();\n // Diagnostics','renderUI();raf=requestAnimationFrame(tick);\n // Diagnostics')
# Preserve visible intermediate steps on slower devices rather than jumping.
replace('const m=flight,t=Math.min(1,Math.max(0,(now-m.start)/m.duration)),e=ease(t);','const m=flight;m.elapsed=(m.elapsed||0)+Math.min(50,Math.max(0,now-(m.last??m.start)));m.last=now;const t=Math.min(1,m.elapsed/m.duration),e=ease(t);')
replace('const m=doorMotion,t=Math.min(1,Math.max(0,(now-m.start)/m.duration));','const m=doorMotion;m.elapsed=(m.elapsed||0)+Math.min(50,Math.max(0,now-Math.max(m.last??m.start,m.start)));m.last=now;const t=Math.min(1,m.elapsed/m.duration);')
(out/'hero-service-navigator.js').write_text(js,encoding='utf-8')
css=(root/'styles.css').read_text(encoding='utf-8')
for name in ('section-motion.css','hero-service-navigator.css'): css+='\n'+(root/name).read_text(encoding='utf-8')
(out/'styles.css').write_text(css,encoding='utf-8')
html=(root/'index.html').read_text(encoding='utf-8').replace('class="hero"','class="hero nav-enabled"',1)
# Restore the v55-sized headline, with intentional lines instead of overflowing
# an undersized text box. On mobile the first break is hidden by CSS.
old_title='Что нужно<br /><span>вашему автомобилю?</span>'
new_title='Что<br class="hero-title-desktop-break" /> нужно<br /><span>вашему<br />автомобилю?</span>'
assert old_title in html, 'Reconcile source hero title before building'
html=html.replace(old_title,new_title,1)
needle='<script type="module" src="./app.js"></script>';assert needle in html
scripts='<script>window.TI_NAV_CONFIG='+json.dumps(config,separators=(',',':'))+';</script>\n'
scripts+='  <script src="./navigation-overrides.js"></script>\n  <script type="module" src="./app.js"></script>\n  <script src="./section-motion.js"></script>\n  <script type="module" src="./hero-service-navigator.bundle.js"></script>'
(out/'index.html').write_text(html.replace(needle,scripts,1),encoding='utf-8')
for p in out.glob('*.html'):
    text=p.read_text(encoding='utf-8')
    text=re.sub(r'((?:src|href)="\./[^"?]+\.(?:css|js))"',lambda m:m[1]+'?v='+version+'"',text)
    p.write_text(text,encoding='utf-8')
assert 'src="./premium-car.js' not in (out/'index.html').read_text()
print(json.dumps({'navigator':'active','driverDoor':config['rig'],'legacyRenderer':'removed','version':version}))
