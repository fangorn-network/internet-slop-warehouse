// SPDX-License-Identifier: CC0-1.0
// Things you handle that aren't lamps or reading: the carry-on you arrive with, anything that opens (drawers, doors,
// lids: named by convention in the model), sockets built into furniture, room 212's lamps one switch each, and the bed
// you slept in.
// Part of buildWorld (../world.js): runs after every zone is built, so it can find what they placed.
//
// Model conventions (Victor's GLBs light up here without code):
//   open_drawer_<what>  slides out along its local +Z, 75 % of its depth           "Open the <what> drawer"
//   open_door_<what>    swings 100° about its local Y (origin on the hinge line)   "Open the <what> door"
//   open_lid_<what>     lifts 100° about its local X (origin on the hinge line)    "Open the <what> lid"
//   take_<noun>         a loose thing you can pick up (world.js takeables); inside a drawer it rides with it and can
//                       only be reached while the drawer is open
//   socket_<what>       a socket a lamp's plug goes into, at the node's origin (outlets in nightstands, R15)
//   unmade_* / made_*   the king bed's slept-in and made-up states (shown after you sleep), or a hotel-king-bed-unmade model
//   handle*             the roller bag's telescoping handle (slides up 0.42 m while you pull it)
import * as T from 'three';
import * as F from '../fixtures.js';

