import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// The .gz is an exact transport envelope, not mesh or image recompression.
// Fall back to the identical raw GLB on browsers without Compression Streams.
export function supportsGzip() {
  try { new DecompressionStream('gzip'); return true; } catch { return false; }
}
export async function loadPackedGLB(asset, onProgress = () => {}) {
  const compressed = !!asset.gzip && supportsGzip();
  const started = performance.now();
  let result;
  try { result = await downloadGLB(compressed ? asset.gzip : asset.url, asset, onProgress); }
  catch (error) {
    if (!compressed) throw error;
    // A stale CDN or unavailable gzip response must not strand the scene.
    // The fallback contains exactly the same geometry and image bytes.
    result = await downloadGLB(asset.url, asset, onProgress);
    result.fallback = true;
  }
  const parseStart = performance.now();
  const gltf = await new GLTFLoader().parseAsync(result.data, new URL('.', new URL(asset.url, location.href)).href);
  return {gltf, metrics:{url:result.url, transferredBytes:result.received, decodedBytes:result.data.byteLength, downloadMs:parseStart-started, parseMs:performance.now()-parseStart, fallback:!!result.fallback}};
}

async function downloadGLB(url, asset, onProgress) {
  const response = await fetch(url, {mode:'cors', credentials:'same-origin', cache:'default'});
  if (!response.ok) throw new Error(`AMG HTTP ${response.status}: ${url}`);
  const total = Number(response.headers.get('content-length')) || (url===asset.gzip ? asset.gzipBytes : asset.bytes);
  let received = 0;
  const input=response.body || new Blob([await response.arrayBuffer()]).stream();
  const reader=input.getReader(),prefix=[];
  let prefixBytes=0;
  // Read only the magic bytes before choosing a decoding stream.
  while(prefixBytes<2){const chunk=await reader.read();if(chunk.done)break;prefix.push(chunk.value);prefixBytes+=chunk.value.byteLength;}
  const magic=new Uint8Array(prefixBytes);let offset=0;
  for(const chunk of prefix){magic.set(chunk,offset);offset+=chunk.byteLength;}
  function progress(chunk,controller){received+=chunk.byteLength;onProgress(total?Math.min(100,Math.round(100*received/total)):0);controller.enqueue(chunk);}
  let stream=new ReadableStream({
    start(controller){for(const chunk of prefix)progress(chunk,controller);},
    async pull(controller){try{const chunk=await reader.read();if(chunk.done)controller.close();else progress(chunk.value,controller);}catch(error){controller.error(error);}},
    cancel(reason){return reader.cancel(reason);}
  });
  // Some hosts send Content-Encoding:gzip. Fetch has already decoded those.
  // Decode during download, without retaining a second full compressed buffer.
  if(magic[0]===0x1f&&magic[1]===0x8b)stream=stream.pipeThrough(new DecompressionStream('gzip'));
  const data=await new Response(stream).arrayBuffer();
  if (data.byteLength < 28 || new DataView(data).getUint32(0, true) !== 0x46546c67) {
    throw new Error('AMG asset is not a GLB');
  }
  if (asset.bytes && data.byteLength !== asset.bytes) throw new Error('AMG asset length mismatch');
  onProgress(100);
  return {data,url,received};
}
