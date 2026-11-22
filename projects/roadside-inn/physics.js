// SPDX-License-Identifier: CC0-1.0
// Heartland Inn on the warehouse's physics-world part (Rapier). The world's hand-placed boxes and floors become
// colliders, the player a character controller, and props world.js tags `userData.loose` can be bumped, picked up
// and thrown. world.js itself doesn't change shape: games that don't load this (Late Checkout, Slopov II) still read
// colliders and surfaces the old way.
import * as T from 'three';
import { createWorld, attach, character } from '../../parts/physics-world.js';

const SLAB = 0.3;   // floor thickness under each walkable surface, metres

// What things weigh, kg (by model id, or the noun a take_ item is renamed to). Before, mass came from density over the
// collider's volume in made-up units: a side table was 50 g, the same as the lamp on it, and a remote 0.08 g. With
// real weights a table outweighs what's on it, as it should. `low`: the centre of mass, metres above the object's
// origin, when the shape puts it wrong (a lamp's hull is mostly shade; its weight is in the base). A loose() tag's own
// `mass` wins; anything not listed keeps its density.
const KG = {
  'ph-side-table-01': 6, 'ph-coffee-table-round-01': 14, 'ph-modern-coffee-table-01': 18, 'hotel-lounge-chair-navy': 16,
  'hotel-task-chair': 13, 'hotel-bar-stool': 7, 'ph-modern-arm-chair-01': 9, 'hotel-luggage-cart-brass': 30,
  'ph-wetfloorsign-01': 1.1, 'g3-traffic-cone': 2.5, 'ph-potted-plant-04': 2.5,
  'hotel-table-lamp': { kg: 1.8, low: 0.08 }, 'hotel-tv-remote': 0.15, 'hotel-coffee-cup': 0.3, 'hotel-newspaper': 0.2,
  'hotel-floor-lamp': { kg: 6, low: 0.05 },   // a weighted iron base under a brass pole and a shade
  cookie: 0.04, creamer: 0.5, 'tea box': 0.3, pen: 0.01, 'tent card': 0.02, apple: 0.2, 'key card': 0.005, mug: 0.35,
  'registration card': 0.005, stapler: 0.25, brochure: 0.02, 'hotel-roller-bag': { kg: 4.5, low: 0.2 }, bible: 0.6,
};
// How a thing sits in your hand, turned from "its +Z away from you": the remote's IR window is its -Z end, so it pointed
// back at you (R12).
const HOLD_YAW = { 'hotel-tv-remote': Math.PI };
// What they're made of, for the sound they make when they land (sound.js impact). Unlisted: plastic.
const MADE = {
  wood: ['ph-side-table-01', 'ph-coffee-table-round-01', 'ph-modern-coffee-table-01', 'hotel-bar-stool', 'cookie', 'tea box'],
  ceramic: ['hotel-table-lamp', 'mug', 'ph-potted-plant-04'], metal: ['hotel-luggage-cart-brass', 'stapler', 'hotel-floor-lamp'],
  soft: ['hotel-roller-bag', 'hotel-lounge-chair-navy', 'ph-modern-arm-chair-01', 'hotel-task-chair', 'hotel-coffee-cup', 'apple', 'creamer'],
  paper: ['hotel-newspaper', 'brochure', 'bible', 'tent card', 'registration card'],
};
const made = n => Object.keys(MADE).find(k => MADE[k].includes(n)) ?? 'plastic';
// How fast you can throw something, m/s: a remote or a sign leaves the hand at 5.5, a 6 kg side table at about 3.
// ponytail: a curve through those two feels, not a model of an arm.
export const throwSpeed = kg => 5.5 * Math.min(1, Math.max(0.35, Math.sqrt(2 / kg)));
const weight = o => {
  const own = o.userData.loose?.mass, k = KG[o.name];
  if (own !== undefined) return { mass: own };
  if (k === undefined) return {};
  return typeof k === 'number' ? { mass: k } : { mass: k.kg, centerOfMass: [0, k.low, 0] };
};

