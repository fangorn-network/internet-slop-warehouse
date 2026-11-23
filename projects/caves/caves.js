// SPDX-License-Identifier: CC0-1.0
// Onyx Caverns: a morning at the Heartland Inn's nearest tourist trap (the brochure in the lobby rack, the billboard on
// I-62). A scene on the hotel's stage: it starts beside your car in the hotel lot and ends back in it.
//
// morning:  get in your car. Out of the lot, east on the frontage road, right at the brown sign onto Route V through the
//           trees, into the caverns' gravel lot. Nobody in the ticket hut: SELF-GUIDED TOURS TODAY, $14 in the box.
// cave:     a tour path strung with bare bulbs, down to the Onyx Room. Break off a piece (everybody does). The bulbs go out
//           behind you, one by one, coming your way. Your flashlight. Your steps, and an echo of them that doesn't stop
//           quite when you do. Back up to daylight.
//           Then drive back (ctx.next({ loot: ['onyx'] })).
//
//   prebuild(ctx0, { seed })   the road, the lot, the hill and the cave, before the player exists
//   caves = { acts: { morning, cave }, start: 'morning', install }
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as F from '../roadside-inn/fixtures.js';
import { createAir } from '../night-audit/air.js';
import { rng } from '../night-audit/maze.js';
import { createCar } from './car.js';

const CAR_SPOT = new T.Vector3(1.6, 0, 20.75), CAR_HEADING = Math.PI + 0.02;   // your wagon, nose-in by the canopy (world/outside.js)
const ROAD_X = 266, LOT = [242, 290, -162, -132];                                 // Route V, and the caverns' lot
const MOUTH = new T.Vector3(266, 0, -176);                                         // the cave's mouth in the hill
const CAVE_Y = -100, CELL = 4, CAVE_H = 3.2;                                        // the cave is drawn under everything, like the audit floors
const TICKET = 14;
// Where the car may go: the hotel lot, its apron, the frontage road east to Route V, Route V, the caverns' lot.
export const AREAS = [[-45, 50, 10.6, 46], [-45, ROAD_X + 4, 46, 49.6], [ROAD_X - 4, ROAD_X + 4, LOT[3] - 1, 49.6], LOT];

