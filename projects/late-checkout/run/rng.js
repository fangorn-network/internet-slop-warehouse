// SPDX-License-Identifier: CC0-1.0
// Seeded randomness: one number makes one night. The same seed always builds the same case, puzzles and hauntings,
// so a night can be shared ("try night 48213") and a bug can be replayed.
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: list => list[Math.floor(next() * list.length)],
    chance: p => next() < p,
    shuffle(list) { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; },
    /** Take n distinct items, removing them from `pool` (so later picks can't reuse them). */
    take(pool, n = 1) { const out = []; for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]); return out; },
  };
  return r;
}

export function seedFromUrl() {
  const s = Number(new URLSearchParams(typeof location === 'undefined' ? '' : location.search).get('seed'));
  return Number.isFinite(s) && s > 0 ? Math.floor(s) : 1 + Math.floor(Math.random() * 99998);
}
