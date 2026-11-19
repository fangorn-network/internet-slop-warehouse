// SPDX-License-Identifier: CC0-1.0
// A multi-storey hotel from 3D wave function collapse: corridors, rectangular rooms with doors, stairwells
// between floors. Structure is pinned (a lobby crossroads and a stair beside it), detail is collapsed, and every
// floor plan is flood-checked from the lobby before it's returned. Pure data: pair with socket-mesher to draw it.
// Sockets [n, e, s, w, up, down]: c corridor, r room, w wall, d door; f plain slab, s0–s3 stair (by rotation).

const t = (id, weight, sockets, rotate = true) => ({ id, weight, sockets, rotate });
/** Base tiles; withRotations() turns them. kind(): void, corridor, room, stair-low, stair-high. */
export const TILES = [
  t('void', 5, ['w', 'w', 'w', 'w', 'f', 'f'], false),
  t('hall', 5, ['c', 'w', 'c', 'w', 'f', 'f']),
  t('corner', 2, ['c', 'c', 'w', 'w', 'f', 'f']),
  t('tee', 1.2, ['c', 'c', 'c', 'w', 'f', 'f']),
  t('cross', 0.4, ['c', 'c', 'c', 'c', 'f', 'f'], false),
  t('end', 0.3, ['c', 'w', 'w', 'w', 'f', 'f']),
  t('hall-door', 3, ['c', 'd', 'c', 'w', 'f', 'f']),
  t('hall-doors', 1.5, ['c', 'd', 'c', 'd', 'f', 'f']),
  t('room-corner', 2, ['w', 'r', 'r', 'w', 'f', 'f']),
  t('room-corner-door', 1, ['d', 'r', 'r', 'w', 'f', 'f']),
  t('room-corner-door-side', 1, ['w', 'r', 'r', 'd', 'f', 'f']),
  t('room-edge', 0.5, ['w', 'r', 'r', 'r', 'f', 'f']),
  t('room-edge-door', 0.3, ['d', 'r', 'r', 'r', 'f', 'f']),
  t('room-middle', 0.2, ['r', 'r', 'r', 'r', 'f', 'f'], false),
  // A stair climbs north within one cell: enter the low half from the south, leave the high half to the north.
  t('stair-low', 0.3, ['w', 'w', 'c', 'w', 's%', 'f']),
  t('stair-high', 0.3, ['c', 'w', 'w', 'w', 'f', 's%']),
];

export const kind = (tile) => { const b = tile.base ?? tile.id; return b === 'void' ? 'void' : b.startsWith('room') ? 'room' : b.startsWith('stair') ? b : 'corridor'; };
/** Faces you can walk through (doors included; the game narrows them). */
export const passable = (socket) => socket === 'c' || socket === 'r' || socket === 'd' || /^s\d$/.test(socket);

/**
 * generate({ seed, width, height, floors, collapse, withRotations, flood, hash, minCoverage }) → hotel.
 * worldgen's functions are passed in (parts don't import each other). Tries sub-seeds until the lobby reaches at
 * least minCoverage of the non-void cells, an upper floor and a room. Returns { world, tiles, start, goal, reached,
 * dist, coverage, rooms, attempts }; start is the lobby cell, goal the farthest reachable room cell.
 */
export function generate({ seed = 1, width = 14, height = 14, floors = 2, minCoverage = 0.6, collapse, withRotations, flood, hash }) {
  if (![collapse, withRotations, flood, hash].every((f) => typeof f === 'function')) throw TypeError('Pass worldgen collapse, withRotations, flood and hash');
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 5 || height < 5 || !Number.isInteger(floors) || floors < 1 || floors > 6) throw RangeError('Invalid hotel size');
  const tiles = withRotations(TILES), by = new Map(tiles.map((x) => [x.id, x])), cx = width >> 1, cy = height >> 1, layer = width * height;
  const fixed = [{ x: cx, y: cy, z: 0, id: 'cross' }, ...(floors > 1 ? [{ x: cx, y: cy - 1, z: 0, id: 'stair-low' }] : [])];
  for (let k = 0; k < 64; k++) {
    let world;
    try { world = collapse({ width, height, depth: floors, seed: hash(seed, k), tiles, fixed, edge: ['w', 'w', 'w', 'w', 'f', 'f'], maxRestarts: 8 }); } catch { continue; }
    const start = cy * width + cx, f = flood(world, tiles, { from: start, passable, solid: (x) => x.id === 'void' });
    const roomCells = [...f.reached].filter((i) => kind(by.get(world.cells[i])) === 'room');
    const upper = floors === 1 || [...f.reached].some((i) => i >= layer);
    if (f.coverage < minCoverage || !upper || !roomCells.length) continue;
    const goal = roomCells.reduce((a, b) => (f.dist[b] > f.dist[a] ? b : a));
    return { world, tiles, start, goal, reached: f.reached, dist: f.dist, coverage: f.coverage, rooms: roomCells.length, attempts: k + 1 };
  }
  throw Error(`No hotel reached ${minCoverage} coverage in 64 sub-seeds of ${seed}; loosen minCoverage or retune weights`);
}

/** Behaviour contract: generate once and hand the hotel to onReady. */
export function attach(object, opts = {}) {
  const hotel = generate(opts); opts.onReady?.(hotel);
  return { hotel, update() {}, dispose() {} };
}