export function buildHandling(ctx) {
  const { scene, lib, game, interact, updaters, loose, takeables, socket, room, R } = ctx;
  const has = id => !!lib.models?.has?.(id);

  // ---------- the carry-on (E1) ----------
  // You arrive pulling it. E sets it down standing on its wheels and feet wherever you are; E on it picks it up again by
  // the handle; Q throws it (badly: 4.5 kg). Where it is and whether you have it are in the save (physics snapshot).
  const bag = has('hotel-roller-bag') ? lib.model('hotel-roller-bag', { origin: true }) : placeholderBag();
  bag.name = 'hotel-roller-bag';
  bag.position.set(4.75, 0, 16.7); bag.rotation.y = 0.6; scene.add(bag);
  loose(bag, { carry: true, shape: 'box', hold: 'roll', roll: { wheel: [0, 0.035, -0.095], handle: 1.0, extend: 0.42 } });
  game.arrive = () => { const P = game.physics, l = P?.loose.find(l => l.o === bag); if (l) P.grab(l); };
  // Victor's model replaces this (same size, origin on the floor at the middle, wheels at the back, handle node 'handle').
  function placeholderBag() {
    const g = new T.Group(), shell = F.mat('#2c3e57', { roughness: 0.8 }), black = F.mat('#151515', { roughness: 0.5 }), alu = F.mat('#9aa1a8', { metalness: 0.8, roughness: 0.35 });
    F.box(0.36, 0.52, 0.22, shell, 0, 0.3, 0, g);
    for (const x of [-0.15, 0.15]) { const w = F.cyl(0.035, 0.035, 0.025, black, x, 0.035, -0.095, g, 16); w.rotation.z = Math.PI / 2; F.box(0.03, 0.02, 0.03, black, x, 0.01, 0.085, g); }
    const handle = new T.Group(); handle.name = 'handle'; g.add(handle);
    for (const x of [-0.1, 0.1]) F.box(0.016, 0.34, 0.016, alu, x, 0.42, -0.12, handle);
    F.box(0.24, 0.025, 0.03, black, 0, 0.6, -0.12, handle);
    F.box(0.12, 0.02, 0.025, black, 0, 0.57, 0, g);   // carry handle on top
    return g;
  }

  // ---------- take_ things anywhere (a Bible in a drawer) ----------
  takeables(scene);

  // ---------- openables ----------
  const openables = [];
  const found = []; scene.traverse(o => { const m = /^open_(drawer|door|lid)_?(.*)$/.exec(o.name); if (m) found.push([o, m[1], m[2]]); });
  for (const [o, kind, what] of found) {
    o.updateWorldMatrix(true, true);
    const local = new T.Box3(); o.traverse(n => { if (n.isMesh) { n.geometry.computeBoundingBox(); local.union(n.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().copy(o.matrixWorld).invert().multiply(n.matrixWorld))); } });
    const mid = local.getCenter(new T.Vector3()), size = local.getSize(new T.Vector3());
    const st = { o, kind, open: false, t: 0, home: o.position.clone(), q: o.quaternion.clone(), rot: o.rotation.clone(), riders: [] };
    st.move = kind === 'drawer' ? size.z * 0.75 : -Math.sign((kind === 'door' ? mid.x : mid.z) || 1) * 1.75;
    const world = new T.Box3().setFromObject(o).expandByScalar(0.02);
    // what lies in it moves with it, and is only within reach while it's open
    scene.traverse(n => { if (n.userData.loose?.rest && world.containsPoint(n.position)) { st.riders.push({ n, at: n.position.clone() }); n.userData.loose.reachable = () => st.t > 0.6; } });
    const words = what.replace(/[_\d]+$/, '').replace(/_/g, ' ').trim(), noun = words ? `${words} ${kind}` : kind;
    const at = new T.Vector3().copy(mid).applyMatrix4(o.matrixWorld);
    interact.push({ pos: at, r: 1.1, label: () => `${st.open ? 'Close' : 'Open'} the ${noun}`, use: () => { st.open = !st.open; (kind === 'drawer' ? game.sound?.swish : game.sound?.click)?.(); } });
    openables.push(st);
  }
  const step = new T.Vector3();
  updaters.push(dt => {
    for (const st of openables) {
      const target = st.open ? 1 : 0; if (st.t === target) continue;
      st.t += Math.sign(target - st.t) * Math.min(Math.abs(target - st.t), dt * (st.kind === 'drawer' ? 2.5 : 1.6));
      const e = st.t * st.t * (3 - 2 * st.t), was = st.o.getWorldPosition(new T.Vector3());
      if (st.kind === 'drawer') st.o.position.copy(st.home).add(new T.Vector3(0, 0, st.move * e).applyQuaternion(st.q));
      else if (st.kind === 'door') st.o.rotation.y = st.rot.y + st.move * e;
      else st.o.rotation.x = st.rot.x + st.move * e;
      step.subVectors(st.o.getWorldPosition(new T.Vector3()), was);
      for (const r of st.riders) if (r.n.position.equals(r.at)) { r.n.position.add(step); r.at.copy(r.n.position); }   // not taken: rides along
    }
  });

  // ---------- sockets in furniture (R15) ----------
  const sockets = []; scene.traverse(o => { if (/^socket(_|$)/.test(o.name)) sockets.push(o); });
  for (const o of sockets) socket(o, false, false, o.getWorldPosition(new T.Vector3()).y > 2.5 ? 3.212 : 0.01, new T.Vector3());

  // ---------- room 212's ceiling light (R4) ----------
  // The bedside lamps carry their own switches (they're lamps: kinds.js, world/put.js); the ceiling light's switch is on
  // the wall by the door. room.setLamps(on) (Late Checkout and Catherine set the scene with it) still sets all three.
  const parts = room.parts;
  if (parts) {
    const y = parts.y;
    const ceiling = { noun: 'ceiling light', get on() { return parts.roomLight.intensity > 0; }, at: new T.Vector3(R.x0 + 1.5, y + 1.2, 1.1), set(on) { parts.roomLight.intensity = on ? parts.roomBright : 0; } };
    interact.push({ pos: ceiling.at, r: 1.1, when: p => Math.abs(p.y - y) < 1 && p.x > R.x0 && p.x < R.x1 && p.z > R.z0 && p.z < R.z1, label: () => `Turn the ${ceiling.noun} ${ceiling.on ? 'off' : 'on'}`, use: () => { ceiling.set(!ceiling.on); game.sound?.click?.(); } });
    room.switches = [...parts.lamps.map(l => ({ noun: l.noun, get on() { return l.on; }, set: on => l.setOn(on) })), ceiling];
  }

  // ---------- the bed you slept in (R6) ----------
  const bed = scene.children.find(o => o.name === 'hotel-king-bed');
  const named = re => { const list = []; bed?.traverse(n => { if (re.test(n.name)) list.push(n); }); return list; };
  const unmadeNodes = named(/^unmade/i), madeNodes = named(/^made/i);
  unmadeNodes.forEach(n => (n.visible = false));
  let slept = false;
  updaters.push(() => {
    if (slept || !game.flags?.slept || !bed) return;
    slept = true;
    if (unmadeNodes.length) { madeNodes.forEach(n => (n.visible = false)); unmadeNodes.forEach(n => (n.visible = true)); }
    else if (has('hotel-king-bed-unmade')) { const u = lib.model('hotel-king-bed-unmade', { rotate: -Math.PI / 2 }); u.position.copy(bed.position); u.quaternion.copy(bed.quaternion); u.scale.copy(bed.scale); scene.add(u); bed.visible = false; }
    else slept = false;   // nothing to show yet (the model hasn't landed): try again when it has
    game.bedUnmade = slept;
  });
  Object.assign(ctx, { bag, openables });
}
