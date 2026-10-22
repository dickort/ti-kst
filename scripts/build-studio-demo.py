"""Append only the isolated demo to the existing Pages output."""
from pathlib import Path
import shutil, subprocess, sys

root = Path(__file__).resolve().parent.parent
source = root / 'demo/studio'
target = root / '_site/demo/studio'
assert (root / '_site/index.html').is_file(), 'Build the existing site first'
target.mkdir(parents=True, exist_ok=True)
for name in ['index.html', 'studio.css']:
    shutil.copy2(source / name, target / name)
esbuild = sys.argv[1] if len(sys.argv) > 1 else str(root / 'node_modules/.bin/esbuild')
subprocess.run([esbuild, str(source / 'studio.js'), '--bundle', '--format=esm',
                '--target=es2022', '--minify', '--outfile=' + str(target / 'studio.js')], check=True)
assert {p.name for p in target.iterdir()} == {'index.html','studio.css','studio.js'}
print('Built isolated demo/studio; reusing existing public GLB and poster assets.')
