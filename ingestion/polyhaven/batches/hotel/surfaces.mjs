// Powered by Poly Haven. Hotel surfaces + sky: 1K PBR maps and a 2K HDRI, CC0.
// Verifies upstream byte length and MD5, records SHA-256. Reruns reuse files already on disk.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const here = new URL('./', import.meta.url);
const dest = new URL('../../../../parts/haven/', here);
const hash = (b, algo = 'sha256') => createHash(algo).update(b).digest('hex');
const UA = { 'User-Agent': 'internet-slop-warehouse-seed/0.1' };
const json = async url => (await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) })).json();

// [upstream id, short name, roles]
const textures = [
  ['herringbone_parquet', 'parquet', ['color', 'normal', 'roughness']],
  ['poly_wool_herringbone', 'carpet', ['color', 'normal', 'roughness']],
  ['white_sandstone_bricks_03', 'stone-facade', ['color', 'normal', 'roughness']],
  ['sparse_grass', 'lawn', ['color', 'normal']],
  // batch 3: interior materials
  ['beige_wall_002', 'wall-plaster', ['normal', 'roughness']],
  ['american_walnut_veneer', 'walnut', ['color', 'normal', 'roughness']],
  ['long_white_tiles', 'bath-tile', ['color', 'normal', 'roughness']],
  ['square_tiled_wall', 'pool-tile', ['color', 'normal']],
  ['rubber_tiles', 'gym-rubber', ['color', 'normal', 'roughness']],
  ['brushed_concrete', 'concrete', ['color', 'normal', 'roughness']],
];
const pick = (files, role) => {
  const key = role === 'color' ? ['Diffuse', 'diff', 'diffuse', 'col1'].find(k => files[k])
    : role === 'normal' ? 'nor_gl' : ['Rough', 'rough'].find(k => files[k]);
  return files[key]?.['1k']?.jpg;
};

const jobs = [];
for (const [upstream, name, roles] of textures) {
  const files = await json(`https://api.polyhaven.com/files/${upstream}`);
  for (const role of roles) jobs.push({ upstream, id: `ph-hotel-${name}-${role}`, ext: 'jpg', mime: 'image/jpeg', role, name, spec: pick(files, role) });
}
for (const [upstream, id, name, res] of [['farm_field_puresky', 'ph-hotel-farm-sky', 'farm sky', '2k'], ['industrial_sunset_02_puresky', 'ph-hotel-dusk-sky', 'dusk sky', '2k'], ['hotel_room', 'ph-hotel-room-hdri', 'hotel room', '1k']]) {
  const sky = await json(`https://api.polyhaven.com/files/${upstream}`);
  jobs.push({ upstream, id, ext: 'hdr', mime: 'image/vnd.radiance', role: 'hdri', name, spec: sky.hdri[res].hdr });
}

const parts = [], provenance = [];
for (const job of jobs) {
  if (!job.spec) throw Error(`${job.id}: missing upstream variant`);
  const target = new URL(`${job.id}.${job.ext}`, dest);
  let bytes = await readFile(target).catch(() => null);
  if (!bytes || hash(bytes, 'md5') !== job.spec.md5) {
    const res = await fetch(job.spec.url, { headers: UA, signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw Error(`${res.status} ${job.spec.url}`);
    bytes = Buffer.from(await res.arrayBuffer());
  }
  if (bytes.length !== job.spec.size || hash(bytes, 'md5') !== job.spec.md5) throw Error(`${job.id}: source mismatch`);
  await writeFile(target, bytes);
  const info = await json(`https://api.polyhaven.com/info/${job.upstream}`);
  const creator = Object.keys(info.authors ?? {}).join(', ');
  const usage = { color: 'sRGB base color.', normal: 'OpenGL +Y tangent-space normal, linear.', roughness: 'Linear roughness.', hdri: job.name === 'hotel room' ? 'Equirectangular Radiance HDR (1K) of a real hotel room; use as an indoor environment map for reflections.' : 'Equirectangular Radiance HDR (2K); load with RGBELoader for sky and image-based lighting.' }[job.role];
  const title = job.role === 'hdri' ? { 'dusk sky': 'Prairie dusk sky (pure sky HDRI)', 'farm sky': 'Farm field sky (pure sky HDRI)', 'hotel room': 'Hotel room interior HDRI' }[job.name] : `Hotel ${job.name} ${job.role}`;
  parts.push({ id: job.id, file: `haven/${job.id}.${job.ext}`, type: 'asset', mime: job.mime, title, author: creator.slice(0, 64), license: 'CC0-1.0',
    tags: ['polyhaven', 'hotel', 'realistic', job.role === 'hdri' ? 'hdri' : 'texture', job.role === 'hdri' ? 'sky' : 'pbr', job.name.replace(' ', '-'), job.role],
    description: `${title}. ${usage} Source https://polyhaven.com/a/${job.upstream}, by ${creator}. CC0-1.0.` });
  provenance.push({ id: job.id, source: `https://polyhaven.com/a/${job.upstream}`, license: 'CC0-1.0', licenseUrl: 'https://polyhaven.com/license', creator, download: job.spec, bytes: bytes.length, sha256: hash(bytes), acquiredAt: new Date().toISOString() });
  console.log(job.id, bytes.length);
}
await writeFile(new URL('surfaces.parts.json', here), JSON.stringify(parts, null, 2) + '\n');
await writeFile(new URL('surfaces.provenance.json', here), JSON.stringify(provenance, null, 2) + '\n');
