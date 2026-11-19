// SPDX-License-Identifier: CC0-1.0
// socket-mesher: draw a wave-function-collapse grid (2D or 3D) in three.js without modelling a mesh per tile.
// Geometry comes from the sockets: you say which piece stands on a face with a given socket (a wall on 'w',
// a door frame on 'd') and what goes inside a cell (floor, ceiling, stairs, a bed); every piece is one
// InstancedMesh per material, so draw calls = piece kinds, not cells. Pieces may be whole GLB models. placements() is
// pure data; build() makes the meshes; footprints() turns placements into collision boxes.
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
 * Returns Map(piece → [{ x, y, z, rot, cell }]).
 */
export function placements(world, tiles, { cell = 3, storey = 3, only, face = () => [], inside = () => [], seed = world.seed ?? 1 } = {}) {
  const { width, height, depth = 1, cells } = world, layer = width * height, by = new Map(tiles.map((t) => [t.id, t])), out = new Map();
  const put = (spec, cx, cy, cz, turn, cell) => {
    const { piece, at = [0, 0, 0], rot = 0 } = typeof spec === 'string' ? { piece: spec } : spec;
    const c = Math.cos(turn), s = Math.sin(turn); // rotate about Y by turn: (x, z) → (x c + z s, -x s + z c)
    (out.get(piece) ?? out.set(piece, []).get(piece)).push({ x: cx + at[0] * c + at[2] * s, y: cy + at[1], z: cz - at[0] * s + at[2] * c, rot: turn + rot, cell });
  };
  for (let i = 0; i < cells.length; i++) {
    if (only && !only.has(i)) continue;
    const tile = by.get(cells[i]), x = i % width, y = ((i / width) | 0) % height, z = (i / layer) | 0;
    const cx = (x + 0.5) * cell, cy = z * storey, cz = (y + 0.5) * cell, random = rng((seed * 2654435761) ^ (i * 40503));
    for (const spec of inside({ i, j: -1, x, y, z, tile, random }) ?? []) put(spec, cx, cy, cz, -(tile.rotation ?? 0) * Math.PI / 2, i);
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d], j = nx < 0 || ny < 0 || nx >= width || ny >= height ? -1 : i + DX[d] + DY[d] * width;
      const ctx = { i, j, x, y, z, d, tile, socket: tile.sockets?.[d], other: j < 0 ? null : by.get(cells[j]), random };
      for (const spec of face(ctx) ?? []) put(spec, cx, cy, cz, -d * Math.PI / 2, i);
    }
  }
  return out;
}

// A loaded model as instanceable parts: every mesh baked into the model's own frame, merged per material where the
// attributes line up, so a GLB of 30 meshes and 4 materials costs 4 draw calls however many times it's placed.
function flatten(object) {
  object.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(object.matrixWorld).invert(), byMaterial = new Map();
  object.traverse((m) => {
    if (!m.isMesh || Array.isArray(m.material)) return;
    const g = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    (byMaterial.get(m.material) ?? byMaterial.set(m.material, []).get(m.material)).push(g);
  });
  return [...byMaterial].flatMap(([material, list]) => merge(list).map((geometry) => ({ geometry, material })));
}
function merge(list) {
  if (list.length === 1) return list;
  const key = (g) => Object.keys(g.attributes).sort().map((n) => n + g.attributes[n].itemSize).join();
  const groups = new Map(); for (const g of list) (groups.get(key(g)) ?? groups.set(key(g), []).get(key(g))).push(g);
  return [...groups.values()].map((gs) => {
    if (gs.length === 1) return gs[0];
    const out = new THREE.BufferGeometry(), names = Object.keys(gs[0].attributes), counts = gs.map((g) => g.attributes.position.count);
    for (const n of names) {
      const size = gs[0].attributes[n].itemSize, arr = new Float32Array(counts.reduce((a, b) => a + b, 0) * size); let o = 0;
      for (const g of gs) { const a = g.attributes[n]; for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) arr[o++] = a.getComponent(i, k); }
      out.setAttribute(n, new THREE.BufferAttribute(arr, size));
    }
    const index = []; let base = 0;
    gs.forEach((g, gi) => { if (g.index) for (let i = 0; i < g.index.count; i++) index.push(base + g.index.getX(i)); else for (let i = 0; i < counts[gi]; i++) index.push(base + i); base += counts[gi]; });
    out.setIndex(index); return out;
  });
}

/**
 * One InstancedMesh per piece and material: pieces = { name: { geometry, material } | Object3D }. An Object3D (a loaded
 * GLB scene, or a clone with nodes removed) is placed in its own frame, so author or pick models facing +z.
 * chunk (metres, optional) splits each piece's instances into blocks of that size, so three.js can frustum-cull them
 * (one InstancedMesh's bounds cover every instance, so unchunked it's always drawn whole). Give a number for every piece,
 * { piece: metres } to chunk only the heavy ones, or (placement, piece) → key | null to block by anything (a room id from
 * placement.cell, say). Blocks cost draw calls (one per block per material). Each mesh keeps its key in userData.block. Returns a Group; dispose() frees it.
 */
export function build(where, pieces, { chunk = 0 } = {}) {
  const group = new THREE.Group(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (const [name, all] of where) {
    const piece = pieces[name]; if (!piece) throw Error(`No piece called ${name}`);
    const subs = piece.isObject3D ? flatten(piece) : [piece], blocks = new Map(), size = typeof chunk === 'number' ? chunk : typeof chunk === 'function' ? 0 : chunk[name] ?? 0;
    const keyOf = typeof chunk === 'function' ? (o) => chunk(o, name) ?? '' : (o) => (size > 0 ? [o.x, o.y, o.z].map((v) => Math.floor(v / size)).join() : '');
    for (const o of all) { const k = keyOf(o); (blocks.get(k) ?? blocks.set(k, []).get(k)).push(o); }
    for (const [block, list] of blocks) for (const { geometry, material } of subs) {
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      list.forEach((o, k) => mesh.setMatrixAt(k, m.compose(p.set(o.x, o.y, o.z), q.setFromAxisAngle(up, o.rot), one)));
      mesh.name = name; mesh.userData.block = block; mesh.computeBoundingSphere(); group.add(mesh);
    }
  }
  group.userData.dispose = () => group.children.forEach((c) => c.dispose());
  return group;
}

/**
 * Axis-aligned footprints for collision, from placements: boxes = { piece: [x0, x1, z0, z1] } in the piece's own frame
 * (metres), turned with each placement. Returns [{ piece, x0, x1, z0, z1, y }].
 */
export function footprints(where, boxes) {
  const out = [];
  for (const [piece, [x0, x1, z0, z1]] of Object.entries(boxes)) for (const o of where.get(piece) ?? []) {
    const c = Math.cos(o.rot), s = Math.sin(o.rot), xs = [], zs = [];
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { xs.push(o.x + x * c + z * s); zs.push(o.z - x * s + z * c); }
    out.push({ piece, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), y: o.y });
  }
  return out;
}

/** Behaviour contract: build the grid into `parent` (an Object3D) and remove it on dispose. */
export function attach(parent, { world, tiles, pieces, ...rules }) {
  const group = build(placements(world, tiles, rules), pieces); parent.add(group);
  return { group, update() {}, dispose() { group.removeFromParent(); group.userData.dispose(); } };
}