// ---------------------------------------------------------------- before the player
export function prebuild({ scene, lib, world }, { seed }) {
  const r = rng(seed ^ 0x2c1b3c6d);
  const g = new T.Group(); g.name = 'Onyx Caverns';
  const solid = (x0, x1, y0, y1, z0, z1) => world.colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
  const flat = (x0, x1, z0, z1, mat, y = 0.009) => { const m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), mat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; g.add(m); };
  // Route V: a county two-lane through the trees, a yellow centre line; the caverns' lot is gravel.
  flat(ROAD_X - 4, ROAD_X + 4, LOT[3], 46, lib.surface('asphalt', { repeat: [1, (46 - LOT[3]) / 8], color: '#4f4f4f' }));
  const dash = []; for (let z = LOT[3] + 2; z < 44; z += 9) { const d = new T.BoxGeometry(0.12, 0.01, 3); d.translate(ROAD_X, 0.016, z); dash.push(d); }
  g.add(new T.Mesh(mergeGeometries(dash), F.mat('#d8b23a', { roughness: 0.7 })));
  flat(LOT[0], LOT[1], LOT[2], LOT[3], lib.surface('concrete', { repeat: [6, 4], color: '#9a8f80' }), 0.01);
  // Brown attraction signs: at the turn off the frontage road, and at the lot.
  const brown = (text, x, z, ry, w = 3.2) => { const s = new T.Group(); for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) F.box(0.1, 2.2, 0.1, F.mat('#5a5f63'), dx, 0, 0, s); const face = F.sign(text, { w, h: 1.3, bg: '#5a3a1e', fg: '#f3e6c4', font: 'bold 60px Georgia, serif' }); face.position.y = 2.75; s.add(face); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); };
  brown('ONYX CAVERNS\n◄ ROUTE V · ½ MI', ROAD_X + 7, 44.5, Math.PI / 2 + Math.PI);
  brown('ONYX CAVERNS\nGUIDED TOURS DAILY', ROAD_X - 6.5, LOT[3] + 3, Math.PI / 2, 3.6);
  // The ticket hut, at the walk up to the hill: board-and-batten, a window, an honour box.
  const hut = new T.Group(), wood = F.mat('#6e5137', { roughness: 0.9 }), trim = F.mat('#e8e0cc', { roughness: 0.7 });
  F.box(3, 2.6, 2.4, wood, 0, 0, 0, hut); F.box(3.4, 0.15, 2.8, F.mat('#3b3b3b'), 0, 2.6, 0, hut);
  F.box(1.4, 0.8, 0.05, F.mat('#1a2026', { roughness: 0.1 }), 0, 1.1, 1.21, hut); F.box(1.5, 0.08, 0.1, trim, 0, 1.06, 1.24, hut);
  const card = F.sign('SELF-GUIDED TOURS TODAY\nPLEASE LEAVE $14 IN THE BOX', { w: 1.2, h: 0.4, bg: '#f2ead4', fg: '#3b2a1a', font: 'bold 34px Georgia, serif' }); card.position.set(0, 1.55, 1.26); hut.add(card);
  F.box(0.35, 0.3, 0.25, F.mat('#7a1f1a'), 0.9, 0.9, 1.3, hut);
  const tix = F.sign('TICKETS', { w: 1.6, h: 0.35, bg: '#5a3a1e', fg: '#f3e6c4', font: 'bold 70px Georgia, serif' }); tix.position.set(0, 2.25, 1.23); hut.add(tix);
  const HUT = new T.Vector3(ROAD_X + 9, 0, LOT[2] + 4);
  hut.position.copy(HUT); g.add(hut); solid(HUT.x - 1.5, HUT.x + 1.5, 0, 2.6, HUT.z - 1.2, HUT.z + 1.2);
  // The hill: a long wooded limestone ridge with the mouth in its face, timbered, a rope and a sign.
  const hillGeo = new T.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), p = hillGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + (z > 0.75 ? 0 : 0.08 * Math.sin(x * 9 + z * 5) + 0.05 * Math.sin(x * 23 - z * 17)); p.setXYZ(i, x * n, y * n, z * n); }
  hillGeo.computeVertexNormals();
  const rock = lib.surface('concrete', { repeat: [14, 6], color: '#8d8476' });
  const hill = new T.Mesh(hillGeo, rock); hill.scale.set(46, 16, 22); hill.position.set(MOUTH.x, -1.5, MOUTH.z - 21.6); hill.receiveShadow = true; hill.castShadow = true; g.add(hill);   // its face (left smooth) stands just behind the mouth
  solid(MOUTH.x - 40, MOUTH.x + 40, 0, 14, MOUTH.z - 40, MOUTH.z + 0.3);
  const timber = F.mat('#3e2c1e', { roughness: 0.95 });
  for (const dx of [-1.6, 1.6]) F.box(0.3, 2.9, 0.3, timber, MOUTH.x + dx, 0, MOUTH.z + 0.5, g);
  F.box(3.6, 0.35, 0.35, timber, MOUTH.x, 2.9, MOUTH.z + 0.5, g);
  const dark = new T.Mesh(new T.PlaneGeometry(3, 2.9), new T.MeshBasicMaterial({ color: '#000000' })); dark.position.set(MOUTH.x, 1.45, MOUTH.z + 0.34); g.add(dark);
  const mouthSign = F.sign('ONYX CAVERNS\nWATCH YOUR HEAD', { w: 1.6, h: 0.6, bg: '#5a3a1e', fg: '#f3e6c4', font: 'bold 44px Georgia, serif' }); mouthSign.position.set(MOUTH.x, 3.45, MOUTH.z + 0.7); g.add(mouthSign);
  // Clear the trees off the road and the lot: Route V was cut through them.
  const keepOff = (x, z) => (Math.abs(x - ROAD_X) < 8 && z > LOT[2] - 40 && z < 56) || (x > LOT[0] - 6 && x < LOT[1] + 6 && z > LOT[2] - 30 && z < LOT[3] + 6) || (z > 44 && z < 56 && x > 40 && x < ROAD_X + 10);
  const m4 = new T.Matrix4(), v = new T.Vector3(), zero = new T.Matrix4().makeScale(0, 0, 0);
  scene.traverse(o => {
    if (!o.isInstancedMesh || o.count < 100 || !(o.geometry.type === 'CylinderGeometry' || o.geometry.type === 'IcosahedronGeometry')) return;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); v.setFromMatrixPosition(m4); if (keepOff(v.x, v.z)) o.setMatrixAt(i, zero); }
    o.instanceMatrix.needsUpdate = true;
  });
  scene.add(g);

  // ---------- the cave: a winding tour path of 4 m cells under the hill, down to a chamber ----------
  const cave = buildCave({ scene, lib, world, solid, r });
  world.zones.push(cave.zone); world.sees[cave.zone.id] = [];
  return { cave, hut: HUT, mouth: MOUTH };
}

