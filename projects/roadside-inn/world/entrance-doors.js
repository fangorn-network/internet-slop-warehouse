// SPDX-License-Identifier: CC0-1.0
// The automatic entrance doors.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';

export function buildEntranceDoors(ctx) {
  const {
    scene, game, interact, updaters, solid, openableDoor, storefrontDoor, walkers,
  } = ctx;
  // ---------- automatic entrance doors ----------
  {
    const doorGlass = F.mat('#b9cfd8', { transparent: true, opacity: 0.28, roughness: 0.04, metalness: 0.2 });
    const frameM = F.mat('#2e3136', { metalness: 0.6, roughness: 0.35 });
    // the round vinyl decal every automatic slider carries: white disc, red ring, red lettering
    const caution = F.canvasTexture(256, 256, (g, W) => {
      g.clearRect(0, 0, W, W); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.fill();
      g.strokeStyle = '#c8102e'; g.lineWidth = 14; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 12, 0, 7); g.stroke();
      g.fillStyle = '#c8102e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 34px system-ui, sans-serif'; g.fillText('AUTOMATIC', W / 2, W * 0.32);
      g.font = 'bold 50px system-ui, sans-serif'; g.fillText('CAUTION', W / 2, W / 2);
      g.font = 'bold 34px system-ui, sans-serif'; g.fillText('DOOR', W / 2, W * 0.68);
    });
    // Hands push sliders that don't open fast enough: palm prints and finger dabs around the meeting edge at 0.9-1.4 m,
    // a child's lower down, and the arc of the last wipe. Faint haze, seen against the lot lights at night.
    const smudge = F.canvasTexture(256, 512, (g, W, H) => {
      g.clearRect(0, 0, W, H); let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      // greasy haze, not drawn hands: smeared ovals at odd angles where palms land, a few fingertip dots, nothing regular
      const smear = (x, y, rx, ry, rot, a) => { g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.6, `rgba(255,255,255,${a * 0.5})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore(); };
      const at = h => H * (1 - h / 2.5);   // metres up the 2.5 m leaf
      for (let i = 0; i < 14; i++) smear(W * (0.62 + r() * 0.34), at(0.9 + r() * 0.55), 16 + r() * 22, 8 + r() * 12, r() * 3, 0.08 + r() * 0.1);
      for (let i = 0; i < 18; i++) smear(W * (0.6 + r() * 0.38), at(1.0 + r() * 0.6), 3 + r() * 3, 2 + r() * 2, r() * 3, 0.12 + r() * 0.1);
      for (let i = 0; i < 4; i++) smear(W * (0.55 + r() * 0.35), at(0.5 + r() * 0.25), 10 + r() * 8, 6 + r() * 5, r() * 3, 0.08);   // a child's, lower
      g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 30; g.beginPath(); g.arc(W * 0.2, H * 0.62, W * 0.7, -0.9, 0.5); g.stroke();   // the last wipe
    });
    const smudgeMat = new T.MeshStandardMaterial({ map: smudge, color: '#dfe4e8', transparent: true, opacity: 0.8, roughness: 0.9, side: T.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const cautionMat = new T.MeshStandardMaterial({ map: caution, transparent: true, alphaTest: 0.5, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
    const leaves = [0, 1].map(i => {
      const g = new T.Group();
      F.box(1.5, 2.5, 0.04, doorGlass, 0, 0, 0, g);
      for (const x of [-0.73, 0.73]) F.box(0.04, 2.5, 0.06, frameM, x, 0, 0, g);
      F.box(1.5, 0.08, 0.06, frameM, 0, 0, 0, g); F.box(1.5, 0.08, 0.06, frameM, 0, 2.42, 0, g);
      // ANSI/BHMA A156.10: AUTOMATIC CAUTION DOOR on both faces, centred about 50 in (1.27 m) up
      for (const side of [1, -1]) { const h = new T.Mesh(new T.PlaneGeometry(1.42, 2.4), smudgeMat); h.position.set(0, 1.25, side * 0.0208); h.scale.x = i ? -1 : 1; h.renderOrder = 2; g.add(h); }   // prints toward the meeting edge (double-sided: a mirrored plane is culled otherwise)
      for (const side of [1, -1]) { const d = new T.Mesh(new T.PlaneGeometry(0.2, 0.2), cautionMat); d.position.set(0, 1.27, side * 0.0215); if (side < 0) d.rotation.y = Math.PI; g.add(d); }
      g.position.set(-2.75 + i * 1.5, 0, 9); scene.add(g); return g;
    });
    F.box(3.4, 0.25, 0.3, frameM, -2, 2.55, 9, scene);
    F.box(0.3, 0.06, 0.1, F.mat('#111'), -2, 2.5, 9.18, scene);   // motion sensor
    const st = { open: 0 };
    solid(-3.5, -0.5, 0, 2.6, 8.9, 9.1, () => st.open < 0.7);
    updaters.push((dt, t, player) => {
      const near = Math.abs(player.x + 2) < 2.4 && Math.abs(player.z - 9) < 3.2 && player.y < 1;
      const near2 = walkers.some(w => Math.abs(w.p.root.position.x + 2) < 2 && Math.abs(w.p.root.position.z - 9) < 2.6);
      const target = near || near2 ? 1 : 0;
      if (target && st.open === 0) game.sound.slide();
      st.open += Math.sign(target - st.open) * Math.min(Math.abs(target - st.open), dt * 1.4);
      leaves[0].position.x = -2.75 - st.open * 1.4; leaves[1].position.x = -1.25 + st.open * 1.4;
    });
  }
  // Pool door: needs the key card, swings into the pool room.
  {
    const d = storefrontDoor(1.2, 0.085); d.group.position.set(-12, 0, -2.4); d.group.rotation.y = Math.PI / 2; scene.add(d.group);   // aluminium storefront, glazed (Natasha, L7)
    const st = { open: false, angle: 0, timer: 0 };
    solid(-12.1, -11.9, 0, 2.2, -3, -1.8, () => st.angle < 1.1);
    interact.push({ pos: new T.Vector3(-11.6, 1.2, -2.4), r: 1.4, when: p => p.x > -12, label: () => game.has('key card') ? 'Pool door (tap key)' : 'Pool door', use: () => openPool() });
    interact.push({ pos: new T.Vector3(-12.6, 1.2, -2.4), r: 1.2, when: p => p.x < -12, label: () => 'Open door', use: () => { st.open = true; st.timer = 5; } });
    function openPool() {
      if (!game.has('key card')) { game.sound.beep(false); return game.say('“Pool access with room key.” The reader blinks red.'); }
      game.sound.beep(true); st.open = true; st.timer = 6;
    }
    updaters.push((dt, t, player) => {
      const inDoorway = player.y < 1 && Math.abs(player.x + 12) < 0.9 && player.z > -3.3 && player.z < -1.5;
      if (st.open) { st.timer -= dt; if (st.timer < 0 && !inDoorway) { st.open = false; game.sound.thud(); } }
      st.angle += Math.sign((st.open ? 1.45 : 0) - st.angle) * Math.min(Math.abs((st.open ? 1.45 : 0) - st.angle), dt * 2);
      d.leaf.rotation.y = st.angle;
    });
    const sgn = F.sign('POOL · HOT TUB', { w: 0.9, h: 0.18, bg: '#24303f', font: 'bold 60px system-ui, sans-serif' }); sgn.position.set(-11.885, 2.55, -2.4); sgn.rotation.y = Math.PI / 2; scene.add(sgn);
  }
}
