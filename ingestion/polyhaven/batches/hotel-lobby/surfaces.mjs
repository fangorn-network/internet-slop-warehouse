// Powered by Poly Haven. Formula Blue lobby surfaces for the Heartland Inn: 1K PBR maps, CC0.
// Verifies upstream byte length and MD5, records SHA-256. Reruns reuse files already on disk.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const here = new URL('./', import.meta.url);
const dest = new URL('../../../../parts/haven/', here);
const hash = (b, algo = 'sha256') => createHash(algo).update(b).digest('hex');
const UA = { 'User-Agent': 'internet-slop-warehouse-seed/0.1' };
const json = async url => (await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) })).json();

// [upstream id, short name, what it is]
const textures = [
  ['laminate_floor_02', 'oak', 'Light oak commercial laminate plank (lobby floor, oak veneers)'],
  ['poly_wool_herringbone', 'herringbone', 'Grey poly-wool herringbone upholstery, about 27 cm a tile (lobby sofa)'],
  ['rough_linen', 'linen', 'Rough linen weave, about 27 cm a tile (vinyl wallcovering in the corridors, fabric-wrapped lobby columns)'],
  ['jogging_melange', 'melange', 'Grey melange (heathered) textile, about 27 cm a tile (base colour of the light-grey sectional and lobby sofa, under the herringbone weave)'],
];
const ROLES = ['color', 'normal', 'roughness'];
const pick = (files, role) => {
  const key = role === 'color' ? ['Diffuse', 'diff', 'diffuse', 'col1'].find(k => files[k])
    : role === 'normal' ? 'nor_gl' : ['Rough', 'rough'].find(k => files[k]);
  return files[key]?.['1k']?.jpg;
};

const parts = [], provenance = [];
for (const [upstream, name, what] of textures) {
  const files = await json(`https://api.polyhaven.com/files/${upstream}`);
  const info = await json(`https://api.polyhaven.com/info/${upstream}`);
  const creator = Object.keys(info.authors ?? {}).join(', ');
  for (const role of ROLES) {
    const spec = pick(files, role), id = `ph-hotel-${name}-${role}`;
    if (!spec) throw Error(`${id}: missing upstream variant`);
    const target = new URL(`${id}.jpg`, dest);
    let bytes = await readFile(target).catch(() => null);
    if (!bytes || hash(bytes, 'md5') !== spec.md5) {
      const res = await fetch(spec.url, { headers: UA, signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw Error(`${res.status} ${spec.url}`);
      bytes = Buffer.from(await res.arrayBuffer());
    }
    if (bytes.length !== spec.size || hash(bytes, 'md5') !== spec.md5) throw Error(`${id}: source mismatch`);
    await writeFile(target, bytes);
    const usage = { color: 'sRGB base color.', normal: 'OpenGL +Y tangent-space normal, linear.', roughness: 'Linear roughness.' }[role];
    const title = `Hotel ${name} ${role}`;
    parts.push({ id, file: `haven/${id}.jpg`, type: 'asset', mime: 'image/jpeg', title, author: creator.slice(0, 64), license: 'CC0-1.0',
      tags: ['polyhaven', 'hotel', 'lobby', 'realistic', 'texture', 'pbr', name, role],
      description: `${what}, ${role} map (1K). ${usage} Source https://polyhaven.com/a/${upstream}, by ${creator}. CC0-1.0.` });
    provenance.push({ id, source: `https://polyhaven.com/a/${upstream}`, license: 'CC0-1.0', licenseUrl: 'https://polyhaven.com/license', creator, download: spec, bytes: bytes.length, sha256: hash(bytes), acquiredAt: new Date().toISOString() });
    console.log(id, bytes.length);
  }
}
await writeFile(new URL('surfaces.parts.json', here), JSON.stringify(parts, null, 2) + '\n');
await writeFile(new URL('surfaces.provenance.json', here), JSON.stringify(provenance, null, 2) + '\n');
