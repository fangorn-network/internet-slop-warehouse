// ambientCG (https://ambientcg.com, CC0: https://docs.ambientcg.com/license/) 1K-JPG materials.
// Usage: node ingestion/ambientcg/ingest.mjs <prefix> <AssetId>:<name> ...   e.g. hotel OfficeCeiling001:ceiling
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [prefix, ...specs] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(prefix ?? '') || !specs.length) throw Error('Usage: ingest.mjs <prefix> <AssetId>:<name> ...');
const here = new URL('./', import.meta.url), dest = new URL('../../parts/acg/', here);
await mkdir(dest, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const UA = { 'User-Agent': 'internet-slop-warehouse-seed/0.1' };
const ROLES = { color: 'Color', normal: 'NormalGL', roughness: 'Roughness' };

const parts = [], provenance = [];
for (const spec of specs) {
  const [assetId, name] = spec.split(':');
  const meta = await (await fetch(`https://ambientcg.com/api/v3/assets?id=${assetId}&include=downloads`, { headers: UA })).json();
  const dl = meta.assets?.[0]?.downloads?.find(d => d.attributes === '1K-JPG');
  if (!dl) throw Error(`${assetId}: no 1K-JPG`);
  if (new URL(dl.url).hostname !== 'ambientcg.com') throw Error(`Unexpected source ${dl.url}`);
  const zip = Buffer.from(await (await fetch(dl.url, { headers: UA, signal: AbortSignal.timeout(120000) })).arrayBuffer());
  if (zip.length !== dl.size) throw Error(`${assetId}: size mismatch`);
  // Unpack into a fresh directory; only the three maps we need are read back.
  const work = await mkdtemp(join(tmpdir(), 'acg-'));
  try {
    await writeFile(join(work, 'a.zip'), zip);
    execFileSync('unzip', ['-q', join(work, 'a.zip'), `*_${ROLES.color}.jpg`, `*_${ROLES.normal}.jpg`, `*_${ROLES.roughness}.jpg`, '-d', join(work, 'out')]);
    for (const [role, suffix] of Object.entries(ROLES)) {
      const bytes = await readFile(join(work, 'out', `${assetId}_1K-JPG_${suffix}.jpg`));
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw Error(`${assetId} ${role}: not a JPEG`);
      const id = `acg-${prefix}-${name}-${role}`;
      await writeFile(new URL(`${id}.jpg`, dest), bytes);
      parts.push({ id, file: `acg/${id}.jpg`, type: 'asset', mime: 'image/jpeg', title: `ambientCG ${assetId} · ${role}`, author: 'ambientCG (Lennart Demes)', license: 'CC0-1.0',
        tags: ['ambientcg', 'pbr', 'texture', prefix, name, role],
        description: `${assetId} ${role} map, 1K, from https://ambientcg.com/a/${assetId}. ${role === 'normal' ? 'OpenGL normal, linear.' : role === 'color' ? 'sRGB base color.' : 'Linear roughness.'} CC0-1.0.` });
      provenance.push({ id, source: `https://ambientcg.com/a/${assetId}`, license: 'CC0-1.0', licenseUrl: 'https://docs.ambientcg.com/license/', archive: dl, archiveSha256: sha(zip), sha256: sha(bytes), bytes: bytes.length, acquiredAt: new Date().toISOString() });
      console.log(id, bytes.length);
    }
  } finally { await rm(work, { recursive: true, force: true }); }
}
await mkdir(new URL(`batches/${prefix}/`, here), { recursive: true });
await writeFile(new URL(`batches/${prefix}/parts.json`, here), JSON.stringify(parts, null, 2) + '\n');
await writeFile(new URL(`batches/${prefix}/provenance.json`, here), JSON.stringify(provenance, null, 2) + '\n');
