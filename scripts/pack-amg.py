"""Split the uploaded, verified AMG at original object boundaries; no mesh edits."""
from pathlib import Path
import copy, json, struct, hashlib, gzip

DOOR_INSIDE={'Matte_Plastic_Interior','Speakers_doors','Black_gloss','Dynamic','Decals',
             'Satin_Interior','Leather_Black','Carbon_Fiber_Interior','Stitch_1'}
# The source exporter placed the windshield under interiorCabin. It seals the
# exterior silhouette and must render before seats/dash/door cards are fetched.
EXTERIOR_ENVELOPE={'cabin__Glass'}

def read_glb(path):
    raw=Path(path).read_bytes(); magic,v,total=struct.unpack_from('<III',raw)
    assert (magic,v,total)==(0x46546c67,2,len(raw))
    n,tag=struct.unpack_from('<II',raw,12); assert tag==0x4e4f534a
    doc=json.loads(raw[20:20+n]); off=20+n; length,tag=struct.unpack_from('<II',raw,off); assert tag==0x004e4942
    return doc,raw[off+8:off+8+length]

def texture_infos(value):
    if isinstance(value,dict):
        for k,v in value.items():
            if k.endswith('Texture') and isinstance(v,dict) and 'index' in v: yield v
            else: yield from texture_infos(v)
    elif isinstance(value,list):
        for v in value: yield from texture_infos(v)

def subset(doc, binary, part):
    d=copy.deepcopy(doc)
    assert not d.get('skins') and not d.get('cameras')
    is_inner=lambda n: n.get('name','') not in EXTERIOR_ENVELOPE and (n.get('name','').startswith('cabin__') or (n.get('name','').startswith('door__') and n['name'][6:] in DOOR_INSIDE))
    # Keep the same root, hinge and empty cabin group in both files. Their local
    # transforms are the source of truth; quantized mesh transforms stay intact.
    nodes=[i for i,n in enumerate(d['nodes']) if 'mesh' not in n or is_inner(n)==(part=='interior')]
    rem={i:k for k,i in enumerate(nodes)}
    d['nodes']=[d['nodes'][i] for i in nodes]
    for n in d['nodes']:
        if 'children' in n:n['children']=[rem[i] for i in n['children'] if i in rem]
    for s in d['scenes']:s['nodes']=[rem[i] for i in s['nodes'] if i in rem]
    meshes=sorted({n['mesh'] for n in d['nodes'] if 'mesh' in n}); rmesh={i:k for k,i in enumerate(meshes)}
    d['meshes']=[d['meshes'][i] for i in meshes]
    for n in d['nodes']:
        if 'mesh'in n:n['mesh']=rmesh[n['mesh']]
    prims=[p for m in d['meshes'] for p in m['primitives']]
    mats=sorted({p['material'] for p in prims if 'material' in p}); rm={i:k for k,i in enumerate(mats)}
    d['materials']=[d['materials'][i] for i in mats]
    for p in prims:
        if 'material'in p:p['material']=rm[p['material']]
    texinfos=list(texture_infos(d['materials']));texs=sorted({t['index'] for t in texinfos});rt={i:k for k,i in enumerate(texs)}
    d['textures']=[d['textures'][i] for i in texs]
    for t in texinfos:t['index']=rt[t['index']]
    images=sorted({t['source'] for t in d['textures'] if 'source'in t});ri={i:k for k,i in enumerate(images)}
    d['images']=[d['images'][i] for i in images]
    for t in d['textures']:
        if 'source'in t:t['source']=ri[t['source']]
    samps=sorted({t['sampler'] for t in d['textures'] if 'sampler'in t});rs={i:k for k,i in enumerate(samps)}
    d['samplers']=[d.get('samplers',[])[i] for i in samps]
    for t in d['textures']:
        if 'sampler'in t:t['sampler']=rs[t['sampler']]
    ac=set()
    for p in prims:
        ac.update(p['attributes'].values())
        if 'indices'in p:ac.add(p['indices'])
        for target in p.get('targets',[]):ac.update(target.values())
    # Runtime animates the hinge itself; retain native clips only in exterior.
    if part=='interior':d.pop('animations',None)
    for a in d.get('animations',[]):
        for c in a['channels']:c['target']['node']=rem[c['target']['node']]
        for s in a['samplers']:ac.update((s['input'],s['output']))
    ac=sorted(ac);ra={i:k for k,i in enumerate(ac)};d['accessors']=[d['accessors'][i] for i in ac]
    for p in prims:
        p['attributes']={s:ra[i] for s,i in p['attributes'].items()}
        if 'indices'in p:p['indices']=ra[p['indices']]
        for t in p.get('targets',[]):
            for k in t:t[k]=ra[t[k]]
    for a in d.get('animations',[]):
        for s in a['samplers']:
            for k in ('input','output'):s[k]=ra[s[k]]
    views=set(im['bufferView'] for im in d['images'])
    for a in d['accessors']:
        if 'bufferView'in a:views.add(a['bufferView'])
        if 'sparse'in a:
            views.update(a['sparse'][k]['bufferView'] for k in ('indices','values'))
    views=sorted(views);rv={};newviews=[];buf=bytearray();seen={}
    for old in views:
        bv=copy.deepcopy(d['bufferViews'][old]);start=bv.get('byteOffset',0);chunk=binary[start:start+bv['byteLength']]
        # Deduplicate only identical descriptors AND identical packed bytes.
        key=(hashlib.sha256(chunk).hexdigest(),json.dumps({k:v for k,v in bv.items() if k not in ('byteOffset','buffer')},sort_keys=True))
        if key in seen:rv[old]=seen[key];continue
        buf+=b'\0'*((-len(buf))%4);bv['buffer']=0;bv['byteOffset']=len(buf);buf+=chunk
        rv[old]=len(newviews);seen[key]=len(newviews);newviews.append(bv)
    d['bufferViews']=newviews;d['buffers']=[{'byteLength':len(buf)}]
    for a in d['accessors']:
        if 'bufferView'in a:a['bufferView']=rv[a['bufferView']]
        if 'sparse'in a:
            for k in ('indices','values'):a['sparse'][k]['bufferView']=rv[a['sparse'][k]['bufferView']]
    for im in d['images']:im['bufferView']=rv[im['bufferView']]
    d['asset']['extras']['loadPart']=part;d['asset']['extras']['splitVersion']=1
    names={n['name'] for n in d['nodes'] if 'mesh'in n}
    return d,bytes(buf),names