function buildCave({ scene, lib, world, solid, r }) {
  const g = new T.Group(); g.name = 'Onyx Caverns (inside)';
  const ox = 200, oz = -300;                       // the grid's corner (any clear patch: it's a floor of its own)
  // A self-avoiding walk of cells, mostly straight, then a 2 x 2 chamber at the end.
  const cells = new Map(), key = (x, z) => `${x},${z}`, path = [];
  let x = 0, z = 0, d = [0, 1];
  cells.set(key(x, z), path.length); path.push([x, z]);
  for (let n = 0; n < 15; n++) {
    const turns = r() < 0.65 ? [d] : [[d[1], -d[0]], [-d[1], d[0]], d].sort(() => r() - 0.5);
    const next = turns.map(t => [x + t[0], z + t[1], t]).find(([a, b]) => !cells.has(key(a, b)) && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([u, w]) => { const k = cells.get(key(a + u, b + w)); return k !== undefined && k < path.length - 1; }));
    if (!next) break;
    [x, z, d] = next; cells.set(key(x, z), path.length); path.push([x, z]);
  }
  // the chamber: the last cell and the three past it in the walk's direction and to one side
  const side = [d[1], -d[0]], end = path.at(-1);
  const room = [[end[0] + d[0], end[1] + d[1]], [end[0] + side[0], end[1] + side[1]], [end[0] + d[0] + side[0], end[1] + d[1] + side[1]]].filter(([a, b]) => !cells.has(key(a, b)));
  for (const c of room) cells.set(key(...c), -1);
  const at = (cx, cz) => new T.Vector3(ox + (cx + 0.5) * CELL, CAVE_Y, oz + (cz + 0.5) * CELL);
  // Rock: every closed side of every cell is a jagged slab; floors and ceilings undulate a little.
  const walls = [], floors = [], ceils = [];
  const jag = (geo, amp, seedx) => { const q = geo.attributes.position; for (let i = 0; i < q.count; i++) { const a = q.getX(i), b = q.getY(i), c = q.getZ(i); q.setXYZ(i, a + amp * Math.sin(b * 3.1 + c * 2.3 + seedx), b + amp * 0.5 * Math.sin(a * 2.7 + seedx), c + amp * Math.sin(a * 2.9 + b * 1.7 + seedx * 1.3)); } geo.computeVertexNormals(); return geo; };
  let k = 0;
  for (const [kk] of cells) {
    const [cx, cz] = kk.split(',').map(Number), c = at(cx, cz);
    for (const [u, w] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (cells.has(key(cx + u, cz + w))) continue;
      const wall = new T.BoxGeometry(u ? 0.9 : CELL + 0.9, CAVE_H + 1, w ? 0.9 : CELL + 0.9, u ? 2 : 8, 6, w ? 2 : 8);
      wall.translate(c.x + u * (CELL / 2 + 0.2), CAVE_Y + (CAVE_H + 1) / 2 - 0.3, c.z + w * (CELL / 2 + 0.2));
      walls.push(jag(wall, 0.22, k++));
      solid(c.x + u * CELL / 2 - (u ? 0.15 : CELL / 2), c.x + u * CELL / 2 + (u ? 0.15 : CELL / 2), CAVE_Y, CAVE_Y + CAVE_H, c.z + w * CELL / 2 - (w ? 0.15 : CELL / 2), c.z + w * CELL / 2 + (w ? 0.15 : CELL / 2));
    }
    const f = new T.PlaneGeometry(CELL, CELL, 4, 4); f.rotateX(-Math.PI / 2); f.translate(c.x, CAVE_Y, c.z); floors.push(f);
    const ce = new T.PlaneGeometry(CELL, CELL, 6, 6); ce.rotateX(Math.PI / 2); ce.translate(c.x, CAVE_Y + CAVE_H - 0.1, c.z); ceils.push(jag(ce, 0.3, k++));
    world.surfaces.push({ x0: c.x - CELL / 2, x1: c.x + CELL / 2, z0: c.z - CELL / 2, z1: c.z + CELL / 2, y: CAVE_Y, name: 'cave' });
  }
  const stone = lib.surface('concrete', { repeat: [0.6, 0.6], color: '#6d6051' });
  const mud = lib.surface('concrete', { repeat: [0.5, 0.5], color: '#4a3f33' });
  const strip = geos => mergeGeometries(geos.map(q => { const n = q.index ? q.toNonIndexed() : q; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; }));
  g.add(new T.Mesh(strip(walls), stone), new T.Mesh(strip(floors), mud), new T.Mesh(strip(ceils), stone));
  // The tour: a cable of bare bulbs along the path, every other cell, warm and dim.
  const bulbs = [], bulbGeo = [];
  path.forEach(([cx, cz], i) => {
    if (i % 2) return;
    const c = at(cx, cz).setY(CAVE_Y + CAVE_H - 0.55);
    const a = { pos: c.clone(), color: new T.Color('#ffb46a'), intensity: 3.2, distance: 9, base: 3.2, i };
    world.lightAnchors.push(a); bulbs.push(a);
    const s = new T.SphereGeometry(0.06, 8, 6); s.translate(c.x, c.y, c.z); bulbGeo.push(s);
  });
  const glass = F.glow('#ffd29a', 2.2), bulbMesh = new T.Mesh(mergeGeometries(bulbGeo), glass); g.add(bulbMesh);
  // The Onyx Room: black formations behind a rope, a sign, and two lights on them.
  const centre = room.length ? room.map(([a, b]) => at(a, b)).reduce((s, q) => s.add(q), at(...end)).multiplyScalar(1 / (room.length + 1)) : at(...end);
  const onyx = F.mat('#0b0a0c', { roughness: 0.08, metalness: 0.25 });
  for (let i = 0; i < 9; i++) { const h = 0.6 + r() * 1.6, cone = new T.Mesh(new T.ConeGeometry(0.18 + r() * 0.25, h, 7), onyx); cone.position.set(centre.x + (r() - 0.5) * 2.2, CAVE_Y + h / 2, centre.z + (r() - 0.5) * 2.2); g.add(cone); }
  solid(centre.x - 1.4, centre.x + 1.4, CAVE_Y, CAVE_Y + 2, centre.z - 1.4, centre.z + 1.4);
  const sign = F.sign('THE ONYX ROOM\nPLEASE DO NOT TOUCH\nTHE FORMATIONS', { w: 0.9, h: 0.6, bg: '#5a3a1e', fg: '#f3e6c4', font: 'bold 40px Georgia, serif' });
  const toEntry = at(...path[0]).sub(centre).setY(0).normalize();
  sign.position.copy(centre).addScaledVector(toEntry, 1.7).setY(CAVE_Y + 1.1); sign.lookAt(sign.position.clone().add(toEntry)); g.add(sign);
  const spots = [centre.clone().addScaledVector(toEntry, 1.5).setY(CAVE_Y + 0.4)].map(pos => { const a = { pos, color: new T.Color('#fff0d8'), intensity: 4, distance: 6, base: 4 }; world.lightAnchors.push(a); return a; });
  scene.add(g);
  const xs = [...cells.keys()].map(s => s.split(',').map(Number));
  const zone = { name: 'cave', id: 'cave', indoor: true, y0: CAVE_Y - 1, y1: CAVE_Y + CAVE_H + 2,
    x0: ox + (Math.min(...xs.map(c => c[0])) - 1) * CELL, x1: ox + (Math.max(...xs.map(c => c[0])) + 2) * CELL, z0: oz + (Math.min(...xs.map(c => c[1])) - 1) * CELL, z1: oz + (Math.max(...xs.map(c => c[1])) + 2) * CELL };
  const entry = at(...path[0]), first = at(...path[1]);
  return { group: g, zone, path, bulbs, bulbMesh, glass, spots, centre, entry, facing: Math.atan2(-(first.x - entry.x), -(first.z - entry.z)), toEntry, inside: p => p.y < CAVE_Y + CAVE_H + 1 && p.y > CAVE_Y - 1 };
}

