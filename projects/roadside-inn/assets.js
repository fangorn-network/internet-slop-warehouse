// SPDX-License-Identifier: CC0-1.0
// Loads warehouse parts. Published builds set globalThis.WAREHOUSE_PARTS = {id: url}; locally they come from the repo.
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { createPerson } from './people.js';
import { economy } from './quality.js';
import { STATION_PARTS } from './station.js';

const local = {
  'qt-thrift-casual': '../mairas-dream/assets/characters/casual.glb',
  'qt-thrift-cashier': '../mairas-dream/assets/characters/cashier.glb',
  'qt-thrift-manager': '../mairas-dream/assets/characters/manager.glb',
  'kenney-thrift-foley': '../mairas-dream/assets/foley.json',
  'hotel-impact-foley': './assets/impact-foley.json',   // Kenney Impact Sounds (CC0) as data URIs: things landing
  'rb-sophia-formal': './assets/rb-sophia-formal.glb',
  'rb-marcus-formal': './assets/rb-marcus-formal.glb',
  'rb-emma-casual': './assets/rb-emma-casual.glb',
  'rb-andre-casual': './assets/rb-andre-casual.glb',
  'g3-shower-cabin': './assets/g3-shower-cabin.glb',
  'g3-treadmill': './assets/g3-treadmill.glb',
  'g3-exercise-bike': './assets/g3-exercise-bike.glb',
  'municipal-water-tower': '../../parts/dead-air/water-tower.glb',
};
// Local paths are relative to this module (not the page), so remixes in other folders load the same files.
const here = p => typeof location === 'undefined' ? p : new URL(p, import.meta.url).href;
// Heavy models load as their lite versions (ingestion/lite: simplified, 1K textures), published as <id>-lite. The game
// still names them by the original id. 2.5 M triangles in the lobby were mostly these (lean-scenes skill).
export const LITE = new Set(['ph-potted-plant-01', 'ph-potted-plant-02', 'ph-potted-plant-04', 'hotel-king-bed', 'ph-desk-lamp-arm-01', 'ph-bar-chair-round-01', 'g3-semi-truck', 'g3-1990s-suv', 'g3-1990s-station-wagon', 'g3-1990s-sedan', 'g3-1990s-hatchback', 'g3-1990s-pickup-truck', 'g3-1990s-minivan', 'g3-utility-pole', 'g3-dumpster', 'g3-fire-hydrant', 'g3-grocery-shelf', 'g3-end-cap-display', 'g3-coffee-machine', 'g3-soda-fountain', 'g3-upright-freezer', 'g3-freezer-chest', 'g3-vending-machine']); // = ingestion/lite/hotel.json
const file = id => LITE.has(id) ? `${id}-lite` : id;
export const url = (id, ext = 'glb') => globalThis.WAREHOUSE_PARTS?.[id] ?? here(local[id] ?? (id.endsWith('-lite') ? `../../parts/lite/${id}.glb` : null) ?? (id.startsWith('hotel-') ? `./assets/${id}.glb` : null) ?? (id.startsWith('g3-') ? `../../parts/grab3d/${id}.glb` : id.startsWith('acg-') ? `../../parts/acg/${id}.jpg` : `../../parts/haven/${id}.${ext}`));

