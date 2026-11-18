// SPDX-License-Identifier: CC0-1.0
// The Route 66 Travel Stop across the interstate, filled in: a store you can walk into (shelves, coolers, coffee, a
// counter nobody is behind), the pump canopy, a payphone, a newspaper box and a price sign whose prices are from the
// wrong decade. World coordinates; the storefront faces the hotel (-z). Static geometry is merged per material, so the
// whole place costs a couple of dozen draw calls.
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as F from './fixtures.js';

// Warehouse parts the travel stop loads (Grab3D, CC0; published in projects/late-checkout/assets-1.parts.json, ingested
// from ingestion/grab3d/batches/travel-stop). assets.js adds them to the hotel's library.
export const STATION_PARTS = ['g3-phone-booth', 'g3-gas-pump', 'g3-newspaper-stand', 'g3-grocery-shelf', 'g3-upright-freezer', 'g3-cash-register', 'g3-freezer-chest', 'g3-trash-can', 'g3-coffee-machine', 'g3-soda-fountain', 'g3-end-cap-display'];
export const STATION = { x0: -78, x1: -62, z0: 114, z1: 124, h: 4.2 };

export function buildStation(scene, lib, game, world) {
  const { x0, x1, z0, z1, h } = STATION, cx = (x0 + x1) / 2;
  const statics = new T.Group(), live = new T.Group();
  const solid = (ax, bx, ay, by, az, bz) => world.colliders.push({ x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: ay, y1: by, z0: Math.min(az, bz), z1: Math.max(az, bz) });
  const block = (w, hh, d, m, x, y, z, parent = statics, collide = true) => { const b = F.box(w, hh, d, m, x, y, z, parent); if (collide) solid(x - w / 2, x + w / 2, y, y + hh, z - d / 2, z + d / 2); return b; };
  const light = (x, y, z, color, intensity, distance, outdoor = false) => world.lightAnchors.push({ pos: new T.Vector3(x, y, z), color: new T.Color(color), intensity, distance, outdoor });

  const stucco = F.mat('#cbbfa8', { roughness: 0.95 }), trimRed = F.mat('#b3141a', { roughness: 0.6 }), steel = F.mat('#9aa1a7', { metalness: 0.7, roughness: 0.35 });
  const dark = F.mat('#2e3136', { metalness: 0.6, roughness: 0.35 }), white = F.mat('#f2f2f2', { roughness: 0.7 });
  const floor = lib.surface('tile', { repeat: [0.6, 0.6], color: '#d9d4c8' });
  const ceiling = lib.surface('ceiling', { repeat: [1 / 3.66, 1 / 3.66] });

  // ---------- the store ----------
  const T_ = 0.2, door = [cx - 1, cx + 1];
  block(x1 - x0, h, T_, stucco, cx, 0, z1);                       // back
  block(T_, h, z1 - z0, stucco, x0, 0, (z0 + z1) / 2);            // sides
  block(T_, h, z1 - z0, stucco, x1, 0, (z0 + z1) / 2);
  // Storefront: kick plate and glass either side of the door, a header band above.
  for (const [a, b] of [[x0, door[0]], [door[1], x1]]) {
    block(b - a, 0.45, T_, stucco, (a + b) / 2, 0, z0);
    const pane = new T.Mesh(new T.PlaneGeometry(b - a - 0.2, 2.2), F.glass()); pane.position.set((a + b) / 2, 1.55, z0); live.add(pane);
    solid(a, b, 0, 2.65, z0 - 0.1, z0 + 0.1);
    for (let x = a + 0.05; x <= b; x += (b - a - 0.1) / 3) block(0.08, 2.2, 0.12, dark, x, 0.45, z0, statics, false);
  }
  block(x1 - x0, h - 2.65, T_, stucco, cx, 2.65, z0, statics, false);
  block(x1 - x0 + 0.4, 0.35, 0.3, trimRed, cx, h - 0.35, z0 - 0.1, statics, false);
  for (const x of door) block(0.1, 2.65, 0.14, dark, x, 0, z0, statics, false);
  const name = F.sign('ROUTE 66 TRAVEL STOP\nFUEL · FOOD · FIREWORKS', { w: 9, h: 1.2, bg: '#1d3557', fg: '#ffd166', font: 'bold 64px system-ui', emissive: 1.1 });
  name.position.set(cx, 3.2, z0 - 0.13); name.rotation.y = Math.PI; live.add(name);
  const hours = F.sign('OPEN 24 HOURS', { w: 0.9, h: 0.25, bg: '#111', fg: '#ff3b30', font: 'bold 80px system-ui', emissive: 2 });
  hours.position.set(door[1] + 0.8, 2.1, z0 - 0.02); hours.rotation.y = Math.PI; live.add(hours);
  // Floor, ceiling, roof.
  const fl = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), floor); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, 0.012, (z0 + z1) / 2); fl.receiveShadow = true; statics.add(fl);
  const ce = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), ceiling); ce.rotation.x = Math.PI / 2; ce.position.set(cx, 3.0, (z0 + z1) / 2); statics.add(ce);
  block(x1 - x0 + 0.4, 0.2, z1 - z0 + 0.4, F.mat('#6f6a62'), cx, h, (z0 + z1) / 2, statics, false);
  // Fluorescent panels: the store is lit all night, which is the point of it.
  for (const x of [x0 + 4, cx, x1 - 4]) for (const z of [z0 + 2.8, z1 - 2.8]) {
    const p = new T.Mesh(new T.PlaneGeometry(1.2, 0.6), F.glow('#eef6ff', 1.6)); p.rotation.x = Math.PI / 2; p.position.set(x, 2.99, z); live.add(p);
  }
  for (const x of [x0 + 4, x1 - 4]) light(x, 2.8, (z0 + z1) / 2, '#eef6ff', 8, 10);
  world.zones.push({ name: 'travel stop', x0, x1, y0: -1, y1: 3.5, z0, z1, indoor: true });

  // Real fixtures (Grab3D, CC0): grocery shelving with end caps, glass-door coolers, the register, coffee and soda.
  const place = (id, opts, x, y, z, ry = 0) => { const m = lib.model(id, opts); m.position.set(x, y, z); m.rotation.y = ry; live.add(m); return m; };
  for (const x of [x0 + 4.2, x0 + 7.2]) {
    for (let k = 0; k < 3; k++) place('g3-grocery-shelf', { height: 1.8 }, x, 0, 117.7 + k * 1.24, Math.PI / 2);
    place('g3-end-cap-display', { height: 1.55 }, x, 0, 116.55, Math.PI);
    solid(x - 0.55, x + 0.55, 0, 1.8, 116.0, 121.0);
  }
  for (let i = 0; i < 6; i++) place('g3-upright-freezer', { height: 2.0 }, x0 + 0.95 + i * 0.86, 0, z1 - 0.58, Math.PI);
  solid(x0 + 0.4, x0 + 6.2, 0, 2.1, z1 - 1.05, z1 - 0.1);
  light(x0 + 3.5, 1.6, z1 - 1.6, '#dff3ff', 3, 4);
  world.interact.push({ pos: new T.Vector3(x0 + 3.5, 1.2, z1 - 1.3), r: 2.4, label: () => 'Cooler', use: () => game.vend('drinks') });
  // Coffee counter on the west wall: two brewers and a soda fountain.
  block(0.7, 0.95, 2.4, F.mat('#5b4636'), x0 + 0.5, 0, z0 + 2.2);
  for (const z of [z0 + 1.5, z0 + 2.1]) place('g3-coffee-machine', { height: 0.34 }, x0 + 0.5, 0.95, z, -Math.PI / 2);
  place('g3-soda-fountain', { height: 0.7 }, x0 + 0.5, 0.95, z0 + 2.95, -Math.PI / 2);
  world.interact.push({ pos: new T.Vector3(x0 + 0.6, 1.2, z0 + 2.2), r: 1.6, label: () => 'Coffee', use: () => { game.sound.pour(); game.say('The pot is full and scorched black, as if it had been on the burner since the store was built and had learned to wait.'); } });
  // The counter, east of the door, with a real register, a lottery sign and the radio you can almost hear.
  block(3.2, 1.0, 0.8, F.mat('#7a1f1f', { roughness: 0.7 }), x1 - 2.2, 0, z0 + 2.0);
  place('g3-cash-register', { height: 0.42 }, x1 - 2.6, 1.0, z0 + 2.0, 0);
  const lotto = F.sign('MISSOURI LOTTERY\nTONIGHT’S JACKPOT $4.2M', { w: 1.2, h: 0.4, bg: '#2b2d42', fg: '#ffd166', font: 'bold 60px system-ui', emissive: 0.6 });
  lotto.position.set(x1 - 2.2, 2.3, z0 + 2.9); lotto.rotation.y = Math.PI; live.add(lotto);
  block(2.6, 2.0, 0.35, F.mat('#4a3a2c'), x1 - 2.0, 0.9, z0 + 3.3, statics, false);
  world.interact.push({ pos: new T.Vector3(x1 - 2.2, 1.2, z0 + 1.4), r: 1.8, label: () => 'Counter', use: () => game.say('Nobody behind the counter. A radio plays in the back, too quiet to make out the words, though you know them. You have always known them.') });

  // ---------- outside the store ----------
  // The payphone: a booth on the east corner, its open side to the lot.
  const phoneX = x1 - 0.9, phoneZ = z0 - 0.66;
  place('g3-phone-booth', { height: 2.3 }, phoneX, 0, phoneZ, Math.PI);
  solid(phoneX - 0.55, phoneX + 0.55, 0, 2.3, phoneZ + 0.1, phoneZ + 0.55); solid(phoneX - 0.55, phoneX - 0.45, 0, 2.3, phoneZ - 0.5, phoneZ + 0.55); solid(phoneX + 0.45, phoneX + 0.55, 0, 2.3, phoneZ - 0.5, phoneZ + 0.55);
  world.interact.push({ pos: new T.Vector3(phoneX, 1.3, phoneZ - 0.2), r: 1.4, label: () => 'Payphone', use: () => { game.sound.synth.tone(350, 2.5, 0.05); game.sound.synth.tone(440, 2.5, 0.05); game.say('A dial tone, steady as a held breath. You still know one number by heart, although the person it belonged to has not answered it in years.'); } });
  // Ice chest and a newspaper box west of the door.
  place('g3-freezer-chest', { width: 1.6 }, x0 + 2.2, 0, z0 - 0.62, Math.PI); solid(x0 + 1.4, x0 + 3.0, 0, 0.95, z0 - 1.05, z0 - 0.15);
  const ice = F.sign('ICE', { w: 0.9, h: 0.35, bg: '#ffffff', fg: '#1d6fb8', font: 'bold 160px system-ui' }); ice.position.set(x0 + 2.2, 1.45, z0 - 0.115); ice.rotation.y = Math.PI; live.add(ice);
  place('g3-newspaper-stand', { height: 1.0 }, door[0] - 1.0, 0, z0 - 0.4, Math.PI); solid(door[0] - 1.28, door[0] - 0.72, 0, 1, z0 - 0.66, z0 - 0.12);
  world.interact.push({ pos: new T.Vector3(door[0] - 1.0, 1.0, z0 - 0.75), r: 1.2, label: () => 'Newspaper box', use: () => game.say('The Joplin Globe. The window is fogged from the inside, as if the newspaper were breathing, and you cannot read the date.') });
  const vend = lib.model('g3-vending-machine', { height: 1.85, rotate: Math.PI }); vend.position.set(x1 - 2.4, 0, z0 - 0.55); live.add(vend); solid(x1 - 2.9, x1 - 1.9, 0, 1.9, z0 - 1, z0 - 0.1);
  place('g3-trash-can', { height: 0.9 }, door[1] + 0.7, 0, z0 - 0.45);

  // ---------- pump canopy ----------
  const cz = 104;
  block(18, 0.7, 9, white, cx, 4.9, cz, statics, false);
  const stripe = new T.Mesh(new T.PlaneGeometry(18, 0.5), F.glow('#e63946', 1.4)); stripe.position.set(cx, 5.25, cz - 4.51); stripe.rotation.y = Math.PI; live.add(stripe);
  for (const x of [cx - 6, cx, cx + 6]) {
    block(4.2, 0.18, 1.3, F.mat('#bdb7aa'), x, 0, cz);                       // island
    block(0.35, 4.75, 0.35, white, x - 1.8, 0.18, cz, statics, false);       // columns
    block(0.35, 4.75, 0.35, white, x + 1.8, 0.18, cz, statics, false);
    place('g3-gas-pump', { height: 1.8 }, x, 0.18, cz, 0); solid(x - 0.7, x + 0.7, 0, 2, cz - 0.32, cz + 0.32);
    // The price, on a placard above each pump, from the wrong decade.
    for (const s of [-1, 1]) { const face = F.sign('REG 1.29', { w: 0.5, h: 0.18, bg: '#111', fg: '#7fff7f', font: 'bold 90px monospace', emissive: 1.2 }); face.position.set(x, 2.25, cz + s * 0.08); face.rotation.y = s > 0 ? 0 : Math.PI; live.add(face); }
    place('g3-trash-can', { height: 0.9 }, x + 1.4, 0.18, cz + 0.25);
    const under = new T.Mesh(new T.PlaneGeometry(2.4, 1.2), F.glow('#fff8ec', 2.2)); under.rotation.x = Math.PI / 2; under.position.set(x, 4.89, cz); live.add(under);
    world.interact.push({ pos: new T.Vector3(x, 1.2, cz - 0.6), r: 1.4, label: () => 'Pump', use: () => game.say('Regular, one twenty-nine a gallon. Nobody has paid that since you were a kid.') });
  }
  for (const x of [cx - 5, cx + 5]) light(x, 4.6, cz, '#fff4e0', 12, 14, true);
  // The price sign by the road, with prices from the wrong decade.
  block(0.4, 7, 0.4, steel, cx + 13, 0, 99, statics);
  const price = F.sign('ROUTE 66\nREGULAR 1.29\nDIESEL 1.19', { w: 2.6, h: 2.2, bg: '#1d3557', fg: '#ffd166', font: 'bold 90px system-ui', emissive: 0.9 });
  price.position.set(cx + 13, 7.4, 98.75); price.rotation.y = Math.PI; live.add(price);

  // Merge the static meshes per material: one draw call per material for the whole stop.
  statics.updateMatrixWorld(true);
  const byMat = new Map();
  statics.traverse(m => { if (m.isMesh) (byMat.get(m.material) ?? byMat.set(m.material, []).get(m.material)).push(m); });
  for (const [material, meshes] of byMat) {
    const geo = mergeGeometries(meshes.map(m => { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); return g.applyMatrix4(m.matrixWorld); }));
    const merged = new T.Mesh(geo, material); merged.castShadow = merged.receiveShadow = true; merged.name = 'Travel stop';
    scene.add(merged);
  }
  live.name = 'Travel stop details'; scene.add(live);
  return { center: new T.Vector3(cx, 0, (z0 + z1) / 2) };
}