// ---------------------------------------------------------------- install
function install(ctx) {
  const { scene, world, lib, game } = ctx;
  const c = ctx.caves = { state: 'off', paid: false, onyx: false, dark: false, echo: [], air: createAir(ctx.sound.synth, { economy: ctx.quality.economy }) };
  const act = () => ctx.director?.name, B = ctx.cavesBuilt;
  // Your car, as a car: the parked instance at your spot is hidden and a real one stands in for it.
  const wagon = lib.model('g3-1990s-station-wagon', { rotate: 0 });
  wagon.traverse(n => { if (n.isMesh && /body_pbr|paint/.test(n.material.name)) { n.material = n.material.clone(); n.material.color.set('#3c6e91'); } });
  wagon.position.copy(CAR_SPOT); wagon.rotation.y = CAR_HEADING; wagon.visible = false; scene.add(wagon);
  const m4 = new T.Matrix4(), v = new T.Vector3();
  c.parked = [];
  scene.traverse(o => { if (!o.isInstancedMesh) return; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); v.setFromMatrixPosition(m4); if (Math.abs(v.x - CAR_SPOT.x) < 0.3 && Math.abs(v.z - CAR_SPOT.z) < 0.3 && v.y < 0.5) c.parked.push([o, i, m4.clone()]); } });
  c.showParked = on => { for (const [o, i, m] of c.parked) { o.setMatrixAt(i, on ? m : new T.Matrix4().makeScale(0, 0, 0)); o.instanceMatrix.needsUpdate = true; } };
  // what the car can hit: low outdoor boxes, minus the one that stood for your own car
  const boxes = world.colliders.filter(b => !b.on && b.y0 < 1 && b.y1 > 0.4 && b.y0 > -1 && !(CAR_SPOT.x > b.x0 && CAR_SPOT.x < b.x1 && CAR_SPOT.z > b.z0 && CAR_SPOT.z < b.z1));
  c.car = createCar(wagon, { areas: AREAS, boxes, synth: ctx.sound.synth, onHit: s => { game.sound.thud(); if (s > 8) game.say('The wagon bangs into it. Something in the back slides over.'); } });
  c.wagon = wagon;
  const inLot = () => { const p = wagon.position; return p.x > LOT[0] && p.x < LOT[1] && p.z > LOT[2] && p.z < LOT[3]; };
  const drive = () => {
    c.driving = true; ctx.frozen = true; c.car.on(true); game.sound.synth.burst(0.12, 0.3, 300, 'lowpass');
    ctx.view = { pos: new T.Vector3(), yaw: 0, pitch: 0, label: '', onUse: () => {
      if (Math.abs(c.car.speed) > 0.6) return game.say('Stop the car first.', 2);
      if (inLot()) return getOut();
      if (c.onyx) return home();
      game.say(c.paid ? 'The lobby can wait. You came for the caves.' : 'Route V, then the caverns. The brown signs.', 3);
    } };
    if (!c.paid) ctx.goal('Drive to Onyx Caverns: east on the frontage road, then Route V');
  };
  const getOut = () => {
    c.driving = false; c.car.on(false); ctx.view = null; ctx.frozen = false; game.sound.thud();
    const p = wagon.position, h = c.car.heading;
    ctx.teleport(p.x + Math.cos(h) * 1.6, 0, p.z - Math.sin(h) * 1.6, h + Math.PI, 0);   // out the driver's door, on its left
    ctx.goal(c.paid ? (c.onyx ? 'Drive back to the Heartland' : 'Go into the cave') : 'Buy a ticket at the hut');
  };
  const home = () => { c.driving = false; c.car.on(false); ctx.next({ loot: ['onyx'], spent: TICKET }); };
  world.interact.push({ pos: new T.Vector3(), dynamicY: () => 1.2, r: 2.6, when: () => (act() === 'morning') && !c.driving, label: () => c.onyx ? 'Drive back to the Heartland' : 'Get in your car',
    use: () => c.onyx ? home() : drive() });
  c.carInteract = world.interact.at(-1);
  // the hut and the mouth
  world.interact.push({ pos: B.hut.clone().setY(1.1).add(new T.Vector3(0.9, 0, 1.5)), r: 1.6, when: () => act() === 'morning' && !c.paid, label: () => `Leave $${TICKET} in the box`,
    use: () => {
      if (ctx.run && !ctx.run.spend(TICKET)) return game.say('You don’t have fourteen dollars. Not even close.');
      c.paid = true; game.sound.synth.burst(0.05, 0.1, 2500, 'bandpass'); game.say('The bills go in. Somewhere in the box, a little bell.', 3);
      ctx.goal('Go into the cave');
    } });
  world.interact.push({ pos: B.mouth.clone().setY(1.4).add(new T.Vector3(0, 0, 0.6)), r: 2, when: () => act() === 'morning' && !c.onyx, label: () => 'Go into the cave',
    use: () => c.paid ? ctx.director.go('cave', { fadeOut: 0.8, fadeIn: 1.2 }) : game.say('A chain across the mouth: TOUR TICKETS AT THE HUT.') });
  // inside: the formations, and the way out
  const cv = B.cave;
  world.interact.push({ pos: cv.centre.clone().addScaledVector(cv.toEntry, 1.2).setY(cv.centre.y + 1), r: 1.8, when: () => act() === 'cave' && !c.onyx, label: () => 'Break off a piece of onyx', use: () => takeOnyx(ctx) });
  world.interact.push({ pos: cv.entry.clone().setY(cv.entry.y + 1.3), r: 2, when: () => act() === 'cave', label: () => 'Back out into daylight', use: () => ctx.director.go('morning', { fadeOut: 0.8, fadeIn: 1.4 }) });
  world.updaters.push(dt => {   // the car moves under the interaction and the camera
    c.carInteract.pos.copy(wagon.position).setY(1.2);
    if (c.driving) { c.car.update(dt, ctx.controls.input); Object.assign(ctx.view, c.car.camera(dt)); ctx.view.label = Math.abs(c.car.speed) < 0.6 ? (inLot() ? 'Park and get out' : c.onyx ? 'Drive back' : '') : ''; }
  });
}

