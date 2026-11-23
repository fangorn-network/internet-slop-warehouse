// SPDX-License-Identifier: CC0-1.0
// The floors under the stairs: remixes of the Heartland's corridors, generated from a seed. Each floor is a grid of
// corridor cells (one corridor wide), carved as a maze that prefers long straight runs, the way hotel halls go, with a few
// loops so there's more than one way round. You arrive by a stair door at one end; the stairs on down are at the cell
// farthest from it, by walking.
//
// Built from the hotel's own surfaces (corridor carpet, linen wallcovering, the acoustic ceiling) and models (the guest
// room door, the ice machine, the beds…); the deeper you go, the more of the rest of the hotel has leaked into the halls.
// Everything here is plain data plus one builder: generate() is pure (seed → grid), buildFloor() turns a grid into meshes,
// colliders, surfaces, light anchors and interactions on the hotel's world.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as F from '../roadside-inn/fixtures.js';
const CEIL = 2.95;   // the hotel's ceiling height (roadside-inn/world.js; the heartland-hotel part doesn't export it)

export const C = 2.4;          // a cell: one corridor's width and a door's bay
const WT = 0.07;               // half a partition's thickness: wall faces stand this far inside each cell
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // N E S W (north is -z)

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** A maze: { w, h, open (bitmask per cell: 1 << dir), start, exit, exitSide, dist (steps from start) }. */
export function generate({ w, h, seed, straight = 0.72, loops = 0.08 }) {
  const r = rng(seed), open = new Uint8Array(w * h), seen = new Uint8Array(w * h), heading = new Int8Array(w * h).fill(-1);
  const at = (x, z) => x >= 0 && z >= 0 && x < w && z < h ? z * w + x : -1;
  const start = at(0, Math.floor(h / 2));
  const stack = [start]; seen[start] = 1; heading[start] = 1;
  while (stack.length) {
    const i = stack.at(-1), x = i % w, z = (i / w) | 0;
    const free = [0, 1, 2, 3].filter(d => { const j = at(x + DIRS[d][0], z + DIRS[d][1]); return j >= 0 && !seen[j]; });
    if (!free.length) { stack.pop(); continue; }
    const d = free.includes(heading[i]) && r() < straight ? heading[i] : free[Math.floor(r() * free.length)];
    const j = at(x + DIRS[d][0], z + DIRS[d][1]);
    open[i] |= 1 << d; open[j] |= 1 << ((d + 2) % 4); seen[j] = 1; heading[j] = d; stack.push(j);
  }
  for (let i = 0; i < w * h; i++) for (const d of [1, 2]) {   // knock through a few walls: loops
    const j = at(i % w + DIRS[d][0], ((i / w) | 0) + DIRS[d][1]);
    if (j >= 0 && !(open[i] & (1 << d)) && r() < loops) { open[i] |= 1 << d; open[j] |= 1 << ((d + 2) % 4); }
  }
  const m = { w, h, open, start, at };
  m.dist = distances(m, start);
  // The way on: about the farthest cell by walking (a dead end if one is nearly as far), its door in a closed wall.
  let exit = -1;
  for (let i = 0; i < w * h; i++) if (i !== start && (exit < 0 || score(m, i) > score(m, exit))) exit = i;
  m.exit = exit;
  m.exitSide = [1, 0, 2, 3].find(d => !(open[exit] & (1 << d)));
  return m;
}
const degree = (m, i) => [0, 1, 2, 3].filter(d => m.open[i] & (1 << d)).length;
const score = (m, i) => m.dist[i] + (degree(m, i) === 1 ? 3 : 0);   // far first; a dead end wins a near tie
export const neighbours = (m, i) => [0, 1, 2, 3].filter(d => m.open[i] & (1 << d)).map(d => m.at(i % m.w + DIRS[d][0], ((i / m.w) | 0) + DIRS[d][1]));
export function distances(m, from) {
  const d = new Int16Array(m.w * m.h).fill(-1), q = [from]; d[from] = 0;
  for (let k = 0; k < q.length; k++) for (const j of neighbours(m, q[k])) if (d[j] < 0) { d[j] = d[q[k]] + 1; q.push(j); }
  return d;
}

