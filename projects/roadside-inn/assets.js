// SPDX-License-Identifier: CC0-1.0
// Loads warehouse parts. Published builds set globalThis.WAREHOUSE_PARTS = {id: url}; locally they come from the repo.
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { createPerson } from './people.js';

const local = {
  'qt-thrift-casual': '../mairas-dream/assets/characters/casual.glb',
  'qt-thrift-cashier': '../mairas-dream/assets/characters/cashier.glb',
  'qt-thrift-manager': '../mairas-dream/assets/characters/manager.glb',
  'kenney-thrift-foley': '../mairas-dream/assets/foley.json',
  'rb-sophia-formal': './assets/rb-sophia-formal.glb',
  'rb-marcus-formal': './assets/rb-marcus-formal.glb',
  'rb-emma-casual': './assets/rb-emma-casual.glb',
  'rb-andre-casual': './assets/rb-andre-casual.glb',
  'g3-shower-cabin': './assets/g3-shower-cabin.glb',
  'g3-treadmill': './assets/g3-treadmill.glb',
  'g3-exercise-bike': './assets/g3-exercise-bike.glb',
  'municipal-water-tower': '../../parts/dead-air/water-tower.glb',
};
export const url = (id, ext = 'glb') => globalThis.WAREHOUSE_PARTS?.[id] ?? local[id] ?? (id.startsWith('hotel-') ? `./assets/${id}.glb` : null) ?? (id.startsWith('g3-') ? `../../parts/grab3d/${id}.glb` : id.startsWith('acg-') ? `../../parts/acg/${id}.jpg` : `../../parts/haven/${id}.${ext}`);

const MODELS = [
  'rb-sophia-formal', 'rb-marcus-formal', 'rb-emma-casual', 'rb-andre-casual',
  'g3-shower-cabin', 'g3-treadmill', 'g3-exercise-bike',
  'ph-modern-arm-chair-01', 'ph-mid-century-lounge-chair', 'ph-ottoman-01',
  'ph-modern-coffee-table-01', 'ph-side-table-01', 'ph-modern-ceiling-lamp-01', 'ph-potted-plant-01',
  'ph-potted-plant-04', 'ph-throw-pillows-01', 'ph-bar-chair-round-01', 'ph-round-wooden-table-01',
  'ph-wetfloorsign-01', 'ph-lifebuoy', 'ph-wall-clock',
  'ph-shrub-03', 'ph-korean-fire-extinguisher-01',
  'municipal-water-tower', 'ph-desk-lamp-arm-01',
  // original Blender furniture (blender/bed.py, blender/furniture.py)
  ...['king-bed', 'headboard', 'nightstand', 'table-lamp', 'credenza-tv', 'desk', 'closet', 'microfridge', 'ptac', 'vanity', 'toilet', 'front-desk', 'snack-vending', 'drum-pendant', 'luggage-cart', 'lobby-sofa', 'accent-chair-green', 'accent-chair-mustard',
    'coffee-station', 'breakfast-bar', 'ice-machine', 'ice-bucket', 'elevator-car', 'dumbbell-rack', 'pool-chaise', 'pool-rail', 'housekeeping-cart', 'room-door',
    'shelving-unit', 'floor-lamp', 'snake-plant', 'centerpiece', 'lattice-pendant'].map(s => 'hotel-' + s),
  ...['1990s-sedan', '1990s-suv', '1990s-pickup-truck', '1990s-minivan', '1990s-station-wagon', '1990s-hatchback', 'semi-truck', 'dumpster', 'utility-pole', 'street-light', 'vending-machine', 'fire-hydrant', 'traffic-cone', 'bollard', 'guard-rail'].map(s => 'g3-' + s),
];
const PBR = ['color', 'normal', 'roughness'];
const SURFACES = { parquet: PBR, carpet: PBR, 'stone-facade': PBR, lawn: ['color', 'normal'], 'wall-plaster': ['normal', 'roughness'], walnut: PBR, 'bath-tile': PBR, 'pool-tile': ['color', 'normal'], 'gym-rubber': PBR, concrete: PBR };
const STORE = { asphalt: 'ph-store-asphalt', tile: 'ph-store-floor', ceiling: 'acg-hotel-ceiling' }; // Maira's Dream; ambientCG
const SKIES = { dusk: 'ph-hotel-dusk-sky', day: 'ph-hotel-farm-sky', interior: 'ph-hotel-room-hdri' };
// Every warehouse part this game loads (package.mjs pins these).
export const PART_IDS = [...MODELS, ...Object.entries(SURFACES).flatMap(([k, roles]) => roles.map(r => `ph-hotel-${k}-${r}`)),
  ...Object.values(STORE).flatMap(id => ['color', 'normal', 'roughness'].map(r => `${id}-${r}`)), ...Object.values(SKIES), 'kenney-thrift-foley'];

