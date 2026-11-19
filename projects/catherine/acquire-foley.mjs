// SPDX-License-Identifier: CC0-1.0
// Kenney Impact Sounds (CC0): wooden footsteps and a heavy board impact, for Catherine's walk on a floor that isn't there.
// Same format as projects/mairas-dream/assets/foley.json (clips as embedded Ogg data URLs). Unmodified audio.
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const names = ['footstep_wood_000', 'footstep_wood_001', 'footstep_wood_002', 'footstep_wood_003', 'footstep_wood_004', 'impactWood_heavy_000', 'impactPlank_medium_000'];
const bank = { author: 'Kenney', license: 'CC0-1.0', source: 'https://kenney.nl/assets/impact-sounds', clips: {} }, provenance = [];
for (const name of names) {
  const url = `https://raw.githubusercontent.com/receptron/mulmocast-media/main/soundeffects/kenney/impact-sounds/${name}.ogg`;
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`${r.status}: ${name}`);
  const b = Buffer.from(await r.arrayBuffer());
  if (b.subarray(0, 4).toString() !== 'OggS') throw Error(`${name}: not Ogg`);
  bank.clips[name] = 'data:audio/ogg;base64,' + b.toString('base64');
  provenance.push({ id: name, source: url, official: bank.source, license: 'CC0-1.0', sha256: createHash('sha256').update(b).digest('hex'), bytes: b.length });
}
const dir = new URL('./assets/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL('wood-foley.json', dir), JSON.stringify(bank));
await writeFile(new URL('wood-foley.provenance.json', dir), JSON.stringify(provenance, null, 2) + '\n');
console.log(provenance.map(p => `${p.id} ${p.bytes}`).join('\n'));