// ---------------------------------------------------------------- geometry helpers
// Quads into one buffer, UVs in metres (the hotel's surfaces are sized for that: repeat = 1 / tile size).
function quads() {
  const pos = [], uv = [], nor = [], idx = [];
  return {
    // a, b: bottom corners, left then right as seen from the front; up: height vector; n: the facing normal
    add(a, b, up, n, u0 = 0, v0 = 0) {
      const k = pos.length / 3, len = a.distanceTo(b), h = up.length();
      for (const p of [a, b, b.clone().add(up), a.clone().add(up)]) pos.push(p.x, p.y, p.z), nor.push(n.x, n.y, n.z);
      uv.push(u0, v0, u0 + len, v0, u0 + len, v0 + h, u0, v0 + h);
      idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    },
    geometry() {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('uv1', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      return g;
    },
  };
}
const V = (x, y, z) => new T.Vector3(x, y, z);

// One model, many placements, as InstancedMeshes (one per mesh in the model): forty doors cost a door's draw calls.
function instanced(lib, id, matrices, parent) {
  if (!matrices.length || !lib.models.has(id)) return;
  const src = lib.model(id, { origin: true });
  src.updateMatrixWorld(true);
  src.traverse(n => {
    if (!n.isMesh) return;
    const im = new T.InstancedMesh(n.geometry, n.material, matrices.length);
    matrices.forEach((m, i) => im.setMatrixAt(i, m.clone().multiply(n.matrixWorld)));
    im.castShadow = im.receiveShadow = true; im.computeBoundingSphere();
    parent.add(im);
  });
}

// Door numbers on one canvas: every plate on a floor is a quad into it, one draw call.
function plateAtlas(labels) {
  const cols = 8, rows = Math.ceil(labels.length / cols), cw = 160, ch = 96;
  const tex = F.canvasTexture(cols * cw, Math.max(1, rows) * ch, (g, w, h) => {
    g.fillStyle = '#24303f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    labels.forEach((t, i) => { g.font = `bold ${t.length > 4 ? 44 : 72}px system-ui, sans-serif`; g.fillText(t, (i % cols + 0.5) * cw, (((i / cols) | 0) + 0.52) * ch); });
  });
  const uvOf = i => [(i % cols) / cols, 1 - (((i / cols) | 0) + 1) / Math.max(1, rows), 1 / cols, 1 / Math.max(1, rows)];
  return { tex, uvOf };
}

// ---------------------------------------------------------------- what leaks in, floor by floor
// Props for dead ends: [model id, depth (m, against the end wall), footprint width, height]. Fronts face +Z.
const LEAKS = [
  [['hotel-ice-machine', 0.8, 0.8, 1.9], ['hotel-housekeeping-cart', 0.6, 1.3, 1.3], ['hotel-snack-vending', 0.9, 1.0, 1.9], ['hotel-luggage-cart-brass', 0.7, 1.1, 1.9]],
  [['hotel-king-bed', 2.1, 1.95, 1.2], ['hotel-credenza-tv', 0.55, 1.6, 1.6], ['hotel-microfridge', 0.55, 0.6, 1.4], ['hotel-nightstand', 0.45, 0.55, 0.65], ['hotel-ptac', 0.4, 1.05, 0.5]],
  [['hotel-lounge-chair-navy', 0.85, 0.8, 0.9], ['hotel-sectional', 1.0, 2.0, 0.9], ['hotel-breakfast-bar', 0.75, 2.0, 1.0], ['hotel-brochure-rack', 0.35, 0.6, 1.5], ['ph-potted-plant-04', 0.5, 0.5, 1.3], ['hotel-market-cooler', 0.8, 1.0, 2.0]],
];
// The plates on the doors, by floor. One: the second floor's numbers, out of order. Two: every door is yours. Three: the
// numbers run down past where any floor's numbers stop.
function doorLabel(level, k, r) {
  if (level === 0) return String(r() < 0.12 ? 212 : 201 + Math.floor(r() * 30));
  if (level === 1) return '212';
  return k < 9 ? String(108 - k) : r() < 0.5 ? String(100 - k) : '';
}

/**
 * Build one generated floor at `origin` on the hotel's world. Call before the player exists (physics reads colliders once).
 * → { m, level, origin, group, cellAt(p), centre(i), stairs: { start, exit }, tvs: [{ cell, pos, screen, light, on, channel }], zone }
 */
export function buildFloor({ scene, lib, world, game }, m, { origin, level, seed, label }) {
  const r = rng(seed ^ 0x5bd1e995), group = new T.Group(); group.name = `Night audit floor ${level + 1}`;
  const [ox, oy, oz] = origin, W = m.w * C, H = m.h * C;
  const centre = i => V(ox + (i % m.w + 0.5) * C, oy, oz + (((i / m.w) | 0) + 0.5) * C);
  const cellAt = p => { const x = Math.floor((p.x - ox) / C), z = Math.floor((p.z - oz) / C); return p.y > oy - 1 && p.y < oy + CEIL + 1 ? m.at(x, z) : -1; };
  const solid = (x0, x1, y0, y1, z0, z1) => world.colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
  const closed = (i, d) => !(m.open[i] & (1 << d));
  const out = (d) => V(DIRS[d][0], 0, DIRS[d][1]);
  const right = (d) => V(-DIRS[d][1], 0, DIRS[d][0]);   // looking out through side d, your right

  // Walls: a face per closed side of every cell, pillars at the corners so wall ends don't show a slit, a vinyl base.
  const walls = quads(), base = quads(), up = V(0, CEIL, 0), baseUp = V(0, 0.1, 0);
  const sides = [];   // [cell, dir] of every closed side: where doors, art and TVs can go
  for (let i = 0; i < m.w * m.h; i++) for (let d = 0; d < 4; d++) {
    if (!closed(i, d)) continue;
    sides.push([i, d]);
    const c = centre(i), face = c.clone().addScaledVector(out(d), C / 2 - WT), rt = right(d), n = out(d).negate();
    const a = face.clone().addScaledVector(rt, -C / 2), b = face.clone().addScaledVector(rt, C / 2);
    walls.add(a, b, up, n, (d % 2 ? c.z : c.x) - C / 2);
    base.add(a.clone().addScaledVector(n, 0.004), b.clone().addScaledVector(n, 0.004), baseUp, n);
    // the partition, once per pair (each wall belongs to the cell on its north or west side, or to the edge)
    const j = m.at(i % m.w + DIRS[d][0], ((i / m.w) | 0) + DIRS[d][1]);
    if (j < 0 || d === 1 || d === 2) {
      const mid = c.clone().addScaledVector(out(d), C / 2);
      if (d % 2) solid(mid.x - WT, mid.x + WT, oy, oy + CEIL, mid.z - C / 2, mid.z + C / 2);
      else solid(mid.x - C / 2, mid.x + C / 2, oy, oy + CEIL, mid.z - WT, mid.z + WT);
    }
  }
  const pillars = [];
  for (let x = 0; x <= m.w; x++) for (let z = 0; z <= m.h; z++) {
    // a corner post wherever a wall ends: any of the four walls meeting here
    const hits = [[x - 1, z - 1, 1], [x - 1, z - 1, 2], [x, z, 0], [x, z, 3]].some(([cx, cz, d]) => { const i = m.at(cx, cz); return i >= 0 && closed(i, d); });
    if (!hits) continue;
    const g = new T.BoxGeometry(WT * 2, CEIL, WT * 2); g.translate(ox + x * C, oy + CEIL / 2, oz + z * C);
    pillars.push(g.toNonIndexed());
  }
  const surface = (id, opts) => lib.surface(id, opts);
  const paint = surface('linen', { repeat: [1 / 0.27, 1 / 0.27], color: level === 2 ? '#d9cbb4' : '#e4dccd', grade: 'saturate(35%)', normalScale: 0.8 });
  const wallGeo = mergeGeometries([walls.geometry(), ...pillars.map(g => { g.deleteAttribute('uv1'); g.setAttribute('uv1', g.attributes.uv.clone()); return g; })].map(g => g.index ? g.toNonIndexed() : g));
  group.add(Object.assign(new T.Mesh(wallGeo, paint), { receiveShadow: true, name: 'walls' }));
  group.add(Object.assign(new T.Mesh(base.geometry(), F.mat('#3a3631', { roughness: 0.7 })), { name: 'cove base' }));
  // Floor and ceiling: the corridor carpet (on the last floor, the lobby's), the acoustic tile.
  const matte = s => new T.MeshPhysicalMaterial({ map: s.map, normalMap: s.normalMap, normalScale: s.normalScale, color: s.color, roughness: 1, specularIntensity: 0 });
  const carpet = level === 2
    ? matte(surface('lobby-carpet', { repeat: [1, 1], color: '#b4c6e8', grade: 'contrast(2.1)' }))
    : matte(surface('corridor', { repeat: [0.55, 0.55], color: level === 1 ? '#c8c0d2' : '#c0cadc', grade: 'contrast(0.45) brightness(1.35) saturate(85%)', roughness: 1 }));
  const fl = quads(), ce = quads();
  fl.add(V(ox, oy, oz + H), V(ox + W, oy, oz + H), V(0, 0, -H), V(0, 1, 0));
  ce.add(V(ox, oy + CEIL, oz), V(ox + W, oy + CEIL, oz), V(0, 0, H), V(0, -1, 0));
  group.add(Object.assign(new T.Mesh(fl.geometry(), carpet), { receiveShadow: true, name: 'carpet' }));
  // The downlights' anchors sit above the ceiling (as in world/corridors.js), so nothing lights its face directly: a little
  // emission stands in for the bounce off the carpet and walls, or the tile reads as night sky.
  const tile = surface('ceiling', { repeat: [1 / 0.61, 1 / 0.61], grade: 'saturate(15%) brightness(1.45) contrast(0.85)' }).clone();
  tile.emissive = new T.Color('#5a5852'); tile.emissiveMap = tile.map;
  group.add(Object.assign(new T.Mesh(ce.geometry(), tile), { name: 'ceiling' }));
  world.surfaces.push({ x0: ox, x1: ox + W, z0: oz, z1: oz + H, y: oy, name: `audit floor ${level + 1}` });

  // Lights: a downlight every other cell along the halls, as the real corridor has; on the last floor some are out.
  const can = [], lights = [];
  for (let i = 0; i < m.w * m.h; i++) {
    const x = i % m.w, z = (i / m.w) | 0;
    if ((x + z) % 2 && i !== m.start && i !== m.exit) continue;
    const dead = level === 2 && r() < 0.3 && i !== m.start && i !== m.exit;
    const c = centre(i);
    const g = new T.CylinderGeometry(0.1, 0.1, 0.02, 16); g.translate(c.x, oy + CEIL - 0.01, c.z); can.push(g);
    if (!dead) { const a = { pos: V(c.x, oy + CEIL + 0.01, c.z), color: new T.Color(level === 1 ? '#ffe2bb' : '#ffe7c7'), intensity: 7, distance: 8 }; world.lightAnchors.push(a); lights.push(a); }
  }
  if (can.length) group.add(Object.assign(new T.Mesh(mergeGeometries(can), F.glow('#fff4e2', 1.4)), { name: 'downlights' }));

  // Which closed sides are free: not the stair doors' walls.
  const startSide = 3;   // the start cell is on the west edge
  const taken = new Set([`${m.start}:${startSide}`, `${m.exit}:${m.exitSide}`]);
  const free = sides.filter(([i, d]) => !taken.has(`${i}:${d}`));
  const deadEnds = [];
  for (let i = 0; i < m.w * m.h; i++) if (i !== m.start && i !== m.exit && degree(m, i) === 1) deadEnds.push(i);
  shuffle(deadEnds, r);

  // TVs: in some dead ends (on the end wall) and on side walls along the way. More the deeper you go.
  const tvs = [], nTV = [3, 5, 7][level] ?? 7;
  const tvSides = [];
  for (const i of deadEnds.slice(0, Math.ceil(nTV / 2))) tvSides.push([i, (([0, 1, 2, 3].find(d => !closed(i, d))) + 2) % 4]);
  const along = shuffle(free.filter(([i]) => degree(m, i) === 2 && !deadEnds.includes(i)), r);
  for (const s of along) { if (tvSides.length >= nTV) break; if (!tvSides.some(([i]) => i === s[0])) tvSides.push(s); }
  const usedSides = new Set(tvSides.map(([i, d]) => `${i}:${d}`));
  for (const [i, d] of tvSides) {
    const c = centre(i), n = out(d).negate(), face = c.clone().addScaledVector(out(d), C / 2 - WT);
    const tv = flatTV(level === 2 ? 1.25 : 1.0);
    tv.group.position.copy(face).setY(oy + 1.55).addScaledVector(n, 0.03);
    tv.group.rotation.y = Math.atan2(n.x, n.z);
    group.add(tv.group);
    const glow = { pos: face.clone().setY(oy + 1.4).addScaledVector(n, 0.9), color: new T.Color('#9fb6d8'), intensity: 0, distance: 4 };
    world.lightAnchors.push(glow);
    tvs.push({ cell: i, side: d, pos: face.clone().setY(oy + 1.5), screen: tv.screen, light: glow, on: true });
  }

  // Doors on the rest of the free walls (about every other bay), numbered by the floor's rule.
  const doorMs = [], plates = [], labels = [];
  let k = 0;
  for (const [i, d] of shuffle(free.slice(), r)) {
    if (usedSides.has(`${i}:${d}`) || r() > 0.55) continue;
    const c = centre(i), n = out(d).negate(), face = c.clone().addScaledVector(out(d), C / 2 - WT);
    doorMs.push(new T.Matrix4().compose(face.clone(), new T.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.atan2(n.x, n.z)), V(1, 1, 1)));
    const t = doorLabel(level, k++, r);
    if (t) { plates.push({ at: face.clone().addScaledVector(right(d), 0.78).addScaledVector(n, 0.012).setY(oy + 1.5), n, rt: right(d), li: labels.length }); labels.push(t); }
    world.interact.push({ pos: face.clone().setY(oy + 1.2).addScaledVector(n, 0.2), r: 1.3, label: () => 'Knock', use: () => knock(game, level, r) });
  }
  // The stair doors: where you came in (it won't open again from this side), and the way on.
  const stairDoor = (i, d, isExit) => {
    const c = centre(i), n = out(d).negate(), face = c.clone().addScaledVector(out(d), C / 2 - WT);
    doorMs.push(new T.Matrix4().compose(face.clone(), new T.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.atan2(n.x, n.z)), V(1, 1, 1)));
    const sign = F.sign(isExit ? 'STAIR A\nDOWN' : `${label}\nSTAIR A`, { w: 0.3, h: 0.3, bg: '#24303f', font: 'bold 44px system-ui, sans-serif' });
    sign.position.copy(face).addScaledVector(right(d), -0.85).addScaledVector(n, 0.012).setY(oy + 1.5); sign.rotation.y = Math.atan2(n.x, n.z); group.add(sign);
    if (isExit) {
      const exit = F.sign('EXIT', { w: 0.4, h: 0.16, bg: '#b3141a', font: 'bold 110px system-ui, sans-serif', emissive: 1.5 });
      exit.position.copy(face).addScaledVector(n, 0.05).setY(oy + 2.45); exit.rotation.y = Math.atan2(n.x, n.z); group.add(exit);
      world.lightAnchors.push({ pos: face.clone().addScaledVector(n, 0.4).setY(oy + 2.3), color: new T.Color('#ff3020'), intensity: 0.8, distance: 3 });
    }
    return { cell: i, side: d, pos: face.clone().setY(oy + 1.2).addScaledVector(n, 0.25), facing: Math.atan2(-n.x, -n.z) };
  };
  const stairs = { start: stairDoor(m.start, startSide, false), exit: stairDoor(m.exit, m.exitSide, true) };
  instanced(lib, 'hotel-room-door', doorMs, group);
  if (labels.length) {
    const { tex, uvOf } = plateAtlas(labels), q = quads();
    for (const p of plates) q.add(p.at.clone().addScaledVector(p.rt, -0.1).setY(p.at.y - 0.06), p.at.clone().addScaledVector(p.rt, 0.1).setY(p.at.y - 0.06), V(0, 0.12, 0), p.n);
    const g = q.geometry(), uv = g.attributes.uv;
    plates.forEach((p, j) => { const [u, v, du, dv] = uvOf(p.li); for (const [o, a, b] of [[0, 0, 0], [1, 1, 0], [2, 1, 1], [3, 0, 1]]) uv.setXY(j * 4 + o, u + a * du, v + b * dv); });
    group.add(Object.assign(new T.Mesh(g, new T.MeshStandardMaterial({ map: tex, roughness: 0.5 })), { name: 'door plates' }));
  }

  // Dead ends get what leaked in from elsewhere in the hotel, against the end wall, facing back up the hall.
  const pool = LEAKS[level] ?? LEAKS.at(-1);
  for (const i of deadEnds.slice(Math.ceil(nTV / 2))) {
    if (r() < 0.25) continue;
    const [id, depth, width, height] = pool[Math.floor(r() * pool.length)];
    if (!lib.models.has(id)) continue;
    const back = (([0, 1, 2, 3].find(d => !closed(i, d))) + 2) % 4, n = out(back).negate(), c = centre(i);
    const at = c.clone().addScaledVector(out(back), C / 2 - WT - depth / 2 - 0.02);
    const o = lib.model(id, { origin: true }); o.position.copy(at); o.rotation.y = Math.atan2(n.x, n.z); group.add(o);
    const hx = (back % 2 ? depth : width) / 2, hz = (back % 2 ? width : depth) / 2;
    solid(at.x - hx, at.x + hx, oy, oy + height, at.z - hz, at.z + hz);
  }

  scene.add(group);
  const zone = { name: 'audit', id: `audit${level + 1}`, x0: ox - 0.5, x1: ox + W + 0.5, y0: oy - 1, y1: oy + CEIL + 1, z0: oz - 0.5, z1: oz + H + 0.5, indoor: true };
  return { m, level, origin, group, centre, cellAt, stairs, tvs, lights, zone, label };
}

const KNOCKS = [
  ['No answer.', 'A TV goes quiet behind the door, then comes back on, louder.', 'Somebody on the other side knocks back. Twice.'],
  ['No answer. Your key card would open this one, if it worked.', 'From inside: the PTAC rattling, the way yours does.', 'Someone in there is asleep. You can hear them breathing through the door.'],
  ['No answer.', 'Music, very faint, from somewhere behind the door. Not this room. Further.', 'The door is warm.'],
];
function knock(game, level, r) {
  const lines = KNOCKS[level] ?? KNOCKS[0];
  game.sound.knock(); game.say(lines[Math.floor(r() * lines.length)]);
}
// A wall-mounted flat panel: bezel and screen centred on the mount point, screen facing +Z.
function flatTV(width) {
  const group = new T.Group(), h = width * 0.5625;
  F.box(width + 0.03, h + 0.03, 0.05, F.mat('#111111', { roughness: 0.3 }), 0, -(h + 0.03) / 2, 0, group);   // box() stands on y: centre it
  const screen = new T.Mesh(new T.PlaneGeometry(width, h), new T.MeshBasicMaterial({ color: '#000000' }));
  screen.position.z = 0.0255; group.add(screen);
  return { group, screen };
}
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export { degree };
