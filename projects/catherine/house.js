// SPDX-License-Identifier: CC0-1.0
// The house that stood where the Heartland is. Built once over the east half of the floor-2 corridor (from 212's door to
// the end of the hall), hidden until you open the door: rough floorboards, dark wainscot, stained wallpaper, a plaster
// ceiling, unnumbered doors, bare bulbs on pull chains, a grandfather clock. Poly Haven, CC0 (ingestion/polyhaven/batches/old-house).
//
// Nothing in the hotel is edited: while the house is up, the hotel's own fittings inside its footprint (doors, plates,
// signs, art, downlights) are hidden, and restored when it goes.
import * as T from 'three';

// The heartland-hotel part exports only its engine; what else this needs from the hotel is restated here.
export const CEIL = 2.95;   // = roadside-inn/world.js CEIL (floor-to-ceiling, both floors)
// A part's file: the page's pins when packaged, the repo locally.
export const pin = (id, ext) => globalThis.WAREHOUSE_PARTS?.[id] ?? new URL(`../../parts/haven/${id}.${ext}`, import.meta.url).href;

export const HOUSE_MODELS = ['ph-pull-chain-light-socket', 'ph-lightbulb-01', 'ph-vintage-grandfather-clock-01', 'ph-gothiccommode-01',
  'ph-wooden-stool-01', 'ph-hanging-picture-frame-02', 'ph-wooden-bookshelf-worn'];
export const X0 = 12.3, X1 = 29.93, Z = 0.935;   // the footprint: west wall, east wall, the side walls' faces (the hotel's inner faces are at ±0.95, x = 30 − 0.05)
export const BULBS = [16.2, 22.4, 27.6];
export const CLOCK = new T.Vector3(28.3, 0, -0.72);
const WAIN = 0.95;   // wainscot height

async function surface(name, repeat, tint = '#fff') {
  const loader = new T.TextureLoader(), maps = {};
  await Promise.all(['color', 'normal', 'roughness'].map(async role => {
    const t = await loader.loadAsync(pin(`ph-oldhouse-${name}-${role}`, 'jpg'));
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
    t.colorSpace = role === 'color' ? T.SRGBColorSpace : T.NoColorSpace;
    maps[role] = t;
  }));
  return new T.MeshStandardMaterial({ map: maps.color, normalMap: maps.normal, roughnessMap: maps.roughness, color: tint });
}
// A textured plane, its texture repeat set from its size so boards and paper keep their real scale (metres per tile).
function panel(mat, w, h, tile) {
  const m = mat.clone();
  for (const k of ['map', 'normalMap', 'roughnessMap']) { m[k] = mat[k].clone(); m[k].repeat.set(w / tile, h / tile); m[k].needsUpdate = true; }
  const mesh = new T.Mesh(new T.PlaneGeometry(w, h), m);
  mesh.receiveShadow = true;
  return mesh;
}

