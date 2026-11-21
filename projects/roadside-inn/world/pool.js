// SPDX-License-Identifier: CC0-1.0
// The pool wing: pool and hot tub, deck furniture, signage.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';

export function buildPool(ctx) {
  const {
    scene, lib, game, interact, updaters, add, loose, solid, light, poolTile, slab, wall, openableDoor, storefrontDoor, equipDoor,
  } = ctx;
  // ---------- pool wing ----------
  {
    const basin = (x0, x1, z0, z1, depth) => {
      slab(x0, x1, z0, z1, -depth, poolTile, 0.1);
      wall('x', z0, x0, x1, -depth, depth, poolTile, { t: 0.05, collide: false });
      wall('x', z1, x0, x1, -depth, depth, poolTile, { t: 0.05, collide: false });
      wall('z', x0, z0, z1, -depth, depth, poolTile, { t: 0.05, collide: false });
      wall('z', x1, z0, z1, -depth, depth, poolTile, { t: 0.05, collide: false });
      const coping = F.mat('#f1ece2', { roughness: 0.6 });
      for (const [w, d, x, z] of [[x1 - x0 + 0.5, 0.25, (x0 + x1) / 2, z0 - 0.12], [x1 - x0 + 0.5, 0.25, (x0 + x1) / 2, z1 + 0.12], [0.25, z1 - z0, x0 - 0.12, (z0 + z1) / 2], [0.25, z1 - z0, x1 + 0.12, (z0 + z1) / 2]]) F.box(w, 0.04, d, coping, x, 0.0, z, scene);
      const band = new T.Mesh(new T.PlaneGeometry(x1 - x0, 0.12), F.mat('#1f4f8a')); band.position.set((x0 + x1) / 2, -0.12, z0 + 0.03); scene.add(band);
    };
    basin(-21, -16, -7, 3, 1.6);
    basin(-15.2, -12.8, 4.6, 7, 0.9);
    const water = waterSurface(5, 10, 0.22); water.position.set(-18.5, -0.14, -2); scene.add(water);
    const tub = waterSurface(2.4, 2.4, 0.5, '#7fd8e8'); tub.position.set(-14, -0.12, 5.8); scene.add(tub);
    const poolLight = new T.PointLight('#5fd6ff', 6, 7); poolLight.position.set(-18.5, -0.8, -2); scene.add(poolLight);
    const bubbles = new T.InstancedMesh(new T.SphereGeometry(0.03, 6, 4), F.mat('#ffffff', { roughness: 0.3, transparent: true, opacity: 0.7 }), 60);
    scene.add(bubbles);
    const bm = new T.Object3D(), seeds = Array.from({ length: 60 }, () => [Math.random() * 2.2 - 1.1, Math.random() * 2.2 - 1.1, Math.random()]);
    updaters.push((dt, t) => {
      water.material.normalMap.offset.set(t * 0.02, t * 0.013);
      tub.material.normalMap.offset.set(t * 0.18, -t * 0.11);
      seeds.forEach(([x, z, p], i) => { const k = (t * 0.8 + p) % 1; bm.position.set(-14 + x, -0.12 + Math.sin(k * Math.PI) * 0.03, 5.8 + z); bm.scale.setScalar(0.5 + k); bm.updateMatrix(); bubbles.setMatrixAt(i, bm.matrix); });
      bubbles.instanceMatrix.needsUpdate = true;
    });
    // Blender rails reach toward -Z (three) into the water; rotate so they hang over each pool edge.
    for (const [x, z, ry] of [[-16.3, -6.2, Math.PI / 2], [-20.7, 2.4, -Math.PI / 2], [-13.1, 6.6, Math.PI / 2]]) add(lib.model('hotel-pool-rail', { origin: true, rotate: ry }), x, 0, z);
    for (let i = 0; i < 4; i++) { add(lib.model('hotel-pool-chaise', { origin: true, rotate: Math.PI / 2 }), -23.0, 0, -6 + i * 2.6); solid(-23.6, -22.4, 0, 0.6, -6.5 + i * 2.6, -5.5 + i * 2.6); }
    for (const z of [6.5, 8]) loose(add(lib.model('ph-modern-arm-chair-01', { height: 0.85 }), -20 + (z - 6.5) * 2, 0, z, Math.PI), { shape: 'box', density: 0.5 });   // a hull on its uneven legs rocks and walks
    loose(add(lib.model('ph-wetfloorsign-01', { height: 0.63 }), -15.4, 0, -4, 0.6), { carry: true, density: 0.25 });
    add(lib.model('ph-lifebuoy', { height: 0.8 }), -18.5, 1.6, -8.8);
    add(lib.model('ph-wall-clock', { height: 0.4 }), -12.15, 3.2, -6, -Math.PI / 2);
    loose(add(lib.model('ph-potted-plant-04', { height: 0.35 }), -20, 0.45, 7.2), { carry: true, shape: 'box', density: 0.6 });
    const rules = F.sign('POOL RULES\nNo lifeguard on duty · Swim at your own risk\nPool hours 6 AM – 10 PM · No diving\nChildren must be supervised · No glass', { w: 1.3, h: 0.9, bg: '#f6f6f2', fg: '#1d3557', font: '600 32px system-ui, sans-serif' });
    rules.position.set(-12.08, 1.7, -7.6); rules.rotation.y = -Math.PI / 2; scene.add(rules);   // east wall, read on the way in from the pool corridor
    for (const [txt, x, z] of [['3 FT', -18.5, 3.1], ['5 FT', -18.5, -7.1], ['NO DIVING', -16.4, -2]]) {
      const s = F.sign(txt, { w: 0.6, h: 0.18, bg: '#f1ece2', fg: '#1f2a44', font: 'bold 70px system-ui, sans-serif' });
      s.rotation.x = -Math.PI / 2; s.position.set(x, 0.045, z + (z > 0 ? 0.3 : z < -6 ? -0.3 : 0)); if (txt === 'NO DIVING') s.position.x = -15.6, s.rotation.z = Math.PI / 2; scene.add(s);
    }
    light(-18, 4.0, -4, '#eaf6ff', 14, 12); light(-18, 4.0, 5, '#eaf6ff', 14, 12);
  }

  // ---------- pool corridor doors and signs (briefs/natasha-pool-plan.md) ----------
  // Key-card glass door from the pool corridor (reader on the corridor side, push from the pool), like the lobby's.
  {
    const d = storefrontDoor(1.0, 0.18, -1); d.group.position.set(-13.15, 0, -9); d.group.rotation.y = Math.PI; scene.add(d.group);   // aluminium storefront (L7)
    const st = { open: false, angle: 0, timer: 0 };
    solid(-13.65, -12.65, 0, 2.2, -9.08, -8.92, () => st.angle < 1.1);
    interact.push({ pos: new T.Vector3(-13.15, 1.2, -9.5), r: 1.4, when: p => p.z < -9, label: () => game.has('key card') ? 'Pool door (tap key)' : 'Pool door',
      use: () => { if (!game.has('key card')) { game.sound.beep(false); return game.say('“Pool access with room key.” The reader blinks red.'); } game.sound.beep(true); st.open = true; st.timer = 6; } });
    interact.push({ pos: new T.Vector3(-13.15, 1.2, -8.5), r: 1.2, when: p => p.z > -9, label: () => 'Open door', use: () => { st.open = true; st.timer = 5; } });
    updaters.push((dt, t, player) => {
      const inDoorway = player.y < 1 && Math.abs(player.x + 13.15) < 0.9 && player.z > -9.9 && player.z < -7.9;
      if (st.open) { st.timer -= dt; if (st.timer < 0 && !inDoorway) { st.open = false; game.sound.thud(); } }
      const target = st.open ? 1.45 : 0;
      st.angle += Math.sign(target - st.angle) * Math.min(Math.abs(target - st.angle), dt * 2);
      d.leaf.rotation.y = st.angle;
    });
    const s = F.sign('POOL · HOT TUB\nRoom key required · 6 AM – 10 PM', { w: 0.9, h: 0.26, bg: '#24303f', font: 'bold 44px system-ui, sans-serif' });
    s.position.set(-11.9, 1.55, -9.19); s.rotation.y = Math.PI; scene.add(s);
  }
  // Pool equipment room behind the front desk: a plain steel door, locked. Empty inside until its plant is modelled
  // (briefs/victor-pool-equipment.md).
  {
    const cx = (equipDoor.a0 + equipDoor.a1) / 2, d = openableDoor('STAFF');
    d.group.position.set(cx, 0, -9.0); d.group.rotation.y = Math.PI; scene.add(d.group);
    d.group.getObjectByName('leaf').material = F.mat('#8d949b', { metalness: 0.4, roughness: 0.55 });   // painted hollow-metal
    const s = F.sign('POOL EQUIPMENT\nAUTHORIZED PERSONNEL ONLY', { w: 0.5, h: 0.2, bg: '#b3141a', font: 'bold 40px system-ui, sans-serif' });
    s.position.set(cx, 1.55, -9.215); s.rotation.y = Math.PI; scene.add(s);
    interact.push({ pos: new T.Vector3(cx, 1.2, -9.5), r: 1.2, label: () => 'Pool equipment room', use: () => game.say('Locked. Behind it a pump hums, and the door smells of chlorine.') });
  }
  add(lib.model('ph-korean-fire-extinguisher-01', { height: 0.6 }), 1.5, 0.9, -10.82);   // on the walkway's north wall, like the corridors'

  function waterSurface(w, d, strength, color = '#4fb6d4') {
    const size = 128, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
      const dx = Math.cos(u * 3 + v) * 0.5 + Math.cos(u * 7 - v * 2) * 0.3 + Math.cos(u * 2 + v * 5) * 0.2;
      const dy = Math.sin(v * 4 - u) * 0.5 + Math.sin(v * 6 + u * 3) * 0.3 + Math.cos(u * 5 + v * 2) * 0.2;
      const i = (y * size + x) * 4;
      data.set([128 + dx * 60, 128 + dy * 60, 255, 255], i);
    }
    const n = new T.DataTexture(data, size, size); n.wrapS = n.wrapT = T.RepeatWrapping; n.repeat.set(w / 2, d / 2); n.needsUpdate = true;
    const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ color, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.78, normalMap: n, normalScale: new T.Vector2(strength, strength) }));
    m.rotation.x = -Math.PI / 2;
    return m;
  }
}
