// SPDX-License-Identifier: CC0-1.0
// Seeded world generation toolkit: PRNG, coordinate hash, value noise, socketed 2D/3D wave function collapse,
// rules learned from an example, flood-fill reachability, a grid playtest bot and a seed sweep. Pure data in and out: no renderer, browser or network.

/** mulberry32: seed → random() in [0,1). Same seed, same sequence. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/** Stateless integer hash of any number of ints → uint32. A world as a function of (seed, x, y). */
export function hash(...ints) {
  let h = 0x811C9DC5;
  for (const n of ints) { h = Math.imul(h ^ (n | 0), 0x01000193); h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D); h ^= h >>> 12; }
  return h >>> 0;
}

/** Smooth value noise in [0,1] at real (x, y). */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), c = (a, b) => hash(seed, xi + a, yi + b) / 4294967296;
  return (c(0, 0) * (1 - u) + c(1, 0) * u) * (1 - v) + (c(0, 1) * (1 - u) + c(1, 1) * u) * v;
}

/** Fractal value noise in [0,1]: octaves of noise2, each finer and fainter. */
export function fbm(x, y, { seed = 0, octaves = 4, lacunarity = 2, gain = 0.5 } = {}) {
  let sum = 0, amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) { sum += amp * noise2(x, y, seed + o * 1013); norm += amp; amp *= gain; x *= lacunarity; y *= lacunarity; }
  return sum / norm;
}

const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // n e s w, y grows downwards (row order)
const flip = (s) => [...String(s)].reverse().join('');

/**
 * Add the distinct quarter turns of every tile with `rotate: true`. Rotated ids are `id@1..3`. Side sockets
 * turn with the tile; in up/down sockets a '%' becomes the rotation (0–3), so a stair's top and bottom halves
 * ('st%') only stack when they face the same way.
 */
export function withRotations(tiles) {
  return tiles.flatMap((t) => {
    if (!t.rotate) return [t];
    if (!Array.isArray(t.sockets)) throw Error(`Tile ${t.id}: rotate needs sockets`);
    const out = [], seen = new Set();
    for (let r = 0; r < 4; r++) {
      const sockets = [0, 1, 2, 3].map((d) => t.sockets[(d + 4 - r) % 4]).concat(t.sockets.slice(4).map((s) => String(s).replaceAll('%', r))), key = sockets.join('|');
      if (seen.has(key)) continue; seen.add(key);
      out.push({ ...t, id: r ? `${t.id}@${r}` : t.id, base: t.id, rotation: r, sockets });
    }
    return out;
  });
}

/**
 * Learn tiles from a hand-drawn example: each character is a tile, weighted by how often it appears, allowed
 * next to exactly the neighbours it has in the example (per direction). Returns { tiles, edge } to spread
 * into collapse(): only characters seen on a border may sit on that border. Draw what you want; get more of it.
 */
export function fromExample(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.some((r) => typeof r !== 'string' || r.length !== rows[0].length)) throw RangeError('Example must be equal-length strings');
  const W = rows[0].length, H = rows.length, info = new Map(), border = [0, 1, 2, 3].map(() => new Set());
  const of = (c) => info.get(c) ?? info.set(c, { weight: 0, allow: [0, 1, 2, 3].map(() => new Set()) }).get(c);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = rows[y][x], t = of(c); t.weight++;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) border[d].add(c); else t.allow[d].add(rows[ny][nx]);
    }
  }
  return {
    tiles: [...info].map(([id, t]) => ({ id, weight: t.weight, allow: t.allow.map((s) => [...s]) })),
    edge: (tile, d) => border[d].has(tile.id),
  };
}

/**
 * Weighted minimum-entropy wave function collapse with propagation and bounded deterministic restarts, in 2D
 * (depth 1) or stacked 3D layers. Tiles take one of three forms:
 *   { id, weight = 1, sockets: [n, e, s, w] } or, with depth > 1, [n, e, s, w, up, down]. Side sockets fit when a's
 *     equals b's facing socket read backwards ('ab' fits 'ba'; single characters just match); up fits the
 *     tile above's down exactly.
 *   { id, weight, neighbors: [ids] }: symmetric, any side.
 *   { id, weight, allow: [[n ids], [e ids], [s ids], [w ids]] }: directional, as fromExample() makes.
 * `fixed` pins cells: [{ x, y, z = 0, id }]. `edge` seals the outside: a socket every side border cell must face
 * outwards, an array of six sockets per direction (undefined = free), or a function (tile, d) → allowed.
 * Returns { width, height, depth, seed, attempt, cells } with cells as ids, index (z * height + y) * width + x.
 * Throws on contradictory rules; never hides failure.
 */