function takeOnyx(ctx) {
  const c = ctx.caves, B = ctx.cavesBuilt.cave, s = ctx.sound.synth;
  c.onyx = true; ctx.game.give('piece of onyx');
  s.burst(0.08, 0.5, 3200, 'bandpass'); s.burst(0.2, 0.15, 900, 'bandpass', 0.05);
  ctx.say('It snaps off clean, cold and heavier than it looks. You feel watched by a sign.', 4);
  ctx.run?.hurt?.(5);
  ctx.goal('Get back out');
  // The bulbs go: from the far end of the string, toward you, one at a time, each with a tick.
  setTimeout(() => {
    const order = [...B.bulbs].sort((a, b) => a.i - b.i);
    order.forEach((b, k) => setTimeout(() => {
      b.intensity = 0; c.air.shot(b.pos, d => { s.burst(0.03, 0.3, 4000, 'highpass', 0, d); s.tone(90, 0.3, 0.06, 'sawtooth', 0.5, 0, d); }, { gain: 0.8 });
      if (k === order.length - 1) { B.glass.emissiveIntensity = 0; for (const sp of B.spots) sp.intensity = 0; c.dark = true; ctx.say('Then the last one. Your flashlight, and the sound of the cave.', 4); }
    }, k * 650));
  }, 2500);
}

