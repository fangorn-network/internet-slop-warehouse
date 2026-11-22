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
    if (kind.stack) stack(o, kind);
    if (kind.dispenser) dispenser(o, kind, id);
    return o;
  }

  // ---------- the coffee sequence: rules on what you hold, not on pairs of objects ----------
  // A cup is a cup: userData.cup = { contents, lid, sleeve, sugar, creamer, stirred }. Any stack, caddy or dispenser
  // reads the held thing's cup state, so a cup carried in from anywhere works at any station.
  const held = () => game.physics?.held?.o ?? null, cupHeld = () => held()?.userData.cup ?? null;
  const show = (o, node, on) => { const n = o.getObjectByName(node); if (n) n.visible = on; };
  /** A new empty paper cup in your hand. Its liquid, lid and sleeve nodes (Victor's hotel-coffee-cup) start hidden. */
  function newCup() {
    const o = lib.model('hotel-coffee-cup', { origin: true }); o.name = 'hotel-coffee-cup';
    for (const n of ['liquid', 'lid', 'sleeve']) show(o, n, false);
    o.userData.cup = { contents: null, lid: false, sleeve: false, sugar: 0, creamer: 0, stirred: false };
    o.userData.loose = { rest: true, density: 0.3 };
    scene.add(o); o.position.copy(game.camera?.()?.position ?? new T.Vector3());
    const l = game.physics?.add(o); if (l) game.physics.grab(l);
    return o;
  }
  // Hook nodes are renamed out of take_ so world/handling.js's takeables() leaves them be (a stack hands out copies).
  const hooks = (o, prefix) => { const out = []; o.traverse(n => { if (n.name.startsWith(prefix)) out.push(n); }); for (const n of out) n.name = 'stack_' + n.name.slice(5); return out; };
  // stack: each hook hands out an item (cups) or, with `fits`, goes onto the cup you hold (lids). A caddy (hook 'take_')
  // has one hook per thing: take_sleeve, take_sugar, take_creamer, take_stirrer, each done to the held cup.
  const DO = {
    sleeve: c => !c.sleeve && ['Slide a sleeve on', o => { c.sleeve = true; show(o, 'sleeve', true); }],
    sugar: c => c.contents && !c.lid && ['Add a sugar', () => { c.sugar++; game.sound?.paper?.(); }],
    creamer: c => c.contents && !c.lid && ['Add a creamer', () => { c.creamer++; }],
    stirrer: c => c.contents && !c.lid && ['Stir it', () => { c.stirred = true; }],
    lid: c => !c.lid && ['Put a lid on', o => { c.lid = true; show(o, 'lid', true); game.sound?.click?.(); }],
  };
  function stack(o, kind) {
    const S = kind.stack; let left = S.count ?? Infinity;
    for (const n of hooks(o, S.hook)) {
      const at = n.getWorldPosition(new T.Vector3()), what = S.fits ? 'lid' : (n.name.slice(6).replace(/[_\d]+$/, '') || S.item);
      const act = () => { const c = cupHeld(); return c ? DO[what]?.(c) : null; };
      if (S.item && !S.fits) interact.push({ pos: at, r: 0.8, precise: true, when: () => !held() && left > 0, label: () => `Take a ${S.item}`, use: () => { left--; newCup(); game.sound?.paper?.(); } });
      else interact.push({ pos: at, r: 0.8, precise: true, when: () => !!act(), label: () => act()[0], use: () => act()?.[1](held()) });
    }
  }
  // dispenser: holding an empty, unlidded cup, E at the tap fills it over a few seconds (the coffee rises in the cup).
  function dispenser(o, kind, id) {
    const D = kind.dispenser, p = o.getObjectByName(D.point) ?? o, at = p.getWorldPosition(new T.Vector3());
    const fills = D.fills ?? (/water/.test(id) ? 'hot water' : 'coffee');
    let pouring = null;
    interact.push({ pos: at, r: 0.9, precise: true, when: () => { const c = cupHeld(); return !!c && !c.contents && !c.lid && !pouring; }, label: () => `Fill the cup with ${fills}`,
      use: () => { const cup = held(), liquid = cup.getObjectByName('liquid'); pouring = { cup, liquid, t: 0, y: liquid?.position.y ?? 0 }; if (liquid) liquid.visible = true; game.sound?.pour?.(); } });
    updaters.push(dt => {
      if (!pouring) return;
      const P = pouring; P.t = Math.min(1, P.t + dt / D.seconds);
      if (P.liquid) P.liquid.position.y = P.y - 0.07 * (1 - P.t);   // rises to its modelled level just under the rim
      if (held() !== P.cup) { P.cup.userData.cup.contents = P.t > 0.3 ? fills : null; pouring = null; return; }   // walked off mid-pour
      if (P.t >= 1) { P.cup.userData.cup.contents = fills; if (fills === 'coffee') game.give?.('coffee'); pouring = null; }
    });
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
