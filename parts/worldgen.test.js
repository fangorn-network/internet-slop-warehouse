import { describe, it, expect } from 'vitest';
import { collapse, withRotations, playRows, sweep, noise2, fbm, hash } from './worldgen.js';
import { generate, toRows } from './lock-key-dungeon.js';

// Socketed dungeon tiles: '#' wall edge, '.' open edge.
const TILES = withRotations([
  { id: 'solid', weight: 4, sockets: ['#', '#', '#', '#'] },
  { id: 'floor', weight: 3, sockets: ['.', '.', '.', '.'] },
  { id: 'hall', weight: 3, sockets: ['.', '#', '.', '#'], rotate: true },
  { id: 'corner', weight: 2, sockets: ['.', '.', '#', '#'], rotate: true },
  { id: 'tee', weight: 1, sockets: ['.', '.', '.', '#'], rotate: true },
]);

describe('worldgen', () => {
  it('hash and noise are deterministic and bounded', () => {
    expect(hash(1, 2, 3)).toBe(hash(1, 2, 3));
    expect(hash(1, 2, 3)).not.toBe(hash(1, 3, 2));
    for (let i = 0; i < 200; i++) { const n = noise2(i * 0.37, i * 0.11, 9), f = fbm(i * 0.2, -i * 0.3, { seed: 4 }); expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(1); expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThanOrEqual(1); }
    expect(noise2(3, 4, 1)).toBeCloseTo(hash(1, 3, 4) / 4294967296); // lattice points are the hash
  });

  it('rotations are distinct and hall has two', () => {
    expect(TILES.filter((t) => t.base === 'hall').length).toBe(2);
    expect(TILES.filter((t) => t.base === 'corner').length).toBe(4);
  });

  it('collapse honours sockets, edges and fixed cells, and repeats per seed', () => {
    const opts = { width: 12, height: 9, seed: 7, tiles: TILES, edge: '#', fixed: [{ x: 5, y: 4, id: 'floor' }] };
    const a = collapse(opts), b = collapse(opts), by = new Map(TILES.map((t) => [t.id, t]));
    expect(a.cells).toEqual(b.cells);
    expect(a.cells[4 * 12 + 5]).toBe('floor');
    for (let y = 0; y < 9; y++) for (let x = 0; x < 12; x++) {
      const t = by.get(a.cells[y * 12 + x]);
      if (x + 1 < 12) expect(t.sockets[1]).toBe(by.get(a.cells[y * 12 + x + 1]).sockets[3]);
      if (y + 1 < 9) expect(t.sockets[2]).toBe(by.get(a.cells[(y + 1) * 12 + x]).sockets[0]);
      if (x === 0) expect(t.sockets[3]).toBe('#');
      if (y === 0) expect(t.sockets[0]).toBe('#');
    }
  });

  it('collapse throws on contradictions instead of hiding them', () => {
    expect(() => collapse({ width: 3, height: 3, tiles: [{ id: 'x', sockets: ['a', 'b', 'c', 'd'] }], maxRestarts: 2 })).toThrow(/Contradictory/);
  });

  it('playRows walks keys before doors and reports failure', () => {
    expect(playRows(['#######', '#S.A.G#', '#a#####', '#######'])).toMatchObject({ ok: true, keys: ['a'], steps: 1 + 1 + 4 });
    expect(playRows(['######', '#S.AG#', '######'])).toMatchObject({ ok: false, reason: 'goal unreachable' });
  });

  it('sweep collects failures and metrics', () => {
    const r = sweep({ seeds: 4, generate: (s) => s, check: (s) => (s === 3 ? { ok: false, reason: 'three' } : { ok: true, size: s }) });
    expect(r.passed).toBe(3);
    expect(r.failures).toEqual([{ seed: 3, reason: 'three' }]);
    expect(r.stats.size).toEqual({ min: 1, median: 2, max: 4 });
  });
});

describe('lock-key-dungeon', () => {
  it('is deterministic per seed', () => {
    expect(generate({ seed: 42 })).toEqual(generate({ seed: 42 }));
    expect(toRows(generate({ seed: 42 }))).not.toEqual(toRows(generate({ seed: 43 })));
  });

  it('every one of 500 seeds is solvable and needs every key', () => {
    const r = sweep({
      seeds: 500,
      generate: (seed) => generate({ seed, rooms: 18, keys: 3, loops: 0.3 }),
      check: (d) => {
        const play = playRows(toRows(d, { room: 4 }));
        // Without the last key the goal must be out of reach: locks are real, loops never bypass them.
        const noKey = playRows(toRows(d, { room: 4 }).map((row) => row.replace('c', '.')));
        return { ...play, ok: play.ok && play.keys.length === 3 && !noKey.ok, reason: play.reason ?? 'a lock can be bypassed' };
      },
    });
    expect(r.failures).toEqual([]);
    expect(r.stats.coverage.min).toBe(1);
    expect(r.stats.steps.min).toBeGreaterThan(20);
  });

  it('rejects impossible requests loudly', () => {
    expect(() => generate({ rooms: 3, keys: 5 })).toThrow(/too short/);
    expect(() => generate({ width: 2, height: 2, rooms: 9 })).toThrow(/fit/);
  });
});