const MODELS = [
  'rb-sophia-formal', 'rb-marcus-formal', 'rb-emma-casual', 'rb-andre-casual',
  'g3-shower-cabin', 'g3-treadmill', 'g3-exercise-bike',
  'ph-modern-arm-chair-01', 'ph-ottoman-01',
  'ph-modern-coffee-table-01', 'ph-side-table-01', 'ph-modern-ceiling-lamp-01', 'ph-potted-plant-01',
  'ph-potted-plant-04', 'ph-round-wooden-table-01',
  'ph-wetfloorsign-01', 'ph-lifebuoy', 'ph-wall-clock',
  'ph-shrub-03', 'ph-korean-fire-extinguisher-01', 'ph-fire-alarm',   // fire_alarm: pull stations (world/life-safety.js)
  'municipal-water-tower', 'ph-desk-lamp-arm-01',
  // original Blender furniture (blender/bed.py, blender/furniture.py)
  ...['king-bed', 'headboard', 'nightstand', 'table-lamp', 'credenza-tv', 'desk', 'closet', 'microfridge', 'ptac', 'vanity', 'toilet', 'snack-vending', 'luggage-cart', 'lobby-sofa', 'accent-chair-mustard',
    'coffee-station', 'breakfast-bar', 'ice-machine', 'ice-bucket', 'elevator-car', 'dumbbell-rack', 'pool-chaise', 'pool-rail', 'housekeeping-cart', 'room-door',
    'floor-lamp'].map(s => 'hotel-' + s),
  // Formula Blue lobby (blender/lobby.py) and a Poly Haven stone-top coffee table
  ...['checkin-pod', 'sectional', 'lounge-chair-navy', 'communal-table', 'bar-stool', 'market-cooler', 'market-shelf', 'business-center', 'task-chair'].map(s => 'hotel-' + s), 'ph-coffee-table-round-01',
  // lived-in props with printed labels (blender/props.py, labels.mjs) and a second Poly Haven plant
  ...['outlet', 'brochure-rack', 'newspaper', 'newspaper-stack', 'coffee-cup', 'phone', 'entry-mat', 'coffee-board', 'waste-cabinet', 'waste-bin', 'desk-items', 'desk-closed', 'lobby-sofa-2', 'tv-remote', 'map-mural', 'wall-art'].map(s => 'hotel-' + s), 'ph-potted-plant-02',
  ...['1990s-sedan', '1990s-suv', '1990s-pickup-truck', '1990s-minivan', '1990s-station-wagon', '1990s-hatchback', 'semi-truck', 'dumpster', 'utility-pole', 'street-light', 'vending-machine', 'fire-hydrant', 'traffic-cone', 'bollard', 'guard-rail'].map(s => 'g3-' + s),
  ...STATION_PARTS,   // the travel stop across the interstate (station.js)
];
// Decorative props nothing inspects after placing them (no traverse, bounds or named parts), outside room 212 (whose
// clearance pass measures every prop). With stream: true these load after the first frame, nearest first.
export const LAZY = new Set(['ph-potted-plant-01', 'ph-potted-plant-02', 'ph-potted-plant-04', 'hotel-brochure-rack', 'hotel-newspaper', 'hotel-newspaper-stack', 'hotel-coffee-cup', 'ph-round-wooden-table-01',
  'ph-lifebuoy', 'ph-wetfloorsign-01', 'ph-wall-clock', 'ph-ottoman-01', 'ph-modern-coffee-table-01',
  'ph-korean-fire-extinguisher-01', 'municipal-water-tower', 'g3-treadmill', 'g3-exercise-bike', 'g3-dumpster',
  ...['pool-chaise', 'pool-rail', 'dumbbell-rack', 'floor-lamp', 'luggage-cart', 'housekeeping-cart', 'bar-stool', 'task-chair', 'market-shelf', 'business-center'].map(s => 'hotel-' + s), 'ph-coffee-table-round-01', ...STATION_PARTS]);
const PBR = ['color', 'normal', 'roughness'];
const SURFACES = { parquet: PBR, carpet: PBR, 'stone-facade': PBR, lawn: ['color', 'normal'], 'wall-plaster': ['normal', 'roughness'], walnut: PBR, oak: PBR, 'bath-tile': PBR, 'pool-tile': ['color', 'normal'], 'gym-rubber': PBR, concrete: PBR, linen: PBR };
const STORE = { asphalt: 'ph-store-asphalt', tile: 'ph-store-floor', ceiling: 'acg-hotel-ceiling', corridor: 'acg-lobby-corridor', 'lobby-carpet': 'acg-lobby-carpet' }; // Maira's Dream; ambientCG (corridor: Carpet006, lobby-carpet: Carpet001)
const SKIES = { dusk: 'ph-hotel-dusk-sky', day: 'ph-hotel-farm-sky' };   // indoor reflections are captured from the hotel itself (captureEnv)
// Every warehouse part this game loads (package.mjs pins these).
export const PART_IDS = [...MODELS.map(file), ...Object.entries(SURFACES).flatMap(([k, roles]) => roles.map(r => `ph-hotel-${k}-${r}`)),
  ...Object.values(STORE).flatMap(id => ['color', 'normal', 'roughness'].map(r => `${id}-${r}`)), ...Object.values(SKIES), 'kenney-thrift-foley', 'hotel-impact-foley'];

