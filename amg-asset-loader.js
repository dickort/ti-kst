import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// The .gz is an exact transport envelope, not mesh or image recompression.
// Fall back to the identical raw GLB on browsers without Compression Streams.
export function supportsGzip() {
  try { new DecompressionStream('gzip'); return true; } catch { return false; }
}
export async function loadPackedGLB(asset, onProgress = () => {}) {
  const compressed = !!asset.gzip && supportsGzip();
  const url = compressed ? asset.gzip : asset.url;
  const started = performance.now();
  const response = await fetch(url, {mode:'cors', credentials:'same-origin', cache:'default'});
  if (!response.ok) throw new Error(`AMG HTTP ${response.status}: ${url}`);
  let total = Number(response.headers.get('content-length')) || (compressed ? asset.gzipBytes : asset.bytes);
  let received = 0;
  const stream = response.body?.pipeThrough(new TransformStream({transform(chunk, controller) {
    received += chunk.byteLength; onProgress(Math.min(100, Math.round(100 * received / total)));
    controller.enqueue(chunk);
  }}));
  const bytes = await new Response(stream || await response.arrayBuffer()).arrayBuffer();
  const networkEnd = performance.now();
  // Some hosts send Content-Encoding:gzip. Fetch has already decoded those.
  // Check magic instead of decompressing twice.
  const magic = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  let data = bytes;
  if (magic[0] === 0x1f && magic[1] === 0x8b) {
    data = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  if (data.byteLength < 28 || new DataView(data).getUint32(0, true) !== 0x46546c67) {
    throw new Error('AMG asset is not a GLB');
  }
  if (asset.bytes && data.byteLength !== asset.bytes) throw new Error('AMG asset length mismatch');
  const gltf = await new GLTFLoader().parseAsync(data, new URL('.', new URL(asset.url, location.href)).href);
  return {gltf, metrics:{url, transferredBytes:received || bytes.byteLength, decodedBytes:data.byteLength, downloadMs:networkEnd-started, parseMs:performance.now()-networkEnd}};
}