// ---------------------------------------------------------------- acts
const morning = {
  fadeIn: 2,
  enter(ctx) {
    const c = ctx.caves, B = ctx.cavesBuilt;
    ctx.applyLook('day'); ctx.world.setTimeOfDay?.('day');
    for (const w of ctx.world.walkers) { w.p.root.visible = true; }
    c.wagon.visible = true; c.showParked(false);
    if (c.onyx) {   // out of the cave: daylight, and the car where you left it
      ctx.teleport(B.mouth.x, 0, B.mouth.z + 2.5, 0 + Math.PI, 0);
      ctx.say('Daylight. It is warmer out here than it should be, and the lot is still empty except for your car.', 5);
      ctx.goal('Drive back to the Heartland');
    } else {
      c.wagon.position.copy(CAR_SPOT); c.car.heading = CAR_HEADING; c.wagon.rotation.y = CAR_HEADING;
      ctx.teleport(CAR_SPOT.x + 1.9, 0, CAR_SPOT.z - 0.5, -Math.PI / 2, 0);
      ctx.say('Morning. The lot is half empty. On the brochure in your pocket: ONYX CAVERNS, EXIT 127, ROUTE V.', 5);
      ctx.goal('Get in your car');
    }
    ctx.fx.snap({ dream: 0, lids: 0, peep: 0, flash: 0 });
  },
  exit(ctx) { const c = ctx.caves; if (c.driving) { c.driving = false; c.car.on(false); ctx.view = null; ctx.frozen = false; } },
};