export async function createPhysics(scene, world, { spawn, radius = 0.28, height = 1.75, step = 0.45, sound = null }) {
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
  // For the save (main.js): each prop by name and where it was built, and that starting pose to compare against.
  const byId = new Map();
  for (const o of pending) { let id = `${o.name}@${[o.position.x, o.position.y, o.position.z].map(v => v.toFixed(2))}`; while (byId.has(id)) id += '+'; byId.set(id, o); o.userData.saveId = id; o.userData.home = [o.position.clone(), o.quaternion.clone()]; }
  const hasMesh = o => { let m = false; o.traverse(x => { m ||= !!x.isMesh; }); return m; };
  // A prop that starts inside a hand-placed box (pillows on a bench whose box covers the backrest) would be fired out
  // of it: it stays put as a fixed body instead, still solid, until its box is replaced by one shaped from the model.
  const boxes = world.colliders.filter(c => !c.loose && !c.on), bounds = new T.Box3(), DEEP = 0.04;
  const buried = o => { bounds.setFromObject(o).expandByScalar(-DEEP); return boxes.some(c => bounds.max.x > c.x0 && bounds.min.x < c.x1 && bounds.max.y > c.y0 && bounds.min.y < c.y1 && bounds.max.z > c.z0 && bounds.min.z < c.z1); };
  const pinned = [];
  // Landing, bumping, being knocked over: sound.js scales it by the hit's energy and how far away you are.
  let eye = null;   // the camera, from the last update
  // and the residents hear it too (world.onImpact, set by main.js: game.hear turns heads toward a loud enough landing)
  const heard = (o, kg) => (sound?.impact || world.onImpact || world.spill) && (({ speed }) => {
    sound?.impact?.(made(o.name), kg(), speed, eye ? eye.position.distanceTo(o.position) : 0);
    world.onImpact?.(o.getWorldPosition(new T.Vector3()), 0.5 * kg() * speed * speed);
    world.spill?.(o, speed, eye?.position);   // a cup or creamer that lands hard leaves a puddle (lived-in.js)
  });

  // Carrying: E on a small loose prop picks it up; E again throws it the way you're looking. Each carriable prop gets
  // its prompt when it's attached, so props streamed in after the first frame (Late Checkout) can be picked up too.
  let held = null;
  const SAY = { wetfloorsign: 'wet floor sign', 'bar chair round': 'bar stool', 'desk lamp arm': 'desk lamp' };   // part ids that don't read as words
  const ahead = new T.Vector3(), to = new T.Vector3(), up = new T.Vector3(), still = new T.Vector3(), name = o => { const n = (o.name || 'it').replace(/^(ph|hotel|g3)-/, '').replace(/-0?\d+$/, '').replace(/-/g, ' '); return SAY[n] ?? n; };
  // The prompt aims at the prop's middle, not its origin on the floor, and follows it as it's knocked about.
  const targets = [];
  function offer(l) {
    const box = new T.Box3().setFromObject(l.o), mid = box.getCenter(new T.Vector3()).y - l.o.position.y, at = l.o.position.clone().setY(l.o.position.y + mid);
    const sz = box.getSize(new T.Vector3()); l.size = sz.length(); l.half = Math.max(sz.x, sz.z) / 2;   // half its footprint: how far to keep it off a wall
    targets.push([l, at, mid]);
    // small things want you close and looking right at them, or an apple on the counter steals the desk's "Check in"
    const small = l.size < 0.45;
    l.mid = mid;
    // only the top one of a pile: what's under something else stays put until what's on it is taken; nothing shut in a
    // drawer (loose.reachable, world/handling.js)
    const stack = l.o.userData.loose.stack;
    const covered = () => stack
      ? loose.some(r => !r.b && r.o.userData.loose.stack === stack && r.o.position.y > l.o.position.y)
      : l.riders?.some(r => !r.b && r.on === l);
    world.interact.push({ pos: at, r: small ? 0.85 : 1.3, precise: small, when: () => !held && loose.includes(l) && ((stack && l.b) || !covered()) && (l.o.userData.loose.reachable?.() ?? true), label: () => `Pick up the ${name(l.o)}`, use: () => grab(l) });
  }

  function attachLoose() {
    for (let i = pending.length - 1; i >= 0; i--) {
      const o = pending[i];
      if (!hasMesh(o)) continue;
      pending.splice(i, 1);
      const { shape = 'hull', density = 0.5, carry = false, rest = false } = o.userData.loose, w = weight(o);
      // Small things you can take (pens, cups, the remote) rest as plain models until picked up: a body on an
      // approximate counter box would be pinned or launched. They get one when taken, and fall like anything else.
      if (rest) { const l = { o, carry: true, b: null, spec: { shape, ...w } }; loose.push(l); offer(l); continue; }
      if (buried(o)) { pinned.push(o.name || 'a prop'); attach(o, { world: pw, body: 'fixed', shape }); continue; }
      let l;
      try { l = { o, carry, b: attach(o, { world: pw, shape, density, ...w, friction: 0.7, damping: 1, settle: 5, onContact: heard(o, () => l.b.body.mass()) }) }; }   // damping: chairs on uneven legs settle; settle: a stool on its side stops rolling
      catch (e) { console.warn('physics: left', o.name || 'a prop', 'static:', e.message); continue; }
      loose.push(l);
      if (carry) offer(l);
    }
    findSupports();
    if (wantHeld && !held) { const l = loose.find(l => l.o === wantHeld); if (l) { wantHeld = null; grab(l); } }
  }
  let wantHeld = null;   // restored as held but not streamed in yet
  // Things resting on a loose prop (the lamp on its side table, the remote on the coffee table, a paper on the one under
  // it) stay plain models and ride along when that prop moves, or fall off it (you picked the table up). Before, a lamp
  // bolted to its table came up with it, and a shoved coffee table left the remote floating in the air. The highest
  // surface under its middle wins (a paper on a paper on a table rests on the paper).
  const lb = new T.Box3(), sb = new T.Box3(), lc = new T.Vector3();
  function findSupports() {
    for (const l of loose) {
      if (l.b || l.on) continue;
      lb.setFromObject(l.o).getCenter(lc);
      let top = -Infinity;
      for (const s of loose) if (s !== l && (sb.setFromObject(s.o), lc.x > sb.min.x && lc.x < sb.max.x && lc.z > sb.min.z && lc.z < sb.max.z && sb.max.y - lb.min.y < 0.01 && lb.min.y - sb.max.y < 0.04 && sb.min.y < lb.min.y - 0.001 && sb.max.y > top)) { top = sb.max.y; l.on = s; }   // under it: a paper dropped beside the pile doesn't become the bottom one's support
      if (l.on) {
        (l.on.riders ??= []).push(l); l.on.o.updateMatrixWorld(); l.o.updateMatrixWorld(); l.from = l.on.o.position.clone(); l.rel = l.on.o.matrixWorld.clone().invert().multiply(l.o.matrixWorld); }   // where it sits, in its support's frame
    }
  }
  const speed = b => { const v = b.body.linvel(); return Math.hypot(v.x, v.y, v.z); };
  // Small things grip what they rest on (felt pads, rubber feet, a cup's damp ring): their friction wins over the
  // surface's, so a table stopping short under them doesn't leave them sliding.
  const GRIP = 0.9, grip = b => { b.collider.setFrictionCombineRule(R.CoefficientCombineRule.Max); return b; };
  const wake = l => { l.start ??= l.o.position.clone(); if (!l.b) l.b = grip(attach(l.o, { world: pw, shape: l.spec.shape, mass: l.spec.mass ?? 0.1, centerOfMass: l.spec.centerOfMass, friction: GRIP, damping: 1, settle: 5, onContact: heard(l.o, () => l.b.body.mass()) })); };
  attachLoose();

  world.interact.push({ pos: new T.Vector3(), r: 2, heldEntry: true, when: () => !!held, label: () => held ? `Throw the ${name(held.o)}` : 'Throw', use: () => throwHeld() });   // pos follows the held prop
  const throwEntry = world.interact.at(-1);
  function grab(l) {
    wake(l);
    held = l; l.b.grab(); me.ignore(l.b.collider);
    l.b.body.enableCcd(true);   // thrown, a remote covers 9 cm a step: more than its own thickness, most of a wall's
  }
  function throwHeld(speed = 5.5, up = 1.2, put = false) {
    const l = held; held = null;
    if (l.o.userData.loose.hold === 'roll') {   // stood up on its wheels and feet where it was, handle pushed down
      const yaw = Math.atan2(l.o.position.x - hold.x, l.o.position.z - hold.z); telescope(l, 0); l.trail = null;
      if (put) { l.o.quaternion.setFromAxisAngle(new T.Vector3(0, 1, 0), yaw); l.o.position.y = me.position.y + 0.005; l.b.body.setNextKinematicTranslation(l.o.position); l.b.body.setNextKinematicRotation(l.o.quaternion); l.b.body.setTranslation(l.o.position, true); l.b.body.setRotation(l.o.quaternion, true); l.b.release([0, 0, 0]); setTimeout(() => me.unignore(l.b.collider), 400); return; }
    }
    eye?.getWorldDirection(ahead);
    const k = put ? 1 : throwSpeed(l.b.body.mass()) / 5.5;
    l.b.release(ahead.clone().multiplyScalar(speed * k).add(new T.Vector3(0, up * k, 0)).toArray());
    setTimeout(() => me.unignore(l.b.collider), 400);   // clear of the player before it can bump them
  }
  // Put it down: let go just ahead of you with a little forward drift, so it lands where you were looking.
  const drop = () => held && throwHeld(0.6, 0.2, true);

  // A roller bag in hand rolls behind you on its wheels by its handle, like a trailer: the axle follows the hand at the
  // handle's length, so it swings round behind you as you turn and tilts back toward your hand. The handle (a node named
  // /handle/) telescopes out while you pull it and back in when you set it down. Cast: `grip` is where the hand goes.
  const hold = new T.Vector3(), axle = new T.Vector3(), fl = new T.Vector3(), rt = new T.Vector3(), yAx = new T.Vector3(), zAx = new T.Vector3(), xAx = new T.Vector3(), basis = new T.Matrix4();
  function roll(l, camera, feet) {
    const r = l.o.userData.loose.roll;   // { wheel: [x, y, z] axle in the bag's frame, handle: hold height when extended }
    camera.getWorldDirection(fl).setY(0).normalize(); rt.set(-fl.z, 0, fl.x);
    hold.copy(feet).addScaledVector(rt, 0.26).addScaledVector(fl, -0.08).setY(feet.y + Math.max(0.55, 0.8 - 0.35 * (1.62 - camera.position.y + feet.y) / 0.62));
    const reach = Math.hypot(r.handle - r.wheel[1], 0.01);
    if (!l.trail || l.trail.distanceTo(hold) > 2) l.trail = hold.clone().addScaledVector(fl, -0.6);
    const dx = l.trail.x - hold.x, dz = l.trail.z - hold.z, flat = Math.hypot(dx, dz) || 1, h = hold.y - feet.y - r.wheel[1], run = Math.sqrt(Math.max(0.01, reach * reach - h * h));
    axle.set(hold.x + dx / flat * run, feet.y + r.wheel[1], hold.z + dz / flat * run);
    // never through a wall: a fixed thing between you and the bag stops it short
    to.subVectors(axle, hold).setY(0); const far = to.length();
    const hit = far > 0.01 && pw.raw.castRay(new R.Ray({ x: hold.x, y: feet.y + 0.15, z: hold.z }, to.divideScalar(far)), far + 0.2, true, R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_SENSORS, undefined, me.collider);
    if (hit) axle.set(hold.x + to.x * Math.max(0.15, (hit.timeOfImpact ?? hit.toi) - 0.2), axle.y, hold.z + to.z * Math.max(0.15, (hit.timeOfImpact ?? hit.toi) - 0.2));
    l.trail.copy(axle);
    yAx.subVectors(hold, axle).normalize(); zAx.set(axle.x - hold.x, 0, axle.z - hold.z).normalize(); zAx.addScaledVector(yAx, -zAx.dot(yAx)).normalize(); xAx.crossVectors(yAx, zAx);
    basis.makeBasis(xAx, yAx, zAx); l.o.quaternion.setFromRotationMatrix(basis);
    l.o.position.copy(axle).sub(new T.Vector3(...r.wheel).applyQuaternion(l.o.quaternion));
    telescope(l, 1);
    throwEntry.pos.copy(hold);
  }
  const telescope = (l, out) => { const n = l.handle ??= (() => { let h = null; l.o.traverse(c => { if (!h && /handle/i.test(c.name)) h = c; }); return h ? { n: h, y: h.position.y } : false; })(); if (n) n.n.position.y = n.y + out * (l.o.userData.loose.roll.extend ?? 0.42); };
  // Pulling something by a cord: a rope from a loose prop to a point you move (the plug in your hand).
  const hand = pw.raw.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
  let leash = null;
  const down = new T.Vector3(0, -1, 0);

  let attachClock = 0;
  return {
    world: pw, me, loose, pinned, wake,
    get held() { return held; },
    /** Pick up a loose prop (an entry of `loose`), letting go of anything held first. Scripts and checks use it. */
    grab: l => { if (held) drop(); grab(l); },
    /** Throw what's held, the way the camera looks. */
    throw: () => held && throwHeld(),
    /** Let go of what's held, gently, just ahead. */
    drop,
    /** A prop made after start (a cup taken from a stack): tag it `userData.loose` first. Returns its entry. */
    add(o) { pending.push(o); attachLoose(); return loose.find(l => l.o === o); },
    /** Put what's held into `parent` (a bin) at world point `at`, out of physics for good: it stays there as a plain
     *  model. Returns it, or null if nothing's held. */
    stow(parent, at) {
      const l = held; if (!l) return null;
      held = null; me.unignore(l.b.collider); l.b.dispose(); l.b = null;
      loose.splice(loose.indexOf(l), 1);
      l.o.position.copy(at); l.o.rotation.set(0.3, Math.random() * 6, 0.2); parent.attach(l.o);
      return l.o;
    },
    /** Where the hand holds a rolled bag's handle (world space), or null: for the player's body (Cast). */
    get grip() { return held?.o.userData.loose.hold === 'roll' ? hold : null; },
    /** Pull loose object `o` by a rope `length` long from the point `at` (a Vector3 you keep moving), e.g. a lamp by
     *  the plug in your hand; leash(null) lets go. Taut, it drags the thing (and pulls a lamp off its table). */
    leash(o, at, length) {
      if (leash && leash.l.o === o && leash.length === length) { leash.at = at; return; }
      if (leash?.joint) pw.raw.removeImpulseJoint(leash.joint, true);
      leash = null;
      const l = o && loose.find(l => l.o === o);
      if (l) { hand.setTranslation(at, true); leash = { l, at, length, joint: null }; }
    },
    /** Height of whatever is under (x, y, z) within `far` metres, ignoring the walker and `skip` (an object), or null. */
    ground(x, y, z, far = 1.5, skip = null) {
      const b = skip && loose.find(l => l.o === skip)?.b?.body;
      const hit = pw.raw.castRay(new R.Ray({ x, y, z }, down), far, true, R.QueryFilterFlags.EXCLUDE_SENSORS, undefined, me.collider, b ?? undefined);
      return hit ? y - (hit.timeOfImpact ?? hit.toi) : null;
    },
    /** What's held, as a word ("remote", "coffee cup"), or null. */
    get holding() { return held ? name(held.o) : null; },
    /** Where every moved prop is, for a save: { moved: { id: [x, y, z, qx, qy, qz, qw] }, held: id | null }. */
    snapshot() {
      const moved = {};
      for (const [id, o] of byId) {
        const [p, q] = o.userData.home;
        if (o.visible && (o.position.distanceToSquared(p) > 2.5e-5 || o.quaternion.angleTo(q) > 0.02)) moved[id] = [...o.position.toArray(), ...o.quaternion.toArray()].map(v => +v.toFixed(4));
      }
      return { moved, held: held?.o.userData.saveId ?? null };
    },
    /** Put props back where a snapshot had them (before the game starts). What rests on what is worked out again. */
    restore({ moved = {}, held: h = null } = {}) {
      for (const [id, a] of Object.entries(moved)) {
        const o = byId.get(id);
        if (!o || a.length !== 7) continue;
        o.position.fromArray(a); o.quaternion.fromArray(a, 3); o.updateMatrixWorld();
        const l = loose.find(l => l.o === o);
        if (l?.b) { l.b.body.setTranslation(o.position, false); l.b.body.setRotation(o.quaternion, false); l.b.body.setLinvel(still, false); l.b.body.setAngvel(still, false); l.b.body.sleep(); }
      }
      for (const l of loose) { l.on = null; l.riders = null; }
      findSupports();
      wantHeld = byId.get(h) ?? null;
      if (wantHeld) attachLoose();
    },
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
      if (held?.o.userData.loose.hold === 'roll') roll(held, camera, feet);
      else if (held) {
        camera.getWorldDirection(ahead);
        // big props at arm's length; small ones in hand, low and to the right
        const small = held.size < 0.45;
        held.o.position.copy(camera.position).addScaledVector(ahead, small ? 0.42 : 0.95).add(new T.Vector3(0, (small ? -0.24 : -0.3) - held.mid, 0));   // its middle there, not its foot: a floor lamp's shade stayed in the ceiling
        if (small) held.o.position.add(new T.Vector3(-ahead.z, 0, ahead.x).normalize().multiplyScalar(0.16));
        held.o.rotation.set(0, Math.atan2(ahead.x, ahead.z) + (HOLD_YAW[held.o.name] ?? 0), 0);
        // Never inside a wall: held at arm's length against one, it was let go of inside (or past) it, and a remote
        // thrown at the lobby's west wall flew through into the pool hall. Hold it short of anything fixed in between.
        to.subVectors(held.o.position, camera.position);
        const far = to.length(), hit = pw.raw.castRay(new R.Ray(camera.position, to.divideScalar(far)), far + held.half, true, R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_SENSORS, undefined, me.collider, held.b.body);
        if (hit) held.o.position.copy(camera.position).addScaledVector(to, Math.max(0.12, Math.min(far, (hit.timeOfImpact ?? hit.toi) - held.half)));
        throwEntry.pos.copy(held.o.position);
      }
      for (const [l, at, mid] of targets) at.copy(l.o.position).y += mid;
      if (pending.length && (attachClock -= dt) <= 0) { attachClock = 1; attachLoose(); }
      for (const l of loose) {
        // A cord ({ tether: { at, length } }, at = where it's plugged in or null): carried past its length, the plug pulls
        // out; loose, a rope joint to the outlet stops it, so a thrown lamp swings up short on its cord.
        const t = l.o.userData.loose?.tether;
        if (!t) continue;
        if (l === held && t.at && l.o.position.distanceTo(t.at) > t.length) t.at = null;
        if (l.b && (l.rope?.at ?? null) !== t.at) {
          if (l.rope) pw.raw.removeImpulseJoint(l.rope.joint, true);
          l.rope = t.at && { at: t.at, joint: pw.raw.createImpulseJoint(R.JointData.rope(t.length, { x: 0, y: 0, z: 0 }, { x: t.at.x, y: t.at.y, z: t.at.z }), l.b.body, fixed, true) };
        }
      }
      if (leash) {
        if (!leash.l.b && leash.l.o.position.distanceTo(leash.at) > leash.length) wake(leash.l);   // taut: it comes off its table
        if (leash.l.b && !leash.joint) leash.l.b.body.enableCcd(true);   // dragged hard by its cord, a floor lamp's thin base tunnelled through the floor (user report)
        if (leash.l.b && !leash.joint) leash.joint = pw.raw.createImpulseJoint(R.JointData.rope(leash.length, { x: 0, y: 0.02, z: 0 }, { x: 0, y: 0, z: 0 }), leash.l.b.body, hand, true);
        hand.setNextKinematicTranslation(leash.at);
        if (leash.joint && leash.l.o.position.distanceTo(leash.at) > leash.length * 0.98) leash.l.b.body.wakeUp();
      }
      pw.update(dt);
      // What rests on a moved prop rides along on it, as a plain model in the prop's frame, the way a lamp on felt pads
      // rides a table you slide. It only gets a body (and falls, slides or topples by physics) when a person would see it
      // come loose: the prop lifted out from under it, tipped past 5 degrees, or jolted harder than friction can hold (GRIP g:
      // the friction resting things get, see grip()). Woken on any movement, a slow (headless) frame let the table slip 2-4
      // cm under the lamp before it caught up; woken at 0.4 g, a table stopping on its own floor friction (0.6 g) woke the
      // lamp and the solver then let the table slide on under it.
      for (const l of loose) {
        const s = l.on;
        if (!s || l.b) continue;
        if (s === held) { wake(l); continue; }   // lifted out from under it: it just drops
        const v = s.b ? s.b.body.linvel() : still, was = s.v ?? (s.v = new T.Vector3());
        if (s.o.position.distanceToSquared(l.from) > 4e-6 || (s.b && speed(s.b) > 0.03)) {
          s.o.updateMatrixWorld(); s.o.matrixWorld.clone().multiply(l.rel).decompose(l.o.position, l.o.quaternion, l.o.scale); l.o.updateMatrixWorld();
          l.from.copy(s.o.position);
          const jolt = Math.hypot(v.x - was.x, v.y - was.y, v.z - was.z) / Math.max(dt, 1e-3) > GRIP * 0.95 * 9.81, tipped = up.set(0, 1, 0).applyQuaternion(s.o.quaternion).y < Math.cos(5 * Math.PI / 180);
          if (jolt || tipped) { wake(l); l.woke = { jolt, tipped, a: +(Math.hypot(v.x - was.x, v.y - was.y, v.z - was.z) / Math.max(dt, 1e-3)).toFixed(2), dt }; l.b.body.setLinvel(was, true); }
        }
      }
      for (const l of loose) if (l.on?.v && !l.b) l.on.v.copy(l.on.b ? l.on.b.body.linvel() : still);   // for the next frame's jolt
      for (const l of loose) if (l.b && l.o.position.y < (l.start?.y ?? 0) - 2.5) {   // (below the 1.6 m pool) through the floor anyway: back where it started, not lost (a lamp vanished)
        const s = l.start ?? l.o.position.clone().setY(1); l.b.body.setTranslation(s, true); l.b.body.setLinvel({ x: 0, y: 0, z: 0 }, true); l.b.body.setAngvel({ x: 0, y: 0, z: 0 }, true); l.b.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      }
    },
  };
}