export async function buildHouse(ctx) {
  const { scene, lib, FLOOR2: y, world } = ctx;
  const g = new T.Group(); g.name = 'old house'; g.visible = false;
  const [boards, paper, wood, plaster] = await Promise.all([
    surface('floorboards', [1, 1], '#b8a48c'), surface('wallpaper', [1, 1], '#c9b99a'), surface('wainscot', [1, 1], '#7a5a40'), surface('ceiling', [1, 1], '#bdb8ae')]);
  const L = X1 - X0, cx = (X0 + X1) / 2, H = CEIL;

  // Floor and ceiling.
  const floor = panel(boards, L, 2 * Z, 2.0); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, y + 0.012, 0); g.add(floor);
  const ceil = panel(plaster, L, 2 * Z, 1.5); ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, y + H - 0.012, 0); g.add(ceil);

  // A wall face from x0 to x1 at side s (-1 north, +1 south), facing into the hall: wainscot below, paper above, a chair
  // rail and a skirting board. Gaps are doorways (only 212's: the rest of the doors are painted shut onto the wall).
  const trim = new T.MeshStandardMaterial({ map: wood.map, normalMap: wood.normalMap, color: '#4a3424', roughness: 0.7 });
  function face(x0, x1, s, bottom = 0, top = H) {
    const w = x1 - x0, z = s * Z, rot = s > 0 ? Math.PI : 0;
    const part = (mat, h0, h1, tile) => { if (h1 <= h0) return; const p = panel(mat, w, h1 - h0, tile); p.position.set((x0 + x1) / 2, y + (h0 + h1) / 2, z); p.rotation.y = rot; g.add(p); };
    part(wood, Math.max(bottom, 0), Math.min(top, WAIN), 1.2);
    part(paper, Math.max(bottom, WAIN), top, 1.4);
    const strip = (h, d, at) => { if (at < bottom || at > top) return; const b = new T.Mesh(new T.BoxGeometry(w, h, d), trim); b.position.set((x0 + x1) / 2, y + at, z - s * d / 2); b.castShadow = b.receiveShadow = true; g.add(b); };
    strip(0.05, 0.03, WAIN);         // chair rail
    strip(0.16, 0.022, 0.08);        // skirting
  }
  face(X0, X1, -1);
  face(X0, 12.4, 1); face(13.4, X1, 1); face(12.4, 13.4, 1, 2.15, H);   // 212's doorway stays open
  for (const [x, rot] of [[X0, Math.PI / 2], [X1, -Math.PI / 2]]) {   // the two ends
    const lo = panel(wood, 2 * Z, WAIN, 1.2), hi = panel(paper, 2 * Z, H - WAIN, 1.4);
    lo.position.set(x, y + WAIN / 2, 0); hi.position.set(x, y + (WAIN + H) / 2, 0); lo.rotation.y = hi.rotation.y = rot; g.add(lo, hi);
  }

  // Doors where the hotel's doors are (its holes span x+0.4..x+1.4), as the house had them: a four-panel leaf, dark
  // varnish, a casing round it, a porcelain knob. No numbers; the house had none.
  const doorMat = new T.MeshStandardMaterial({ map: wood.map.clone(), normalMap: wood.normalMap, roughnessMap: wood.roughnessMap, color: '#3b2a1d' });
  doorMat.map.repeat.set(0.86 / 1.2, 2.04 / 1.2);
  const knobMat = new T.MeshStandardMaterial({ color: '#d8d0bf', roughness: 0.3 });
  for (const x of [16.5, 21, 25.5]) for (const s of [-1, 1]) {
    const d = new T.Group();
    const leaf = new T.Mesh(new T.BoxGeometry(0.86, 2.04, 0.035), doorMat); leaf.position.set(0, 1.02, -0.01); d.add(leaf);
    for (const [px, py, ph] of [[-0.19, 1.5, 0.78], [0.19, 1.5, 0.78], [-0.19, 0.5, 0.66], [0.19, 0.5, 0.66]]) {   // sunk panels with a raised field
      const p = new T.Mesh(new T.BoxGeometry(0.28, ph, 0.01), doorMat); p.position.set(px, py, 0.012); d.add(p);
    }
    for (const [cx, cy, w, h] of [[-0.48, 1.06, 0.09, 2.12], [0.48, 1.06, 0.09, 2.12], [0, 2.15, 1.05, 0.1]]) {   // casing
      const c = new T.Mesh(new T.BoxGeometry(w, h, 0.025), trim); c.position.set(cx, cy, 0.012); d.add(c);
    }
    const knob = new T.Mesh(new T.SphereGeometry(0.026, 16, 12), knobMat); knob.position.set(0.33, 0.95, 0.04); d.add(knob);
    const plate = new T.Mesh(new T.BoxGeometry(0.05, 0.16, 0.006), new T.MeshStandardMaterial({ color: '#6b5a3a', metalness: 0.6, roughness: 0.5 })); plate.position.set(0.33, 0.95, 0.01); d.add(plate);
    d.position.set(x + 0.9, y + 0.012, s * Z); d.rotation.y = s > 0 ? Math.PI : 0;
    d.traverse(n => { if (n.isMesh) n.castShadow = n.receiveShadow = true; });
    g.add(d);
  }

  // Bare bulbs on pull chains, warm and weak. The middle one is failing.
  const lights = [];
  for (const x of BULBS) {
    const socket = lib.model('ph-pull-chain-light-socket', { height: 0.42 });
    socket.position.set(x, y + H - 0.42 - 0.012, 0); g.add(socket);
    const bulb = lib.model('ph-lightbulb-01', { height: 0.11 });
    bulb.rotation.x = Math.PI; bulb.position.set(x, y + H - 0.075, 0); g.add(bulb);
    bulb.traverse(n => { if (n.isMesh) { n.material = n.material.clone(); n.material.emissive = new T.Color('#ffb15e'); n.material.emissiveIntensity = 1.2; n.castShadow = false; } });
    const a = { pos: new T.Vector3(x, y + H - 0.3, 0), color: new T.Color('#ffb874'), intensity: 0, base: x === BULBS[1] ? 0.7 : 1.2, distance: 4.5, bulb };   // 25-watt bulbs: pools of light, dark between
    lights.push(a); world.lightAnchors.push(a);
  }

  // Furniture, on the boards, against the walls.
  const place = (id, opts, x, z, rot = 0, dy = 0) => { const m = lib.model(id, opts); m.position.set(x, y + 0.012 + dy, z); m.rotation.y = rot; g.add(m); return m; };
  const clock = place('ph-vintage-grandfather-clock-01', { height: 2.05 }, CLOCK.x, CLOCK.z + 0.04, 0);
  place('ph-gothiccommode-01', { height: 0.92 }, 19.6, Z - 0.26, Math.PI);
  place('ph-hanging-picture-frame-02', { width: 0.62 }, 19.6, Z - 0.03, Math.PI, 1.55);
  place('ph-wooden-bookshelf-worn', { height: 1.55 }, 23.6, -Z + 0.2, 0);
  place('ph-wooden-stool-01', { height: 0.62 }, 24.6, -Z + 0.3, 0.6);
  // The clock's pendulum (its own animation, if the model carries one).
  const src = lib.models.get('ph-vintage-grandfather-clock-01');
  let mixer = null;
  if (src?.animations?.length) { mixer = new T.AnimationMixer(clock.children[0]); for (const clip of src.animations) mixer.clipAction(clip).play(); }

  scene.add(g);

  // What of the hotel lies inside the footprint (fittings, not the long walls and slabs the house covers).
  const box = new T.Box3(new T.Vector3(X0 - 0.05, y - 0.05, -1.2), new T.Vector3(X1 + 0.2, y + H + 0.3, 1.2)), b = new T.Box3();
  let hidden = [];
  const keep = world.room.leaf?.parent;   // your own door stays what it is
  const hotelLights = world.lightAnchors.filter(a => !lights.includes(a) && a.pos.y > y + 2 && a.pos.y < y + 4 && Math.abs(a.pos.z) < 0.5 && !a.outdoor);

  return {
    group: g, lights, clock,
    show(on) {
      g.visible = on;
      if (on) {
        hidden = [];
        scene.traverse(o => {
          if (!o.isMesh || !o.visible || o.parent?.userData.hotelResident) return;
          for (let p = o; p; p = p.parent) if (p === g || p === keep || p.userData.dreamFigure) return;   // the house, 212's door, her
          b.setFromObject(o);
          if (box.containsBox(b)) { o.visible = false; hidden.push(o); }
        });
        for (const a of hotelLights) { a.saved ??= a.intensity; a.intensity = 0; }
        for (const a of lights) a.intensity = a.base;
      } else {
        for (const o of hidden) o.visible = true;
        hidden = [];
        for (const a of hotelLights) if (a.saved !== undefined) a.intensity = a.saved;
        for (const a of lights) a.intensity = 0;
      }
    },
    update(dt, t) {
      mixer?.update(dt);
      if (!g.visible) return;
      // The failing bulb: mostly steady, now and then a stutter.
      const a = lights[1], f = Math.sin(t * 37) * Math.sin(t * 11.3) > 0.93 ? 0.25 : 1;
      a.intensity = a.base * f;
      a.bulb.traverse(n => { if (n.isMesh) n.material.emissiveIntensity = 1.2 * f; });
    },
  };
}