export function collapse({ width = 16, height = 16, depth = 1, seed = 1, tiles, fixed = [], edge, maxRestarts = 24 } = {}) {
  // ponytail: O(cells²) entropy scan; switch to a heap if grids grow past ~16k cells.
  if (![width, height, depth].every((n) => Number.isInteger(n) && n >= 1) || width * height * depth > 16384) throw RangeError('Invalid grid size (max 16384 cells)');
  if (!Array.isArray(tiles) || !tiles.length || new Set(tiles.map((t) => t.id)).size !== tiles.length) throw Error('Invalid tiles');
  const sides = depth > 1 ? 6 : 4;
  for (const t of tiles) if (!((t.weight ?? 1) > 0) || !(Array.isArray(t.sockets) && t.sockets.length >= sides || Array.isArray(t.neighbors) || Array.isArray(t.allow) && depth === 1)) throw Error(`Invalid tile ${t.id}${depth > 1 ? ' (3D needs six sockets)' : ''}`);
  const T = tiles.length, w = tiles.map((t) => t.weight ?? 1), opp = (d) => (d < 4 ? (d + 2) % 4 : 9 - d);
  const fits = (a, b, d) => a.sockets && b.sockets ? (d < 4 ? String(a.sockets[d]) === flip(b.sockets[opp(d)]) : String(a.sockets[d]) === String(b.sockets[opp(d)]))
    : a.allow && b.allow ? a.allow[d].includes(b.id) && b.allow[opp(d)].includes(a.id)
    : !!(a.neighbors?.includes(b.id) && b.neighbors?.includes(a.id));
  const allowed = Array.from({ length: sides }, (_, d) => tiles.map((a) => Uint8Array.from(tiles, (b) => (fits(a, b, d) ? 1 : 0))));
  const index = new Map(tiles.map((t, i) => [t.id, i])), layer = width * height;
  for (const f of fixed) { const z = f.z ?? 0; if (![f.x, f.y, z].every(Number.isInteger) || f.x < 0 || f.y < 0 || z < 0 || f.x >= width || f.y >= height || z >= depth || !index.has(f.id)) throw Error('Invalid fixed tile'); }
  const outside = typeof edge === 'function' ? edge : edge === undefined ? null
    : (t, d) => { const s = Array.isArray(edge) ? edge[d] : d < 4 ? edge : undefined; return s === undefined || !t.sockets || String(t.sockets[d]) === String(s); };

  for (let attempt = 0; attempt <= maxRestarts; attempt++) {
    const random = rng(hash(seed, attempt)), cells = Array.from({ length: layer * depth }, () => tiles.map((_, i) => i));
    let bad = false;
    const step = (i, d) => { const x = i % width, y = ((i / width) | 0) % height, z = (i / layer) | 0;
      if (d < 4) { const nx = x + DX[d], ny = y + DY[d]; return nx < 0 || ny < 0 || nx >= width || ny >= height ? -1 : i + DX[d] + DY[d] * width; }
      const nz = z + (d === 4 ? 1 : -1); return nz < 0 || nz >= depth ? -1 : i + (d === 4 ? layer : -layer); };
    const propagate = (queue) => {
      for (let q = 0; q < queue.length && !bad; q++) {
        const i = queue[q];
        for (let d = 0; d < sides; d++) {
          const j = step(i, d); if (j < 0) continue;
          const next = cells[j].filter((b) => cells[i].some((a) => allowed[d][a][b]));
          if (!next.length) { bad = true; break; }
          if (next.length !== cells[j].length) { cells[j] = next; queue.push(j); }
        }
      }
    };
    const restrict = (i, keep) => { const next = cells[i].filter(keep); if (!next.length) bad = true; else cells[i] = next; };
    if (outside) for (let i = 0; i < cells.length && !bad; i++) for (let d = 0; d < sides && !bad; d++) if (step(i, d) < 0) restrict(i, (k) => outside(tiles[k], d));
    for (const f of fixed) if (!bad) restrict((f.z ?? 0) * layer + f.y * width + f.x, (k) => k === index.get(f.id));
    if (!bad) propagate(cells.map((_, i) => i));
    while (!bad) {
      let pick = -1, min = Infinity;
      for (let i = 0; i < cells.length; i++) if (cells[i].length > 1) {
        let sum = 0, sl = 0; for (const k of cells[i]) { sum += w[k]; sl += w[k] * Math.log(w[k]); }
        const entropy = Math.log(sum) - sl / sum + random() * 1e-6;
        if (entropy < min) { min = entropy; pick = i; }
      }
      if (pick < 0) return { width, height, depth, seed, attempt, cells: cells.map((c) => tiles[c[0]].id) };
      let r = random() * cells[pick].reduce((s, k) => s + w[k], 0), choice = cells[pick].at(-1);
      for (const k of cells[pick]) { r -= w[k]; if (r <= 0) { choice = k; break; } }
      cells[pick] = [choice]; propagate([pick]);
    }
  }
  throw Error('Contradictory tile rules: restart budget exhausted');
}

/**
 * Flood a collapsed socket grid (2D or 3D) from cell `from`, crossing a face when passable(socket, d) is true
 * on both sides (sockets as the tile has them; d: 0 n, 1 e, 2 s, 3 w, 4 up, 5 down). Returns { reached: Set of
 * cell indices, dist: Int32Array of steps (-1 = unreached), coverage: reached / cells that are not solid(tile) }.
 */
