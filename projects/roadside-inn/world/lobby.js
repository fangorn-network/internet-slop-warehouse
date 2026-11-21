// SPDX-License-Identifier: CC0-1.0
// The lobby (Formula Blue): front desk pods, market, great room with TV and sectional, west living room, business center, communal table, and the lobby's atmosphere.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';
import { CEIL } from '../world.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function buildLobby(ctx) {
  const {
    scene, lib, game, interact, lightAnchors, add, loose, unboxed, takeables, solid,
    light, statics, drywall, charcoal, regionalMap, painting, mbox, dm, tableLamp, floorLamp, downlight,
  } = ctx;
  // Accent chairs: the reference lobbies mix mustard and heather grey in with the navy (same chair, its fabric recoloured).
  // (glTF keeps Blender's .001 suffix on material names, hence the prefix match.)
  const recolor = (g, hex) => { g.traverse(n => { if (n.isMesh && /^navy_fabric/.test(n.material.name)) { n.material = n.material.clone(); n.material.color.set(hex); } }); return g; };
  const MUSTARD = '#c9952e', HEATHER = '#a7abb1';
  // ---------- lobby: the Formula Blue prototype (current Holiday Inn Express) ----------
  // White, oak and navy; open check-in pods in front of a branded slat wall; the market beside them; a great room with
  // a sectional, the TV wall and a regional map; a bar-height communal table with power; an open business center.
  const cool = '#ffe8d2';                                  // about 3500 K: warm-white, not the old 2700 K amber
  // Ceiling light anchors sit just above the ceiling face, like the cans they stand for: the ceiling faces away and stays
  // a mid-value plane instead of a glowing one (at 2.1 m they lit it to 216/255). THROW makes up the longer drop.
  const DOWN = CEIL + 0.01, THROW = 1.45;
  // Check-in pods. Dana stands behind the right-hand one; the gaps are closed so guests stay on their side.
  for (const x of [-9.9, -7.65]) { add(lib.model('hotel-checkin-pod', { origin: true }), x, 0, -3.0); solid(x - 0.8, x + 0.8, 0, 1.1, -3.38, -2.54); }
  solid(-12, -10.7, 0, 1.2, -4.95, -3.1); solid(-9.1, -8.45, 0, 1.2, -3.4, -3.1);   // the east end stays open: you can walk round behind the desk
  // What's on the pods: Dana's working clutter (bell, apples, Wi-Fi card, keys) and the closed pod's "next agent" card.
  takeables(add(lib.model('hotel-desk-items', { origin: true }), -7.65, 0, -3.0)); takeables(add(lib.model('hotel-desk-closed', { origin: true }), -9.9, 0, -3.0));
  // Wastebaskets where guests actually drop things: by the business center, the communal table and the entry.
  for (const [x, z] of [[5.95, -1.6], [-3.55, -4.75], [0.15, 8.45]]) { add(lib.model('hotel-waste-bin', { origin: true }), x, 0, z, 0.1); solid(x - 0.17, x + 0.17, 0, 0.62, z - 0.17, z + 0.17); }
  // Linear LED pendant over the pods.
  { const bar = F.box(3.4, 0.05, 0.1, F.mat('#1b1d21', { roughness: 0.5 }), -8.8, 2.3, -3.0, scene); bar.name = 'Pod pendant';
    F.box(3.36, 0.006, 0.07, F.glow('#fff6ea', 2.6), -8.8, 2.296, -3.0, scene);
    for (const x of [-10.3, -7.3]) F.box(0.004, CEIL - 2.35, 0.004, F.mat('#222'), x, 2.35, -3.0, scene); }
  light(-8.8, DOWN, -2.2, cool, 12 * THROW, 9);

  // Branded feature wall: vertical oak slats on navy, the lit logo, and a flush screen that runs the weather.
  {
    const back = new T.Mesh(new T.PlaneGeometry(6.6, CEIL), F.mat('#13264a', { roughness: 0.9 })); back.position.set(-8.5, CEIL / 2, -4.925); scene.add(back);
    const slatGeo = new T.BoxGeometry(0.05, CEIL - 0.02, 0.035), n = 87;
    const slats = new T.InstancedMesh(slatGeo, lib.surface('oak', { repeat: [0.06, 1.4], grade: 'saturate(70%) brightness(1.1)', roughness: 1 }), n);
    for (let i = 0; i < n; i++) { dm.position.set(-11.72 + i * 0.075, CEIL / 2, -4.905); dm.rotation.set(0, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); slats.setMatrixAt(i, dm.matrix); }
    slats.receiveShadow = true; scene.add(slats); statics.push(slats);
    const logo = F.sign('Heartland Inn\nEXPRESS', { w: 2.0, h: 0.62, bg: '#0d2350', fg: '#ffffff', font: 'bold 104px Georgia, serif', emissive: 0.9 });
    logo.position.set(-9.9, 2.05, -4.86); scene.add(logo);
    F.box(2.1, 0.012, 0.06, F.glow('#9cc0ff', 2.2), -9.9, 2.40, -4.86, scene);        // wall-washer above the logo
  }
  const lobbyTV = F.flatTV(1.4); add(lobbyTV.group, -7.2, 2.1, -4.87);

  // Sundry market in the alcove on the office's east face, right beside the pods for the clerk to watch.
  add(lib.model('hotel-market-cooler', { origin: true }), -4.56, 0, -8.15, Math.PI / 2); solid(-5, -4.17, 0, 2.1, -8.85, -7.45);
  for (const z of [-6.85, -5.62]) { add(lib.model('hotel-market-shelf', { origin: true }), -4.71, 0, z, Math.PI / 2); solid(-5, -4.48, 0, 1.7, z - 0.6, z + 0.6); }
  { const s = F.sign('MARKET  ·  GRAB & GO', { w: 2.4, h: 0.28, bg: '#13264a', font: 'bold 64px system-ui, sans-serif', emissive: 0.4 }); s.rotation.y = Math.PI / 2; s.position.set(-4.92, 2.5, -7.0); scene.add(s); }
  light(-3.6, DOWN, -7.0, cool, 8 * THROW, 7);

  // Bar-height communal table with pop-up power, metal-and-vinyl stools; a ring pendant over it.
  add(lib.model('hotel-communal-table', { origin: true }), -1.7, 0, -5.4); solid(-3.3, -0.1, 0, 1.06, -5.85, -4.95);
  for (const dx of [-1.2, -0.4, 0.4, 1.2]) for (const [dz, ry] of [[-0.78, 0], [0.78, Math.PI]]) loose(add(lib.model('hotel-bar-stool', { origin: true }), -1.7 + dx, 0, -5.4 + dz, ry), { carry: true, density: 0.3 });
  light(-1.7, DOWN, -5.0, cool, 10 * THROW, 8);

  // Open business center in the semi-private corner by the corridor.
  add(lib.model('hotel-business-center', { origin: true }), 6.1, 0, -3.0, -Math.PI / 2); solid(5.75, 6.5, 0, 1.1, -3.98, -2.02);
  for (const [x, z] of [[5.5, -3.55], [5.35, -2.85]]) loose(add(lib.model('hotel-task-chair', { origin: true }), x, 0, z, Math.PI / 2 + (z + 3.2) * 0.4), { density: 0.4 });
  { const s = F.sign('BUSINESS CENTER', { w: 1.1, h: 0.18, bg: '#13264a', font: 'bold 54px system-ui, sans-serif' }); s.rotation.y = -Math.PI / 2; s.position.set(6.42, 2.3, -3.0); scene.add(s); }

  // Great room (SE): the TV on a navy panelled wall, an oversized regional map, a gray-and-navy sectional.
  const loungeTV = F.flatTV(2.1); add(loungeTV.group, 6.36, 1.95, 6.4, -Math.PI / 2);
  {
    const panel = mbox(0.04, 2.3, 4.2, F.mat('#1a3156', { roughness: 0.95 })); panel.position.set(6.41, 1.55, 6.4); scene.add(panel);
    for (let i = 1; i < 14; i++) F.box(0.005, 2.3, 0.012, F.mat('#0f2040', { roughness: 1 }), 6.388, 0.4, 4.3 + i * 0.3, scene);   // routed grooves
    const credenza = F.box(2.4, 0.5, 0.42, F.mat('#f2f1ee', { roughness: 0.4 }), 0, 0, 0); add(credenza, 6.21, 0, 6.4, -Math.PI / 2); solid(5.98, 6.5, 0, 0.55, 5.2, 7.6);
    add(regionalMap(), 6.43, 0, 2.65, -Math.PI / 2);   // map mural, z 1.10..4.20, y 0.12..2.93 (blender/art.py)
  }
  add(lib.model('hotel-sectional', { origin: true }), 2.2, 0, 6.4, Math.PI / 2); solid(1.72, 2.68, 0, 0.85, 4.97, 7.83); solid(2.68, 3.38, 0, 0.6, 4.97, 5.92);
  loose(add(lib.model('ph-coffee-table-round-01', { height: 0.42 }), 4.25, 0.01, 6.7), { density: 0.6, shape: 'cylinder' });   // on the carpet's top (y 0.01), as the floor collider now is   // a hull this round sinks what's set on it (physics-world)
  loose(recolor(add(lib.model('hotel-lounge-chair-navy', { origin: true }), 4.9, 0, 8.15, -2.7), MUSTARD), { density: 0.5 });
  loose(recolor(add(lib.model('hotel-lounge-chair-navy', { origin: true }), 4.6, 0, 4.15, -0.5), HEATHER), { density: 0.5 });
  tableLamp(2.25, 8.4, [2.0, 8.75]);   // cord to the floor box behind the sectional
  // No area rug: the seating stands on the striated carpet, as in the reference (the triangle rug read as a toy).
  // The cloud's downlights shine down from its face: the light sits just inside the cloud, so it can't light the cloud's own
  // underside (at 2.1 m it lit it from below like an uplight), scaled for the longer throw to the floor.
  light(3.6, CEIL - 0.005, 6.4, '#ffd6a8', 10 * ((CEIL - 0.32) / 2.1) ** 2, 10);   // 3000 K, in the lit panel's plane: shines down, never onto the coffer itself

  // West living room by the pool glass: gray sofa, navy chairs, ring pendant; a reading pair by the window.
  add(lib.model('hotel-lobby-sofa-2', { origin: true }), -9.9, 0, 5.3, Math.PI / 2); solid(-10.36, -9.44, 0, 0.84, 4.25, 6.35);   // cloth-simulated cushions, herringbone (blender/sofa.py)
  loose(recolor(add(lib.model('hotel-lounge-chair-navy', { origin: true }), -6.6, 0, 3.9, -Math.PI * 0.72), MUSTARD), { density: 0.5 });
  loose(add(lib.model('hotel-lounge-chair-navy', { origin: true }), -6.6, 0, 6.7, -Math.PI * 0.28), { density: 0.5 });
  loose(add(lib.model('ph-modern-coffee-table-01', { height: 0.4 }), -8.0, 0, 5.3), { density: 0.6, shape: 'box' });
  loose(add(lib.model('ph-potted-plant-04', { height: 0.3 }), -8.0, 0.4, 5.1), { carry: true, shape: 'box', density: 0.6 });
  solid(-8.4, -7.6, 0, 0.5, 4.7, 5.9);
  for (const [x, z, oz] of [[-10.35, 3.75, 3.35], [-10.35, 6.85, 7.25]]) { light(x, 1.45, z, '#ffd2a0', 6, 3.5); floorLamp(x, z, [-11.9, oz], lightAnchors.at(-1)); }   // 2700 K, a pool you can see; plugged into the wall behind (lamps.js)
  light(-8, DOWN, 5, cool, 9 * THROW, 8);
  loose(recolor(add(lib.model('hotel-lounge-chair-navy', { origin: true }), -10.9, 0, 1.4, Math.PI * 0.6), HEATHER), { density: 0.5 });
  loose(add(lib.model('hotel-lounge-chair-navy', { origin: true }), -9.2, 0, 1.0, -Math.PI * 0.75), { density: 0.5 });
  // The reading lamp by the desk: its cord runs to the west wall outlet, and its light follows it.
  light(-10.15, 1.2, 0.85, '#ffd2a0', 5, 3.2);
  tableLamp(-10.25, 0.45, [-11.875, 0.15], lightAnchors.at(-1));

  // Brochure rack and luggage cart near the entrance; a walk-off mat inside the doors.
  add(lib.model('hotel-brochure-rack', { origin: true }), -4.6, 0, 1.2, Math.PI / 2); solid(-4.78, -4.42, 0, 1.45, 1.02, 1.38);
  loose(add(lib.model('hotel-luggage-cart', { origin: true }), -5.0, 0, 6.3, 0.3), { density: 0.35 }); solid(-5.6, -4.4, 0, 2, -0.4 + 6.3, 0.4 + 6.3); unboxed();
  add(lib.model('hotel-entry-mat', { origin: true }), -2, 0.006, 8.1);
  light(-2, DOWN, 1.5, cool, 10 * THROW, 9);

  // Pantry (NE): coffee counter, vending, cooler, bar tables.
  takeables(add(lib.model('hotel-coffee-station', { origin: true }), 3.4, 0, -8.6)); solid(1.8, 5, 0, 1, -8.95, -8.25);
  add(lib.model('hotel-snack-vending', { origin: true, rotate: -Math.PI / 2 }), 6.0, 0, -6.6); solid(5.5, 6.5, 0, 2, -7.1, -6.1);
  add(lib.model('g3-vending-machine', { rotate: -Math.PI / 2, height: 1.85 }), 6.03, 0, -5.4); solid(5.55, 6.5, 0, 2, -5.88, -4.92);
  for (const [x, z] of [[2.5, -5.3]]) {
    add(lib.model('ph-round-wooden-table-01', { height: 1.0 }), x, 0, z);
    solid(x - 0.45, x + 0.45, 0, 1, z - 0.45, z + 0.45);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; loose(add(lib.model('hotel-bar-stool', { origin: true }), x + Math.cos(a) * 0.8, 0, z + Math.sin(a) * 0.8, -a - Math.PI / 2), { carry: true, density: 0.3 }); }
  }
  add(lib.model('hotel-waste-cabinet', { origin: true }), 1.32, 0, -8.6); solid(0.86, 1.78, 0, 0.95, -8.93, -8.27);
  add(lib.model('ph-wall-clock', { height: 0.4 }), 0.75, 1.9, -8.86);
  light(3.4, DOWN, -6, '#fff0d8', 10 * THROW, 8);
  const pantrySign = F.sign('THE PANTRY', { w: 1.6, h: 0.3, bg: '#2e4057', font: 'bold 80px system-ui, sans-serif' });
  pantrySign.position.set(3.4, 2.5, -8.865); scene.add(pantrySign);

  // Hot breakfast (mornings only) along the north windows.
  const bm = add(lib.model('hotel-breakfast-bar', { origin: true }), -2.2, 0, -8.5);
  const breakfast = { group: bm, waffleLight: bm.getObjectByName('waffle_light') }; solid(-3.95, -0.45, 0, 1, -8.9, -8.12);
  breakfast.group.visible = false;
  const breakfastSign = F.sign('Hot Breakfast · 6:00 – 9:30 AM', { w: 1.8, h: 0.22, bg: '#2e4057', font: '600 44px system-ui, sans-serif' });
  breakfastSign.position.set(-2.2, 2.45, -8.865); scene.add(breakfastSign);
  let waffleBusy = false;
  interact.push({ pos: new T.Vector3(-2.1, 1.1, -7.9), r: 1.3, when: () => breakfast.group.visible, label: () => game.has('waffle') ? 'Waffle maker' : 'Make a waffle',
    use: () => {
      if (waffleBusy) return game.say('It’s cooking. Don’t open it early. Everyone opens it early.');
      if (game.has('waffle')) return game.say('One waffle per guest is the honor system. You honor it.');
      waffleBusy = true; game.sound.hum(true); breakfast.waffleLight.material = F.glow('#ff3b30', 1.5);
      game.say('Batter in, lid closed, flip. The timer counts down from two minutes. You wait.');
      setTimeout(() => { waffleBusy = false; game.sound.hum(false); game.sound.beep(true); breakfast.waffleLight.material = F.glow('#57ff9a', 0.6); game.give('waffle'); game.say('A golden waffle, shaped like Missouri. It’s the state, not the… yes, the state.'); }, 7000);
    } });
  interact.push({ pos: new T.Vector3(-3.3, 1.1, -7.9), r: 1.1, when: () => breakfast.group.visible, label: () => 'Eggs & sausage',
    use: () => { if (game.has('breakfast plate')) return game.say('Your plate is already a structural achievement.'); game.give('breakfast plate'); game.say('Powdered eggs, two sausage links, a biscuit you didn’t mean to take.'); } });
  interact.push({ pos: new T.Vector3(-0.8, 1.2, -7.9), r: 1.1, when: () => breakfast.group.visible, label: () => 'Orange juice',
    use: () => { game.sound.pour(); game.give('orange juice'); game.say('“Orange drink.” Close enough.'); } });

  // ---------- lobby atmosphere ----------
  {
    // Floating coffer over the great room (reference: oak-banded soffits with a diffuse lit panel): an oak veneer fascia
    // 0.3 m deep, a white drywall return, and a warm (3000 K) luminous panel recessed above it, so light comes from the
    // coffer and not from a plank "floor" on the ceiling.
    {
      const cx = 3.6, cz = 6.4, W = 4.4, D = 4.0, H = 0.3, rim = 0.42, y0 = CEIL - H;
      const veneer = lib.surface('walnut', { repeat: [1.2, 1.2], color: '#f3d3a6', roughness: 0.75 });
      for (const [w, d, x, z] of [[W, 0.03, cx, cz - D / 2], [W, 0.03, cx, cz + D / 2], [0.03, D, cx - W / 2, cz], [0.03, D, cx + W / 2, cz]]) {
        const b = mbox(w, H, d, veneer); b.position.set(x, y0 + H / 2, z); scene.add(b);
      }
      const ret = F.mat('#efede8', { roughness: 0.9 });
      for (const [w, d, x, z] of [[W, rim, cx, cz - D / 2 + rim / 2], [W, rim, cx, cz + D / 2 - rim / 2], [rim, D - 2 * rim, cx - W / 2 + rim / 2, cz], [rim, D - 2 * rim, cx + W / 2 - rim / 2, cz]]) {
        const b = mbox(w, 0.02, d, ret); b.position.set(x, y0 + 0.01, z); scene.add(b);
      }
      const panel = new T.Mesh(new T.PlaneGeometry(W - 2 * rim, D - 2 * rim), F.mat('#fbf4ea', { roughness: 1, emissive: '#ffcf96', emissiveIntensity: 0.5 }));
      panel.rotation.x = Math.PI / 2; panel.position.set(cx, CEIL - 0.01, cz); panel.name = 'Coffer panel'; scene.add(panel);
    }
    // Ring pendants: over the communal table and the west seating.
    for (const [x, z, r] of [[-1.7, -5.4, 0.6], [-8.1, 5.3, 0.75]]) {
      const ring = new T.Mesh(new T.TorusGeometry(r, 0.022, 10, 72), F.mat('#1b1d21', { roughness: 0.4, metalness: 0.6 }));
      ring.rotation.x = Math.PI / 2; ring.position.set(x, 2.15, z); ring.name = 'Ring pendant'; scene.add(ring);
      const glow = new T.Mesh(new T.TorusGeometry(r, 0.012, 6, 72), F.glow('#fff6ea', 2.6)); glow.rotation.x = Math.PI / 2; glow.position.set(x, 2.13, z); scene.add(glow);
      for (let k = 0; k < 3; k++) { const a = k * 2.094; F.box(0.003, CEIL - 2.15, 0.003, F.mat('#222'), x + Math.cos(a) * r, 2.15, z + Math.sin(a) * r, scene); }
    }
    // Columns flanking the walk from the doors: white surround, a navy fabric-wrapped panel on each face with a nailhead
    // border (reference: Santa Clarita), charcoal base.
    {
      const fabric = lib.surface('linen', { repeat: [1 / 0.27, 1 / 0.27], color: '#2a3f86', normalScale: 1.2 });
      const nails = [], P = { w: 0.36, y0: 0.62, y1: CEIL - 0.42 };
      for (const x of [-5.2, 1.2]) {
        const c = mbox(0.55, CEIL, 0.55, drywall); c.position.set(x, CEIL / 2, 2.2); scene.add(c);
        solid(x - 0.28, x + 0.28, 0, CEIL, 1.92, 2.48);
        F.box(0.58, 0.1, 0.58, charcoal, x, 0, 2.2, scene);
        for (let f = 0; f < 4; f++) {
          const a = f * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a), ax = Math.cos(a), az = -Math.sin(a);
          const p = mbox(P.w, P.y1 - P.y0, 0.016, fabric); p.position.set(x + nx * 0.283, (P.y0 + P.y1) / 2, 2.2 + nz * 0.283); p.rotation.y = a; scene.add(p);
          for (let y = P.y0 + 0.04; y < P.y1 - 0.02; y += 0.16) for (const s of [-1, 1]) nails.push([x + nx * 0.292 + ax * s * (P.w / 2 - 0.025), y, 2.2 + nz * 0.292 + az * s * (P.w / 2 - 0.025)]);
        }
      }
      const nail = new T.InstancedMesh(new T.SphereGeometry(0.006, 6, 4), F.mat('#9a9590', { metalness: 0.9, roughness: 0.35 }), nails.length);
      nails.forEach((p, i) => { dm.position.set(...p); dm.rotation.set(0, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); nail.setMatrixAt(i, dm.matrix); });
      scene.add(nail);
    }
    // Recessed 4000 K downlights on a grid (one instanced draw call), clear of the oak cloud.
    {
      const spots = [];
      for (let x = -10.8; x <= 5.6; x += 1.8) for (let z = -7.8; z <= 7.8; z += 1.8) if (!(x > 1.3 && x < 5.9 && z > 4.3 && z < 8.5) && !(x < -5 && z < -5)) spots.push([x, z]);
      const can = new T.InstancedMesh(new T.CircleGeometry(0.09, 20), downlight, spots.length);
      spots.forEach(([x, z], i) => { dm.position.set(x, CEIL - 0.004, z); dm.rotation.set(Math.PI / 2, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); can.setMatrixAt(i, dm.matrix); });
      scene.add(can);
    }
    // Ceiling services: what every real lay-in or drywall ceiling carries and ours didn't. Square 4-way supply diffusers
    // (stepped louvre rings) each with the grey smudge halo the air stream leaves on the paint; two egg-crate returns;
    // pendant sprinklers in chrome escutcheons; smoked dome cameras over the desk, the doors and the market. Instanced:
    // about 10 draw calls for all of it.
    {
      const at = (geo, x, y, z) => geo.clone().translate(x, y, z), Y = CEIL;
      const frame = (s, w, h, y) => [[s, h, w, 0, (s - w) / 2], [s, h, w, 0, -(s - w) / 2], [w, h, s - 2 * w, (s - w) / 2, 0], [w, h, s - 2 * w, -(s - w) / 2, 0]].map(([a, b, c, x, z]) => new T.BoxGeometry(a, b, c).translate(x, y, z));
      const face = mergeGeometries([...frame(0.6, 0.04, 0.012, -0.006), ...[1, 2, 3].flatMap(k => frame(0.6 - k * 0.12, 0.034, 0.004, -0.012 - k * 0.007)), new T.BoxGeometry(0.17, 0.004, 0.17).translate(0, -0.036, 0)]);
      const throat = new T.PlaneGeometry(0.53, 0.53).rotateX(Math.PI / 2).translate(0, -0.004, 0);
      const diffusers = [];
      for (const x of [-9.9, -6.3, -2.7, 0.9, 4.5]) for (const z of [-6.9, -3.3, 0.3, 3.9, 7.5]) {
        const k = Math.round((x + 9.9) / 3.6) + Math.round((z + 6.9) / 3.6);
        if (k % 2 || (x > 1.3 && x < 5.9 && z > 4.3 && z < 8.5) || (x < -5 && z < -5)) continue;   // a checkerboard, clear of the coffer and the office
        diffusers.push([x, z]);
      }
      const inst = (geo, mat, list, y = Y) => { const m = new T.InstancedMesh(geo, mat, list.length); list.forEach(([x, z], i) => { dm.position.set(x, y, z); dm.rotation.set(0, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); }); scene.add(m); return m; };
      inst(face, F.mat('#eeede8', { roughness: 0.45 }), diffusers).name = 'Supply diffusers';
      inst(throat, F.mat('#5a5b5e', { roughness: 0.9 }), diffusers).name = 'Diffuser throats';
      // the smudge: darkest hard against the frame, fading out over ~25 cm, streaky along the four throws
      const halo = document.createElement('canvas'); halo.width = halo.height = 256; { const g = halo.getContext('2d'), S = 256, inner = S * 0.25, r = mulberry(5);
        for (let i = 0; i < 900; i++) { const side = i % 4, t = r() * 2 - 1, d = r() ** 2.2 * (S / 2 - inner), a = 0.05 * (1 - d / (S / 2 - inner));
          const along = S / 2 + t * inner * 1.05, out = S / 2 + (inner + d) * (side < 2 ? 1 : -1);
          g.fillStyle = `rgba(70,68,66,${a})`; side % 2 ? g.fillRect(out - 1, along - 6, 2, 12) : g.fillRect(along - 6, out - 1, 12, 2); } }
      const haloTex = new T.CanvasTexture(halo); haloTex.colorSpace = T.SRGBColorSpace;
      const haloGeo = mergeGeometries(diffusers.map(([x, z]) => new T.PlaneGeometry(1.2, 1.2).rotateX(Math.PI / 2).translate(x, Y - 0.002, z)));
      const halos = new T.Mesh(haloGeo, new T.MeshStandardMaterial({ map: haloTex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      halos.name = 'Diffuser smudge'; halos.renderOrder = 1; scene.add(halos);
      // egg-crate returns: a dark grid behind a white frame
      const grid = document.createElement('canvas'); grid.width = grid.height = 128; { const g = grid.getContext('2d'); g.fillStyle = '#1e1f21'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#d9d8d3'; for (let i = 0; i < 128; i += 4) { g.fillRect(i, 0, 1, 128); g.fillRect(0, i, 128, 1); } }
      const gridTex = new T.CanvasTexture(grid); gridTex.colorSpace = T.SRGBColorSpace;
      const returns = [[-0.9, -1.5], [-8.1, 1.2]];
      inst(new T.PlaneGeometry(0.56, 0.56).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ map: gridTex, roughness: 0.8 }), returns, Y - 0.003).name = 'Return grilles';
      inst(mergeGeometries(frame(0.6, 0.025, 0.01, -0.005)), F.mat('#eeede8', { roughness: 0.45 }), returns).name = 'Return frames';
      // pendant sprinklers on a ~3.6 m grid (NFPA 13 light hazard spacing), offset from the cans
      const sprink = mergeGeometries([new T.CylinderGeometry(0.03, 0.032, 0.006, 20).translate(0, -0.003, 0), new T.CylinderGeometry(0.007, 0.009, 0.03, 8).translate(0, -0.02, 0), new T.CylinderGeometry(0.014, 0.014, 0.002, 12).translate(0, -0.036, 0)]);
      const heads = []; for (let x = -9.9; x < 6; x += 3.6) for (let z = -5.1; z < 9; z += 3.6) if (!(x > 1.3 && x < 5.9 && z > 4.3 && z < 8.5) && !(x < -5 && z < -5)) heads.push([x + 0.9, z]);
      inst(sprink, F.mat('#c9c7c2', { roughness: 0.25, metalness: 0.9 }), heads).name = 'Sprinklers';
      // smoked dome cameras: over the desk, the doors and the market
      const dome = mergeGeometries([new T.CylinderGeometry(0.075, 0.075, 0.018, 24).translate(0, -0.009, 0)]), lens = new T.SphereGeometry(0.06, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, -0.018, 0);
      const cams = [[-8.2, -1.6], [-2.6, 7.2], [-3.9, -6.2]];
      inst(dome, F.mat('#efeee9', { roughness: 0.5 }), cams).name = 'Camera bases';
      inst(lens, new T.MeshStandardMaterial({ color: '#141518', roughness: 0.08, metalness: 0.2 }), cams).name = 'Camera domes';
    }
    // Black merchandising pegboard in an oak frame behind the coffee bar.
    add(lib.model('hotel-coffee-board', { origin: true }), 3.4, 0, -8.87);
    painting(-11.895, 1.8, -0.6, Math.PI / 2, 1.0, 0.75, 0);
    // Real potted plants (Poly Haven scans): tall ones in the corners, a bushier one beside the seating.
    for (const [x, z, id, h, ry] of [[-11.35, 8.35, 'ph-potted-plant-01', 1.55, 0.4], [5.95, 1.15, 'ph-potted-plant-02', 1.0, 1.2], [0.9, 8.35, 'ph-potted-plant-01', 1.4, 2.1],
      [-6.1, 8.35, 'ph-potted-plant-02', 1.0, -0.6], [-4.6, -4.4, 'ph-potted-plant-02', 0.95, 2.6], [6.0, 8.45, 'ph-potted-plant-01', 1.5, -1.1], [-11.35, -4.4, 'ph-potted-plant-01', 1.6, 0]]) {
      add(lib.model(id, { height: h }), x, 0, z, ry); solid(x - 0.28, x + 0.28, 0, 1, z - 0.28, z + 0.28);
    }
  }
  Object.assign(ctx, { lobbyTV, loungeTV, breakfast });
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