// opts.skies: the three HDRs (the hotel game's sky and reflections); opts.people: the Rocketbox staff and guests.
// Hosts that bring their own sky and no staff (the heartland-hotel part) skip both: ~4 models and 3 HDRs less to hold.
// opts.stream: load LAZY props after the first frame instead of before it (see lib.stream below).
// opts.extra: more model part ids a remix brings (loaded and budgeted like the hotel's own).
export async function loadLibrary(onProgress = () => {}, { skies: withSkies = true, people: withPeople = true, stream = false, extra = [] } = {}) {
  const models_ = [...MODELS.filter(id => (withPeople || !id.startsWith('rb-')) && !(stream && LAZY.has(id))), ...extra];
  const gltf = new GLTFLoader(), tex = new T.TextureLoader();
  const total = models_.length + (withSkies ? Object.keys(SKIES).length : 0) + Object.values(SURFACES).flat().length + Object.keys(STORE).length * 3;
  let done = 0;
  const tick = () => onProgress(++done / total);

  const models = new Map(), maps = {};
  const loadMap = async (key, role, id) => {
    const t = await tex.loadAsync(url(id, 'jpg'));
    if (economy) shrink(t, 512);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = role === 'color' ? T.SRGBColorSpace : T.NoColorSpace;
    t.anisotropy = 8;
    (maps[key] ??= {})[role] = t;
    tick();
  };
  // ponytail: 4 parallel downloads, fine for desktop; add priority loading if mobile startup drags.
  const jobs = [
    ...models_.map(id => async () => { const m = await gltf.loadAsync(url(file(id))); budget(m.scene, id); models.set(id, m); tick(); }),
    ...Object.entries(SURFACES).flatMap(([k, roles]) => roles.map(r => () => loadMap(k, r, `ph-hotel-${k}-${r}`))),
    ...Object.entries(STORE).flatMap(([k, id]) => ['color', 'normal', 'roughness'].map(r => () => loadMap(k, r, `${id}-${r}`))),
  ];
  let next = 0;
  await Promise.all([0, 1, 2, 3].map(async () => { while (next < jobs.length) await jobs[next++](); }));
  const skies = {};
  for (const [k, id] of withSkies ? Object.entries(SKIES) : []) {
    skies[k] = await new RGBELoader().loadAsync(url(id, 'hdr'));
    skies[k].mapping = T.EquirectangularReflectionMapping;
    skies[k].sunDirection = brightest(skies[k]);
    tick();
  }
  // Reflection maps must share one size: a different size changes every material's shader, and swapping
  // sky ↔ interior on the doorstep would recompile them all at once (the "entering the hotel" freeze).
  if (withSkies) {
    // 1024 wide: three turns it into a 256 px cube, the size captureEnv renders, so swapping them recompiles nothing.
    for (const k of ['dusk', 'day']) skies[k].env = resample(skies[k], 1024);
    skies.interior = { env: skies.dusk.env };   // until a game captures the real rooms (it used to be a photo of another hotel)
  }

  // A textured standard material; repeat is in tiles per meter-ish, set per surface.
  // grade: a CSS filter applied to the color map once (e.g. whitewash a warm wood: 'saturate(30%) brightness(1.35)').
  function surface(key, { repeat = [1, 1], color = '#ffffff', roughness = 1, normalScale = 1, grade } = {}) {
    const m = maps[key], out = {};
    for (const [role, t] of Object.entries(m)) { out[role] = t.clone(); out[role].repeat.set(...repeat); }
    if (grade && out.color) {
      const img = out.color.image, c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.filter = grade; g.drawImage(img, 0, 0);
      const t = new T.CanvasTexture(c);
      Object.assign(t, { wrapS: T.RepeatWrapping, wrapT: T.RepeatWrapping, colorSpace: T.SRGBColorSpace, anisotropy: 8 });
      t.repeat.set(...repeat);
      out.color = t;
    }
    return new T.MeshStandardMaterial({ map: out.color, normalMap: out.normal, roughnessMap: out.roughness, color, roughness, normalScale: new T.Vector2(normalScale, normalScale) });
  }

  // Clone a model, scaled so its largest box dimension along `axis` equals `size`, origin at floor center.
  // origin: true keeps the model's own origin (Blender assets are authored floor-centered, with hinge pivots).
  function model(id, opts = {}) {
    const g = new T.Group(); g.name = id;
    g.userData.hotelProp = true;
    const src = models.get(id);
    if (src) fill(g, src, opts);
    else if (stream && LAZY.has(id)) { g.userData.visibilityRadius = 0; (pending.get(id) ?? pending.set(id, []).get(id)).push([g, opts]); }
    else throw Error(`model not loaded: ${id}`);
    return g;
  }
  function fill(g, src, { height, width, rotate = 0, origin = false } = {}) {
    const inner = src.scene.clone(true);
    inner.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    inner.rotation.y = rotate;
    const box = new T.Box3().setFromObject(inner), size = box.getSize(new T.Vector3());
    const s = height ? height / size.y : width ? width / Math.max(size.x, size.z) : 1;
    inner.scale.multiplyScalar(s);
    const c = box.getCenter(new T.Vector3());
    if (!origin) inner.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    g.add(inner);
    g.userData.visibilityRadius = Math.max(size.x, size.y, size.z) * s / 2;
    return inner;
  }

  // Streaming. Placeholders wait in `pending`; step() loads the model nearest the eye (one at a time, so a phone never
  // decodes several at once), compiles its shaders off to the side, then drops it into every placeholder in one frame.
  // near: skip props farther than this (a phone never downloads the gym if you never walk past it).
  const pending = new Map(), at = new T.Vector3();
  let loading = false;
  async function step(eye, { renderer, camera, scene, near = Infinity } = {}) {
    if (loading || !pending.size) return;
    let best = null, bestD = near * near;
    for (const [id, list] of pending) for (const [g] of list) { g.getWorldPosition(at); const d = at.distanceToSquared(eye); if (d < bestD) { bestD = d; best = id; } }
    if (!best) return;
    loading = true;
    try {
      const m = await gltf.loadAsync(url(file(best))); budget(m.scene, best); models.set(best, m);
      const list = pending.get(best); pending.delete(best);
      const staging = new T.Group(), inners = list.map(([g, opts]) => [g, fill(new T.Group(), m, opts)]);
      for (const [, inner] of inners) staging.add(inner.parent);
      if (renderer) await renderer.compileAsync(staging, camera, scene);
      for (const [g, inner] of inners) { const r = inner.parent.userData.visibilityRadius; g.add(inner); g.userData.visibilityRadius = r; }
    } catch (e) { console.warn('stream: could not load', best, e); }
    finally { loading = false; }
  }
  const streaming = { step, get pending() { return pending.size; }, get busy() { return loading; } };

  const people = [];
  const person = (id, options) => { const p = createPerson(models.get(id), options); people.push(p); return p; };

  let foley = null;
  try { foley = await (await fetch(url('kenney-thrift-foley'))).json(); } catch { /* footsteps are optional */ }
  try { (foley ??= {}).impacts = await (await fetch(url('hotel-impact-foley'))).json(); } catch { /* impacts fall back to a synthesized knock */ }
  return { models, maps, skies, surface, model, person, people, foley, stream: streaming };
}