export function flood(world, tiles, { from = 0, passable, solid = () => false }) {
  const { width, height, depth = 1, cells } = world, layer = width * height, by = new Map(tiles.map((t) => [t.id, t]));
  const dist = new Int32Array(cells.length).fill(-1), q = [from], sides = depth > 1 ? 6 : 4; dist[from] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], a = by.get(cells[i]), x = i % width, y = ((i / width) | 0) % height, z = (i / layer) | 0;
    for (let d = 0; d < sides; d++) {
      const nx = x + (DX[d] ?? 0), ny = y + (DY[d] ?? 0), nz = z + (d === 4 ? 1 : d === 5 ? -1 : 0);
      if (nx < 0 || ny < 0 || nz < 0 || nx >= width || ny >= height || nz >= depth) continue;
      const j = nz * layer + ny * width + nx;
      if (dist[j] >= 0 || !passable(a.sockets[d], d) || !passable(by.get(cells[j]).sockets[d < 4 ? (d + 2) % 4 : 9 - d], d < 4 ? (d + 2) % 4 : 9 - d)) continue;
      dist[j] = dist[i] + 1; q.push(j);
    }
  }
  const open = cells.reduce((n, id) => n + (solid(by.get(id)) ? 0 : 1), 0);
  return { reached: new Set(q), dist, coverage: q.length / Math.max(1, open) };
}

/**
 * Playtest bot for character grids (array of equal-length strings). It walks from 'S' (four-way),
 * picks up keys a–z (never used up), passes door A–Z (not S or G) only holding its key, and heads for 'G' as soon as it
 * can reach it, otherwise for the nearest key it can reach. Returns { ok, steps, keys, coverage, reason }:
 * steps walked, key pickup order, and the share of open cells it could reach (low = wasted map).
 */
export function playRows(rows, { wall = '#' } = {}) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 256 || rows.some((r) => typeof r !== 'string' || r.length !== rows[0].length || r.length > 256)) throw RangeError('Invalid rows');
  const W = rows[0].length, H = rows.length, at = (i) => rows[(i / W) | 0][i % W], find = (c) => { const y = rows.findIndex((r) => r.includes(c)); return y < 0 ? -1 : y * W + rows[y].indexOf(c); };
  let pos = find('S'); const goal = find('G');
  if (pos < 0 || goal < 0) return { ok: false, steps: 0, keys: [], coverage: 0, reason: 'needs S and G' };
  const held = new Set(), keys = []; let steps = 0, open = 0;
  for (let i = 0; i < W * H; i++) if (at(i) !== wall) open++;
  const bfs = (from) => {
    const dist = new Int32Array(W * H).fill(-1), q = [from]; dist[from] = 0;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d], j = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || dist[j] >= 0) continue;
        const c = at(j); if (c === wall || c >= 'A' && c <= 'Z' && c !== 'S' && c !== 'G' && !held.has(c.toLowerCase())) continue;
        dist[j] = dist[i] + 1; q.push(j);
      }
    }
    return { dist, reached: q };
  };
  for (;;) {
    const { dist, reached } = bfs(pos);
    const coverage = reached.length / open;
    if (dist[goal] >= 0) return { ok: true, steps: steps + dist[goal], keys, coverage };
    const next = reached.find((i) => { const c = at(i); return c >= 'a' && c <= 'z' && !held.has(c); });
    if (next === undefined) return { ok: false, steps, keys, coverage, reason: 'goal unreachable' };
    steps += dist[next]; held.add(at(next)); keys.push(at(next)); pos = next;
  }
}

/**
 * Run generate(seed) → check(world, seed) over many seeds. check returns { ok, reason?, ...numbers }
 * (playRows fits). Returns { seeds, passed, failures: [{ seed, reason }], stats: { metric: { min, median, max } } }.
 */
export function sweep({ generate, check = () => ({ ok: true }), seeds = 100, from = 1 } = {}) {
  if (typeof generate !== 'function' || !Number.isSafeInteger(seeds) || seeds < 1) throw TypeError('sweep needs generate and a positive seed count');
  const failures = [], metrics = {};
  for (let seed = from; seed < from + seeds; seed++) {
    try {
      const r = check(generate(seed), seed);
      if (!r?.ok) { failures.push({ seed, reason: r?.reason ?? 'check failed' }); continue; }
      for (const [k, v] of Object.entries(r)) if (typeof v === 'number') (metrics[k] ??= []).push(v);
    } catch (e) { failures.push({ seed, reason: e.message }); }
  }
  const stats = Object.fromEntries(Object.entries(metrics).map(([k, v]) => { v.sort((a, b) => a - b); return [k, { min: v[0], median: v[v.length >> 1], max: v.at(-1) }]; }));
  return { seeds, passed: seeds - failures.length, failures, stats };
}

/** Behaviour contract: collapse once with opts, hand the grid to onReady. */
export function attach(object, opts = {}) {
  const world = collapse(opts); opts.onReady?.(world);
  return { world, update() {}, dispose() {} };
}
