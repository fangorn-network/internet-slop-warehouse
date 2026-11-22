// SPDX-License-Identifier: CC0-1.0
// Outside: the lot, roads, the interstate and scenery (and the travel stop).
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';
import { buildStation } from '../station.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FLOOR2 } from '../world.js';

export function buildOutside(ctx) {
  const {
    scene, lib, game, outside, station, colliders, interact, updaters, lightAnchors, zones,
    add, loose, solid, trees, statics, outdoor, lawn, concrete, mbox, placeWindow,
    instances, dm,
  } = ctx;
  // ---------- outside: lot, roads, highway, scenery ----------
  let carLamps = null;
  if (outside) buildLot();
  function buildLot() {
    for (const [x0, x1, z0, z1] of [[-450, 450, 9, 450], [-450, 450, -450, -9], [-450, -24, -9, 9], [30, 450, -9, 9]]) {
      const g = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), lawn); g.rotation.x = -Math.PI / 2; g.position.set((x0 + x1) / 2, -0.02, (z0 + z1) / 2); g.receiveShadow = true;
      g.geometry.attributes.uv.array.forEach((v, i, a) => (a[i] = v * (i % 2 ? (z1 - z0) : (x1 - x0)) / 4));
      scene.add(g);
    }
    lawn.map.repeat.set(1, 1); lawn.normalMap.repeat.set(1, 1);
    const flat = (x0, x1, z0, z1, m, y = 0.005) => { const p = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), m); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); p.receiveShadow = true; scene.add(p); return p; };
    const lot = lib.surface('asphalt', { repeat: [95 / 6, 34 / 6], color: '#6d6d6d' }); flat(-45, 50, 10.6, 44.5, lot, 0.006);
    const side = mbox(66, 0.12, 1.6, concrete); side.position.set(3, 0.06 - 0.1, 9.9); scene.add(side);
    const backLot = lib.surface('asphalt', { repeat: [10, 3], color: '#6a6a6a' }); flat(-30, 36, -26, -10, backLot, 0.006);
    flat(30.5, 40, -26, 10.6, lib.surface('asphalt', { repeat: [2, 6], color: '#6a6a6a' }), 0.006);
    // Stall lines.
    const lineM = F.mat('#e9e7df', { roughness: 0.8 }), lines = [];
    for (const [z0, z1] of [[18, 23.5], [30.5, 36], [36, 41.5]]) for (let x = -42; x <= 47; x += 2.75) lines.push([x, (z0 + z1) / 2, 0.1, z1 - z0]);
    for (let x = -42; x <= 47; x += 2.75) lines.push([x, -20, 0.1, 5]);
    const lineMesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), lineM, lines.length);
    lines.forEach(([x, z, w, d], i) => { dm.position.set(x, 0.012, z); dm.rotation.set(-Math.PI / 2, 0, 0); dm.scale.set(w, d, 1); dm.updateMatrix(); lineMesh.setMatrixAt(i, dm.matrix); });
    scene.add(lineMesh);
    for (const z of [17.9, 41.6]) { const curb = mbox(90, 0.15, 0.3, concrete); curb.position.set(2, 0.075, z + (z > 30 ? 1.3 : -0.2)); scene.add(curb); }
    const accessible = F.sign('♿', { w: 1.2, h: 1.2, bg: '#1f5fbf', fg: '#ffffff', font: 'bold 300px system-ui' }); accessible.rotation.x = -Math.PI / 2; accessible.position.set(-4.6, 0.013, 21); scene.add(accessible);
    // Parked cars. Ours sits nearest the canopy.
    // Parked cars (Grab3D, front = +Z), nose-in. Ours sits nearest the canopy.
    const carIds = ['sedan', 'suv', 'pickup-truck', 'minivan', 'station-wagon', 'hatchback'].map(k => 'g3-1990s-' + k);
    const paints = ['#8f1d1d', '#e9e9e4', '#1f2d44', '#6b7277', '#151515', '#c8bfa9', '#2f4f3a', '#3c6e91', '#7a5c3e'];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const vehicle = (id, ry, paint) => {
      const car = lib.model(id, { rotate: ry });
      if (paint) car.traverse(n => { if (n.isMesh && /body_pbr|paint/.test(n.material.name)) { n.material = n.material.clone(); n.material.color.set(paint); } });
      return car;
    };
    // Parked cars are instanced per model (paint via instance color): ~40 draw calls instead of ~400.
    const parked = new Map();
    const park = (x, z, ry, id, paint = paints[Math.floor(rnd() * paints.length)]) => {
      (parked.get(id) ?? parked.set(id, []).get(id)).push({ m: at(x, z, ry), paint });
      solid(x - 1, x + 1, 0, 1.7, z - 2.5, z + 2.5);
    };
    const at = (x, z, ry = 0) => new T.Matrix4().compose(new T.Vector3(x, 0, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ry), new T.Vector3(1, 1, 1));
    for (let x = -40.6; x <= 46; x += 2.75) for (const [z, ry] of [[20.75, Math.PI], [33.25, 0], [38.75, Math.PI]]) {
      if (Math.abs(x - 1.6) < 1 && z === 20.75) continue;   // our spot
      if (rnd() < (Math.abs(x) < 20 ? 0.42 : 0.14)) park(x, z, ry + (rnd() - 0.5) * 0.06, carIds[Math.floor(rnd() * carIds.length)]);
    }
    for (let x = -26.6; x < 34; x += 2.75) if (rnd() < 0.25) park(x, -20, 0, carIds[Math.floor(rnd() * carIds.length)]);
    park(1.6, 20.75, Math.PI + 0.02, 'g3-1990s-station-wagon', '#3c6e91');
    for (const [id, cars] of parked) instances(id, cars.map(c => c.m), false, cars.map(c => c.paint), 'outside');
    interact.push({ pos: new T.Vector3(1.6, 1, 20.75), r: 2.8, label: () => 'Your car', use: () => game.say(game.has('key card') ? 'Everything you need is already in your bag. Room 212 awaits.' : 'Your car, ticking as it cools. Seven hours on I-62. Time to check in.') });
    // Parking lot lights.
    for (const [x, z] of [[-30, 27], [-10, 27], [10, 27], [30, 27], [-20, 42.5], [20, 42.5]]) {
      add(lightPole(), x, 0, z);
    }
    for (const [x, z] of [[0, 27], [-25, 27], [25, 27], [0, 40]]) outdoor.push(lightAnchors[lightAnchors.push({ pos: new T.Vector3(x, 7.6, z), color: new T.Color('#ffd59a'), intensity: 16, distance: 24, base: 16, outdoor: true }) - 1]);
    // Entrance bollards, a hydrant, the dumpster corral out back, a couple of cones.
    for (const x of [-4.4, -2.9, -1.1, 0.4]) { add(lib.model('g3-bollard'), x, 0, 11.3); solid(x - 0.12, x + 0.12, 0, 1, 11.18, 11.42); }
    add(lib.model('g3-fire-hydrant', { rotate: Math.PI }), 9.5, 0, 11.4);
    { const corral = F.mat('#8a8279', { roughness: 0.95 });
      for (const [w, d, x, z] of [[5, 0.2, 24, -26.5], [0.2, 2.6, 21.6, -25.3], [0.2, 2.6, 26.4, -25.3]]) { F.box(w, 1.8, d, corral, x, 0, z, scene); solid(x - w / 2, x + w / 2, 0, 1.8, z - d / 2, z + d / 2); }
      add(lib.model('g3-dumpster', { rotate: Math.PI, height: 1.5 }), 23, 0, -25.3); add(lib.model('g3-dumpster', { rotate: Math.PI, height: 1.5 }), 25, 0, -25.3); solid(21.7, 26.3, 0, 1.5, -26.3, -24.6);
      for (const [x, z] of [[28.5, -24], [29.4, -23.2], [-14, -12]]) loose(add(lib.model('g3-traffic-cone'), x, 0, z, rnd() * 3), { carry: true, density: 0.3 }); }
    // Landscaping islands along the facade.
    for (const [x0, x1] of [[-23, -7], [3, 29]]) {
      const bed = mbox(x1 - x0, 0.25, 1.4, F.mat('#5b4636', { roughness: 1 })); bed.position.set((x0 + x1) / 2, 0.02, 10.4); scene.add(bed);
      for (let x = x0 + 0.6; x < x1; x += 1.9) add(lib.model('ph-shrub-03', { height: 0.55 + rnd() * 0.25 }), x + rnd() * 0.3, 0.14, 10.4 + (rnd() - 0.5) * 0.6, rnd() * 6);
    }
    add(F.trashReceptacle(true), 2.9, 0, 11.2);
    // Frontage road, interstate (two carriageways), guard rails.
    const road = (z0, z1) => flat(-450, 450, z0, z1, lib.surface('asphalt', { repeat: [900 / 8, (z1 - z0) / 8], color: '#555555' }), 0.008);
    road(46, 53); road(62, 70); road(80, 88);
    flat(-3, 5, 44.5, 46, lib.surface('asphalt', { repeat: [1, 0.3], color: '#6d6d6d' }), 0.007);
    const dashes = [];
    for (let x = -450; x < 450; x += 12) dashes.push([x, 66], [x, 84], [x, 49.5]);
    const dashMesh = new T.InstancedMesh(new T.PlaneGeometry(3, 0.15), F.mat('#efeee6'), dashes.length);
    dashes.forEach(([x, z], i) => { dm.position.set(x, 0.013, z); dm.rotation.set(-Math.PI / 2, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); dashMesh.setMatrixAt(i, dm.matrix); });
    scene.add(dashMesh);
    for (const z of [62.2, 69.8, 80.2, 87.8]) flat(-450, 450, z - 0.08, z + 0.08, F.mat(z === 69.8 || z === 80.2 ? '#e8c547' : '#efeee6'), 0.013);
    // Guard rails, utility poles with sagging lines, and street lights along the frontage road (instanced).
    // ponytail: detailed rail only where you can see it (|x| < 48); plain beam beyond. Widen if the view distance grows.
    const rails = []; for (let x = -48; x < 48; x += 4) rails.push(at(x, 60.6), at(x, 89.4, Math.PI));
    instances('g3-guard-rail', rails, false, null, 'outside');
    for (const z of [60.6, 89.4]) for (const [x0, x1] of [[-450, -50], [46, 450]]) { const r = mbox(x1 - x0, 0.32, 0.1, F.mat('#a9adb0', { metalness: 0.8, roughness: 0.4 })); r.position.set((x0 + x1) / 2, 0.6, z); scene.add(r); }
    const poleXs = []; for (let x = -220; x <= 220; x += 44) poleXs.push(x);
    instances('g3-utility-pole', poleXs.map(x => at(x, 57, Math.PI / 2)), false, null, 'outside');
    const wire = new T.LineBasicMaterial({ color: '#1c1c1c' });
    for (const dz of [-1.05, 0, 1.05]) {
      const pts = [];
      for (let i = 0; i < poleXs.length - 1; i++) for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new T.Vector3(poleXs[i] + t * 44, 9.55 - (dz === 0 ? 0.35 : 0) - Math.sin(t * Math.PI) * 0.9, 57 + dz)); }
      scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), wire));
    }
    instances('g3-street-light', [-60, -20, 20, 60].map(x => at(x, 45.2)), true, null, 'outside');
    // Traffic: cars and semis loop along the interstate and the frontage road (front = +Z, so face along X).
    const traffic = [];
    for (let i = 0; i < 22; i++) {
      const lane = [[64, 1, 31], [68, 1, 27], [82, -1, 31], [86, -1, 26], [51, -1, 15], [64.4, 1, 26]][i % 6];
      const semi = i % 6 === 5 || i === 3;
      const car = vehicle(semi ? 'g3-semi-truck' : carIds[i % carIds.length], lane[1] > 0 ? Math.PI / 2 : -Math.PI / 2, semi ? null : paints[i % paints.length]);
      car.traverse(n => (n.castShadow = false));
      scene.add(car);
      traffic.push({ car, z: semi && lane[1] > 0 ? 64 : semi ? 86 : lane[0], dir: lane[1], speed: (semi ? 26 : lane[2]) * (0.9 + (i % 4) * 0.06), x: -450 + i * 41 });
    }
    // Head and tail lights after dusk: one Points cloud of soft glows (a single draw call for the whole interstate).
    const glow = F.canvasTexture(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,255,255,.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    const lampPos = new Float32Array(traffic.length * 12), lampCol = new Float32Array(traffic.length * 12);
    for (const c of traffic) { const sz = new T.Box3().setFromObject(c.car).getSize(new T.Vector3()); c.hx = sz.x / 2; c.hz = sz.z / 2; c.ly = sz.y > 3 ? 1.1 : 0.7; }
    traffic.forEach((c, i) => [[1, 0.96, 0.82], [1, 0.96, 0.82], [1, 0.08, 0.04], [1, 0.08, 0.04]].forEach((col, k) => lampCol.set(col, i * 12 + k * 3)));
    const lampGeo = new T.BufferGeometry(); lampGeo.setAttribute('position', new T.BufferAttribute(lampPos, 3)); lampGeo.setAttribute('color', new T.BufferAttribute(lampCol, 3));
    carLamps = new T.Points(lampGeo, new T.PointsMaterial({ size: 1.5, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    carLamps.frustumCulled = false; scene.add(carLamps);
    updaters.push(dt => {
      for (const [i, c] of traffic.entries()) {
        c.x += c.dir * c.speed * dt; if (c.x > 450) c.x = -450; if (c.x < -450) c.x = 450; c.car.position.set(c.x, 0, c.z);
        if (!carLamps.visible) continue;
        const front = c.x + c.dir * (c.hx - 0.1), back = c.x - c.dir * (c.hx - 0.1), w = c.hz * 0.62;
        lampPos.set([front, c.ly, c.z - w, front, c.ly, c.z + w, back, c.ly, c.z - w, back, c.ly, c.z + w], i * 12);
      }
      if (carLamps.visible) lampGeo.attributes.position.needsUpdate = true;
    });
    game.traffic = traffic;
    // The pole sign by the frontage road.
    add(F.poleSign('HEARTLAND\nINN EXPRESS'), 34, 0, 45, 0);
    // The Route 66 Travel Stop across the interstate (station.js) and the billboard.
    if (station) buildStation(scene, lib, game, { colliders, interact, lightAnchors, zones });
    flat(-95, -45, 98, 130, lib.surface('asphalt', { repeat: [8, 5], color: '#6a6a6a' }), 0.007);
    for (const [x, z] of [[-60, 126], [-78.6, 126.5]]) add(vehicle('g3-semi-truck', Math.PI / 2), x, 0, z);   // ~20 m rigs: 18.6 m apart, they overlapped (check.mjs lint)
    const bb = new T.Group();
    for (const x of [-3, 3]) { const p = mbox(0.5, 8, 0.5, F.mat('#5a5f63')); p.position.set(x, 4, 0); bb.add(p); }
    const face = F.sign('CAVE TOURS\nEXIT 129 · OPEN DAILY', { w: 12, h: 4, bg: '#3a2416', fg: '#ffe8a3', font: 'bold 96px Georgia, serif', emissive: 0.4 }); face.position.set(0, 9.5, 0.3); bb.add(face);
    const bback = mbox(12.2, 4.2, 0.4, F.mat('#2d2d2d')); bback.position.set(0, 9.5, 0); bb.add(bback);
    bb.position.set(55, 0, 96); bb.rotation.y = Math.PI * 0.95; scene.add(bb);
    const tower2 = lib.model('municipal-water-tower', { height: 34 }); add(tower2, -190, 0, -160);
    // Tree lines and scattered hardwoods (instanced, original low-poly).
    let s2 = 3; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 360; i++) {
      const band = i % 3;
      const x = -420 + r2() * 840, z = band === 0 ? -70 - r2() * 60 : band === 1 ? 120 + r2() * 160 : (r2() < 0.5 ? -1 : 1) * (60 + r2() * 300);
      const zz = band === 2 ? -40 + r2() * 130 : z, xx = band === 2 ? (z > 0 ? 70 + r2() * 300 : -80 - r2() * 300) : x;
      if (Math.abs(zz - 75) < 20 && band !== 1) continue;
      trees.push([xx, zz, 0.7 + r2() * 0.9]);
    }
    plantTrees();
  }
  function lightPole() {
    const g = new T.Group(), grey = F.mat('#3b3f44', { metalness: 0.6, roughness: 0.4 });
    F.cyl(0.35, 0.4, 0.6, concrete, 0, 0, 0, g, 12);
    F.box(0.16, 7.6, 0.16, grey, 0, 0.6, 0, g);
    for (const s of [-1, 1]) {
      F.box(1.0, 0.08, 0.08, grey, s * 0.5, 8.0, 0, g);
      F.box(0.6, 0.14, 0.4, grey, s * 1.15, 7.95, 0, g);
      F.box(0.5, 0.02, 0.32, F.glow('#fff1d6', 2.5), s * 1.15, 7.94, 0, g);
    }
    return g;
  }
  function plantTrees() {
    const trunk = new T.InstancedMesh(new T.CylinderGeometry(0.18, 0.28, 4, 6), F.mat('#4a3a2c', { roughness: 1 }), trees.length);
    const crown = new T.InstancedMesh(new T.IcosahedronGeometry(3, 1), F.mat('#4f6b35', { roughness: 1, flatShading: true }), trees.length);
    trees.forEach(([x, z, s], i) => {
      dm.rotation.set(0, i, 0); dm.scale.setScalar(s); dm.position.set(x, 2 * s, z); dm.updateMatrix(); trunk.setMatrixAt(i, dm.matrix);
      dm.scale.set(s * (1 + (i % 3) * 0.15), s * (0.9 + (i % 4) * 0.12), s); dm.position.set(x, 5.2 * s, z); dm.updateMatrix(); crown.setMatrixAt(i, dm.matrix);
      crown.setColorAt(i, new T.Color().setHSL(0.22 + (i % 7) * 0.012, 0.35, 0.22 + (i % 5) * 0.025));
    });
    crown.castShadow = trunk.castShadow = true;
    scene.add(trunk, crown);
  }

  // Exterior windows (glass + interior drapes) for every guest-room window; room 212 got its own above.
  const backdrops = ['lit', null, null, 'lit', null];
  let k = 0;
  for (const x of [12, 16.5, 21, 25.5]) placeWindow(x + 2.25, 0.8, 8.95, 1.6, 1.5, Math.PI, { drapes: false, backdrop: backdrops[k++ % 5] ?? 'shut' });
  for (const x of [-12, -7.5, 1.5, 16.5, 21, 25.5]) placeWindow(x + 2.25, FLOOR2 + 0.75, 8.95, 1.6, 1.5, Math.PI, { drapes: false, backdrop: backdrops[k++ % 5] ?? 'shut' });
  for (const x of [-12, -7.5, -3, 1.5, 12, 16.5, 21, 25.5]) placeWindow(x + 2.25, FLOOR2 + 0.75, -8.95, 1.6, 1.5, 0, { drapes: false, backdrop: backdrops[k++ % 5] ?? 'shut' });
  for (const x of [18, 22, 26]) placeWindow(x + 2, 0.8, -8.95, 1.6, 1.5, 0, { drapes: false, backdrop: backdrops[k++ % 5] ?? 'shut' });
  // Storefront and pool glazing.
  const pane = (w, h, x, y, z, ry = 0) => { const p = new T.Mesh(new T.PlaneGeometry(w, h), F.glass()); p.position.set(x, y, z); p.rotation.y = ry; scene.add(p); };
  pane(6.6, 2.3, -7.7, 1.45, 9); pane(5.6, 2.3, 3.2, 1.45, 9);
  pane(3, 3.1, -21, 2.05, 9); pane(4, 3.1, -15.5, 2.05, 9); pane(8.5, 3.1, -18.25, 2.05, -9);
  pane(4, 3.1, -24, 2.05, -4, Math.PI / 2); pane(5, 3.1, -24, 2.05, 3.5, Math.PI / 2);
  pane(4, 1.5, -2, 1.55, -9); pane(4, 1.2, 15, 1.8, -9);   // no pane at 3.5: the coffee bar's wall is solid
  pane(1.6, 1.5, 9.25, 1.55, 8.95); pane(1.6, 1.2, 7.5, FLOOR2 + 1.5, 8.95); pane(1.6, 1.2, 10.5, FLOOR2 + 1.5, 8.95);
  pane(1.2, 1.0, 10.8, FLOOR2 + 1.7, -8.95);
  for (const [y, h] of [[1.55, 1.5], [4.75, 1.5]]) pane(1.2, h, 30, y, 0, Math.PI / 2);
  pane(1.2, 1.5, -12, FLOOR2 + 1.55, 0, Math.PI / 2);
  // Mullions on the storefront.
  for (const x of [-11, -8.8, -6.6, -4.4, 0.4, 2.3, 4.2, 6]) F.box(0.06, 2.3, 0.1, F.mat('#2e3136', { metalness: 0.6 }), x, 0.3, 9, scene);

  // ponytail: merge static walls/slabs per material (~2000 → a few hundred draw calls); split by area if culling ever matters.
  const byMaterial = new Map();
  for (const m of statics) { m.updateMatrixWorld(true); (byMaterial.get(m.material) ?? byMaterial.set(m.material, []).get(m.material)).push(m); }
  for (const [material, meshes] of byMaterial) {
    if (meshes.length < 2) continue;
    const merged = new T.Mesh(mergeGeometries(meshes.map(m => m.geometry.clone().applyMatrix4(m.matrixWorld))), material);
    merged.castShadow = meshes.some(m => m.castShadow); merged.receiveShadow = true;
    meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    scene.add(merged);
  }
  Object.assign(ctx, { carLamps });
}