// Texture budget. Every prop ships 1K PBR maps; held at full size the hotel needs ~1.4 GB of texture memory, past what a
// phone tab survives. Textures are capped by the model's real size (a 0.6 m extinguisher does not need 1024 px), and
// small props on phones drop their normal/roughness maps. Runs before anything renders, so no shader recompiles later.
const PX_PER_M = economy ? 192 : 512, MIN_PX = economy ? 64 : 128, MAX_PX = economy ? 512 : 1024;
const DETAIL = ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];
export function budget(root, id = '') {
  const size = new T.Box3().setFromObject(root).getSize(new T.Vector3());
  const meters = Math.max(size.x, size.y, size.z) || 1;
  const big = id.startsWith('rb-') ? 2 : 1;   // faces read up close
  const cap = Math.min(MAX_PX, Math.max(MIN_PX, 2 ** Math.round(Math.log2(meters * PX_PER_M * big))));
  const done = new Set();
  root.traverse(n => {
    if (!n.isMesh) return;
    for (const m of [].concat(n.material)) {
      if (economy && meters < 1.2) for (const k of DETAIL) if (m[k]) { m[k] = null; m.needsUpdate = true; }
      for (const k in m) { const t = m[k]; if (t?.isTexture && !done.has(t.source)) { done.add(t.source); shrink(t, cap); } }
    }
  });
}
// Downscale a texture's image in place (to a canvas) when it is larger than `cap` pixels on its long side.
function shrink(t, cap) {
  const img = t.image, w = img?.width, h = img?.height;
  if (!w || Math.max(w, h) <= cap || t.isDataTexture) return;
  const k = cap / Math.max(w, h), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  img.close?.();
  t.image = c; t.needsUpdate = true;
}

