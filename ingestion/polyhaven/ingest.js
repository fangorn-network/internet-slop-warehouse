// Powered by Poly Haven. Bounded CC0 pilot; reruns reuse verified downloads.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('./', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.json', root)));
const batch = process.argv[2] === '--batch' ? process.argv[3] : null;
if (process.argv.length > 2 && (!batch || !/^[a-z0-9-]+$/.test(batch))) throw Error('Usage: ingest.js [--batch lowercase-name]');
const output = batch ? new URL(`batches/${batch}/`, root) : root;
await mkdir(output, { recursive: true });
const ids = batch ? JSON.parse(await readFile(new URL('selection.json', output))) : ['wooden_crate_01', 'ammo_box', 'crowbar_01', 'Shelf_01', 'WoodenTable_01', 'ArmChair_01'];
const sha = b => createHash('sha256').update(b).digest('hex');
const cache = new URL('cache/', root);
await mkdir(cache, { recursive: true });
await mkdir(new URL('../../parts/haven/', root), { recursive: true });
async function download(url, expected) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !['api.polyhaven.com', 'dl.polyhaven.org', 'polyhaven.com'].includes(parsed.hostname)) throw Error(`Unexpected source: ${url}`);
  const path = new URL(sha(url), cache);
  const check = b => {
    if (expected?.size !== undefined && b.length !== expected.size) throw Error(`Size mismatch: ${url}`);
    if (expected?.md5 && createHash('md5').update(b).digest('hex') !== expected.md5) throw Error(`Checksum mismatch: ${url}`);
    return b;
  };
  try { return check(await readFile(path)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'internet-slop-warehouse-seed/0.1' }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw Error(`${res.status}: ${url}`);
      const b = check(Buffer.from(await res.arrayBuffer()));
      await writeFile(path, b);
      return b;
    } catch (e) { if (attempt === 2) throw e; await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); }
  }
}
const license = await download('https://polyhaven.com/license');
await writeFile(new URL('license-evidence.html', output), license);
const provenance = [], parts = [];
for (const id of ids) {
  const meta = catalog[id];
  if (!meta) throw Error(`Unknown model ${id}`);
  const filesBytes = await download(`https://api.polyhaven.com/files/${id}`);
  const files = JSON.parse(filesBytes);
  await writeFile(new URL(`${id}.files.json`, output), filesBytes);
  const source = files.gltf?.['1k']?.gltf;
  if (!source) throw Error(`${id}: no 1k glTF`);
  const evidence = [];
  async function resource(url, expected) {
    const b = await download(url, expected);
    evidence.push({ url, bytes: b.length, sha256: sha(b), upstreamMd5: expected?.md5 });
    return b;
  }
  const document = JSON.parse(await resource(source.url, source));
  if (document.asset?.version !== '2.0') throw Error('Only glTF 2 supported');
  const chunks = []; let length = 0;
  function append(b) {
    const offset = length;
    chunks.push(b); length += b.length;
    const pad = (4 - length % 4) % 4;
    if (pad) { chunks.push(Buffer.alloc(pad)); length += pad; }
    return offset;
  }
  async function dependency(uri) {
    const spec = source.include?.[uri];
    if (!spec) throw Error(`Unlisted dependency ${uri}`);
    return resource(spec.url, spec);
  }
  const offsets = [];
  for (const b of document.buffers ?? []) {
    const data = await dependency(b.uri);
    if (data.length !== b.byteLength) throw Error('Buffer length mismatch');
    offsets.push(append(data));
  }
  for (const view of document.bufferViews ?? []) {
    const buffer = document.buffers[view.buffer];
    if (!buffer || (view.byteOffset ?? 0) + view.byteLength > buffer.byteLength) throw Error('Invalid buffer view');
    view.byteOffset = (view.byteOffset ?? 0) + offsets[view.buffer]; view.buffer = 0;
  }
  document.bufferViews ??= [];
  for (const image of document.images ?? []) if (image.uri) {
    const data = await dependency(image.uri);
    const mimeType = data[0] === 255 && data[1] === 216 ? 'image/jpeg' : data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : null;
    if (!mimeType) throw Error('Unsupported image');
    image.bufferView = document.bufferViews.length;
    document.bufferViews.push({ buffer: 0, byteOffset: append(data), byteLength: data.length });
    image.mimeType = mimeType; delete image.uri;
  }
  document.buffers = [{ byteLength: length }];
  let json = Buffer.from(JSON.stringify(document));
  json = Buffer.concat([json, Buffer.alloc((4-json.length%4)%4, 32)]);
  const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2,4); header.writeUInt32LE(28+json.length+length,8); header.writeUInt32LE(json.length,12); header.writeUInt32LE(0x4e4f534a,16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(length); binHeader.writeUInt32LE(0x004e4942,4);
  const glb = Buffer.concat([header,json,binHeader,...chunks]);
  const partId = `ph-${id.toLowerCase().replaceAll('_','-')}`;
  const file = `haven/${partId}.glb`;
  await writeFile(new URL(`../../parts/${file}`, root), glb);
  const creator = Object.keys(meta.authors ?? {}).join(', ');
  const stats = { meshes: document.meshes?.length ?? 0, materials: document.materials?.length ?? 0, animations: (document.animations ?? []).map(a=>a.name ?? '(unnamed)'), requiredExtensions: document.extensionsRequired ?? [] };
  provenance.push({ id: partId, upstreamId: id, creator, source: `https://polyhaven.com/a/${id}`, license: 'CC0-1.0', licenseUrl:'https://polyhaven.com/license', licenseEvidenceSha256:sha(license), acquiredAt:new Date().toISOString(), resources:evidence, output:{ file, bytes:glb.length, sha256:sha(glb), ...stats }, transformation:'Pack upstream 1K glTF buffers and images into GLB; geometry/materials unchanged.', metadata:meta });
  parts.push({ id:partId, file, type:'asset', title:meta.name, mime:'model/gltf-binary', license:'CC0-1.0', author:creator.slice(0,64), tags:[...new Set(['model','gltf','realistic','pbr',...meta.categories,...meta.tags])], description:`${meta.name} from Poly Haven, by ${creator}. Self-contained GLB with 1K textures. Upstream polygon count: ${meta.polycount}; ${stats.meshes} meshes. Source: https://polyhaven.com/a/${id}. CC0-1.0. Original scale and pivots preserved; use a bounding box when positioning.` });
  console.log(`${partId}: ${glb.length} bytes, ${stats.meshes} meshes, ${stats.requiredExtensions.join(',') || 'no required extensions'}`);
  await writeFile(new URL('provenance.json', output), JSON.stringify(provenance,null,2)+'\n');
  await writeFile(new URL('parts.json', output), JSON.stringify(parts,null,2)+'\n');
}
