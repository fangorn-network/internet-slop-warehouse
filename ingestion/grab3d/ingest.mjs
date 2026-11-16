// Grab3D (https://grab3d.com/developers/) CC0 models. Bounded selection; cached; size-checked; provenance kept.
// Usage: node ingestion/grab3d/ingest.mjs <batch-name>   (reads batches/<batch>/selection.json)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const batch = process.argv[2];
if (!/^[a-z0-9-]+$/.test(batch ?? '')) throw Error('Usage: ingest.mjs <batch-name>');
const root = new URL('./', import.meta.url), dir = new URL(`batches/${batch}/`, root), cache = new URL('cache/', root);
const dest = new URL('../../parts/grab3d/', root);
await Promise.all([mkdir(dir, { recursive: true }), mkdir(cache, { recursive: true }), mkdir(dest, { recursive: true })]);
const sha = b => createHash('sha256').update(b).digest('hex');
const slugs = JSON.parse(await readFile(new URL('selection.json', dir)));

async function get(url, bytes) {
  if (new URL(url).hostname !== 'grab3d.com') throw Error(`Unexpected source: ${url}`);
  const path = new URL(sha(url), cache);
  const ok = b => { if (bytes !== undefined && b.length !== bytes) throw Error(`Size mismatch: ${url}`); return b; };
  try { return ok(await readFile(path)); } catch (e) { if (e.code !== 'ENOENT' && !/Size/.test(e.message)) throw e; }
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'internet-slop-warehouse-seed/0.1' }, signal: AbortSignal.timeout(90000) });
      if (!res.ok) throw Error(`${res.status} ${url}`);
      const b = ok(Buffer.from(await res.arrayBuffer()));
      await writeFile(path, b);
      await new Promise(r => setTimeout(r, 300));          // be polite to a static host
      return b;
    } catch (e) { if (attempt === 2) throw e; await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); }
  }
}

const parts = [], provenance = [];
for (const slug of slugs) {
  const meta = JSON.parse(await get(`https://grab3d.com/api/v1/models/${slug}.json`));
  const m = meta.model ?? meta;
  if (m.license !== 'CC0-1.0') throw Error(`${slug}: license ${m.license}`);
  const file = (m.files ?? []).find(f => f.format === 'glb' && f.variant === 'full');
  if (!file) throw Error(`${slug}: no full GLB`);
  const glb = await get(file.url, file.bytes);
  if (glb.readUInt32LE(0) !== 0x46546c67) throw Error(`${slug}: not a GLB`);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)));
  const license = await get(m.origin.licenseUrl), manifest = await get(m.origin.manifestUrl);
  await writeFile(new URL(`${slug}.LICENSE.txt`, dir), license);
  await writeFile(new URL(`${slug}.manifest.json`, dir), manifest);
  const id = `g3-${slug}`, out = `grab3d/${id}.glb`;
  await writeFile(new URL(`${id}.glb`, dest), glb);
  const name = m.name?.en ?? slug;
  parts.push({ id, file: out, type: 'asset', title: `${name} (Grab3D)`, mime: 'model/gltf-binary', license: 'CC0-1.0', author: 'Grab3D',
    tags: [...new Set(['model', 'gltf', 'grab3d', m.style, m.category, ...(m.tags ?? []).slice(0, 8)])].filter(Boolean),
    description: `${name}. ${m.summary ?? ''} ${m.style} style, ${m.specs?.triangles} triangles, ${m.specs?.texturePx}px PBR textures, ${m.specs?.dimensionsMeters?.join(' x ')} m. Origin: ${m.origin.method}${m.origin.aiContent ? ' (AI-generated content)' : ', no generative-AI geometry or textures'}. Source ${m.page}. CC0-1.0.`.replace(/\s+/g, ' ') });
  provenance.push({ id, upstream: slug, source: m.page, license: 'CC0-1.0', licenseUrl: m.origin.licenseUrl, licenseSha256: sha(license), manifestUrl: m.origin.manifestUrl, manifestSha256: sha(manifest),
    origin: m.origin, download: file, sha256: sha(glb), bytes: glb.length, extensionsRequired: json.extensionsRequired ?? [], acquiredAt: new Date().toISOString(), specs: m.specs });
  console.log(id, glb.length, m.origin.method, (json.extensionsRequired ?? []).join(',') || 'no required extensions');
}
await writeFile(new URL('parts.json', dir), JSON.stringify(parts, null, 2) + '\n');
await writeFile(new URL('provenance.json', dir), JSON.stringify(provenance, null, 2) + '\n');