def write_glb(path,d,buf):
    j=json.dumps(d,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*((-len(j))%4);buf+=b'\0'*((-len(buf))%4)
    out=struct.pack('<III',0x46546c67,2,28+len(j)+len(buf))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(buf),0x004e4942)+buf
    Path(path).write_bytes(out);return out

def geometry_fingerprints(d, binary):
    """Hash exact packed accessor values, independent of buffer layout."""
    def accessor(index):
        a=d['accessors'][index]
        assert 'sparse' not in a, 'Sparse data needs its own exact comparison'
        bv=d['bufferViews'][a['bufferView']]
        width={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[a['componentType']]
        width*={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        start=bv.get('byteOffset',0)+a.get('byteOffset',0); stride=bv.get('byteStride',width)
        if stride==width: values=binary[start:start+a['count']*width]
        else: values=b''.join(binary[start+i*stride:start+i*stride+width] for i in range(a['count']))
        return (a['count'],a['componentType'],a['type'],a.get('normalized',False),hashlib.sha256(values).hexdigest())
    result={}
    for n in d['nodes']:
        if 'mesh' not in n:continue
        result[n['name']]={'transform':{k:n[k] for k in ('matrix','translation','rotation','scale') if k in n},'primitives':[]}
        for prim in d['meshes'][n['mesh']]['primitives']:
            result[n['name']]['primitives'].append({k:accessor(i) for k,i in {**prim['attributes'],'indices':prim['indices']}.items()})
    return result

def image_hashes(d, binary):
    return {hashlib.sha256(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]).hexdigest() for v in (d['bufferViews'][i['bufferView']] for i in d.get('images',[]))}

def model_bounds(d):
    """Match Three.js non-precise Box3 expansion of source accessor bounds."""
    import itertools, math
    identity=[[float(i==j) for j in range(4)] for i in range(4)]
    def mul(a,b):return [[sum(a[i][k]*b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
    def matrix(n):
        if 'matrix' in n:return [[n['matrix'][j*4+i] for j in range(4)]for i in range(4)]
        x,y,z,w=n.get('rotation',[0,0,0,1]);sx,sy,sz=n.get('scale',[1,1,1]);tx,ty,tz=n.get('translation',[0,0,0])
        return [[(1-2*y*y-2*z*z)*sx,(2*x*y-2*z*w)*sy,(2*x*z+2*y*w)*sz,tx],[(2*x*y+2*z*w)*sx,(1-2*x*x-2*z*z)*sy,(2*y*z-2*x*w)*sz,ty],[(2*x*z-2*y*w)*sx,(2*y*z+2*x*w)*sy,(1-2*x*x-2*y*y)*sz,tz],[0,0,0,1]]
    lo=[math.inf]*3;hi=[-math.inf]*3
    def walk(i,parent):
        n=d['nodes'][i];m=mul(parent,matrix(n))
        if 'mesh' in n:
            for p in d['meshes'][n['mesh']]['primitives']:
                a=d['accessors'][p['attributes']['POSITION']]
                divisor={5120:127,5121:255,5122:32767,5123:65535}.get(a['componentType'],1) if a.get('normalized') else 1
                for corner in itertools.product(*zip(a['min'],a['max'])):
                    v=[max(-1,t/divisor) if a.get('normalized') else t for t in corner]+[1]
                    for ax in range(3):
                        value=sum(m[ax][j]*v[j] for j in range(4));lo[ax]=min(lo[ax],value);hi[ax]=max(hi[ax],value)
        for c in n.get('children',[]):walk(c,m)
    for i in d['scenes'][d.get('scene',0)]['nodes']:walk(i,identity)
    return {'min':lo,'max':hi}

def prepare(source_directory, output_directory):
    src=Path(source_directory);dst=Path(output_directory);dst.mkdir(parents=True,exist_ok=True)
    result={'codec':'gzip','version':1,'qualityPreserved':True,'qualities':{}}
    for quality in ('desktop','mobile'):
        source=src/f'amg_driver_cabin_{quality}_v3.glb'
        doc,buf=read_glb(source);source_fp=geometry_fingerprints(doc,buf)
        parts={};part_fp={};images=set();triangles=0
        reference_bounds=model_bounds(doc)
        for part in ('exterior','interior'):
            d,b,n=subset(doc,buf,part)
            if part=='exterior':assert EXTERIOR_ENVELOPE<=n,'Closed car is missing its windshield'
            else:assert not EXTERIOR_ENVELOPE&n,'Windshield must not wait for the cabin'
            d['asset']['extras']['referenceBounds']=reference_bounds
            fp=geometry_fingerprints(d,b)
            assert all(source_fp[k]==v for k,v in fp.items()),'Geometry values changed'
            assert not set(part_fp)&set(fp),'A source mesh is duplicated'
            part_fp.update(fp);images.update(image_hashes(d,b))
            raw=write_glb(dst/f'temp-{quality}-{part}.glb',d,b)
            digest=hashlib.sha256(raw).hexdigest();name=f'amg_{quality}_{part}.{digest[:12]}.glb'
            (dst/f'temp-{quality}-{part}.glb').rename(dst/name)
            packed=gzip.compress(raw,compresslevel=9,mtime=0)
            assert gzip.decompress(packed)==raw,'Compression is not lossless'
            (dst/(name+'.gz')).write_bytes(packed)
            count=sum(d['accessors'][p['indices']]['count']//3 for m in d['meshes'] for p in m['primitives'])
            triangles+=count
            parts[part]={'url':'./assets/'+name,'gzip':'./assets/'+name+'.gz','bytes':len(raw),'gzipBytes':len(packed),'sha256':digest,'triangles':count,'images':len(d.get('images',[]))}
        assert part_fp==source_fp,'Missing source geometry'
        assert images==image_hashes(doc,buf),'Missing or altered image bytes'
        source_triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
        assert triangles==source_triangles,'Triangle count changed'
        result['qualities'][quality]={'sourceBytes':source.stat().st_size,'triangles':triangles,'referenceBounds':reference_bounds,'validation':{'exactAccessorValues':True,'exactNodeTransforms':True,'exactImageBytes':True,'triangleCountUnchanged':True,'losslessGzipRoundTrip':True,'closedCabinGlassRetained':True},**parts}
    (dst/'amg-stream-manifest.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    return result

if __name__=='__main__':
    import sys
    print(json.dumps(prepare(sys.argv[1],sys.argv[2]),indent=2))