import { fromExample, flood } from './worldgen.js';
import * as hotelWfc from './hotel-wfc.js';
import * as worldgen from './worldgen.js';
import { placements } from './socket-mesher.js';

describe('worldgen 3D, examples and flood', () => {
  it('3D collapse stacks stair halves facing the same way', () => {
    const tiles = withRotations([
      { id: 'air', weight: 3, sockets: ['o', 'o', 'o', 'o', 'f', 'f'] },
      { id: 'low', weight: 1, sockets: ['o', 'o', 'o', 'o', 's%', 'f'], rotate: true },
      { id: 'high', weight: 1, sockets: ['o', 'o', 'o', 'o', 'f', 's%'], rotate: true },
    ]);
    expect(tiles.find((t) => t.id === 'low@2').sockets[4]).toBe('s2');
    const w = collapse({ width: 6, height: 6, depth: 3, seed: 3, tiles, edge: [, , , , 'f', 'f'], fixed: [{ x: 1, y: 1, z: 0, id: 'low@1' }] });
    const at = (x, y, z) => w.cells[(z * 6 + y) * 6 + x];
    expect(at(1, 1, 1)).toBe('high@1');
    for (let i = 0; i < 36; i++) { expect(w.cells[i].startsWith('high')).toBe(false); expect(w.cells[72 + i].startsWith('low')).toBe(false); }
    for (let z = 0; z < 2; z++) for (let i = 0; i < 36; i++) {
      const a = w.cells[z * 36 + i], b = w.cells[(z + 1) * 36 + i];
      expect(a.startsWith('low')).toBe(b.startsWith('high') && a.slice(3) === b.slice(4));
    }
  });

  it('fromExample only reproduces neighbours it was shown', () => {
    const sample = ['~~~~~~', '~..T.~', '~.TT.~', '~....~', '~~~~~~'];
    const out = collapse({ width: 14, height: 10, seed: 5, ...fromExample(sample) });
    const pairs = new Set(); for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) pairs.add(sample[y][x] + sample[y][x + 1]);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 13; x++) expect(pairs.has(out.cells[y * 14 + x] + out.cells[y * 14 + x + 1])).toBe(true);
    for (let x = 0; x < 14; x++) expect(out.cells[x]).toBe('~'); // only water was on the border
  });

  it('flood follows passable sockets on both sides', () => {
    const tiles = [{ id: 'o', sockets: ['o', 'o', 'o', 'o'] }, { id: 'x', sockets: ['x', 'x', 'x', 'x'] }];
    const f = flood({ width: 3, height: 1, cells: ['o', 'x', 'o'] }, tiles, { passable: (s) => s === 'o', solid: (t) => t.id === 'x' });
    expect([...f.reached]).toEqual([0]);
    expect(f.coverage).toBe(0.5);
  });
});

describe('hotel-wfc', () => {
  it('every swept hotel reaches an upper floor and a room from the lobby', () => {
    const r = sweep({ seeds: 40, generate: (seed) => hotelWfc.generate({ seed, ...worldgen }), check: (h) => ({
      ok: h.reached.has(h.goal) && [...h.reached].some((i) => i >= 196) && h.coverage >= 0.6,
      coverage: h.coverage, rooms: h.rooms, goalDist: h.dist[h.goal],
    }) });
    expect(r.failures).toEqual([]);
    expect(r.stats.goalDist.min).toBeGreaterThan(8);
  });

  it('socket-mesher places walls on wall sockets and turns them to the face', () => {
    const h = hotelWfc.generate({ seed: 9, ...worldgen });
    const where = placements(h.world, h.tiles, { cell: 2, storey: 3, only: h.reached, face: ({ socket }) => (socket === 'w' ? ['wall'] : []) });
    const by = new Map(h.tiles.map((t) => [t.id, t]));
    const expected = [...h.reached].reduce((n, i) => n + by.get(h.world.cells[i]).sockets.slice(0, 4).filter((s) => s === 'w').length, 0);
    expect(where.get('wall').length).toBe(expected);
    for (const p of where.get('wall')) { // a wall piece sits at its cell centre; the turn says which face
      expect(Math.round(((p.x - 1) % 2 + 2) % 2 * 100)).toBe(0);
      expect([0, -1, -2, -3]).toContain(Math.round(p.rot / (Math.PI / 2)));
    }
  });
});