const cave = {
  fadeIn: 1.4,
  enter(ctx) {
    const c = ctx.caves, B = ctx.cavesBuilt.cave;
    ctx.teleport(B.entry.x, B.entry.y, B.entry.z, B.facing, 0);
    ctx.envScale = 0.15; ctx.exposure = 0.9;
    const fog = ctx.scene.fog; c.fog0 ??= { color: fog.color.clone(), near: fog.near, far: fog.far }; fog.color.set('#020201'); fog.near = 2; fog.far = 24;
    c.light.intensity = 9;
    ctx.goal(c.onyx ? 'Get back out' : 'Follow the bulbs to the Onyx Room');
    if (!c.inBefore) { c.inBefore = true; setTimeout(() => ctx.say('Cool, wet air. A string of bare bulbs going down. Your own breath, very loud.', 5), 1200); }
    // your steps, and an echo of them from behind
    const step = ctx.sound.step.bind(ctx.sound);
    c.step0 = step;
    ctx.sound.step = soft => {
      step(soft);
      if (!c.onyx) return;
      const cam = ctx.camera, back = new T.Vector3(); cam.getWorldDirection(back);
      const at = cam.position.clone().addScaledVector(back, -7);
      setTimeout(() => c.air.shot(at, d => { ctx.sound.synth.burst(0.06, 0.35, 500, 'lowpass', 0, d); }, { gain: 0.5, cutoff: 1200 }), 380 + Math.random() * 80);
      c.lastStep = performance.now();
      clearTimeout(c.extra); c.extra = setTimeout(() => c.air.shot(at, d => ctx.sound.synth.burst(0.06, 0.3, 450, 'lowpass', 0, d), { gain: 0.45, cutoff: 1000 }), 1200);   // one more, after you've stopped
    };
  },
  update(dt, ctx) {
    const c = ctx.caves; c.air.update(ctx.camera);
    // drips: now and then, somewhere close, into a pool you can't see
    if ((c.drip = (c.drip ?? 1) - dt) <= 0) {
      c.drip = 0.6 + Math.random() * 2.4;
      const at = ctx.camera.position.clone().add(new T.Vector3((Math.random() - 0.5) * 10, 1, (Math.random() - 0.5) * 10));
      c.air.shot(at, d => ctx.sound.synth.tone(1400 + Math.random() * 900, 0.09, 0.05, 'sine', 0.55, 0, d), { gain: 0.6 });
    }
    if (c.dark) c.light.intensity = Math.random() < 0.02 ? 1 : 9;   // the flashlight's contact is bad
  },
  exit(ctx) {
    const c = ctx.caves, fog = ctx.scene.fog;
    if (c.fog0) { fog.color.copy(c.fog0.color); fog.near = c.fog0.near; fog.far = c.fog0.far; }
    ctx.envScale = 1; ctx.exposure = 1; c.light.intensity = 0;
    if (c.step0) ctx.sound.step = c.step0;
  },
};

// The flashlight: on the camera, made at install so turning it on later doesn't recompile every shader.
function installLight(ctx) {
  const l = new T.SpotLight('#fff4e0', 0, 22, 0.42, 0.55, 1.6);
  l.position.set(0.15, -0.1, 0); l.target.position.set(0, -0.25, -1); ctx.camera.add(l, l.target);
  if (!ctx.camera.parent) ctx.scene.add(ctx.camera);
  ctx.caves.light = l;
}

/** A new day: the box is empty again, the bulbs are lit, nothing's been taken. */
export function resetCaves(ctx) {
  const c = ctx.caves, B = ctx.cavesBuilt.cave;
  Object.assign(c, { paid: false, onyx: false, dark: false, inBefore: false });
  for (const b of [...B.bulbs, ...B.spots]) b.intensity = b.base;
  B.glass.emissiveIntensity = 2.2;
  if (ctx.game.has('piece of onyx')) ctx.game.take('piece of onyx');
}
export const caves = { acts: { morning, cave }, start: 'morning', install: ctx => { install(ctx); installLight(ctx); } };
