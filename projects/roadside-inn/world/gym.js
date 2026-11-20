// SPDX-License-Identifier: CC0-1.0
// The gym, seen through its glass wall.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import { economy } from '../quality.js';
import * as F from '../fixtures.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

export function buildGym(ctx) {
  const {
    scene, lib, game, interact, updaters, add, solid, light, openableDoor,
  } = ctx;
  // ---------- gym (seen through the glass) ----------
  for (const x of [14.6, 16.0]) add(lib.model('g3-treadmill', { width: 1.85, rotate: Math.PI / 2 }), x, 0, -6.4);
  add(lib.model('g3-exercise-bike', { height: 1.15, rotate: Math.PI / 2 }), 17.4, 0, -6.5);   // x 13.5..18 since the pool passage took its west strip
  add(lib.model('hotel-dumbbell-rack', { origin: true }), 15.0, 0, -8.6);
  // Gym mirror: a chrome plane reflects the environment map (a photo of another room, or the sky), so it showed the wrong
  // room. Desktop renders a real reflection while you stand where you can see it; phones get a dim mirror with no reflection.
  {
    const dim = new T.Mesh(new T.PlaneGeometry(4.2, 2), F.mat('#5d6266', { metalness: 0, roughness: 0.35 }));
    dim.material.envMapIntensity = 0; dim.position.set(15.75, 1.3, -8.84); scene.add(dim);
    if (!economy) {
      const real = new Reflector(new T.PlaneGeometry(4.2, 2), { textureWidth: 768, textureHeight: 366, color: 0xb8bcbf, clipBias: 0.003 });
      real.position.set(15.75, 1.3, -8.83); real.visible = false; scene.add(real);
      updaters.push((dt, t, p) => { real.visible = p.y < 2.5 && p.x > 9 && p.x < 21 && p.z > -9 && p.z < 2; dim.visible = !real.visible; });
    }
  }
  const gymTV = F.flatTV(1.1); add(gymTV.group, 17.85, 2.1, -5, -Math.PI / 2);
  const gymSign = F.sign('FITNESS CENTER\n5 AM – 11 PM · Room key required', { w: 1.2, h: 0.36, bg: '#24303f', font: 'bold 44px system-ui, sans-serif' });
  gymSign.position.set(15.2, 2.75, -0.885); scene.add(gymSign);
  add(lib.model('ph-korean-fire-extinguisher-01', { height: 0.6 }), 13.66, 0.9, -1.15);
  light(15.75, 2.6, -5, '#f4f8ff', 10, 8);
  // Gym door: glass, key card from the corridor, push from inside.
  {
    const d = openableDoor('GYM'); d.group.position.set(17.3, 0, -1); scene.add(d.group);
    d.group.getObjectByName('leaf').material = F.mat('#b9cfd8', { transparent: true, opacity: 0.35, roughness: 0.05 });
    const st = { open: false, angle: 0, timer: 0 };
    solid(16.8, 17.8, 0, 2.2, -1.08, -0.92, () => st.angle < 1.1);
    interact.push({ pos: new T.Vector3(17.3, 1.2, -0.75), r: 1.4, when: p => p.z > -1, label: () => game.has('key card') ? 'Gym door (tap key)' : 'Gym door',
      use: () => { if (!game.has('key card')) { game.sound.beep(false); return game.say('“Fitness center — room key required.”'); } game.sound.beep(true); st.open = true; st.timer = 6; } });
    interact.push({ pos: new T.Vector3(17.3, 1.2, -1.3), r: 1.2, when: p => p.z < -1, label: () => 'Open door', use: () => { st.open = true; st.timer = 5; } });
    updaters.push((dt, t, player) => {
      const inDoorway = player.y < 1 && player.x > 16.7 && player.x < 17.9 && player.z > -1.6 && player.z < -0.4;
      if (st.open) { st.timer -= dt; if (st.timer < 0 && !inDoorway) { st.open = false; game.sound.thud(); } }
      const target = st.open ? 1.45 : 0;
      st.angle += Math.sign(target - st.angle) * Math.min(Math.abs(target - st.angle), dt * 2);
      d.leaf.rotation.y = st.angle;
    });
    for (const x of [14.6, 16.0]) solid(x - 0.42, x + 0.42, 0, 1.4, -7.4, -5.4);
    solid(17.15, 17.65, 0, 1.2, -7.1, -5.9); solid(14.25, 15.75, 0, 0.9, -8.85, -8.35);
  }
  Object.assign(ctx, { gymTV });
}
