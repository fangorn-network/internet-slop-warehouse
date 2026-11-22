// SPDX-License-Identifier: CC0-1.0
// put(): place a model and give it everything its kind (../kinds.js) says it is. Placements are data:
//   put('hotel-table-lamp', x, y, z, yaw, { out: [x, z], on: table })     // one
//   putAll([['hotel-waste-bin', 5.95, 0, -1.6, 0.1], ...])                  // a room's dressing list
// Instance options: model (lib.model options: origin, height, rotate), out ([x, z]: which outlet the cord starts in;
// none: it lies unplugged), on (the loose prop it stands on, for its cord), lit (false: starts switched off),
// light (an existing light anchor to use instead of making one), plus any kind trait to override for this one.
// Returns the model; o.userData.kind holds the kind and o.userData.thing what put() gave it ({ plug, bin, ... }).
import * as T from 'three';
import { KIND_OF, KINDS } from '../kinds.js';

export function buildPut(ctx) {
  const { scene, lib, game, interact, updaters, add, loose, solid, lightAnchors, pluggable } = ctx;
  const things = [];   // everything placed with a kind: the lint (check.mjs lint) and saves read it
  const box = new T.Box3();

  function put(id, x = 0, y = 0, z = 0, yaw = 0, opts = {}) {
    const kindName = opts.kind ?? KIND_OF[id], kind = { ...KINDS[kindName], ...opts };
    const o = add(lib.model(id, opts.model ?? { origin: true }), x, y, z, yaw);
    o.name = id;
    o.updateMatrixWorld(true);
    const thing = { o, id, kind: kindName };
    o.userData.kind = kindName; o.userData.thing = thing;
    if (!kindName) return o;
    things.push(thing);
    if (kind.solid) { box.setFromObject(o); solid(box.min.x, box.max.x, box.min.y, box.max.y, box.min.z, box.max.z); }
    if (kind.loose) loose(o, { ...kind.loose });
    // light: the kind's own, unless the placement hands it an existing anchor or says light: false (no light of its own)
    let anchor = opts.light?.pos ? opts.light : null;
    if (!anchor && opts.light !== false && KINDS[kindName].light) {
      const L = KINDS[kindName].light;
      anchor = { pos: new T.Vector3(x, y + L.y, z), color: new T.Color(L.color), intensity: L.intensity, distance: L.distance };
      lightAnchors.push(anchor);
    }
    if (kind.power) {
      const tether = { at: null, length: kind.power.cord };
      o.userData.loose = { ...(o.userData.loose ?? {}), tether };
      thing.plug = pluggable(o, { out: opts.out, tether, noun: kind.noun, glow: shadeGlow(o, kind.power.glow), light: anchor, under: () => opts.on ?? null, switchable: !!kind.switch, lit: opts.lit ?? true });
    }
    if (kind.bin) thing.bin = bin(o, kind);
    return o;
  }
  const putAll = list => list.map(([id, x, y, z, yaw, opts]) => put(id, x, y, z, yaw, opts));

  // The shade (or bulb) glows when lit; each lamp its own material, so one going out doesn't take the others with it.
  function shadeGlow(o, level) {
    const mats = []; o.traverse(n => { if (n.isMesh && /lampshade|led_warm|bulb|emiss/i.test(n.material.name)) { n.material = n.material.clone(); n.material.emissive.set('#ffcf8a'); mats.push(n.material); } });
    return on => mats.forEach(m => (m.emissiveIntensity = on ? level : 0));
  }

  // A bin: holding something small enough, look at it and E throws it away. It goes in and stays there (visible over
  // the rim), out of physics for good. Too big (a floor lamp) and the bin doesn't offer.
  function bin(o, kind) {
    const b = new T.Box3().setFromObject(o), top = o.getObjectByName('bin_opening');
    const rim = top ? top.getWorldPosition(new T.Vector3()) : new T.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
    const st = { o, rim, inside: [] };
    const fits = () => { const h = game.physics?.held; return !!h && !h.o.userData.loose?.tether && (h.size ?? 1) < kind.bin.opening * 1.6; };
    interact.push({ pos: rim, r: 0.9, when: fits, label: () => `Throw away the ${game.physics.holding}`, use: () => {
      const n = st.inside.length, depth = Math.max(0.05, rim.y - b.min.y - 0.04 - n * 0.03);
      const it = game.physics.stow(o, new T.Vector3(rim.x + (n % 2 ? 0.04 : -0.03), rim.y - depth, rim.z + (n % 3 - 1) * 0.04));
      if (it) { st.inside.push(it); game.sound?.impact?.('plastic', 0.05, 0.6, 0); }
    } });
    return st;
  }

  Object.assign(ctx, { put, putAll, things });
}
