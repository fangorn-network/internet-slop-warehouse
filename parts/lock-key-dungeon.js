// SPDX-License-Identifier: CC0-1.0
// Seeded lock-and-key dungeon: rooms on a grid, a long critical path, locked rooms along it, each key
// somewhere you can already reach (dead ends first), and loops that never bypass a lock. Solvable by
// construction. Pure data; toRows() turns it into a character map any renderer or playtest bot can read.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/**
 * generate({ seed, width, height, rooms, keys, loops }) → { rooms, doors, start, goal, path, keys }.
 * rooms[i] = { id, x, y, zone, depth, onPath, kind: start|goal|lock|key|room, key?, lock? } where zone counts
 * the locks between it and the start; doors = [{ a, b, lock: 'A'… | null }]. Key 'a' opens lock 'A'.
 */
export function generate({ seed = 1, width = 6, height = 6, rooms = 16, keys = 2, loops = 0.2 } = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || width * height > 1024) throw RangeError('Invalid room grid');
  if (!Number.isInteger(rooms) || rooms < 2 || rooms > width * height) throw RangeError('rooms must fit the grid');
  if (!Number.isInteger(keys) || keys < 0 || keys > 6 || !(loops >= 0 && loops <= 1)) throw RangeError('keys must be 0–6 (A–F; G and S mark goal and start), loops 0–1');
  const random = rng(seed), cell = new Map(), list = [], adj = [];
  const add = (x, y) => { const id = list.length; list.push({ id, x, y }); cell.set(`${x},${y}`, id); adj.push([]); return id; };
  const near = (r) => [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => [r.x + dx, r.y + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < width && y < height);

  // Randomised Prim: grow a spanning tree of rooms from a random cell.
  add(Math.floor(random() * width), Math.floor(random() * height));
  while (list.length < rooms) {
    const frontier = list.flatMap((r) => near(r).filter(([x, y]) => !cell.has(`${x},${y}`)).map((p) => [r.id, p]));
    const [from, [x, y]] = frontier[Math.floor(random() * frontier.length)], to = add(x, y);
    adj[from].push(to); adj[to].push(from);
  }
  const bfs = (from) => { const depth = Array(list.length).fill(-1), parent = Array(list.length).fill(-1), q = [from]; depth[from] = 0;
    for (let h = 0; h < q.length; h++) for (const j of adj[q[h]]) if (depth[j] < 0) { depth[j] = depth[q[h]] + 1; parent[j] = q[h]; q.push(j); }
    return { depth, parent, q }; };
  const far = (d) => d.indexOf(Math.max(...d));
  // Tree diameter: start and goal at its ends, so the critical path is as long as the tree allows.
  const start = far(bfs(0).depth), { depth, parent, q: order } = bfs(start), goal = far(depth);
  const path = []; for (let r = goal; r >= 0; r = parent[r]) path.unshift(r);
  const L = path.length - 1;
  if (keys > L - 1) throw RangeError(`Critical path of ${L} rooms is too short for ${keys} locks; add rooms or drop keys`);

  const lockOf = new Map(); // room id → lock index (1-based), spaced evenly along the critical path
  for (let i = 1; i <= keys; i++) lockOf.set(path[Math.round(i * L / (keys + 1))], i);
  const zone = Array(list.length).fill(0);
  for (const r of order) if (r !== start) zone[r] = zone[parent[r]] + (lockOf.has(r) ? 1 : 0);
  const onPath = new Set(path), keyAt = new Map();
  for (let i = 1; i <= keys; i++) {
    const options = list.filter((r) => zone[r.id] === i - 1 && r.id !== start && !keyAt.has(r.id));
    const off = options.filter((r) => !onPath.has(r.id)).sort((a, b) => depth[b.id] - depth[a.id] || a.id - b.id);
    keyAt.set((off[0] ?? options.sort((a, b) => depth[b.id] - depth[a.id])[0] ?? list[start]).id, i);
  }

  const doors = [], linked = new Set();
  const door = (a, b) => { const lock = lockOf.has(b) && zone[a] < zone[b] ? lockOf.get(b) : lockOf.has(a) && zone[b] < zone[a] ? lockOf.get(a) : 0;
    doors.push({ a, b, lock: lock ? String.fromCharCode(64 + lock) : null }); linked.add(`${Math.min(a, b)},${Math.max(a, b)}`); };
  for (const r of order) if (r !== start) door(parent[r], r);
  // Loops only inside a zone, so no shortcut ever skips a lock.
  for (const r of list) for (const [x, y] of near(r)) {
    const o = cell.get(`${x},${y}`);
    if (o === undefined || o < r.id || linked.has(`${r.id},${o}`) || zone[o] !== zone[r.id]) continue;
    if (random() < loops) door(r.id, o);
  }

  return {
    seed, width, height, start, goal, path, keys, doors,
    rooms: list.map((r) => ({
      ...r, zone: zone[r.id], depth: depth[r.id], onPath: onPath.has(r.id),
      kind: r.id === start ? 'start' : r.id === goal ? 'goal' : lockOf.has(r.id) ? 'lock' : keyAt.has(r.id) ? 'key' : 'room',
      ...(keyAt.has(r.id) && { key: String.fromCharCode(96 + keyAt.get(r.id)) }),
      ...(lockOf.has(r.id) && { lock: String.fromCharCode(64 + lockOf.get(r.id)) }),
    })),
  };
}

/**
 * Character map of a dungeon: '#' wall, '.' floor, 'S' start, 'G' goal, a–z keys, A–Z locked doors.
 * Each room is `room`×`room` floor cells with walls between; a door is one cell in the shared wall.
 */
export function toRows(d, { room = 5 } = {}) {
  if (!Number.isInteger(room) || room < 3) throw RangeError('room must be an integer ≥ 3');
  const s = room + 1, W = d.width * s + 1, H = d.height * s + 1, g = Array.from({ length: H }, () => Array(W).fill('#'));
  const mid = (r) => [r.x * s + 1 + (room >> 1), r.y * s + 1 + (room >> 1)];
  for (const r of d.rooms) for (let y = 0; y < room; y++) for (let x = 0; x < room; x++) g[r.y * s + 1 + y][r.x * s + 1 + x] = '.';
  for (const { a, b, lock } of d.doors) {
    const A = d.rooms[a], B = d.rooms[b], [mx, my] = mid(A);
    g[A.y === B.y ? my : Math.max(A.y, B.y) * s][A.x === B.x ? mx : Math.max(A.x, B.x) * s] = lock ?? '.';
  }
  for (const r of d.rooms) {
    const [x, y] = mid(r);
    if (r.kind === 'start') g[y][x] = 'S';
    if (r.kind === 'goal') g[y][x] = 'G';
    if (r.key) g[y][x + (r.kind === 'start' ? 1 : 0)] = r.key;
  }
  return g.map((row) => row.join(''));
}

/** Behaviour contract: generate once with opts, hand the dungeon (and its rows) to onReady. */
export function attach(object, opts = {}) {
  const dungeon = generate(opts), rows = toRows(dungeon, opts);
  opts.onReady?.(dungeon, rows);
  return { dungeon, rows, update() {}, dispose() {} };
}