export async function loadLibrary(onProgress = () => {}) {
  const gltf = new GLTFLoader(), tex = new T.TextureLoader();
  const total = MODELS.length + Object.keys(SKIES).length + Object.values(SURFACES).flat().length + Object.keys(STORE).length * 3;
  let done = 0;
  const tick = () => onProgress(++done / total);

  const models = new Map(), maps = {};
  const loadMap = async (key, role, id) => {
    const t = await tex.loadAsync(url(id, 'jpg'));
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = role === 'color' ? T.SRGBColorSpace : T.NoColorSpace;
    t.anisotropy = 8;
    (maps[key] ??= {})[role] = t;
    tick();
  };
  // ponytail: 4 parallel downloads, fine for desktop; add priority loading if mobile startup drags.
  const jobs = [
    ...MODELS.map(id => async () => { models.set(id, await gltf.loadAsync(url(id))); tick(); }),
    ...Object.entries(SURFACES).flatMap(([k, roles]) => roles.map(r => () => loadMap(k, r, `ph-hotel-${k}-${r}`))),
    ...Object.entries(STORE).flatMap(([k, id]) => ['color', 'normal', 'roughness'].map(r => () => loadMap(k, r, `${id}-${r}`))),
  ];
  let next = 0;
  await Promise.all([0, 1, 2, 3].map(async () => { while (next < jobs.length) await jobs[next++](); }));
  const skies = {};
  for (const [k, id] of Object.entries(SKIES)) {
    skies[k] = await new RGBELoader().loadAsync(url(id, 'hdr'));
    skies[k].mapping = T.EquirectangularReflectionMapping;
    skies[k].sunDirection = brightest(skies[k]);
    tick();
  }
  // Reflection maps must share one size: a different size changes every material's shader, and swapping
  // sky ↔ interior on the doorstep would recompile them all at once (the "entering the hotel" freeze).
  const envWidth = skies.interior.image.width;
  for (const k of ['dusk', 'day']) skies[k].env = resample(skies[k], envWidth);
  skies.interior.env = skies.interior;

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
  function model(id, { height, width, rotate = 0, origin = false } = {}) {
    const src = models.get(id);
    if (!src) throw Error(`model not loaded: ${id}`);
    const inner = src.scene.clone(true);
    inner.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    inner.rotation.y = rotate;
    const box = new T.Box3().setFromObject(inner), size = box.getSize(new T.Vector3());
    const s = height ? height / size.y : width ? width / Math.max(size.x, size.z) : 1;
    inner.scale.multiplyScalar(s);
    const c = box.getCenter(new T.Vector3());
    if (!origin) inner.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    const g = new T.Group(); g.name = id;
    g.add(inner);
    g.userData.hotelProp = true;
    g.userData.visibilityRadius = Math.max(size.x, size.y, size.z) * s / 2;
    return g;
  }

  const people = [];
  const person = (id, options) => { const p = createPerson(models.get(id), options); people.push(p); return p; };

  let foley = null;
  try { foley = await (await fetch(url('kenney-thrift-foley'))).json(); } catch { /* footsteps are optional */ }
  return { models, maps, skies, surface, model, person, people, foley };
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
