// node projects/late-checkout/run/case.test.mjs — every seed builds a solvable, self-consistent night.
import assert from 'node:assert/strict';
import { generateNight } from './case.js';
import { SPOTS } from './spots.js';
const kinds = {}, culprits = {};
for (let seed = 1; seed <= 5000; seed++) {
  const n = generateNight(seed);
  assert.deepEqual(generateNight(seed), n, 'deterministic');
  assert.equal(n.pieces.length, 4);
  const used = [n.keysSpot, ...n.pieces.map(p => p.spot), ...n.notes.map(x => x.spot)];
  assert.equal(new Set(used).size, used.length, `seed ${seed}: a spot is used twice`);
  assert.ok(SPOTS[n.keysSpot] && !SPOTS[n.keysSpot].lock);
  for (const [i, p] of n.pieces.entries()) {
    kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
    if (i < 3) assert.ok(p.back && p.back === n.pieces[i + 1].clue, 'each back leads on'); else assert.equal(p.back, null);
    if (p.kind === 'code') { assert.match(p.code, /^\d{4}$/); assert.ok(SPOTS[p.spot].lock); assert.ok(n.notes.some(x => x.text.includes(p.code.slice(0, 2)))); }
    if (p.kind === 'hidden' || p.kind === 'window') assert.ok(SPOTS[p.spot] && !SPOTS[p.spot].lock);
    if (p.kind === 'knock') assert.ok(p.door !== 212 && p.knocks >= 2);
  }
  assert.ok(n.rules.length >= 5 && n.rules.every(x => typeof x === 'string' && x.length));
  culprits[n.culprit.id] = (culprits[n.culprit.id] ?? 0) + 1;
}
console.log('5000 nights ok', kinds, culprits);
console.log(JSON.stringify(generateNight(48213), null, 1).slice(0, 2500));