// Direction of the brightest texel of an equirectangular HDR (the sun), in three.js world space.
function brightest(tex) {
  const { data, width, height } = tex.image, half = data instanceof Uint16Array;
  const f = half ? T.DataUtils.fromHalfFloat : v => v;
  let best = 0, at = 0;
  for (let i = 0; i < width * height; i++) { const l = f(data[i * 4]) + f(data[i * 4 + 1]) + f(data[i * 4 + 2]); if (l > best) { best = l; at = i; } }
  const u = (at % width + 0.5) / width, v = 1 - (Math.floor(at / width) + 0.5) / height;
  const lon = (u - 0.5) * Math.PI * 2, lat = (v - 0.5) * Math.PI;
  return new T.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
}

// Box-downsample an equirectangular HDR DataTexture to `width` (keeps the original for the visible sky).
function resample(tex, width) {
  const { data, width: w, height: h } = tex.image;
  if (w === width) return tex;
  const k = w / width, height = h / k, half = data instanceof Uint16Array;
  const from = half ? T.DataUtils.fromHalfFloat : v => v, to = half ? T.DataUtils.toHalfFloat : v => v;
  const out = new data.constructor(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 4; c++) {
    let sum = 0;
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) sum += from(data[((y * k + dy) * w + x * k + dx) * 4 + c]);
    out[(y * width + x) * 4 + c] = to(sum / (k * k));
  }
  const t = new T.DataTexture(out, width, height, T.RGBAFormat, tex.type);
  t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = tex.colorSpace; t.flipY = tex.flipY;
  t.minFilter = t.magFilter = T.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

/** Reflections of the hotel itself, seen from `at`: the scene rendered into a 256 px cube (PMREM, the same size as the
 *  skies' reflection maps). r170's fromScene looks out from the origin, so the scene is shifted under it for the capture. */
export function captureEnv(renderer, scene, at, { bounces = 2, intensity = 1 } = {}) {
  const pmrem = new T.PMREMGenerator(renderer), was = scene.position.clone(), env = scene.environment, envI = scene.environmentIntensity, rt = renderer.getRenderTarget();
  scene.position.copy(at).negate(); scene.updateMatrixWorld(true);
  // Each pass lights the room with the last one, so the lit floor and walls bounce light back in (the first pass sees
  // only the lamps and whatever reflections were set). Earlier passes are freed once the next is made.
  let target = null;
  for (let i = 0; i < bounces; i++) {
    if (target) { scene.environment = target.texture; scene.environmentIntensity = intensity; }
    const next = pmrem.fromScene(scene, 0, 0.05, 80);
    target?.dispose(); target = next;
  }
  scene.position.copy(was); scene.updateMatrixWorld(true);
  scene.environment = env; scene.environmentIntensity = envI;
  pmrem.dispose(); renderer.setRenderTarget(rt);   // the canvas again, whatever the generator left bound
  return target.texture;
}
