// SPDX-License-Identifier: CC0-1.0
// socket-mesher: draw a wave-function-collapse grid (2D or 3D) in three.js without modelling a mesh per tile.
// Geometry comes from the sockets: you say which piece stands on a face with a given socket (a wall on 'w',
// a door frame on 'd') and what goes inside a cell (floor, ceiling, stairs, a bed); every piece is one
// InstancedMesh, so draw calls = piece kinds, not cells. placements() is pure data; build() makes the meshes.
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

/**
 * Where every piece goes. A cell's centre is at ((x + .5) * cell, z * storey, (y + .5) * cell): +x east, +z south,
 * floor level at y = z * storey. face(ctx) returns pieces for one side face, modelled for the NORTH face (at local
 * z = -cell/2, facing +z, inwards) and turned to the face; inside(ctx) returns pieces for the cell, modelled for
 * rotation 0 and turned by the tile's rotation. Either returns [name | { piece, at: [x, y, z], rot }].
 * ctx = { i, j (neighbour cell or -1), x, y, z, d (face only), tile, socket, other (neighbour tile), random() }.
 * only: a Set of cell indices to draw (e.g. flood().reached); cells outside it are skipped entirely.
 * Returns Map(piece → [{ x, y, z, rot }]).
 */
export function placements(world, tiles, { cell = 3, storey = 3, only, face = () => [], inside = () => [], seed = world.seed ?? 1 } = {}) {
  const { width, height, depth = 1, cells } = world, layer = width * height, by = new Map(tiles.map((t) => [t.id, t])), out = new Map();
  const put = (spec, cx, cy, cz, turn) => {
    const { piece, at = [0, 0, 0], rot = 0 } = typeof spec === 'string' ? { piece: spec } : spec;
    const c = Math.cos(turn), s = Math.sin(turn); // rotate about Y by turn: (x, z) → (x c + z s, -x s + z c)
    (out.get(piece) ?? out.set(piece, []).get(piece)).push({ x: cx + at[0] * c + at[2] * s, y: cy + at[1], z: cz - at[0] * s + at[2] * c, rot: turn + rot });
  };
  for (let i = 0; i < cells.length; i++) {
    if (only && !only.has(i)) continue;
    const tile = by.get(cells[i]), x = i % width, y = ((i / width) | 0) % height, z = (i / layer) | 0;
    const cx = (x + 0.5) * cell, cy = z * storey, cz = (y + 0.5) * cell, random = rng((seed * 2654435761) ^ (i * 40503));
    for (const spec of inside({ i, j: -1, x, y, z, tile, random }) ?? []) put(spec, cx, cy, cz, -(tile.rotation ?? 0) * Math.PI / 2);
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d], j = nx < 0 || ny < 0 || nx >= width || ny >= height ? -1 : i + DX[d] + DY[d] * width;
      const ctx = { i, j, x, y, z, d, tile, socket: tile.sockets?.[d], other: j < 0 ? null : by.get(cells[j]), random };
      for (const spec of face(ctx) ?? []) put(spec, cx, cy, cz, -d * Math.PI / 2);
    }
  }
  return out;
}

/** One InstancedMesh per piece: pieces = { name: { geometry, material } }. Returns a Group; dispose() frees it. */
export function build(where, pieces) {
  const group = new THREE.Group(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (const [name, list] of where) {
    const piece = pieces[name]; if (!piece) throw Error(`No piece called ${name}`);
    const mesh = new THREE.InstancedMesh(piece.geometry, piece.material, list.length);
    list.forEach((o, k) => mesh.setMatrixAt(k, m.compose(p.set(o.x, o.y, o.z), q.setFromAxisAngle(up, o.rot), one)));
    mesh.name = name; mesh.computeBoundingSphere(); group.add(mesh);
  }
  group.userData.dispose = () => group.children.forEach((c) => c.dispose());
  return group;
}

/** Behaviour contract: build the grid into `parent` (an Object3D) and remove it on dispose. */
export function attach(parent, { world, tiles, pieces, ...rules }) {
  const group = build(placements(world, tiles, rules), pieces); parent.add(group);
  return { group, update() {}, dispose() { group.removeFromParent(); group.userData.dispose(); } };
}
