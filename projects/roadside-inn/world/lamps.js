// SPDX-License-Identifier: CC0-1.0
// Outlets and things with plugs: sockets a cord can go into, lamps (table and floor) you can unplug, carry anywhere and
// plug into any free outlet, tethered by their cords while plugged in.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';

export function buildLamps(ctx) {
  const {
    scene, lib, game, updaters, add, loose, cordGeometry,
  } = ctx;
  // Outlets a cord can go into: { o (the outlet model), at (where the plug sits), tail (the cord's run from the floor up
  // to the plug), used }. Filled by lived-in.js; anything pluggable() plugs into and out of them.
  const sockets = [], PLUG = new T.Vector3(0, 0.281, 0.013), plugMat = F.mat('#151515', { roughness: 0.5 });
  // Everything with a plug: { lamp (the object), noun, tether, socket, plugInto(s), unplug() }. lived-in.js's outlets
  // offer "Plug in" for any of them in reach and "Unplug" for whatever is in them.
  const plugs = [];
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
    const st = { lamp, noun, tether, socket: null, end: new T.Vector3(), dirty: true };
    st.plugInto = s => { s.used = true; st.socket = s; tether.at = s.at; s.o.add(plug); plug.position.copy(PLUG); plug.rotation.set(0, 0, 0); power(true); st.dirty = true; };
    st.unplug = (quiet = false) => { const s = st.socket; if (!s) return; s.used = false; st.socket = null; tether.at = null; st.end.set(s.tail[0][0], s.tail[0][1], s.tail[0][2]); scene.attach(plug); power(false); st.dirty = true; if (!quiet) game.sound?.click?.(); };
    plugs.push(st);
    const p = new T.Vector3(), lit = light?.pos.clone().sub(lamp.position);
    const mesh = new T.Mesh(new T.BufferGeometry(), F.mat('#141414', { roughness: 0.55 })); mesh.name = 'Lamp cord'; scene.add(mesh);
    const last = new T.Vector3(Infinity, 0, 0), tb = new T.Box3();
    updaters.push(() => {
      if (!st.ready) { st.ready = true; const free = sockets.filter(s => !s.used); if (out && free.length) st.plugInto(free.reduce((a, b) => Math.hypot(b.at.x - out[0], b.at.z - out[1]) < Math.hypot(a.at.x - out[0], a.at.z - out[1]) ? b : a)); }
      if (st.socket && tether.at !== st.socket.at) st.unplug();   // walked off with it (physics.js let go of the outlet)
      lamp.getWorldPosition(p);
      if (p.distanceToSquared(last) < 1e-6 && !st.dirty) return;
      st.dirty = false; last.copy(p); if (light) light.pos.copy(p).add(lit);
      const end = st.socket ? new T.Vector3(...st.socket.tail[0]) : st.end, tail = st.socket ? st.socket.tail.slice(1) : [];
      // the floor under the lamp: floor 2 when it's been carried upstairs
      const floor = p.y > 2.5 ? 3.2 : 0, rel = p.y - floor;
      if (!st.socket) {   // the loose plug trails along the floor behind the lamp
        if (Math.abs(end.y - floor) > 0.5) end.set(p.x, floor + 0.016, p.z);   // carried to another floor: it came along
        const d = Math.hypot(p.x - end.x, p.z - end.z), max = tether.length * 0.85;
        if (d > max) { end.x = p.x + (end.x - p.x) * max / d; end.z = p.z + (end.z - p.z) * max / d; }
        end.y = floor + 0.016;
        plug.position.set(end.x, floor + 0.026, end.z); plug.rotation.set(-Math.PI / 2, 0, Math.atan2(p.x - end.x, p.z - end.z));
      }
      const dx = end.x - p.x, dz = end.z - p.z, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
      const pts = [[p.x + ux * 0.07, p.y + 0.012, p.z + uz * 0.07]], on = under();
      if (on) tb.setFromObject(on);
      if (on && rel > 0.2 && p.x > tb.min.x && p.x < tb.max.x && p.z > tb.min.z && p.z < tb.max.z && Math.abs(tb.max.y - p.y) < 0.05) {   // on its table: over the edge
        const t = Math.min(ux ? ((ux > 0 ? tb.max.x : tb.min.x) - p.x) / ux : Infinity, uz ? ((uz > 0 ? tb.max.z : tb.min.z) - p.z) / uz : Infinity) + 0.012;
        const ex = p.x + ux * t, ez = p.z + uz * t;
        pts.push([ex - ux * 0.01, p.y + 0.008, ez - uz * 0.01], [ex + ux * 0.004, p.y - 0.04, ez + uz * 0.004], [ex + ux * 0.02, floor + rel * 0.5, ez + uz * 0.02], [ex + ux * 0.08, floor + 0.016, ez + uz * 0.08]);
      } else if (rel > 0.06) {   // in hand, in the air or on something else: hangs to the floor, or runs straight when nearly taut
        if (Math.hypot(len, p.y - end.y) > tether.length * 0.9) pts.push([(p.x + end.x) / 2, Math.max(floor + 0.0155, (p.y + end.y) / 2 - 0.06), (p.z + end.z) / 2]);
        else { const f = Math.min(rel * 0.35, len * 0.5); pts.push([p.x + ux * f * 0.4, floor + rel * 0.45, p.z + uz * f * 0.4], [p.x + ux * f, floor + 0.016, p.z + uz * f]); }
      }
      mesh.geometry.dispose(); mesh.geometry = cordGeometry([...pts, end.toArray(), ...tail]);
    });
    return st;
  }
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
  Object.assign(ctx, { sockets, PLUG, plugMat, plugs, tableLamps, tableLamp, floorLamp, pluggable });
}
