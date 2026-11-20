// SPDX-License-Identifier: CC0-1.0
// The Heartland's first-person player, shared by every game built on the hotel (Heartland Inn, Late Checkout).
// Physics (physics.js, Rapier) when it loads: a capsule that slides along walls, climbs the stairs, rides the elevator
// and shoves, carries and throws loose props. When it doesn't load (offline, a blocked CDN), the boxes-and-floors walker.
// Footsteps and head bob either way.
import * as T from 'three';
import { createPhysics } from './physics.js';

export const RADIUS = 0.28, EYE = 1.62, STEP = 0.45;

/**
 * → { player, physics, move(dt, controls, camera), use(), zone() }
 * player: { x, y, z (feet), pos (body centre), stride }. Write x/y/z to teleport (games' scripted moves do).
 * use(): call first when E is pressed; true means it handled it (threw what you were carrying).
 * zone(): the world zone the player stands in.
 */
export async function createPlayer(scene, world, { sound }) {
  const player = { x: world.spawn.x, y: 0, z: world.spawn.z, vy: 0, pos: new T.Vector3(), stride: 0 };
  let phys = null;
  try { phys = await createPhysics(scene, world, { spawn: world.spawn, radius: RADIUS, height: 1.75, step: STEP, sound }); }
  catch (e) { console.warn('physics off, walking the old way:', e.message); }
  const synced = { x: player.x, y: player.y, z: player.z };   // where physics last put the player

  // The walker without physics: push out of the world's boxes, stand on the highest floor within a step.
  function collide(axis, delta) {
    const lo = player.y + 0.3, hi = player.y + 1.75;
    for (const c of world.colliders) {
      if (c.on && !c.on()) continue;
      if (c.y1 <= lo || c.y0 >= hi) continue;
      if (player.x + RADIUS <= c.x0 || player.x - RADIUS >= c.x1 || player.z + RADIUS <= c.z0 || player.z - RADIUS >= c.z1) continue;
      // Push back against the direction of travel; with no travel (a door closing on you, a teleport), take the shortest way out.
      const minSide = axis === 'x' ? c.x0 - RADIUS - 1e-4 : c.z0 - RADIUS - 1e-4, maxSide = axis === 'x' ? c.x1 + RADIUS + 1e-4 : c.z1 + RADIUS + 1e-4;
      const at = axis === 'x' ? player.x : player.z;
      const next = delta > 0 ? minSide : delta < 0 ? maxSide : (at - minSide < maxSide - at ? minSide : maxSide);
      if (axis === 'x') player.x = next; else player.z = next;
    }
  }
  function groundHeight() {
    let best = -Infinity;
    for (const s of world.surfaces) {
      if (player.x < s.x0 || player.x > s.x1 || player.z < s.z0 || player.z > s.z1) continue;
      const h = typeof s.y === 'function' ? s.y(player.x, player.z) : s.y;
      if (h <= player.y + STEP && h > best) best = h;
    }
    return best;
  }
  const zone = () => world.zones.find(z => player.x >= z.x0 && player.x <= z.x1 && player.z >= z.z0 && player.z <= z.z1 && player.y >= z.y0 && player.y <= z.y1);

  function move(dt, controls, camera) {
    const input = controls.input;
    const len = Math.hypot(input.x, input.z), speed = input.run ? 2.9 : 1.55;
    const dx = len ? input.x / Math.max(1, len) * speed * dt : 0, dz = len ? input.z / Math.max(1, len) * speed * dt : 0;
    let moved;
    if (phys) {
      // Anything that set player.x/y/z directly (a test hook, a scripted move) teleports the capsule.
      if (player.x !== synced.x || player.y !== synced.y || player.z !== synced.z) phys.me.teleport([player.x, player.y, player.z]);
      phys.me.walk(dt > 0 ? dx / dt : 0, dt > 0 ? dz / dt : 0);
      phys.update(dt, camera, phys.me.position);
      const p = phys.me.position;
      moved = Math.hypot(p.x - player.x, p.z - player.z);
      Object.assign(player, { x: p.x, y: p.y, z: p.z }); Object.assign(synced, { x: p.x, y: p.y, z: p.z });
    } else {
      player.x += dx; collide('x', dx);
      player.z += dz; collide('z', dz);
      const h = groundHeight();
      if (h >= player.y - 0.02) { player.y = h; player.vy = 0; }
      else { player.vy -= 9.8 * dt; player.y = Math.max(h, player.y + player.vy * dt); if (player.y === h) player.vy = 0; }
      moved = Math.hypot(dx, dz);
    }
    player.stride += moved;
    if (player.stride > (input.run ? 0.95 : 0.72)) { player.stride = 0; const z = zone()?.name; sound.step(z === 'room' || z === 'corridor'); }
    player.pos.set(player.x, player.y + 1.0, player.z);
    const bob = len ? Math.sin(performance.now() / (input.run ? 120 : 170)) * 0.018 : 0;
    camera.position.set(player.x, player.y + EYE + bob, player.z);
    camera.rotation.set(input.pitch, input.yaw, 0);
  }

  // Carrying something: E or a click throws it, whatever else is in view.
  const use = () => { if (!phys?.held) return false; phys.throw(); return true; };
  return { player, physics: phys, move, use, zone };
}
