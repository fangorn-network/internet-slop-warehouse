// SPDX-License-Identifier: CC0-1.0
// Outlets and things with plugs: sockets a cord can go into, lamps (table and floor) you can unplug, carry anywhere and
// plug into any free outlet, tethered by their cords while plugged in.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';

export function buildLamps(ctx) {
  const {
    scene, lib, game, interact, updaters, add, loose,
  } = ctx;
  // Outlets a cord can go into: { o (the outlet model), at (where the plug sits), tail (the cord's run from the floor up
  // to the plug), used }. Filled by lived-in.js; anything pluggable() plugs into and out of them.
  const sockets = [], PLUG = new T.Vector3(0, 0.281, 0.013), plugMat = F.mat('#151515', { roughness: 0.5 });
  // Everything with a plug: { lamp (the object), noun, tether, socket, plugInto(s), unplug() }. lived-in.js's outlets
  // offer "Plug in" for any of them in reach and "Unplug" for whatever is in them.
  const plugs = [];
  /**
   * An outlet a plug can go into: `o` the outlet model (the plug sits at PLUG in its frame), wall: the cord's tail runs
   * down the wall to the floor at height `y`; used: an appliance's cord is in it for good. A free one offers "Plug in"
   * for any plug whose lamp is in its cord's reach (the one in your hand first, else the nearest), a used one "Unplug"
   * (the plug comes away in your hand). plugAt: where the plug goes in o's frame (an outlet model's lower socket, or a
   * socket node's own origin).
   */
  function socket(o, used, wall, y = 0, plugAt = PLUG) {
    o.updateWorldMatrix(true, false);
    const at = o.localToWorld(plugAt.clone()), n = wall ? new T.Vector3(0, 0, 1).transformDirection(o.matrixWorld).setY(0) : null;
    const tail = wall ? [[at.x + n.x * 0.15, y + 0.016, at.z + n.z * 0.15], [at.x + n.x * 0.017, y + 0.05, at.z + n.z * 0.017], [at.x + n.x * 0.017, y + 0.27, at.z + n.z * 0.017]] : plugAt === PLUG ? [[at.x, y + 0.02, at.z]] : [];   // a socket in furniture (plugAt): the cord ends at it
    const s = { o, at, tail, used, plugAt };
    sockets.push(s);
    if (used) return s;
    const p = new T.Vector3(), reach = l => l.lamp.getWorldPosition(p).distanceTo(at);
    const near = () => plugs.filter(l => !l.socket && reach(l) < l.tether.length - 0.1).sort((a, b) => (game.holding?.() === b.noun) - (game.holding?.() === a.noun) || reach(a) - reach(b))[0];
    const inIt = () => plugs.find(l => l.socket === s);
    interact.push({ pos: at, r: 0.9, precise: true, when: () => s.used ? !!inIt() : !!near(),
      label: () => s.used ? `Unplug the ${inIt()?.noun ?? 'lamp'}` : `Plug in the ${near()?.noun ?? 'lamp'}`,
      use: () => { const l = inIt(); if (l) l.unplug(); else { near()?.plugInto(s); game.sound?.click?.(); } } });
    return s;
  }
  /**
   * Give `lamp` (a loose prop, already tagged with `tether`) a cord and plug. Plugged in (into the free socket nearest
   * `out` = [x, z] at the start), it glows and is tethered: thrown, it swings up short on the cord; carried past the
   * cord's length, the plug pulls out. E at its outlet unplugs it; E at any free outlet within the cord's reach of the
   * lamp (carry it there first: another room is fine) plugs it in. glow(on) lights it; `light` (a light anchor) follows
   * the lamp and goes out with it. The cord is redrawn whenever the lamp moves: over the edge of what it stands on
   * (`under()` → that prop), hanging to the floor, straight when taut, or trailing a loose plug.
   */
  function pluggable(lamp, { out, tether, noun = 'lamp', glow = () => {}, light = null, under = () => null }) {
    const bright = light?.intensity ?? 0;
    const power = on => { glow(on); if (light) light.intensity = on ? bright : 0; };
    const plug = F.box(0.034, 0.03, 0.026, plugMat); plug.name = 'Lamp plug';
    const st = { lamp, noun, tether, socket: null, dirty: true, held: false };
    const cord = rope(st, under);
    st.plugInto = s => { if (cordHeld === st) letGo(); s.used = true; st.socket = s; st.held = false; tether.at = s.at; s.o.add(plug); plug.position.copy(s.plugAt ?? PLUG); plug.rotation.set(0, 0, 0); power(true); cord.wake(); };
    // Pulled out, the plug is in your hand (hold: false leaves it on the floor by the outlet: a load, a yank).
    st.unplug = (quiet = false, hold = !quiet) => {
      const s = st.socket; if (!s) return; s.used = false; st.socket = null; tether.at = null; scene.attach(plug); power(false); cord.wake();
      cord.end(s.tail.length ? s.tail[0] : [s.at.x, s.at.y, s.at.z]);
      if (hold) take(st); else if (!quiet) game.sound?.click?.();
    };
    st.plug = plug; st.cord = cord;
    plugs.push(st); offerPlug(st);
    const p = new T.Vector3(), lit = light?.pos.clone().sub(lamp.position), last = new T.Vector3(Infinity, 0, 0);
    updaters.push((dt) => {
      if (!st.ready) { st.ready = true; const free = sockets.filter(s => !s.used); if (out && free.length) st.plugInto(free.reduce((a, b) => Math.hypot(b.at.x - out[0], b.at.z - out[1]) < Math.hypot(a.at.x - out[0], a.at.z - out[1]) ? b : a)); else cord.end(null); }
      if (st.socket && tether.at !== st.socket.at) st.unplug(false, false);   // walked off with it (physics.js let go of the outlet): it drops out
      lamp.getWorldPosition(p);
      if (p.distanceToSquared(last) > 1e-6) { last.copy(p); if (light) light.pos.copy(p).add(lit); cord.wake(); }
      cord.step(dt);
      if (!st.socket) {   // the loose plug lies at the cord's end, along it
        const [a, b] = cord.tip();
        plug.position.copy(b); plug.lookAt(a); plug.rotateX(Math.PI / 2);
      }
    });
    return st;
  }

  // ---------- cords ----------
  // A cord is a rope of short links (Verlet, ~6 cm each) that lies on what's under it: the floor, a rug, its own table,
  // the stairs (physics.js ground() casts down to find it). On the floor it drags with friction, so it slides along behind
  // a lamp you move instead of hanging through the floor, and it pulls a loose plug along once it's taut. Plugged into a
  // wall outlet its far end is the outlet's tail (the run up the wall); in your hand, your hand. It stops simulating once
  // nothing has moved for a second. Before, each frame drew a curve from a few guessed points, which went through the
  // floor under a dragged lamp (the user's report) and over the edge of the wrong table.
  const R_CORD = 0.0045, LINK = 0.06, G = 9.81;
  function rope(st, under) {
    const { lamp, tether } = st, n = Math.max(10, Math.round(tether.length / LINK)) + 1;
    const pos = Array.from({ length: n }, () => new T.Vector3()), prev = pos.map(v => v.clone()), floor = new Float32Array(n), onFloor = new Uint8Array(n);
    const mesh = new T.Mesh(new T.BufferGeometry(), F.mat('#141414', { roughness: 0.55 })); mesh.name = 'Lamp cord'; scene.add(mesh);
    const anchor = new T.Vector3(), endAt = new T.Vector3(), tb = new T.Box3(), side = new T.Vector3();
    let awake = 2, still = 0, laid = false;
    const self = {
      wake() { awake = 2; still = 0; },
      /** The far end: at [x, y, z] (where a plug was pulled out), or free (null: it lies where the rope puts it). */
      end(at) { if (at) { pos[n - 1].set(...at); prev[n - 1].copy(pos[n - 1]); } self.wake(); },
      /** The last two points (the plug's way along the cord). */
      tip: () => [pos[n - 2], pos[n - 1]],
      step(dt) {
        if (awake <= 0) return;
        lamp.updateMatrixWorld(); anchor.set(0, 0.012, -0.075).applyMatrix4(lamp.matrixWorld);   // out of the back of the base
        if (lamp.name === 'hotel-floor-lamp') anchor.set(0, 0.02, -0.13).applyMatrix4(lamp.matrixWorld);
        const s = st.socket, tail = s ? s.tail.slice(1) : [];
        if (s) endAt.set(...(s.tail[0] ?? [s.at.x, s.at.y, s.at.z])); else if (st.held) endAt.copy(st.hand);
        const fixedEnd = !!s || st.held;
        if (laid && anchor.distanceTo(pos[0]) > 0.8) laid = false;   // carried upstairs, or put back by a save: lay it out afresh
        const length = tether.length - (s ? tailLength(s) : 0), link = length / (n - 1);
        if (!laid) {   // first time: lay it from the lamp toward its end, slack sideways in a gentle bow, then let it settle
          laid = true; const to = fixedEnd ? endAt : anchor.clone().add(new T.Vector3(0.5, -anchor.y, 0.3));
          side.subVectors(to, anchor).setY(0); const dist = side.length(); side.set(-side.z, 0, side.x).normalize();
          const bow = Math.sqrt(Math.max(0, length * length - dist * dist)) * 0.35;
          for (let i = 0; i < n; i++) { const t = i / (n - 1); pos[i].lerpVectors(anchor, to, t).addScaledVector(side, Math.sin(t * Math.PI) * bow); prev[i].copy(pos[i]); }
          for (let k = 0; k < 120; k++) integrate(1 / 60, link, fixedEnd, true);
        }
        // ground under each link, once a frame (cast from 30 cm above it)
        const P = game.physics;
        for (let i = 0; i < n; i++) { const g = P?.ground(pos[i].x, pos[i].y + 0.3, pos[i].z, 2.5, lamp); floor[i] = g ?? (pos[i].y > 2.5 ? 3.212 : 0.01); }
        const tableUnder = under(); if (tableUnder) tb.setFromObject(tableUnder);
        self.box = tableUnder ? tb : null;
        const steps = Math.min(4, Math.max(1, Math.round(dt * 60)));
        let moved = 0;
        for (let k = 0; k < steps; k++) moved = Math.max(moved, integrate(dt / steps, link, fixedEnd));
        // drawn: lamp → links → (plugged) up the wall to the outlet
        const pts = [...pos, ...tail.map(t => new T.Vector3(...t))];
        mesh.geometry.dispose(); mesh.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'centripetal'), pts.length * 2, R_CORD, 5, false);
        still = moved < 2e-4 ? still + dt : 0;
        if (still > 1) awake--;
      },
    };
    function integrate(h, link, fixedEnd, settling = false) {
      let moved = 0;
      for (let i = 1; i < n; i++) {
        if (i === n - 1 && fixedEnd) continue;
        const p = pos[i], q = prev[i], vx = p.x - q.x, vy = p.y - q.y, vz = p.z - q.z;
        const drag = onFloor[i] ? (Math.hypot(vx, vz) < 0.0015 ? 0 : 0.55) : 0.985;   // floor: friction, and still links stick
        q.copy(p); p.x += vx * drag; p.z += vz * drag; p.y += vy * 0.985 - G * h * h;
      }
      pos[0].copy(anchor); prev[0].copy(anchor);
      if (fixedEnd) { pos[n - 1].copy(endAt); prev[n - 1].copy(endAt); }
      for (let it = 0; it < 14; it++) {
        for (let i = 0; i < n - 1; i++) {   // links: their length, no more, no less
          const a = pos[i], b = pos[i + 1], dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1e-6, f = (d - link) / d;
          const wa = i === 0 ? 0 : 1, wb = i + 1 === n - 1 && fixedEnd ? 0 : 1, w = wa + wb; if (!w) continue;
          a.x += dx * f * wa / w; a.y += dy * f * wa / w; a.z += dz * f * wa / w; b.x -= dx * f * wb / w; b.y -= dy * f * wb / w; b.z -= dz * f * wb / w;
        }
        for (let i = 1; i < n - 1; i++) {   // stiffness: a cord bends in curves, it doesn't fold flat on itself
          const a = pos[i - 1], b = pos[i + 1], dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1e-6, min = link * 1.2;
          if (d >= min) continue;
          const f = (d - min) / d * 0.25, wa = i - 1 === 0 ? 0 : 1, wb = i + 1 === n - 1 && fixedEnd ? 0 : 1;
          a.x += dx * f * wa; a.z += dz * f * wa; b.x -= dx * f * wb; b.z -= dz * f * wb;
        }
        for (let i = 1; i < n; i++) collide(i, settling);
      }
      for (let i = 1; i < n; i++) moved = Math.max(moved, pos[i].distanceToSquared(prev[i]));
      return Math.sqrt(moved);
    }
    function collide(i, settling) {
      const p = pos[i], top = settling ? (p.y > 2.5 ? 3.212 : 0.01) : floor[i];
      const b = self.box;
      if (b && p.x > b.min.x && p.x < b.max.x && p.z > b.min.z && p.z < b.max.z && p.y < b.max.y + R_CORD && p.y > b.min.y) {
        if (p.y > b.max.y - 0.05) p.y = b.max.y + R_CORD;   // lies on its table top and over the edge
        else { const dx0 = p.x - b.min.x, dx1 = b.max.x - p.x, dz0 = p.z - b.min.z, dz1 = b.max.z - p.z, m = Math.min(dx0, dx1, dz0, dz1);   // inside the table: out the nearest side
          if (m === dx0) p.x = b.min.x - R_CORD; else if (m === dx1) p.x = b.max.x + R_CORD; else if (m === dz0) p.z = b.min.z - R_CORD; else p.z = b.max.z + R_CORD; }
      }
      onFloor[i] = 0;
      if (p.y < top + R_CORD + 0.0008) { p.y = top + R_CORD + 0.0008; onFloor[i] = 1; }
    }
    return self;
  }
  const tailLength = s => { let L = 0; for (let i = 1; i < s.tail.length; i++) L += Math.hypot(...s.tail[i].map((v, k) => v - s.tail[i - 1][k])); return L + (s.tail.length ? Math.hypot(...s.tail.at(-1).map((v, k) => v - [s.at.x, s.at.y, s.at.z][k])) : 0); };

  // ---------- a plug in your hand ----------
  // Pick up a loose plug (or pull one out of the wall) and the cord's end is in your hand: aim at a wall, the floor or an
  // outlet and the plug goes there (within arm's reach); bring it within 15 cm of a free outlet and it snaps in. Walk off
  // further than the cord reaches and you drag the lamp by it (physics.js leash): a floor lamp slides and may topple, a
  // table lamp comes off its table. E: plug into the outlet in reach, or drop the plug.
  let cordHeld = null;
  const hand = new T.Vector3(), look = new T.Vector3(), eyeAt = new T.Vector3();
  function take(st) {
    if (game.physics?.held) game.physics.drop();
    if (cordHeld && cordHeld !== st) letGo();
    cordHeld = st; st.held = true; st.hand = hand; aim(); st.cord.wake(); game.sound?.click?.();
  }
  function letGo() { const st = cordHeld; if (!st) return; cordHeld = null; st.held = false; game.physics?.leash(null); st.cord.wake(); }
  const SNAP = 0.15;
  const freeNear = (r) => sockets.filter(s => !s.used).map(s => [s, s.at.distanceTo(hand)]).filter(([, d]) => d < r).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
  function aim() {
    const camera = game.camera?.(); if (!camera) return;
    camera.getWorldPosition(eyeAt); camera.getWorldDirection(look);
    hand.copy(eyeAt).addScaledVector(look, 0.5).y -= 0.12;
    const P = game.physics?.world;
    const hit = P?.raycast(eyeAt, look, 0.85);
    if (hit && hit.object !== cordHeld?.lamp) hand.copy(hit.point).addScaledVector(look, -0.03);
  }
  game.cordHeld = () => cordHeld;
  interact.push({ pos: hand, r: 2, when: () => !!cordHeld, label: () => freeNear(0.6) ? `Plug in the ${cordHeld.noun}` : `Drop the plug`,
    use: () => { const st = cordHeld, s = freeNear(0.6); letGo(); if (s) { st.plugInto(s); game.sound?.click?.(); } else game.sound?.impact?.('plastic', 0.05, 1, 0); } });
  updaters.push(() => {
    const st = cordHeld; if (!st) return;
    if (game.physics?.held) { letGo(); return; }   // picked something else up: the plug drops
    aim();
    const s = freeNear(SNAP);
    if (s) { letGo(); st.plugInto(s); game.sound?.click?.(); return; }
    // past the cord's length the lamp follows your hand
    game.physics?.leash(st.lamp, hand, st.tether.length * 0.97);
  });
  // A loose plug on the floor (or a table) can be picked up.
  const offerPlug = st => interact.push({ pos: st.plug.position, r: 0.8, precise: true, when: () => !st.socket && !st.held && !game.physics?.held, label: () => `Pick up the ${st.noun}'s plug`, use: () => take(st) });
  // The shade glows when it's lit (each lamp its own material, so one going out doesn't take the others with it).
  const shadeGlow = (lamp, level) => {
    const shades = []; lamp.traverse(n => { if (n.isMesh && /lampshade|led_warm/.test(n.material.name)) { n.material = n.material.clone(); n.material.emissive.set('#ffcf8a'); shades.push(n.material); } });
    return on => shades.forEach(m => (m.emissiveIntensity = on ? level : 0));
  };
  // A table lamp on a loose side table. It rests there as a plain model and comes off when the table moves (physics.js
  // wakes what rests on a moved prop), so pick the table up and the lamp falls; pick the lamp up on its own and carry it.
  const tableLamps = [];
  function tableLamp(x, z, out, lampLight = null) {
    const table = loose(add(lib.model('ph-side-table-01', { height: 0.5 }), x, 0, z), { carry: true, density: 0.4, shape: 'box' });
    const tether = { at: null, length: 2.4 };
    const lamp = loose(add(lib.model('hotel-table-lamp', { origin: true }), x, 0.502, z), { rest: true, density: 0.5, tether });
    const st = pluggable(lamp, { out, tether, noun: 'table lamp', glow: shadeGlow(lamp, 0.45), light: lampLight, under: () => table });
    tableLamps.push(st);
    return { table, lamp };
  }
  // A floor lamp, standing on its own weighted base: a person picks it up and carries it, so it's loose and carriable.
  function floorLamp(x, z, out, lampLight = null, ry = 0) {
    const tether = { at: null, length: 2.6 };
    const lamp = loose(add(lib.model('hotel-floor-lamp', { origin: true }), x, 0, z, ry), { carry: true, tether });
    return pluggable(lamp, { out, tether, noun: 'floor lamp', glow: shadeGlow(lamp, 0.6), light: lampLight });
  }
  game.plugs = {   // for the save (main.js): which outlet each plug is in
    save: () => plugs.map(st => st.socket ? sockets.indexOf(st.socket) : -1),
    load: list => list?.forEach((i, k) => { const st = plugs[k], s = sockets[i]; if (!st) return; st.ready = true; if (st.socket && st.socket !== s) st.unplug(true); if (s && !s.used) st.plugInto(s); }),
  };
  Object.assign(ctx, { sockets, socket, PLUG, plugMat, plugs, tableLamps, tableLamp, floorLamp, pluggable });
}
