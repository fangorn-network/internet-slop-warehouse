// SPDX-License-Identifier: CC0-1.0
// The Heartland Inn: a two-storey interstate hotel, its parking lot, and the highway beyond.
// Plan (meters): building x -24..30, z -9..9; south (+z) faces the lot and I-44. Floor 1 is y=0, floor 2 is y=3.2.
import * as T from 'three';
import * as F from './fixtures.js';
import { buildLamps } from './world/lamps.js';
import { buildLobby } from './world/lobby.js';
import { buildLivedIn } from './world/lived-in.js';
import { buildPool } from './world/pool.js';
import { buildGym } from './world/gym.js';
import { buildCorridors } from './world/corridors.js';
import { buildElevator } from './world/elevator.js';
import { buildRoom212 } from './world/room-212.js';
import { buildTvs } from './world/tvs.js';
import { buildStaff } from './world/staff.js';
import { buildEntranceDoors } from './world/entrance-doors.js';
import { buildOutside } from './world/outside.js';

export const FLOOR2 = 3.2, CEIL = 2.95;

// opts.outside: the lot, roads, highway and scenery; opts.people: staff and guests; opts.station: the Route 66 Travel Stop
// across the interstate (station.js), a store you can walk into
// across the interstate (remixes that build their own turn it off). All default on (the hotel game).
export function buildWorld(scene, lib, game, { outside = true, people = true, station = true } = {}) {
  const colliders = [], surfaces = [], interact = [], updaters = [], lightAnchors = [], zones = [];
  const add = (o, x = 0, y = 0, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o; };
  // A prop physics may move (projects/roadside-inn/physics.js): { carry } can be picked up, density sets its heft.
  // Its stand-in box, if any, is marked too (unboxed()), so physics drops it; games without physics keep both.
  // Lived in: nothing people move stays square to the room. A loose prop settles a degree or two and a centimetre or so
  // off its mark, seeded from where it stands, so the hotel is the same every visit.
  const seeded = seed => () => ((seed = (Math.imul(seed ^ (seed >>> 15), 2246822519) + 0x6d2b79f5) >>> 0) / 4294967296);
  const settle = o => { const r = seeded(Math.round(o.position.x * 1000) * 73856093 ^ Math.round(o.position.z * 1000) * 19349663); o.rotation.y += (r() - 0.5) * 0.07; o.position.x += (r() - 0.5) * 0.03; o.position.z += (r() - 0.5) * 0.03; };
  const loose = (o, opts = {}) => (o.userData.loose = opts, opts.rest || settle(o), o), unboxed = () => { colliders.at(-1).loose = true; };
  // Small things inside a bigger model that you can pick up (the GLB names them take_<noun>: pens, apples, a mug, the
  // cookies) come out as their own loose props, resting where they were placed until taken. glTF names lose the dot of
  // Blender's .001, so "take_pen001" is a "pen".
  const takeables = group => {
    const found = []; group.traverse(o => { if (/^take_/.test(o.name)) found.push(o); });
    for (const o of found) { scene.attach(o); o.name = o.name.replace(/^take_/, '').replace(/[_\d]+$/, '').replace(/_/g, ' '); loose(o, { rest: true, density: 0.4 }); }
    return group;
  };
  const solid = (x0, x1, y0, y1, z0, z1, on) => colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), on });
  const floorAt = (x0, x1, z0, z1, y, name) => surfaces.push({ x0, x1, z0, z1, y, name });
  const light = (x, y, z, color = '#ffd9a8', intensity = 9, distance = 9) => lightAnchors.push({ pos: new T.Vector3(x, y, z), color: new T.Color(color), intensity, distance });
  // A power cord through sparse points. The lobby floor's top is y = 0.01 and the cord is 5 mm thick: a spline overshoots
  // at every bend (lamp foot to floor, floor to wall), so resample it and keep each point resting on the floor, never under it.
  const cordGeometry = pts => {
    const path = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)), false, 'centripetal').getPoints(pts.length * 12);
    path.forEach(p => { p.y = Math.max(p.y, 0.0155); });
    return new T.TubeGeometry(new T.CatmullRomCurve3(path), path.length, 0.005, 6, false);
  };
  const trees = [], statics = [], outdoor = [];
  const zone = (name, x0, x1, y0, y1, z0, z1, indoor = true) => zones.push({ name, x0, x1, y0, y1, z0, z1, indoor });

  // ---------- materials ----------
  // Painted walls share Poly Haven plaster detail (normal + roughness) under a flat paint color.
  const plaster = color => lib.surface('wall-plaster', { repeat: [1, 1], color, normalScale: 0.18 });
  const paint = plaster('#e9e7e2');   // Formula Blue: crisp warm white (the older greige read as 2010s)
  // Corridors: linen-look vinyl wallcovering (Poly Haven rough_linen at its true 27 cm), greige, not flat paint.
  const corridorPaint = lib.surface('linen', { repeat: [1 / 0.27, 1 / 0.27], color: '#e4dccd', grade: 'saturate(35%)', normalScale: 0.8 });
  const roomAccent = plaster('#2d6a90');   // the reference rooms' blue accent wall (it was terracotta)
  const loungeAccent = plaster('#1c3358');   // navy accent wall in the great room
  const poolPaint = plaster('#9fd0de');
  // ambientCG 2×2 ft acoustic tile, lifted to the bright white of every reference photo (it rendered a muddy grey-brown).
  const ceiling = lib.surface('ceiling', { repeat: [1 / 3.66, 1 / 3.66], grade: 'saturate(15%) brightness(1.45) contrast(0.85)' });
  const drywall = F.mat('#f4f3ef', { roughness: 0.95 });
  F.skin.wood = lib.surface('walnut', { repeat: [1, 1], color: '#c9a27e', roughness: 0.9 });
  const charcoal = F.mat('#3f444b', { roughness: 0.8 });
  const redPanel = F.mat('#8e2a2a', { roughness: 0.8 });
  const trim = F.mat('#e6e2d8', { roughness: 0.6 });
  const stone = lib.surface('stone-facade', { repeat: [0.5, 0.5] });
  const parquet = lib.surface('parquet', { repeat: [0.4, 0.4], grade: 'saturate(20%) brightness(1.3) contrast(0.95)', color: '#a9b8c9' });   // cool blue-grey herringbone
  const carpet = patternedCarpet();
  // Lobby seating areas: ambientCG Carpet001, a striated loop pile, cooled to the blue-grey of the Formula Blue lobbies;
  // about 1 m a tile (stripes 15-30 cm apart, so they survive mipmapping at standing distance). Contrast lifted so the striation reads from standing height.
  const lobbyCarpet = lib.surface('lobby-carpet', { repeat: [1, 1], color: '#b4c6e8', grade: 'contrast(2.1)' });
  // Walk paths (entry, desk, elevators, pantry): grey-washed wood-look plank (Poly Haven laminate as LVT).
  const lvt = lib.surface('oak', { repeat: [0.45, 0.45], grade: 'saturate(10%) brightness(1.12) contrast(0.9)', color: '#dedbd6', roughness: 0.9 });
  // Guest rooms: the same striated loop pile in charcoal grey (the old canvas stripe read as wooden planks).
  const roomCarpet = lib.surface('lobby-carpet', { repeat: [1, 1], color: '#c3c5c9', grade: 'contrast(1.8)' });
  const tile = lib.surface('bath-tile', { repeat: [1.2, 0.8], color: '#e6dccb' });             // pool deck: beige rectangular tile
  const bathFloor = lib.surface('bath-tile', { repeat: [1.6, 1.6], color: '#9a9fa6' });     // bathroom: grey porcelain
  const poolTile = lib.surface('pool-tile', { repeat: [1, 1], color: '#a9dcec' });
  const asphalt = lib.surface('asphalt', { repeat: [0.12, 0.12], color: '#7a7a7a' });
  const lawn = lib.surface('lawn', { repeat: [0.25, 0.25], color: '#9aa874' });
  const concrete = lib.surface('concrete', { repeat: [0.4, 0.4], color: '#d8d4cc' });

  // The great room's regional map mural (the prototype's "sense of place" wallcovering): an invented Ozark Highlands map,
  // printed vinyl 3.1 x 2.81 m, 1.5 mm proud of the wall (blender/art.py, prints.mjs). Placed with its origin on the wall
  // face at floor level; polygon offset keeps it off the wall's depth.
  function regionalMap() {
    const m = lib.model('hotel-map-mural', { origin: true }); m.name = 'Regional map';
    m.traverse(o => { if (o.isMesh) Object.assign(o.material, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); });
    return m;
  }

  // Corridor carpet: navy patterned cut pile (ambientCG Carpet006, CC0), about 0.3 m a square, softened toward grey so
  // the pattern reads without shouting.
  function patternedCarpet() {
    return lib.surface('corridor', { repeat: [0.55, 0.55], color: '#c0cadc', grade: 'contrast(0.45) brightness(1.35) saturate(85%)', roughness: 1 });
  }

  // Popcorn (sprayed acoustic) ceiling, drawn at true scale: one 0.5 m tile at ~1 mm a pixel, lumps 1-4 mm across in
  // loose clusters. Real popcorn is white on white and shows only as fine grain and crevice shadow, so the relief is a
  // gentle normal map (a bump map's screen-space derivatives sparkled) and the colour map carries the crevices' shade.
  function popcornCeiling() {
    const size = 512, rnd = seeded(212);
    const height = F.canvasTexture(size, size, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26000; i++) {
        const x = rnd() * w, y = rnd() * h, r = (0.6 + rnd() * rnd() * 1.6) * (rnd() < 0.5 ? 0.6 : 1), k = 0.35 + rnd() * 0.65;
        for (const dx of [0, -w, w]) for (const dy of [0, -h, h]) {   // wrap at the edges: no seam
          if (x + dx < -8 || x + dx > w + 8 || y + dy < -8 || y + dy > h + 8) continue;
          const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
          gr.addColorStop(0, `rgba(255,255,255,${k})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill();
        }
      }
    });
    const hpx = height.image.getContext('2d').getImageData(0, 0, size, size).data, H = (x, y) => hpx[(((y + size) % size) * size + (x + size) % size) * 4] / 255;
    const nrm = new Uint8Array(size * size * 4), col = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 1.5, dy = (H(x, y + 1) - H(x, y - 1)) * 1.5, l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
      nrm.set([128 - dx / l * 127, 128 + dy / l * 127, 128 + 127 / l, 255], i);
      const c = 226 + 29 * Math.min(1, H(x, y) * 1.6); col.set([c, c, c, 255], i);   // crevices a shade darker than the lumps
    }
    height.dispose();
    const tex = (data, srgb) => { const t = new T.DataTexture(data, size, size); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 2); t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.anisotropy = 4; if (srgb) t.colorSpace = T.SRGBColorSpace; t.needsUpdate = true; return t; };
    return new T.MeshStandardMaterial({ color: '#faf8f3', roughness: 1, map: tex(col, true), normalMap: tex(nrm), normalScale: new T.Vector2(0.6, 0.6) });
  }

  // Painted CMU: 0.4 x 0.2 m blocks in running bond with concave tooled joints (10 mm), under semi-gloss paint. One
  // 0.8 x 0.4 m tile (2 courses) at 2 mm a pixel; the joints are a normal map plus a faint shade in the colour.
  function blockWall() {
    const W = 400, H = 200, J = 5, nrm = new Uint8Array(W * H * 4), col = new Uint8Array(W * H * 4), rnd = seeded(8);
    const grain = Array.from({ length: W * H }, () => rnd());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const row = y < H / 2 ? 0 : 1, xb = (x + row * W / 4) % (W / 2), yb = y % (H / 2);
      const dx = xb < J ? -(J - xb) / J : xb > W / 2 - J ? (xb - (W / 2 - J)) / J : 0;
      const dy = yb < J ? -(J - yb) / J : yb > H / 2 - J ? (yb - (H / 2 - J)) / J : 0;
      const i = (y * W + x) * 4, g = (grain[y * W + x] - 0.5) * 0.25;   // block face pits, softened by paint
      nrm.set([128 + (dx + g * 0.3) * 90, 128 - (dy + g * 0.3) * 90, 230, 255], i);
      const c = 238 - (dx || dy ? 14 : 0) + g * 10; col.set([c, c, c, 255], i);
    }
    const tex = (data, srgb) => { const t = new T.DataTexture(data, W, H); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 0.8, 1 / 0.4); t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.anisotropy = 4; if (srgb) t.colorSpace = T.SRGBColorSpace; t.needsUpdate = true; return t; };
    return new T.MeshStandardMaterial({ color: '#e6e2d8', roughness: 0.55, map: tex(col, true), normalMap: tex(nrm), normalScale: new T.Vector2(0.8, 0.8) });
  }

  // Hotel art (blender/art.py, prints.mjs): framed CC0 photographs of the Buffalo River Ozarks and a geometric series in
  // navy, cobalt, grey and mustard. One model holds every piece (art_<name>, top-centre anchored, facing +z); a call
  // takes the set for its size and the piece for its motif. w x h is the framed size (the lobby photo is 1.2 x 0.9).
  const ART_SETS = { '0.8x0.6': ['corr0', 'corr1', 'corr2', 'corr3', 'corr4', 'corr5', 'corr6', 'corr7'], '1x0.75': ['lobby'], '1.45x0.58': ['head'], '1.05x0.42': ['tv'], '0.45x0.6': ['entry'] };
  function painting(x, y, z, ry, w, h, motif) {
    const set = ART_SETS[`${w}x${h}`], names = set ?? ART_SETS['0.8x0.6'];
    const art = lib.model('hotel-wall-art', { origin: true }); art.name = 'Framed artwork';
    const pick = art.getObjectByName('art_' + names[motif % names.length]);
    for (const c of [...pick.parent.children]) if (c !== pick) pick.parent.remove(c);
    if (!set) art.scale.set(w / 0.8, h / 0.6, 1);   // ponytail: an unlisted size stretches a 0.8 x 0.6 piece; add a set in prints.mjs ART for it
    art.position.set(x, y, z); art.rotation.y = ry; scene.add(art);
    return art;
  }

  // Original area-rug designs on Poly Haven wool pile: 'leaves' (round lobby rug), 'stripes' (lounge).
  function rugMaterial(kind, repeat) {
    const tex = F.canvasTexture(1024, 1024, (g, w, h) => {
      let r = kind.length * 977; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
      if (kind === 'leaves') {
        g.fillStyle = '#6b5440'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#8a7055'; g.lineWidth = 18; g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, 7); g.stroke();
        for (let i = 0; i < 70; i++) {
          const x = rnd() * w, y = rnd() * h, a = rnd() * 6.3, L = 30 + rnd() * 60;
          g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = ['#9c8466', '#7d6650', '#b39b7a'][i % 3];
          g.beginPath(); g.ellipse(0, 0, L, L * 0.35, 0, 0, 7); g.fill(); g.strokeStyle = '#5c4636'; g.lineWidth = 3; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke(); g.restore();
        }
      } else if (kind === 'geo') {                                   // low-pile geometric: grays and navy, Formula Blue
        g.fillStyle = '#7c838c'; g.fillRect(0, 0, w, h);
        const s = 64, tones = ['#6e757e', '#8b929a', '#5f6670', '#9aa1a8', '#283c5e', '#7c838c', '#727982'];
        for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) for (const up of [0, 1]) {
          g.fillStyle = tones[Math.floor(rnd() * (rnd() < 0.12 ? tones.length : 4))];
          g.beginPath(); if (up) { g.moveTo(x, y); g.lineTo(x + s, y); g.lineTo(x, y + s); } else { g.moveTo(x + s, y); g.lineTo(x + s, y + s); g.lineTo(x, y + s); } g.fill();
        }
        g.strokeStyle = '#1f2f4c'; g.lineWidth = 26; g.strokeRect(30, 30, w - 60, h - 60);
      } else {
        g.fillStyle = '#56657a'; g.fillRect(0, 0, w, h);
        const blues = ['#2f4a73', '#3e6aa8', '#8aa1bd', '#c7cfd8', '#1f2f4a', '#6f86a6'];
        for (let y = 0; y < h; y += 14 + rnd() * 20) {
          let x = -rnd() * 200;
          while (x < w) { const len = 60 + rnd() * 320; g.fillStyle = blues[Math.floor(rnd() * blues.length)]; g.fillRect(x, y, len, 8 + rnd() * 14); x += len + rnd() * 40; }
        }
      }
      for (let i = 0; i < 20000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }   // pile speckle
    });
    tex.repeat.set(...repeat);
    const m = lib.surface('carpet', { repeat: [2.5, 2.5] });
    m.map = tex; m.color.set('#ffffff'); m.normalScale.set(0.7, 0.7);
    m.polygonOffset = true; m.polygonOffsetFactor = -1;
    return m;
  }

  // Box with UVs in meters, so a texture repeat of 1 means one tile per meter.
  function mbox(w, h, d, material) {
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
    const m = new T.Mesh(g, material);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  // Top and bottom faces take world-space UVs, so a floor cut into pieces (holes, carpet insets) runs on without seams.
  function slab(x0, x1, z0, z1, y, material, thick = 0.02) {
    const m = mbox(x1 - x0, thick, z1 - z0, material), pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
    for (let k = 8; k < 16; k++) uv.setXY(k, pos.getX(k) + (x0 + x1) / 2, -(pos.getZ(k) + (z0 + z1) / 2));
    m.position.set((x0 + x1) / 2, y - thick / 2, (z0 + z1) / 2);
    m.castShadow = false;
    scene.add(m); statics.push(m);
    return m;
  }
  // Floor slab minus rectangular holes (pool, hot tub).
  function slabWithHoles(x0, x1, z0, z1, y, material, holes) {
    const xs = [...new Set([x0, x1, ...holes.flatMap(h => [h[0], h[1]])])].sort((a, b) => a - b);
    const zs = [...new Set([z0, z1, ...holes.flatMap(h => [h[2], h[3]])])].sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
      if (!holes.some(h => cx > h[0] && cx < h[1] && cz > h[2] && cz < h[3])) slab(xs[i], xs[i + 1], zs[j], zs[j + 1], y, material);
    }
  }

  // A straight wall along X (axis 'x', at = z) or Z (axis 'z', at = x) from a0 to a1, base y0, height h.
  // holes: {a0, a1, b0, b1, pass} with b in meters above y0; pass=true leaves a walkable gap (doors).
  function wall(axis, at, a0, a1, y0, h, material, { t = 0.14, holes = [], collide = true } = {}) {
    const piece = (s0, s1, b0, b1, blocks) => {
      if (s1 - s0 < 0.001 || b1 - b0 < 0.001) return;
      const len = s1 - s0, m = axis === 'x' ? mbox(len, b1 - b0, t, material) : mbox(t, b1 - b0, len, material);
      const mid = (s0 + s1) / 2, y = y0 + (b0 + b1) / 2;
      if (axis === 'x') m.position.set(mid, y, at); else m.position.set(at, y, mid);
      scene.add(m); statics.push(m);
      if (collide && blocks) axis === 'x' ? solid(s0, s1, y0 + b0, y0 + b1, at - t / 2, at + t / 2) : solid(at - t / 2, at + t / 2, y0 + b0, y0 + b1, s0, s1);
    };
    let cursor = a0;
    for (const hole of [...holes].sort((p, q) => p.a0 - q.a0)) {
      piece(cursor, hole.a0, 0, h, true);
      piece(hole.a0, hole.a1, hole.b1, h, true);
      piece(hole.a0, hole.a1, 0, hole.b0, true);
      if (!hole.pass && collide) axis === 'x' ? solid(hole.a0, hole.a1, y0, y0 + h, at - t / 2, at + t / 2) : solid(at - t / 2, at + t / 2, y0, y0 + h, hole.a0, hole.a1);
      cursor = hole.a1;
    }
    piece(cursor, a1, 0, h, true);
  }
  // Exterior wall: facade skin outside, paint inside. `out` is +1/-1, the outward direction.
  function facade(axis, at, out, a0, a1, y0, h, skin, holes = [], inner = paint) {
    wall(axis, at + out * 0.08, a0, a1, y0, h, skin, { t: 0.16, holes, collide: false });
    wall(axis, at - out * 0.05, a0, a1, y0, h, inner, { t: 0.1, holes });
  }
  const win = (a0, a1, b0 = 0.8, b1 = 2.3) => ({ a0, a1, b0, b1 });
  const door = (a0, a1, b1 = 2.15) => ({ a0, a1, b0: 0, b1, pass: true });

  // Windows: glass and frame in a facade opening. ry faces the frame toward the room interior.
  function placeWindow(x, y, z, w, h, ry, { drapes = true, backdrop = null } = {}) {
    const wnd = F.hotelWindow(w, h, { drapes });
    add(wnd.group, x, y, z, ry);
    if (backdrop) {                                  // closed curtains in rooms we never enter
      const lit = backdrop === 'lit';
      const curtain = new T.Mesh(new T.PlaneGeometry(w + 0.2, h + 0.2), F.mat(lit ? '#e8c999' : '#8b8478', { roughness: 1, emissive: lit ? '#ffb85c' : '#000000', emissiveIntensity: lit ? 0.35 : 0 }));
      curtain.position.set(0, h / 2, 0.25);
      wnd.group.add(curtain);
    }
    return wnd;
  }

  // An openable guest-room door: {group, leaf (hinge pivot), led (lock LED mesh)} like the old fixture.
  function openableDoor(label) {
    const group = lib.model('hotel-room-door', { origin: true });
    const leaf = group.getObjectByName('door_leaf'), led = group.getObjectByName('led');
    led.material = F.glow('#ff3b30', 0);
    const plate = F.sign(label, { w: 0.2, h: 0.12, bg: '#24303f', font: 'bold 150px system-ui, sans-serif' });
    plate.position.set(0.78, 1.5, 0.11); group.add(plate);
    return { group, leaf, led };
  }
  // One InstancedMesh per mesh of a model, each placement a Matrix4 (model origin kept, bottom on the ground).
  // `zone` names where they stand for zone culling: a lot of cars spans the whole lot, so its box can't say.
  function instances(id, placements, emissiveHeads = false, paints = null, zone) {
    const src = lib.models.get(id).scene;
    src.updateMatrixWorld(true);
    const minY = new T.Box3().setFromObject(src).min.y;
    src.traverse(n => {
      if (!n.isMesh) return;
      const local = new T.Matrix4().makeTranslation(0, -minY, 0).multiply(n.matrixWorld);
      const material = emissiveHeads && /led|lamp/i.test(n.material.name) ? F.glow('#fff1d6', 3) : n.material;
      const im = new T.InstancedMesh(n.geometry, material, placements.length);
      placements.forEach((m, i) => im.setMatrixAt(i, m.clone().multiply(local)));
      if (paints && /body_pbr|paint/.test(n.material.name)) paints.forEach((c, i) => im.setColorAt(i, new T.Color(c)));
      im.castShadow = true; im.receiveShadow = true;
      im.computeBoundingSphere();
      if (zone) im.userData.zone = zone;
      scene.add(im);
    });
  }

  // Recessed downlight: a diffused lens that falls off into a dark baffle and a white trim ring (one material for every
  // can). A flat emissive disc at 2+ blew out into white ellipses.
  const downlight = new T.MeshStandardMaterial({ color: '#e6e3dd', roughness: 0.5, emissive: '#ffe1bd', emissiveIntensity: 1.5,
    emissiveMap: F.canvasTexture(64, 64, (g, w) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
      const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      r.addColorStop(0, '#ffffff'); r.addColorStop(0.35, '#d9d4cc'); r.addColorStop(0.62, '#3a3836'); r.addColorStop(0.7, '#000'); r.addColorStop(1, '#000');
      g.fillStyle = r; g.fillRect(0, 0, w, w);
    }) });
  // ---------- floor 1 slabs and ceilings ----------
  // Lobby floor: carpet under the seating, LVT on the walk paths (reference: Formula Blue 2.0 lobbies). The column line
  // (z 2.48) is the edge between the entry walk and the two living rooms; the doors-to-desk lane (x -5..0.4) stays hard.
  const carpetAreas = [
    [0.4, 6.5, 2.48, 9],        // great room
    [-12, -5, 2.48, 9],         // west living room
    [-12, -8.2, -0.3, 2.48],    // reading pair by the desk
    [4.4, 6.5, -4.6, -1.4],     // business center
  ];
  slabWithHoles(-12, 6.5, -9, 9, 0.01, lvt, [...carpetAreas, [-12, -5, -9, -5]]);
  slab(-12, -5, -9, -5, 0.01, concrete);                        // pool equipment room behind the desk (locked)
  for (const [x0, x1, z0, z1] of carpetAreas) slab(x0, x1, z0, z1, 0.01, lobbyCarpet);
  slab(6.5, 30, -1, 1, 0.01, carpet);                           // corridor F1
  slabWithHoles(6.5, 12, -9, -1, 0.01, concrete, [[6.5, 9, -4.5, -1]]);                        // core
  slab(12, 13.5, -9, -1, 0.01, tile);                           // pool passage beside the stair (tile: a wet route)
  slab(-13.9, 13.5, -11, -9, 0.01, tile);                       // pool corridor along the back
  slab(13.5, 18, -9, -1, 0.01, lib.surface('gym-rubber', { repeat: [0.5, 0.5], color: '#9a9a9a' }));
  slabWithHoles(-24, -12, -9, 9, 0.01, tile, [[-21, -16, -7, 3], [-15.2, -12.8, 4.6, 7]]);
  slab(6.5, 12, 1, 9, 0.01, concrete);
  slab(12, 30, 1, 9, 0.01, roomCarpet); slab(18, 30, -9, -1, 0.01, roomCarpet);
  { const lit = ceiling.clone(); lit.emissive.set('#f4f2ee'); lit.emissiveIntensity = 0.05;   // a little bounce; at 0.28 the ceiling glared (216/255)
    slab(-12, 6.5, -9, 9, CEIL + 0.02, lit); }
  slabWithHoles(6.5, 30, -9, 9, CEIL + 0.02, ceiling, [[9.5, 12, -8.5, -1], [6.5, 9, -4.5, -1]]);
  slab(-24, -12, -9, 9, 4.38, ceiling);
  slab(-13.9, 13.5, -11, -9.16, CEIL + 0.02, drywall);                       // pool corridor: painted gypsum (humid; the tile's relief sparkled under its cans)                                      // below the roof slab's underside (4.4)
  // Floor 2 slab (seen from below as the ceiling above) and its walkable areas.
  // 3 mm proud of FLOOR2: the ground-floor walls under them (the stair entry's, at z = -1) top out at exactly FLOOR2, and
  // where nothing on floor 2 sits on them (the stair doorway) their tops z-fought through the carpet.
  slab(-12, 30, -1, 1, FLOOR2 + 0.003, carpet);
  slab(10.8, 12, -2, -1, FLOOR2 + 0.003, carpet);
  slab(6, 9, 1, 4, FLOOR2, tile);
  slabWithHoles(-12, 30, -9, 9, FLOOR2 + CEIL + 0.02, ceiling, [[12, 16.5, 1, 9]]);
  slabWithHoles(12, 16.5, 1, 9, FLOOR2 + CEIL + 0.005, popcornCeiling(), [[13.9, 16.5, 1, 4.1]]);   // guest room: sprayed popcorn
  slab(13.9, 16.5, 1, 4.1, FLOOR2 + CEIL + 0.005, drywall);                   // its bathroom: smooth, as they're always redone
  // Downlights (emissive discs) on both ceilings.
  const discs = [];
  for (let x = 8; x <= 29; x += 3.5) discs.push([x, CEIL - 0.005, 0], [x - 17, FLOOR2 + CEIL - 0.005, 0], [x, FLOOR2 + CEIL - 0.005, 0]);
  for (let x = -22; x <= -14; x += 4) for (const z of [-6, 0, 6]) discs.push([x, 4.355, z]);
  for (const x of [-10, -2, 5, 11]) discs.push([x, CEIL - 0.005, -10.05]);
  for (const z of [-6, -2.5]) discs.push([12.75, CEIL - 0.005, z]);
  const disc = new T.InstancedMesh(new T.CircleGeometry(0.1, 20), downlight, discs.length);
  const dm = new T.Object3D();
  discs.forEach((p, i) => { dm.position.set(...p); dm.rotation.set(Math.PI / 2, 0, 0); dm.updateMatrix(); disc.setMatrixAt(i, dm.matrix); });
  scene.add(disc);

  // ---------- exterior walls ----------
  const F1 = 0, H1 = FLOOR2;   // floor-1 wall base and height (slab included)
  // South facade, floor 1: pool wing glazing, lobby storefront + entrance, rooms.
  facade('x', 9, 1, -24, -12, 0, 4.6, stone, [win(-22.5, -19.5, 0.5, 3.6), win(-17.5, -13.5, 0.5, 3.6)], poolPaint);
  facade('x', 9, 1, -12, 6.5, F1, H1, stone, [win(-11, -4.4, 0.3, 2.6), door(-3.5, -0.5, 2.6), win(0.4, 6, 0.3, 2.6)]);
  facade('x', 9, 1, 6.5, 30, F1, H1, charcoal, [win(8.4, 10.1), ...[12, 16.5, 21, 25.5].map(x => win(x + 1.45, x + 3.05))]);
  facade('x', 9, 1, -12, 30, H1, 3.6, charcoal, [...[-12, -7.5, 1.5, 12, 16.5, 21, 25.5].map(x => win(x + 1.45, x + 3.05, 0.75, 2.25)), win(6.7, 8.3, 0.9, 2.1), win(9.7, 11.3, 0.9, 2.1)]);
  // North facade.
  facade('x', -9, -1, -24, -12, 0, 4.6, stone, [win(-22.5, -14, 0.5, 3.6), door(-13.65, -12.65)], poolPaint);
  const equipDoor = { a0: -7.9, a1: -6.9, b0: 0, b1: 2.15 };   // locked: the hole stays solid
  facade('x', -9, -1, -12, 30, F1, H1, charcoal, [win(-4, 0), equipDoor, door(12.07, 12.97), win(13.8, 17, 1.2, 2.4), ...[18, 22, 26].map(x => win(x + 1.2, x + 2.8))]);
  facade('x', -9, -1, -12, 30, H1, 3.6, charcoal, [...[-12, -7.5, -3, 1.5, 12, 16.5, 21, 25.5].map(x => win(x + 1.45, x + 3.05, 0.75, 2.25)), win(10.2, 11.4, 1.2, 2.2)]);
  // End walls.
  facade('z', -24, -1, -9, 9, 0, 4.6, stone, [win(-6, -2, 0.5, 3.6), win(1, 6, 0.5, 3.6)], poolPaint);
  facade('z', 30, 1, -9, 9, F1, 6.8, redPanel, [win(-0.6, 0.6, 0.8, 2.3), win(-0.6, 0.6, 4, 5.5)]);
  facade('z', -12, -1, -9, 9, H1, 3.6, charcoal, [win(-0.6, 0.6, 0.8, 2.3)]);
  // Parapets, roof slabs, accent bands.
  for (const [x0, x1, top, m] of [[-12, 22, 7.1, charcoal], [22, 30, 7.5, redPanel]]) {
    const r = mbox(x1 - x0 + 0.3, top - 6.8, 18.3, m); r.position.set((x0 + x1) / 2, (top + 6.8) / 2, 0); scene.add(r);
    slab(x0, x1, -9, 9, 6.8, F.mat('#5c5f63'), 0.3);
  }
  slab(-24.2, -11.9, -9.2, 9.2, 4.8, F.mat('#5c5f63'), 0.4);
  // Stone entrance tower with the sign, and blue LED cove under the parapet.
  for (const [x0, x1, y0, y1] of [[-4.4, -3.5, 0, 8.6], [-0.5, 0.4, 0, 8.6], [-3.5, -0.5, 2.6, 8.6]]) {
    const p = mbox(x1 - x0, y1 - y0, 1.0, stone); p.position.set((x0 + x1) / 2, (y0 + y1) / 2, 9.55); scene.add(p);
  }
  const towerSign = F.sign('HEARTLAND INN\nEXPRESS', { w: 4.8, h: 1.6, bg: '#e9e4da', fg: '#1d4f8f', font: 'bold 92px Georgia, serif', emissive: 0.5 });
  towerSign.position.set(-2, 7.5, 10.06); scene.add(towerSign);
  for (const [z, ry] of [[9.21, 0], [-9.21, Math.PI]]) {
    const strip = new T.Mesh(new T.PlaneGeometry(42, 0.08), F.glow('#3a7bff', 2.5));
    strip.position.set(9, 6.75, z); strip.rotation.y = ry; scene.add(strip);
  }

  // Porte-cochère canopy over the drop-off lane.
  const canopy = mbox(9.5, 0.6, 7, F.mat('#2f3338')); canopy.position.set(-2, 4.5, 13); scene.add(canopy);
  const soffit = new T.Mesh(new T.PlaneGeometry(9.3, 6.8), F.mat('#9c7b58', { roughness: 0.7 }));
  soffit.rotation.x = Math.PI / 2; soffit.position.set(-2, 4.19, 13); scene.add(soffit);
  for (const x of [-6, 2]) { const col = mbox(0.8, 4.2, 0.8, stone); col.position.set(x, 2.1, 15.9); scene.add(col); solid(x - 0.4, x + 0.4, 0, 4.2, 15.5, 16.3); }
  for (const x of [-4.5, -2, 0.5]) for (const z of [11, 13.5, 15.5]) F.box(0.3, 0.02, 0.3, F.glow('#fff4e0', 2), x, 4.17, z, scene);
  light(-2, 3.8, 13, '#ffe7c4', 14, 12);

  // ---------- interior partitions, floor 1 ----------
  // Lobby: back office behind the desk, pool glass, east wall with corridor opening.
  wall('x', -5, -12, -5, 0, CEIL, paint);
  wall('z', -5, -9, -5, 0, CEIL, paint);
  wall('z', -12, -9, 9, 0, 4.4, poolPaint, { holes: [door(-3, -1.8), win(0.5, 8, 0.9, 2.4)] });
  wall('z', -11.92, -9, 9, 0, CEIL, paint, { t: 0.01, collide: false, holes: [door(-3, -1.8), win(0.5, 8, 0.9, 2.4)] });   // lobby face: warm paint, not pool blue
  wall('z', 6.5, -9, -1, 0, CEIL, paint);
  wall('z', 6.5, 1, 9, 0, CEIL, loungeAccent);
  // Glass in the pool wall openings.
  { const g = new T.Mesh(new T.PlaneGeometry(7.5, 1.5), F.glass()); g.rotation.y = Math.PI / 2; g.position.set(-12, 1.65, 4.25); scene.add(g); }
  // Core: elevator shaft and stairwell walls (both floors).
  // Shaft and stairwell walls run floor-to-floor on level 1, so there's no visible gap between ceiling and slab.
  for (const y0 of [0, FLOOR2]) {
    const h = y0 === 0 ? FLOOR2 : CEIL;
    wall('z', 9, -4.5, -1, y0, h, paint);
    wall('x', -4.5, 6.5, 9, y0, h, paint);
    wall('z', 9.5, -8.5, -1, y0, h, paint);
    wall('z', 12, -8.5, -1, y0, h, paint);
    wall('x', -8.5, 9.5, 12, y0, h, paint);
  }
  wall('z', 6.5, -4.5, -1, FLOOR2, CEIL, corridorPaint);
  // Corridor walls, floor 1 (east wing). North side: elevator door, stair entry, gym glass, room doors.
  const ELEV = { x0: 7.15, x1: 8.35 };
  wall('x', -1, 6.5, 9.5, 0, FLOOR2, corridorPaint, { holes: [door(ELEV.x0, ELEV.x1, 2.2)] });
  wall('x', -1, 9.5, 12, 0, FLOOR2, corridorPaint, { holes: [door(9.55, 10.7, 2.2)] });
  wall('x', -1, 12, 18, 0, CEIL, corridorPaint, { holes: [door(12.15, 13.35), win(13.8, 16.6, 0.3, 2.6), door(16.8, 17.8)] });   // pool passage, gym glass, gym door
  wall('x', -1, 18, 30, 0, CEIL, corridorPaint, { holes: [18, 22, 26].map(x => ({ a0: x + 0.4, a1: x + 1.4, b0: 0, b1: 2.15 })) });
  wall('z', 18, -9, -1, 0, CEIL, paint);
  wall('x', 1, 6.5, 30, 0, CEIL, corridorPaint, { holes: [8.4, 12, 16.5, 21, 25.5].map(x => ({ a0: x + 0.4, a1: x + 1.4, b0: 0, b1: 2.15 })) });
  { const g = new T.Mesh(new T.PlaneGeometry(2.8, 2.3), F.glass()); g.position.set(15.2, 1.45, -1); scene.add(g); }

  // ---------- pool corridor (artifacts/roadside-inn/briefs/natasha-pool-plan.md) ----------
  // Guests reach the pool from the floor-1 corridor without crossing the lobby: a passage beside the stair (x 12.07..13.43,
  // taken from the gym), then a single-storey link along the back of the building to a key-card door into the pool.
  {
    const walkWins = [-10, -2, 5, 11].map(x => win(x - 0.6, x + 0.6, 0.9, 2.1));
    wall('x', -11.08, -14.06, 13.66, 0, 3.5, charcoal, { t: 0.16, holes: walkWins, collide: false });   // north skin
    wall('x', -10.95, -13.9, 13.5, 0, CEIL, paint, { t: 0.1, holes: walkWins });
    wall('z', -13.98, -11, -9.16, 0, 3.5, charcoal, { t: 0.16, collide: false }); wall('z', -13.85, -10.9, -9.16, 0, CEIL, paint, { t: 0.1 });
    wall('z', 13.58, -11, -9.16, 0, 3.5, charcoal, { t: 0.16, collide: false });
    wall('z', 13.5, -10.9, -1, 0, CEIL, paint);                      // passage east wall = the gym's new west wall
    wall('z', 12, -9, -8.5, 0, CEIL, paint);                         // closes the slot between the stair's north wall and the facade
    // The old facade's walkway face: painted, 2 cm proud of its charcoal skin, with the doors and the lobby window cut through.
    wall('x', -9.17, -13.85, 13.43, 0, CEIL, paint, { t: 0.02, holes: [door(-13.65, -12.65), { ...equipDoor }, win(-4, 0), door(12.07, 12.97)] });
    // Painted jambs and heads through the old facade's 28 cm: its stone and charcoal skins showed in the reveals.
    for (const [a0, a1, b1] of [[-13.65, -12.65, 2.15], [-7.9, -6.9, 2.15], [12.07, 12.97, 2.15]]) {
      for (const x of [a0 + 0.01, a1 - 0.01]) F.box(0.02, b1, 0.3, paint, x, 0, -9.04, scene);
      F.box(a1 - a0, 0.02, 0.3, paint, (a0 + a1) / 2, b1 - 0.02, -9.04, scene);
    }
    slab(-14.06, 13.66, -11.16, -9.16, 3.5, F.mat('#5c5f63'), 0.3);   // roof, under the floor-2 sills (3.95)
    for (const x of [-10, -2, 5, 11]) placeWindow(x, 0.9, -10.95, 1.2, 1.2, 0, { drapes: false });
    for (const x of [-10, -2, 5, 11]) light(x, CEIL + 0.01, -10.05, '#ffe7c7', 6, 7);
    for (const z of [-6, -2.5]) light(12.75, CEIL + 0.01, z, '#ffe7c7', 5, 6);
  }
  wall('z', 30, -1, 1, 0, CEIL, corridorPaint);

  // ---------- floor 2 walls ----------
  const south2 = [-12, -7.5, -3, 1.5, 12, 16.5, 21, 25.5], north2 = [-12, -7.5, -3, 1.5, 12, 16.5, 21, 25.5];
  wall('x', 1, -12, 6, FLOOR2, CEIL, corridorPaint, { holes: south2.slice(0, 4).map(x => ({ a0: x + 0.4, a1: x + 1.4, b0: 0, b1: 2.15 })) });
  wall('x', 1, 9, 30, FLOOR2, CEIL, corridorPaint, { holes: [{ a0: 9.4, a1: 10.4, b0: 0, b1: 2.15 }, ...south2.slice(4).map(x => ({ a0: x + 0.4, a1: x + 1.4, b0: 0, b1: 2.15, pass: x === 12 }))] });
  wall('x', -1, -12, 6.5, FLOOR2, CEIL, corridorPaint, { holes: north2.slice(0, 4).map(x => ({ a0: x + 0.4, a1: x + 1.4, b0: 0, b1: 2.15 })) });
  wall('x', -1, 6.5, 9.5, FLOOR2, CEIL, corridorPaint, { holes: [door(ELEV.x0, ELEV.x1, 2.2)] });
  wall('x', -1, 9.5, 12, FLOOR2, CEIL, corridorPaint, { holes: [door(10.8, 11.95, 2.2)] });
  wall('x', -1, 12, 30, FLOOR2, CEIL, corridorPaint, { holes: north2.slice(4).map(x => ({ a0: x + 0.4, a1: x + 1.4, b0: 0, b1: 2.15 })) });
  wall('z', -12, -1, 1, FLOOR2, CEIL, corridorPaint);
  wall('z', 30, -1, 1, FLOOR2, CEIL, corridorPaint);
  // Ice alcove (open to the corridor) beside the housekeeping closet.
  wall('z', 6, 1, 4, FLOOR2, CEIL, paint); wall('z', 9, 1, 4, FLOOR2, CEIL, paint); wall('x', 4, 6, 9, FLOOR2, CEIL, paint);
  // Our room, 212: x 12..16.5, z 1..9.
  const R = { x0: 12, x1: 16.5, z0: 1, z1: 9, y: FLOOR2 };
  wall('z', R.x0, R.z0, R.z1, FLOOR2, CEIL, paint);
  wall('z', R.x1, R.z0, R.z1, FLOOR2, CEIL, paint);
  wall('z', 13.9, R.z0, 4.1, FLOOR2, CEIL, F.mat('#f3f3f1', { roughness: 0.6 }), { holes: [door(2.8, 3.6)] });
  wall('x', 4.1, 13.9, R.x1, FLOOR2, CEIL, F.mat('#f3f3f1', { roughness: 0.6 }));
  const accent = mbox(0.02, CEIL, 4.8, roomAccent); accent.position.set(R.x1 - 0.08, FLOOR2 + CEIL / 2, 6.6); scene.add(accent);
  slabWithHoles(R.x0, R.x1, R.z0, R.z1, FLOOR2 + 0.012, roomCarpet, [[13.95, R.x1, R.z0, 4.05]]);
  slab(13.95, R.x1, R.z0, 4.05, FLOOR2 + 0.012, bathFloor);

  // ---------- walkable surfaces ----------
  floorAt(-400, 400, -400, 400, 0, 'ground');
  floorAt(-12, 30, -1, 1, FLOOR2, 'corridor 2');
  floorAt(10.8, 12, -2, -1, FLOOR2, 'stair top');
  floorAt(6, 9, 1, 4, FLOOR2, 'ice alcove');
  floorAt(R.x0, R.x1, R.z0, R.z1, FLOOR2, 'room 212');
  // Switchback stair: flight A climbs north, landing, flight B climbs south to floor 2.
  floorAt(9.5, 10.7, -6.5, -2, (x, z) => (-2 - z) / 4.5 * 1.6, 'stair A');
  floorAt(9.5, 12, -8.5, -6.5, 1.6, 'landing');
  floorAt(10.8, 12, -6.5, -2, (x, z) => 1.6 + (z + 6.5) / 4.5 * 1.6, 'stair B');
  solid(10.7, 10.8, 0, 6, -6.5, -1);       // divider between flights
  solid(10.8, 12, 0, 1.5, -6.5, -1);       // under flight B
  buildStairs();
  solid(-21, -16, -3, 0.7, -7, 3);         // pool: no swimming in street clothes
  solid(-15.2, -12.8, -3, 0.7, 4.6, 7);

  function buildStairs() {
    const tread = F.mat('#6f7378', { roughness: 0.8 }), nose = F.mat('#2c2f33');
    const steps = 9, run = 4.5 / steps, rise = 1.6 / steps;
    for (let i = 0; i < steps; i++) {
      const a = mbox(1.2, rise * (i + 1), run, tread); a.position.set(10.1, rise * (i + 1) / 2, -2 - run * (i + 0.5)); scene.add(a);
      const b = mbox(1.2, 0.18, run, tread); b.position.set(11.4, 1.6 + rise * (i + 1) - 0.09, -6.5 + run * (i + 0.5)); scene.add(b);
      F.box(1.2, 0.02, 0.04, nose, 10.1, rise * (i + 1) - 0.01, -2 - run * i - 0.02, scene);
    }
    const land = mbox(2.5, 0.2, 2, tread); land.position.set(10.75, 1.5, -7.5); scene.add(land);
    const rail = F.mat('#2c2f33', { metalness: 0.7, roughness: 0.3 });
    for (const [x, zA, zB, y0, y1] of [[10.72, -2, -6.5, 0.9, 2.5], [10.78, -6.5, -2, 2.5, 4.1]]) {
      const len = Math.hypot(zB - zA, y1 - y0), r = F.cyl(0.025, 0.025, len, rail, 0, 0, 0, scene, 8);
      r.position.set(x, (y0 + y1) / 2, (zA + zB) / 2); r.rotation.x = Math.atan2(zB - zA, y1 - y0);
    }
    // Stair tower finish (B9): painted concrete block, 8 x 16 in (203 x 406 mm) running bond with tooled joints, as in
    // every limited-service stair tower. Thin liners inside the tower, so the walls' other faces (passage, shaft) keep theirs.
    const block = blockWall();
    for (const [y0, h, doorHole] of [[0, FLOOR2, door(9.55, 10.7, 2.2)], [FLOOR2, CEIL, door(10.8, 11.95, 2.2)]]) {
      wall('z', 9.58, -8.42, -1.08, y0, h, block, { t: 0.01, collide: false });
      wall('z', 11.92, -8.42, -1.08, y0, h, block, { t: 0.01, collide: false });
      wall('x', -8.42, 9.58, 11.92, y0, h, block, { t: 0.01, collide: false });
      wall('x', -1.08, 9.58, 11.92, y0, h, block, { t: 0.01, collide: false, holes: [doorHole] });
    }
    // Light: surface-mounted LED wraparounds (a white housing, an opal lens) on the walls, where stair towers have them.
    const housing = F.mat('#e9e8e4', { roughness: 0.5 }), lens = F.glow('#fff8ee', 1.6);
    for (const [x, y, z, along] of [[10.75, 3.85, -8.36, 'x'], [9.64, 2.35, -1.7, 'z'], [11.3, FLOOR2 + 2.55, -1.14, 'x']]) {
      const [w, d] = along === 'x' ? [1.2, 0.1] : [0.1, 1.2];
      F.box(w, 0.09, d, housing, x, y, z, scene);
      F.box(along === 'x' ? 1.16 : 0.07, 0.012, along === 'x' ? 0.07 : 1.16, lens, x, y - 0.006, z, scene);
    }
    light(10.75, 3.7, -7.9, '#f6f3ea', 7, 7);   // landing
    light(9.8, 2.25, -1.7, '#f6f3ea', 5, 6);     // stair foot
    light(11.3, FLOOR2 + 2.45, -1.4, '#f6f3ea', 5, 6);   // stair top
    // Floor identification signs on the stair side of each door (fire code: floor, stair and exit direction).
    for (const [txt, x, y] of [['1\nSTAIR A\nEXIT TO LOBBY', 11.3, 1.5], ['2\nSTAIR A\nDOWN TO EXIT', 10.15, FLOOR2 + 1.5]]) {
      const id = F.sign(txt, { w: 0.3, h: 0.3, bg: '#24303f', font: 'bold 44px system-ui, sans-serif' });
      id.position.set(x, y, -1.095); id.rotation.y = Math.PI; scene.add(id);
    }
    const exit = F.sign('EXIT', { w: 0.4, h: 0.16, bg: '#b3141a', font: 'bold 110px system-ui, sans-serif', emissive: 1.5 });
    exit.position.set(10.1, 2.5, -0.895); scene.add(exit);
    const exit2 = exit.clone(); exit2.position.set(11.4, FLOOR2 + 2.5, -0.895); scene.add(exit2);
    const fl = F.sign('STAIR A\nFLOORS 1–2', { w: 0.4, h: 0.28, bg: '#24303f', font: 'bold 52px system-ui, sans-serif' });
    fl.position.set(9.3, 1.5, -0.895); scene.add(fl);
  }

  // ---------- zones (for sound and labels) ----------
  zone('pool corridor', -13.9, 13.5, -1, 3, -11.2, -9);
  zone('pool corridor', 12, 13.5, -1, 3, -9, -1);
  zone('pool equipment', -12, -5, -1, 3, -9, -5);
  zone('lobby', -12, 6.5, -1, 3, -9, 9);
  zone('pool', -24, -12, -1, 5, -9, 9);
  zone('gym', 13.5, 18, -1, 3, -9, -1);
  // stairs and elevator before the corridor they sit in: player.zone() takes the first match (the landing read CORRIDOR)
  zone('stairs', 9.5, 12, -1, 6.5, -8.5, -1);
  zone('elevator', 6.5, 9, -1, 6.5, -4.5, -1);
  zone('corridor', 6.5, 30, -1, 3, -9, 9);
  zone('room', R.x0, R.x1, 3, 6.5, R.z0, R.z1);
  zone('corridor', -12, 30, 3, 6.5, -9, 9); zones.at(-1).id = 'upstairs'; // its own zone for culling (zone-culling)

  // The zones and systems live in world/ (one file each, so they can be worked on apart). They share this context:
  // the building's helpers and materials, plus what each zone adds for those after it.
  const ctx = {
    scene, lib, game, updaters, add, loose, cordGeometry, interact, lightAnchors, unboxed,
    takeables, solid, light, statics, drywall, charcoal, downlight, lvt, regionalMap, painting, mbox, dm,
    seeded, poolTile, slab, wall, openableDoor, instances, south2, north2, floorAt, ELEV,
    placeWindow, R, people, outside, station, colliders, zones, trees, outdoor, lawn,
    concrete, equipDoor,
  };
  buildLamps(ctx);
  buildLobby(ctx);
  buildLivedIn(ctx);
  buildPool(ctx);
  buildGym(ctx);
  buildCorridors(ctx);
  buildElevator(ctx);
  buildTvs(ctx);       // before room 212: its set is a tvSet too
  buildRoom212(ctx);
  buildStaff(ctx);
  buildEntranceDoors(ctx);
  buildOutside(ctx);
  const { breakfast, elevator, room, clerk, walkers, carLamps } = ctx;
  // Dusk: lot lights carry the outside; day: they're off.
  const setTimeOfDay = name => { outdoor.forEach(a => (a.intensity = name === 'dusk' ? a.base : 0)); breakfast.group.visible = name === 'day'; if (carLamps) carLamps.visible = name === 'dusk'; };

  // Light cells: point lights cast no shadows, so a corridor light 2 m from room 212 would light it through the wall.
  // A light counts only inside its own cell (room 212 or the rest of the building), unless 212's door is open; lot lights always count.
  const in212 = p => p.y > FLOOR2 - 0.5 && p.y < FLOOR2 + CEIL + 0.5 && p.x > R.x0 && p.x < R.x1 && p.z > R.z0 && p.z < R.z1;
  const lightVisible = (a, eye) => a.outdoor || in212(a.pos) === in212(eye) || room.angle > 0.25;
  // What each zone can see through doors, glass and windows, for zone culling (parts/zone-culling.js): from the lobby
  // there's no drawing room 212, upstairs or the travel stop's shelves.
  const sees = {
    lobby: ['outside', 'corridor', 'pool', 'gym', 'stairs', 'elevator', 'pool corridor'],
    pool: ['lobby', 'outside', 'pool corridor'],
    'pool corridor': ['corridor', 'pool', 'lobby', 'outside', 'stairs', 'elevator'],
    'pool equipment': ['pool corridor'],
    gym: ['corridor', 'lobby', 'outside'],
    corridor: ['lobby', 'gym', 'stairs', 'elevator', 'pool', 'outside', 'pool corridor'],
    stairs: ['corridor', 'upstairs', 'lobby'],
    elevator: ['corridor', 'upstairs', 'lobby'],
    upstairs: ['room', 'stairs', 'elevator', 'outside'],
    room: ['upstairs', 'outside'],
    'travel stop': ['outside'],
    outside: ['lobby', 'pool', 'travel stop', 'pool corridor'],
  };
  return { setTimeOfDay, lightVisible, in212, walkers, clerk, colliders, surfaces, interact, updaters, lightAnchors, zones, sees, elevator, room, spawn: { x: 4.4, z: 17.0, yaw: 0.6 } };
}
