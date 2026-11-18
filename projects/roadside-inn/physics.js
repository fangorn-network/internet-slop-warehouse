// SPDX-License-Identifier: CC0-1.0
// Heartland Inn on the warehouse's physics-world part (Rapier). The world's hand-placed boxes and floors become
// colliders, the player a character controller, and props world.js tags `userData.loose` can be bumped, picked up
// and thrown. world.js itself doesn't change shape: games that don't load this (Late Checkout, Slopov II) still read
// colliders and surfaces the old way.
import * as T from 'three';
import { createWorld, attach, character } from '../../parts/physics-world.js';

const SLAB = 0.3;   // floor thickness under each walkable surface, metres

export async function createPhysics(scene, world, { spawn, radius = 0.28, height = 1.75, step = 0.45 }) {
  const pw = await createWorld(), R = pw.rapier;
  const fixed = pw.raw.createRigidBody(R.RigidBodyDesc.fixed());
  const box = (x0, x1, y0, y1, z0, z1) => R.ColliderDesc.cuboid(Math.max((x1 - x0) / 2, 0.005), Math.max((y1 - y0) / 2, 0.005), Math.max((z1 - z0) / 2, 0.005)).setTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

  // Walls and furniture: one fixed box each. Doors (on() says when they block) switch on and off.
  const switched = [];
  for (const c of world.colliders) {
    if (c.loose) continue;   // a loose prop's stand-in box: its own body replaces it
    const col = pw.raw.createCollider(box(c.x0, c.x1, c.y0, c.y1, c.z0, c.z1), fixed);
    if (c.on) switched.push([c, col]);
  }

  // Floors: a slab under each flat surface. A surface whose height is a function is a ramp (the stairs) or a moving
  // floor (the elevator): a convex hull through its corners, on a fixed body moved to follow the function (Rapier's
  // character controller barely walks on kinematic bodies; see physics-world's platform).
  const moving = [];
  for (const s of world.surfaces) {
    if (typeof s.y === 'number') { pw.raw.createCollider(box(s.x0, s.x1, s.y - SLAB, s.y, s.z0, s.z1), fixed); continue; }
    const corners = [[s.x0, s.z0], [s.x1, s.z0], [s.x1, s.z1], [s.x0, s.z1]], heights = () => corners.map(([x, z]) => s.y(x, z));
    const h0 = heights(), points = new Float32Array(corners.flatMap(([x, z], i) => [x, h0[i], z, x, h0[i] - SLAB, z]));
    const rb = pw.raw.createRigidBody(R.RigidBodyDesc.fixed());
    pw.raw.createCollider(R.ColliderDesc.convexHull(points), rb);
    const base = h0.reduce((a, b) => a + b) / 4;
    moving.push({ s, rb, offset: () => heights().reduce((a, b) => a + b) / 4 - base, last: 0 });
  }

  const me = character(pw, { position: [spawn.x, 0, spawn.z], radius, height, step });

  // Loose props: dynamic bodies shaped from their meshes. Streamed props arrive empty and are attached once filled.
  const loose = [], pending = [];
  scene.traverse(o => { if (o.userData.loose) pending.push(o); });
  const hasMesh = o => { let m = false; o.traverse(x => { m ||= !!x.isMesh; }); return m; };
  // A prop that starts inside a hand-placed box (pillows on a bench whose box covers the backrest) would be fired out
  // of it: it stays put as a fixed body instead, still solid, until its box is replaced by one shaped from the model.
  const boxes = world.colliders.filter(c => !c.loose && !c.on), bounds = new T.Box3(), DEEP = 0.04;
  const buried = o => { bounds.setFromObject(o).expandByScalar(-DEEP); return boxes.some(c => bounds.max.x > c.x0 && bounds.min.x < c.x1 && bounds.max.y > c.y0 && bounds.min.y < c.y1 && bounds.max.z > c.z0 && bounds.min.z < c.z1); };
  const pinned = [];
  function attachLoose() {
    for (let i = pending.length - 1; i >= 0; i--) {
      const o = pending[i];
      if (!hasMesh(o)) continue;
      pending.splice(i, 1);
      const { shape = 'hull', density = 0.5, carry = false } = o.userData.loose;
      if (buried(o)) { pinned.push(o.name || 'a prop'); attach(o, { world: pw, body: 'fixed', shape }); continue; }
      try { loose.push({ o, carry, b: attach(o, { world: pw, shape, density, friction: 0.7 }) }); }
      catch (e) { console.warn('physics: left', o.name || 'a prop', 'static:', e.message); }
    }
  }
  attachLoose();

  // Carrying: E on a small loose prop picks it up; E again throws it the way you're looking.
  let held = null;
  const SAY = { wetfloorsign: 'wet floor sign', 'bar chair round': 'bar stool' };   // part ids that don't read as words
  const ahead = new T.Vector3(), name = o => { const n = (o.name || 'it').replace(/^(ph|hotel|g3)-/, '').replace(/-0?\d+$/, '').replace(/-/g, ' '); return SAY[n] ?? n; };
  // The prompt aims at the prop's middle, not its origin on the floor, and follows it as it's knocked about.
  const targets = [];
  for (const l of loose.filter(l => l.carry)) {
    const mid = new T.Box3().setFromObject(l.o).getCenter(new T.Vector3()).sub(l.o.position).y, at = l.o.position.clone().setY(l.o.position.y + mid);
    targets.push([l, at, mid]);
    world.interact.push({ pos: at, r: 1.3, when: () => !held && l.b.body.isValid?.() !== false, label: () => `Pick up the ${name(l.o)}`, use: () => grab(l) });
  }
  world.interact.push({ pos: new T.Vector3(), r: 2, when: () => !!held, label: () => `Throw the ${name(held.o)}`, use: () => throwHeld() });   // pos follows the held prop
  const throwEntry = world.interact.at(-1);
  function grab(l) { held = l; l.b.grab(); me.ignore(l.b.collider); }
  let eye = null;   // the camera, from the last update: a throw goes where you're looking now, not last frame
  function throwHeld(speed = 5.5) {
    const l = held; held = null;
    eye?.getWorldDirection(ahead);
    l.b.release(ahead.clone().multiplyScalar(speed).add(new T.Vector3(0, 1.2, 0)).toArray());
    setTimeout(() => me.unignore(l.b.collider), 400);   // clear of the player before it can bump them
  }

  let attachClock = 0;
  return {
    world: pw, me, loose, pinned,
    get held() { return held; },
    /** Throw what's held, the way the camera looks. */
    throw: () => held && throwHeld(),
    /** Before the step: doors, moving floors, what the player carries. Then step, which moves the player. */
    update(dt, camera, feet) {
      eye = camera;
      for (const [c, col] of switched) col.setEnabled(c.on());
      for (const m of moving) {
        const off = m.offset(), d = off - m.last;
        if (d) {
          m.rb.setTranslation({ x: 0, y: off, z: 0 }, true);
          const f = feet, s = m.s;   // standing on it: ride along
          if (f.x > s.x0 && f.x < s.x1 && f.z > s.z0 && f.z < s.z1 && Math.abs(f.y - s.y(f.x, f.z) + d) < 0.35) me.ride(d);
          m.last = off;
        }
      }
      if (held) {
        camera.getWorldDirection(ahead);
        held.o.position.copy(camera.position).addScaledVector(ahead, 0.95).add(new T.Vector3(0, -0.3, 0));
        held.o.rotation.set(0, Math.atan2(ahead.x, ahead.z), 0);
        throwEntry.pos.copy(held.o.position);
      }
      for (const [l, at, mid] of targets) at.copy(l.o.position).y += mid;
      if (pending.length && (attachClock -= dt) <= 0) { attachClock = 1; attachLoose(); }
      pw.update(dt);
      for (let i = loose.length - 1; i >= 0; i--) if (loose[i].o.position.y < -30) { const [l] = loose.splice(i, 1); l.b.dispose(); l.o.visible = false; }   // fell out of the world: once
    },
  };
}
