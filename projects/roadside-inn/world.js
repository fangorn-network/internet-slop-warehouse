// SPDX-License-Identifier: CC0-1.0
// The Heartland Inn: a two-storey interstate hotel, its parking lot, and the highway beyond.
// Plan (meters): building x -24..30, z -9..9; south (+z) faces the lot and I-44. Floor 1 is y=0, floor 2 is y=3.2.
import * as T from 'three';
import { economy } from './quality.js';
import * as F from './fixtures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

export const FLOOR2 = 3.2, CEIL = 2.95;

export function buildWorld(scene, lib, game) {
  const colliders = [], surfaces = [], interact = [], updaters = [], lightAnchors = [], zones = [];
  const add = (o, x = 0, y = 0, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); return o; };
  const solid = (x0, x1, y0, y1, z0, z1, on) => colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), on });
  const floorAt = (x0, x1, z0, z1, y, name) => surfaces.push({ x0, x1, z0, z1, y, name });
  const light = (x, y, z, color = '#ffd9a8', intensity = 9, distance = 9) => lightAnchors.push({ pos: new T.Vector3(x, y, z), color: new T.Color(color), intensity, distance });
  const trees = [], statics = [], outdoor = [];
  const zone = (name, x0, x1, y0, y1, z0, z1, indoor = true) => zones.push({ name, x0, x1, y0, y1, z0, z1, indoor });

  // ---------- materials ----------
  // Painted walls share Poly Haven plaster detail (normal + roughness) under a flat paint color.
  const plaster = color => lib.surface('wall-plaster', { repeat: [1, 1], color, normalScale: 0.18 });
  const paint = plaster('#e9e4da');
  const corridorPaint = plaster('#d8d0c0');
  const roomAccent = plaster('#a66d50');
  const poolPaint = plaster('#9fd0de');
  const ceiling = lib.surface('ceiling', { repeat: [1 / 3.66, 1 / 3.66] });     // ambientCG 2×2 ft acoustic tile
  const drywall = F.mat('#f4f3ef', { roughness: 0.95 });
  F.skin.wood = lib.surface('walnut', { repeat: [1, 1], color: '#c9a27e', roughness: 0.9 });
  const charcoal = F.mat('#3f444b', { roughness: 0.8 });
  const redPanel = F.mat('#8e2a2a', { roughness: 0.8 });
  const trim = F.mat('#e6e2d8', { roughness: 0.6 });
  const stone = lib.surface('stone-facade', { repeat: [0.5, 0.5] });
  const parquet = lib.surface('parquet', { repeat: [0.4, 0.4], grade: 'saturate(20%) brightness(1.3) contrast(0.95)', color: '#a9b8c9' });   // cool blue-grey herringbone
  const carpet = patternedCarpet();
  const roomCarpet = lib.surface('carpet', { repeat: [0.8, 0.8], color: '#a59a8b' });
  const tile = lib.surface('bath-tile', { repeat: [1.2, 0.8], color: '#e6dccb' });             // pool deck: beige rectangular tile
  const bathFloor = lib.surface('bath-tile', { repeat: [1.6, 1.6], color: '#9a9fa6' });     // bathroom: grey porcelain
  const poolTile = lib.surface('pool-tile', { repeat: [1, 1], color: '#a9dcec' });
  const asphalt = lib.surface('asphalt', { repeat: [0.12, 0.12], color: '#7a7a7a' });
  const lawn = lib.surface('lawn', { repeat: [0.25, 0.25], color: '#9aa874' });
  const concrete = lib.surface('concrete', { repeat: [0.4, 0.4], color: '#d8d4cc' });

  // Original hotel corridor carpet: navy field, teal lattice, gold medallions; Poly Haven wool for the pile.
  function patternedCarpet() {
    const tex = F.canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#1f2b44'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.strokeStyle = '#2f7f86'; g.lineWidth = 14;
      for (const o of [-w, 0, w]) { g.beginPath(); g.moveTo(o, 0); g.lineTo(o + w, h); g.moveTo(o + w, 0); g.lineTo(o, h); g.stroke(); }
      g.strokeStyle = '#3c4f74'; g.lineWidth = 4; g.strokeRect(w / 4, h / 4, w / 2, h / 2);
      for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]]) {
        g.fillStyle = '#c9a24a'; g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x + 46, y); g.lineTo(x, y + 46); g.lineTo(x - 46, y); g.closePath(); g.fill();
        g.fillStyle = '#8c3b2e'; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill();
      }
    });
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(1 / 1.6, 1 / 1.6);
    const pile = lib.surface('carpet', { repeat: [0.6, 0.6] });
    pile.map = tex; pile.color.set('#ffffff'); pile.normalScale.set(0.6, 0.6);
    return pile;
  }

  // Hotel art: a consistent "Heartland" series (barn at sunset, tractor in wheat, hay bales, windmill), painted on a
  // canvas then re-laid as thousands of short brushstrokes; black frame, white mat, same treatment everywhere.
  function painting(x, y, z, ry, w, h, motif) {
    const W = 384, H = Math.round(384 * h / w);
    const base = document.createElement('canvas'); base.width = W; base.height = H;
    const g = base.getContext('2d');
    let r = 7 + motif * 131; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    const sky = [['#2b3a67', '#e3825b', '#f6c177'], ['#5b8fb9', '#cfe3ef', '#f3e6c4'], ['#6d8fbf', '#d9e6ee', '#f1e0b8'], ['#3f4f80', '#d98a64', '#f3c98b']][motif % 4];
    const grad = g.createLinearGradient(0, 0, 0, H * 0.62); sky.forEach((c, i) => grad.addColorStop(i / 2, c));
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    if (motif % 4 !== 1) { g.fillStyle = 'rgba(255,240,200,0.9)'; g.beginPath(); g.arc(W * (0.25 + rnd() * 0.5), H * 0.5, H * 0.08, 0, 7); g.fill(); }
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(rnd() * W, H * (0.1 + rnd() * 0.25), W * 0.15, H * 0.04, 0, 0, 7); g.fill(); }
    const horizon = H * (0.55 + (motif % 2) * 0.05);
    g.fillStyle = '#5e6f3a'; g.beginPath(); g.moveTo(0, horizon);                                   // rolling hills
    for (let i = 0; i <= 8; i++) g.lineTo(i * W / 8, horizon - Math.sin(i * 0.9 + motif) * H * 0.04); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    const field = ['#c9a24a', '#b8963f', '#d4b05a'][motif % 3];
    g.fillStyle = field; g.fillRect(0, horizon + H * 0.06, W, H);
    g.strokeStyle = 'rgba(120,90,40,0.5)'; g.lineWidth = 2;                                           // furrows to the vanishing point
    for (let i = -10; i <= 20; i++) { g.beginPath(); g.moveTo(W / 2, horizon + H * 0.06); g.lineTo(i * W / 10, H); g.stroke(); }
    const ground = horizon + H * 0.06;
    if (motif % 4 === 0) {                                                                            // red barn and silo
      g.fillStyle = '#8f2b23'; g.fillRect(W * 0.55, ground - H * 0.2, W * 0.22, H * 0.2);
      g.beginPath(); g.moveTo(W * 0.53, ground - H * 0.2); g.lineTo(W * 0.66, ground - H * 0.3); g.lineTo(W * 0.79, ground - H * 0.2); g.fill();
      g.fillStyle = '#f2ede4'; g.fillRect(W * 0.63, ground - H * 0.12, W * 0.06, H * 0.12);
      g.fillStyle = '#9aa0a6'; g.fillRect(W * 0.8, ground - H * 0.33, W * 0.06, H * 0.33); g.beginPath(); g.arc(W * 0.83, ground - H * 0.33, W * 0.03, Math.PI, 0); g.fill();
    } else if (motif % 4 === 1) {                                                                     // vintage tractor
      const tx = W * 0.42, ty = ground + H * 0.08;
      g.fillStyle = '#b8352a'; g.fillRect(tx, ty - H * 0.1, W * 0.16, H * 0.07); g.fillRect(tx + W * 0.1, ty - H * 0.17, W * 0.06, H * 0.08);
      g.fillStyle = '#1e1e1e'; g.beginPath(); g.arc(tx + W * 0.03, ty, H * 0.045, 0, 7); g.fill(); g.beginPath(); g.arc(tx + W * 0.13, ty - H * 0.01, H * 0.065, 0, 7); g.fill();
      g.fillStyle = '#3a3a3a'; g.fillRect(tx + W * 0.04, ty - H * 0.2, W * 0.01, H * 0.1);
    } else if (motif % 4 === 2) {                                                                     // round hay bales
      for (let i = 0; i < 5; i++) { const bx = W * (0.15 + i * 0.17 + rnd() * 0.04), by = ground + H * (0.06 + rnd() * 0.15), br = H * (0.05 + by / H * 0.05);
        g.fillStyle = '#a8803a'; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill(); g.strokeStyle = '#7d5c26'; g.lineWidth = 2; g.beginPath(); g.arc(bx, by, br * 0.55, 0, 7); g.stroke(); }
    } else {                                                                                          // windmill
      const mx = W * 0.68, my = ground;
      g.strokeStyle = '#3b3b3b'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx - W * 0.04, my); g.lineTo(mx, my - H * 0.38); g.lineTo(mx + W * 0.04, my); g.stroke();
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; g.beginPath(); g.moveTo(mx, my - H * 0.38); g.lineTo(mx + Math.cos(a) * H * 0.12, my - H * 0.38 + Math.sin(a) * H * 0.12); g.stroke(); }
    }
    // Re-lay as brushstrokes: sample the composition, paint short jittered strokes.
    const px = g.getImageData(0, 0, W, H).data;
    const tex = F.canvasTexture(W, H, c => {
      c.drawImage(base, 0, 0);
      c.lineCap = 'round';
      for (let i = 0; i < 9000; i++) {
        const sx = rnd() * W, sy = rnd() * H, k = ((sy | 0) * W + (sx | 0)) * 4, j = (rnd() - 0.5) * 24;
        c.strokeStyle = `rgb(${px[k] + j},${px[k + 1] + j},${px[k + 2] + j})`; c.lineWidth = 2 + rnd() * 3;
        const a = sy < H * 0.55 ? (rnd() - 0.5) * 0.6 : 1.2 + (rnd() - 0.5) * 0.8, L = 3 + rnd() * 7;
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * L, sy + Math.sin(a) * L); c.stroke();
      }
    });
    const art = new T.Group(); art.name = 'Heartland framed artwork';
    F.box(w + 0.22, h + 0.22, 0.035, F.mat('#151515', { roughness: 0.4 }), 0, -(h + 0.22) / 2, 0, art);   // frame
    F.box(w + 0.16, h + 0.16, 0.038, F.mat('#f4f1ea', { roughness: 0.9 }), 0, -(h + 0.16) / 2, 0.002, art); // mat
    const pic = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    pic.position.z = 0.0215; art.add(pic);
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
  function slab(x0, x1, z0, z1, y, material, thick = 0.02) {
    const m = mbox(x1 - x0, thick, z1 - z0, material);
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

  // ---------- floor 1 slabs and ceilings ----------
  slab(-12, 6.5, -9, 9, 0.01, parquet);                         // lobby
  slab(6.5, 30, -1, 1, 0.01, carpet);                           // corridor F1
  slabWithHoles(6.5, 12, -9, -1, 0.01, concrete, [[6.5, 9, -4.5, -1]]);                        // core
  slab(12, 18, -9, -1, 0.01, lib.surface('gym-rubber', { repeat: [0.5, 0.5], color: '#9a9a9a' }));
  slabWithHoles(-24, -12, -9, 9, 0.01, tile, [[-21, -16, -7, 3], [-15.2, -12.8, 4.6, 7]]);
  slab(6.5, 12, 1, 9, 0.01, concrete);
  slab(12, 30, 1, 9, 0.01, roomCarpet); slab(18, 30, -9, -1, 0.01, roomCarpet);
  slabWithHoles(-12, 30, -9, 9, CEIL + 0.02, ceiling, [[9.5, 12, -8.5, -1], [6.5, 9, -4.5, -1]]);
  slab(-24, -12, -9, 9, 4.38, ceiling);                                      // below the roof slab's underside (4.4)
  // Floor 2 slab (seen from below as the ceiling above) and its walkable areas.
  slab(-12, 30, -1, 1, FLOOR2, carpet);
  slab(10.8, 12, -2, -1, FLOOR2, carpet);
  slab(6, 9, 1, 4, FLOOR2, tile);
  slabWithHoles(-12, 30, -9, 9, FLOOR2 + CEIL + 0.02, ceiling, [[12, 16.5, 1, 9]]);
  slab(12, 16.5, 1, 9, FLOOR2 + CEIL + 0.005, drywall);                       // guest room: drywall, not tile
  // Downlights (emissive discs) on both ceilings.
  const discs = [];
  for (let x = -10; x <= 5; x += 3) for (const z of [-6, -2, 2, 6]) discs.push([x, CEIL - 0.005, z]);
  for (let x = 8; x <= 29; x += 3.5) discs.push([x, CEIL - 0.005, 0], [x - 17, FLOOR2 + CEIL - 0.005, 0], [x, FLOOR2 + CEIL - 0.005, 0]);
  for (let x = -22; x <= -14; x += 4) for (const z of [-6, 0, 6]) discs.push([x, 4.355, z]);
  const disc = new T.InstancedMesh(new T.CircleGeometry(0.09, 16), F.glow('#fff4e0', 2.2), discs.length);
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
  facade('x', -9, -1, -24, -12, 0, 4.6, stone, [win(-22.5, -14, 0.5, 3.6)], poolPaint);
  facade('x', -9, -1, -12, 30, F1, H1, charcoal, [win(-4, 0), win(1.5, 5.5), win(13, 17, 1.2, 2.4), ...[18, 22, 26].map(x => win(x + 1.2, x + 2.8))]);
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
  const feature = mbox(6.6, CEIL, 0.06, stone); feature.position.set(-8.5, CEIL / 2, -4.9); scene.add(feature);
  const lobbySign = F.sign('Heartland Inn', { w: 2.2, h: 0.5, bg: '#f4f1ea', fg: '#1d4f8f', font: 'bold 96px Georgia, serif' });
  lobbySign.position.set(-8.5, 2.0, -4.835); scene.add(lobbySign);
  wall('z', -12, -9, 9, 0, 4.4, poolPaint, { holes: [door(-3, -1.8), win(0.5, 8, 0.9, 2.4)] });
  wall('z', 6.5, -9, -1, 0, CEIL, paint);
  wall('z', 6.5, 1, 9, 0, CEIL, roomAccent);
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
  wall('x', -1, 12, 18, 0, CEIL, corridorPaint, { holes: [win(12.4, 16.6, 0.3, 2.6), door(16.8, 17.8)] });
  wall('x', -1, 18, 30, 0, CEIL, corridorPaint, { holes: [18, 22, 26].map(x => ({ a0: x + 0.4, a1: x + 1.4, b0: 0, b1: 2.15 })) });
  wall('z', 18, -9, -1, 0, CEIL, paint);
  wall('x', 1, 6.5, 30, 0, CEIL, corridorPaint, { holes: [8.4, 12, 16.5, 21, 25.5].map(x => ({ a0: x + 0.4, a1: x + 1.4, b0: 0, b1: 2.15 })) });
  { const g = new T.Mesh(new T.PlaneGeometry(4.2, 2.3), F.glass()); g.position.set(14.5, 1.45, -1); scene.add(g); }
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
    light(10.7, 2.8, -5, '#f6f3ea', 7, 7);
    light(10.7, 6.0, -5, '#f6f3ea', 6, 7);
    const exit = F.sign('EXIT', { w: 0.4, h: 0.16, bg: '#b3141a', font: 'bold 110px system-ui, sans-serif', emissive: 1.5 });
    exit.position.set(10.1, 2.5, -0.895); scene.add(exit);
    const exit2 = exit.clone(); exit2.position.set(11.4, FLOOR2 + 2.5, -0.895); scene.add(exit2);
    const fl = F.sign('STAIR A\nFLOORS 1–2', { w: 0.4, h: 0.28, bg: '#24303f', font: 'bold 52px system-ui, sans-serif' });
    fl.position.set(9.3, 1.5, -0.895); scene.add(fl);
  }

  // ---------- zones (for sound and labels) ----------
  zone('lobby', -12, 6.5, -1, 3, -9, 9);
  zone('pool', -24, -12, -1, 5, -9, 9);
  zone('gym', 12, 18, -1, 3, -9, -1);
  zone('corridor', 6.5, 30, -1, 3, -9, 9);
  zone('stairs', 9.5, 12, -1, 6.5, -8.5, -1);
  zone('elevator', 6.5, 9, -1, 6.5, -4.5, -1);
  zone('room', R.x0, R.x1, 3, 6.5, R.z0, R.z1);
  zone('corridor', -12, 30, 3, 6.5, -9, 9);

  // ---------- lobby furnishing ----------
  add(lib.model('hotel-front-desk', { origin: true }), -8.4, 0, -3.3);
  solid(-10.75, -6.05, 0, 1.2, -3.95, -2.9);
  solid(-6.05, -5, 0, 1.2, -4.95, -2.9);                     // keep guests out from behind the desk
  solid(-12, -10.75, 0, 1.2, -4.95, -2.9);
  light(-8.4, 2.7, -2.5, '#ffe2b5', 10, 8);
  for (const [x, z] of [[-2, 4.4], [-3.6, -2.2]]) add(lib.model('hotel-lattice-pendant', { origin: true }), x, CEIL - 1.53, z);
  light(-2.5, 2.6, 0, '#ffe0b0', 12, 10);
  // West seating: sectional, lounge chairs, coffee table, plants.
  add(lib.model('hotel-lobby-sofa', { origin: true }), -9.7, 0, 5.3, Math.PI / 2);
  add(lib.model('ph-mid-century-lounge-chair', { height: 1.0 }), -6.6, 0, 3.6, -Math.PI * 0.75);
  add(lib.model('ph-mid-century-lounge-chair', { height: 1.0 }), -6.6, 0, 7.0, -Math.PI * 0.25);
  add(lib.model('ph-modern-coffee-table-01', { height: 0.4 }), -8.0, 0, 5.3);
  add(lib.model('ph-throw-pillows-01', { height: 0.3 }), -9.9, 0.45, 4.6, Math.PI / 2);
  add(lib.model('ph-potted-plant-01', { height: 1.6 }), -11.4, 0, 8.4);
  add(lib.model('ph-potted-plant-04', { height: 0.3 }), -8.0, 0.4, 5.1);
  const rug = new T.Mesh(new T.CircleGeometry(2.3, 64), rugMaterial('leaves', [1, 1])); rug.rotation.x = -Math.PI / 2; rug.position.set(-8.2, 0.024, 5.3); scene.add(rug);
  solid(-10.2, -9.0, 0, 0.9, 3.9, 6.7); solid(-8.4, -7.6, 0, 0.5, 4.7, 5.9);
  light(-8, 2.6, 5, '#ffdcae', 9, 8);
  // Brochure rack and luggage cart near the entrance.
  const rack = F.box(0.6, 1.4, 0.3, F.mat('#3b3027'), 0, 0, 0); add(rack, -4.6, 0, 1.2, Math.PI / 2);
  for (let i = 0; i < 8; i++) F.box(0.1, 0.22, 0.02, F.mat(['#d23b2f', '#2f7bd2', '#3fa34d', '#f4b400'][i % 4]), (i % 2) * 0.24 - 0.12, 0.4 + Math.floor(i / 2) * 0.25, 0.16, rack);
  add(lib.model('hotel-luggage-cart', { origin: true }), 0.4, 0, -6.5, 0.3); solid(-0.2, 1.0, 0, 2, -6.9, -6.1);

  // Pantry (NE): coffee counter, vending, cooler, bar tables.
  add(lib.model('hotel-coffee-station', { origin: true }), 3.4, 0, -8.6); solid(1.8, 5, 0, 1, -8.95, -8.25);
  add(lib.model('hotel-snack-vending', { origin: true, rotate: -Math.PI / 2 }), 6.0, 0, -6.6); solid(5.5, 6.5, 0, 2, -7.1, -6.1);
  add(lib.model('g3-vending-machine', { rotate: -Math.PI / 2, height: 1.85 }), 6.03, 0, -5.4); solid(5.55, 6.5, 0, 2, -5.88, -4.92);
  for (const [x, z] of [[2.2, -5.4], [3.9, -3.2]]) {
    add(lib.model('ph-round-wooden-table-01', { height: 1.0 }), x, 0, z);
    solid(x - 0.45, x + 0.45, 0, 1, z - 0.45, z + 0.45);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; add(lib.model('ph-bar-chair-round-01', { height: 0.75 }), x + Math.cos(a) * 0.9, 0, z + Math.sin(a) * 0.9, -a - Math.PI / 2); }
  }
  add(F.trashReceptacle(), 1.35, 0, -8.6);
  add(lib.model('ph-wall-clock', { height: 0.4 }), 0.75, 1.9, -8.86);
  light(3.4, 2.6, -6, '#fff0d8', 10, 8);
  const pantrySign = F.sign('THE PANTRY', { w: 1.6, h: 0.3, bg: '#2e4057', font: 'bold 80px system-ui, sans-serif' });
  pantrySign.position.set(3.4, 2.5, -8.865); scene.add(pantrySign);

  // Hot breakfast (mornings only) along the north windows.
  const bm = add(lib.model('hotel-breakfast-bar', { origin: true }), -2.2, 0, -8.5);
  const breakfast = { group: bm, waffleLight: bm.getObjectByName('waffle_light') }; solid(-3.95, -0.45, 0, 1, -8.9, -8.12);
  breakfast.group.visible = false;
  const breakfastSign = F.sign('Hot Breakfast · 6:00 – 9:30 AM', { w: 1.8, h: 0.22, bg: '#2e4057', font: '600 44px system-ui, sans-serif' });
  breakfastSign.position.set(-2.2, 2.45, -8.865); scene.add(breakfastSign);
  let waffleBusy = false;
  interact.push({ pos: new T.Vector3(-2.1, 1.1, -7.9), r: 1.3, when: () => breakfast.group.visible, label: () => game.has('waffle') ? 'Waffle maker' : 'Make a waffle',
    use: () => {
      if (waffleBusy) return game.say('It’s cooking. Don’t open it early. Everyone opens it early.');
      if (game.has('waffle')) return game.say('One waffle per guest is the honor system. You honor it.');
      waffleBusy = true; game.sound.hum(true); breakfast.waffleLight.material = F.glow('#ff3b30', 1.5);
      game.say('Batter in, lid closed, flip. The timer counts down from two minutes. You wait.');
      setTimeout(() => { waffleBusy = false; game.sound.hum(false); game.sound.beep(true); breakfast.waffleLight.material = F.glow('#57ff9a', 0.6); game.give('waffle'); game.say('A golden waffle, shaped like Missouri. It’s the state, not the… yes, the state.'); }, 7000);
    } });
  interact.push({ pos: new T.Vector3(-3.3, 1.1, -7.9), r: 1.1, when: () => breakfast.group.visible, label: () => 'Eggs & sausage',
    use: () => { if (game.has('breakfast plate')) return game.say('Your plate is already a structural achievement.'); game.give('breakfast plate'); game.say('Powdered eggs, two sausage links, a biscuit you didn’t mean to take.'); } });
  interact.push({ pos: new T.Vector3(-0.8, 1.2, -7.9), r: 1.1, when: () => breakfast.group.visible, label: () => 'Orange juice',
    use: () => { game.sound.pour(); game.give('orange juice'); game.say('“Orange drink.” Close enough.'); } });

  // Lounge (SE) with the big TV on the east wall.
  const loungeTV = F.flatTV(1.9); add(loungeTV.group, 6.4, 1.75, 5, -Math.PI / 2);
  const tvCabinet = F.box(2.2, 0.55, 0.45, F.mat('#5b4a3c'), 0, 0, 0); add(tvCabinet, 6.2, 0, 5, -Math.PI / 2); solid(5.95, 6.5, 0, 0.6, 3.9, 6.1);
  add(lib.model('hotel-lobby-sofa', { origin: true }), 1.9, 0, 5, Math.PI / 2); solid(1.5, 2.5, 0, 0.9, 3.9, 6.1);
  add(lib.model('hotel-accent-chair-green', { origin: true }), 3.6, 0, 7.4, Math.PI);
  add(lib.model('hotel-accent-chair-green', { origin: true }), 3.6, 0, 2.6, 0);
  add(lib.model('ph-ottoman-01', { height: 0.42 }), 3.6, 0, 5);
  add(lib.model('ph-side-table-01', { height: 0.5 }), 2.0, 0, 7.1);
  add(lib.model('ph-potted-plant-01', { height: 1.6 }), 5.9, 0, 8.4);
  const rug2 = new T.Mesh(new T.PlaneGeometry(3.6, 4.6), rugMaterial('stripes', [1, 1])); rug2.rotation.x = -Math.PI / 2; rug2.position.set(3.6, 0.015, 5); scene.add(rug2);
  light(3.8, 2.2, 5, '#ffdcae', 9, 8);

  // ---------- lobby atmosphere (after the Holiday Inn reference photos) ----------
  {
    // Walnut ceiling feature over the lounge with its own downlights.
    const soffit = mbox(4.4, 0.18, 3.8, F.skin.wood); soffit.position.set(3.6, CEIL - 0.09, 5); scene.add(soffit);
    for (const [dx, dz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]]) F.box(0.16, 0.01, 0.16, F.glow('#fff1d8', 2.2), 3.6 + dx, CEIL - 0.19, 5 + dz, scene);
    // Drum pendants over the round seating area and the pantry tables.
    for (const [x, z, sc] of [[-8.2, 5.3, 1.25], [2.2, -5.4, 0.85], [3.9, -3.2, 0.85]]) { const p = lib.model('hotel-drum-pendant', { origin: true }); p.scale.setScalar(sc); add(p, x, CEIL - 1.03 * sc, z); }
    // Walnut-clad columns with blue LED reveals, flanking the walk from the doors.
    for (const x of [-5.2, 1.2]) {
      const c = mbox(0.55, CEIL, 0.55, F.skin.wood); c.position.set(x, CEIL / 2, 2.2); scene.add(c);
      solid(x - 0.28, x + 0.28, 0, CEIL, 1.92, 2.48);
      for (const [dx, dz] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) F.box(0.02, CEIL - 0.3, 0.02, F.glow('#3a7bff', 2.2), x + dx, 0.15, 2.2 + dz, scene);
    }
    // Framed abstract prints.
    painting(6.395, 1.75, 2.3, -Math.PI / 2, 0.9, 0.7, 1);
    painting(6.395, 1.75, 7.7, -Math.PI / 2, 0.9, 0.7, 2);
    painting(-11.895, 1.8, -0.6, Math.PI / 2, 1.0, 0.75, 0);
    // Shelving, centerpiece, floor lamps, snake plants.
    add(lib.model('hotel-shelving-unit', { origin: true, rotate: Math.PI / 2 }), -4.78, 0, -7.0); solid(-4.95, -4.55, 0, 2, -7.95, -6.05);
    add(lib.model('hotel-centerpiece', { origin: true }), -2, 0, 4.4); solid(-2.6, -1.4, 0, 1, 3.8, 5.0);
    for (const [x, z] of [[-10.35, 3.75], [-10.35, 6.85], [1.4, 3.45]]) { add(lib.model('hotel-floor-lamp', { origin: true }), x, 0, z); light(x, 1.5, z, '#ffcf8f', 3, 4); }
    for (const [x, z] of [[-11.4, 0.4], [5.85, 1.6], [0.9, 8.4], [-4.6, -4.4], [-6.1, 8.4]]) { add(lib.model('hotel-snake-plant', { origin: true }), x, 0, z); solid(x - 0.2, x + 0.2, 0, 1, z - 0.2, z + 0.2); }
    // Breakfast communal table with stools.
    const table = new T.Group();
    F.box(2.4, 0.05, 0.9, F.skin.wood, 0, 1.0, 0, table);
    for (const x of [-1.0, 1.0]) F.box(0.08, 1.0, 0.7, F.mat('#2b2d30', { metalness: 0.6, roughness: 0.4 }), x, 0, 0, table);
    add(table, -2.2, 0, -5.6); solid(-3.4, -1.0, 0, 1.05, -6.05, -5.15);
    for (const [dx, dz, ry] of [[-0.8, -0.75, 0], [0, -0.75, 0], [0.8, -0.75, 0], [-0.8, 0.75, Math.PI], [0, 0.75, Math.PI], [0.8, 0.75, Math.PI]]) add(lib.model('ph-bar-chair-round-01', { height: 0.75 }), -2.2 + dx, 0, -5.6 + dz, ry);
    // Second seating group by the west windows.
    add(lib.model('hotel-accent-chair-mustard', { origin: true }), -10.9, 0, 1.4, Math.PI * 0.6);
    add(lib.model('hotel-accent-chair-green', { origin: true }), -9.2, 0, 1.0, -Math.PI * 0.75);
    add(lib.model('ph-side-table-01', { height: 0.5 }), -10.1, 0, 0.6);
    add(lib.model('hotel-table-lamp', { origin: true }), -10.1, 0.5, 0.6);
    add(lib.model('ph-potted-plant-04', { height: 0.32 }), -2.2, 1.05, -5.6);
    light(-10, 1.2, 1, '#ffcf8f', 3, 4);
  }

  // ---------- pool wing ----------
  {
    const basin = (x0, x1, z0, z1, depth) => {
      slab(x0, x1, z0, z1, -depth, poolTile, 0.1);
      wall('x', z0, x0, x1, -depth, depth, poolTile, { t: 0.05, collide: false });
      wall('x', z1, x0, x1, -depth, depth, poolTile, { t: 0.05, collide: false });
      wall('z', x0, z0, z1, -depth, depth, poolTile, { t: 0.05, collide: false });
      wall('z', x1, z0, z1, -depth, depth, poolTile, { t: 0.05, collide: false });
      const coping = F.mat('#f1ece2', { roughness: 0.6 });
      for (const [w, d, x, z] of [[x1 - x0 + 0.5, 0.25, (x0 + x1) / 2, z0 - 0.12], [x1 - x0 + 0.5, 0.25, (x0 + x1) / 2, z1 + 0.12], [0.25, z1 - z0, x0 - 0.12, (z0 + z1) / 2], [0.25, z1 - z0, x1 + 0.12, (z0 + z1) / 2]]) F.box(w, 0.04, d, coping, x, 0.0, z, scene);
      const band = new T.Mesh(new T.PlaneGeometry(x1 - x0, 0.12), F.mat('#1f4f8a')); band.position.set((x0 + x1) / 2, -0.12, z0 + 0.03); scene.add(band);
    };
    basin(-21, -16, -7, 3, 1.6);
    basin(-15.2, -12.8, 4.6, 7, 0.9);
    const water = waterSurface(5, 10, 0.22); water.position.set(-18.5, -0.14, -2); scene.add(water);
    const tub = waterSurface(2.4, 2.4, 0.5, '#7fd8e8'); tub.position.set(-14, -0.12, 5.8); scene.add(tub);
    const poolLight = new T.PointLight('#5fd6ff', 6, 7); poolLight.position.set(-18.5, -0.8, -2); scene.add(poolLight);
    const bubbles = new T.InstancedMesh(new T.SphereGeometry(0.03, 6, 4), F.mat('#ffffff', { roughness: 0.3, transparent: true, opacity: 0.7 }), 60);
    scene.add(bubbles);
    const bm = new T.Object3D(), seeds = Array.from({ length: 60 }, () => [Math.random() * 2.2 - 1.1, Math.random() * 2.2 - 1.1, Math.random()]);
    updaters.push((dt, t) => {
      water.material.normalMap.offset.set(t * 0.02, t * 0.013);
      tub.material.normalMap.offset.set(t * 0.18, -t * 0.11);
      seeds.forEach(([x, z, p], i) => { const k = (t * 0.8 + p) % 1; bm.position.set(-14 + x, -0.12 + Math.sin(k * Math.PI) * 0.03, 5.8 + z); bm.scale.setScalar(0.5 + k); bm.updateMatrix(); bubbles.setMatrixAt(i, bm.matrix); });
      bubbles.instanceMatrix.needsUpdate = true;
    });
    // Blender rails reach toward -Z (three) into the water; rotate so they hang over each pool edge.
    for (const [x, z, ry] of [[-16.3, -6.2, Math.PI / 2], [-20.7, 2.4, -Math.PI / 2], [-13.1, 6.6, Math.PI / 2]]) add(lib.model('hotel-pool-rail', { origin: true, rotate: ry }), x, 0, z);
    for (let i = 0; i < 4; i++) { add(lib.model('hotel-pool-chaise', { origin: true, rotate: Math.PI / 2 }), -23.0, 0, -6 + i * 2.6); solid(-23.6, -22.4, 0, 0.6, -6.5 + i * 2.6, -5.5 + i * 2.6); }
    for (const z of [6.5, 8]) add(lib.model('ph-modern-arm-chair-01', { height: 0.85 }), -20 + (z - 6.5) * 2, 0, z, Math.PI);
    add(lib.model('ph-wetfloorsign-01', { height: 0.63 }), -15.4, 0, -4, 0.6);
    add(lib.model('ph-lifebuoy', { height: 0.8 }), -18.5, 1.6, -8.8);
    add(lib.model('ph-wall-clock', { height: 0.4 }), -12.15, 3.2, -6, -Math.PI / 2);
    add(lib.model('ph-potted-plant-04', { height: 0.35 }), -20, 0.45, 7.2);
    const rules = F.sign('POOL RULES\nNo lifeguard on duty · Swim at your own risk\nPool hours 6 AM – 10 PM · No diving\nChildren must be supervised · No glass', { w: 1.3, h: 0.9, bg: '#f6f6f2', fg: '#1d3557', font: '600 32px system-ui, sans-serif' });
    rules.position.set(-13.6, 1.7, -8.865); scene.add(rules);
    for (const [txt, x, z] of [['3 FT', -18.5, 3.1], ['5 FT', -18.5, -7.1], ['NO DIVING', -16.4, -2]]) {
      const s = F.sign(txt, { w: 0.6, h: 0.18, bg: '#f1ece2', fg: '#1f2a44', font: 'bold 70px system-ui, sans-serif' });
      s.rotation.x = -Math.PI / 2; s.position.set(x, 0.045, z + (z > 0 ? 0.3 : z < -6 ? -0.3 : 0)); if (txt === 'NO DIVING') s.position.x = -15.6, s.rotation.z = Math.PI / 2; scene.add(s);
    }
    light(-18, 4.0, -4, '#eaf6ff', 14, 12); light(-18, 4.0, 5, '#eaf6ff', 14, 12);
  }

  function waterSurface(w, d, strength, color = '#4fb6d4') {
    const size = 128, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
      const dx = Math.cos(u * 3 + v) * 0.5 + Math.cos(u * 7 - v * 2) * 0.3 + Math.cos(u * 2 + v * 5) * 0.2;
      const dy = Math.sin(v * 4 - u) * 0.5 + Math.sin(v * 6 + u * 3) * 0.3 + Math.cos(u * 5 + v * 2) * 0.2;
      const i = (y * size + x) * 4;
      data.set([128 + dx * 60, 128 + dy * 60, 255, 255], i);
    }
    const n = new T.DataTexture(data, size, size); n.wrapS = n.wrapT = T.RepeatWrapping; n.repeat.set(w / 2, d / 2); n.needsUpdate = true;
    const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ color, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.78, normalMap: n, normalScale: new T.Vector2(strength, strength) }));
    m.rotation.x = -Math.PI / 2;
    return m;
  }

  // ---------- gym (seen through the glass) ----------
  for (const x of [13.2, 14.6]) add(lib.model('g3-treadmill', { width: 1.85, rotate: Math.PI / 2 }), x, 0, -6.4);
  add(lib.model('g3-exercise-bike', { height: 1.15, rotate: Math.PI / 2 }), 16.4, 0, -6.5);
  add(lib.model('hotel-dumbbell-rack', { origin: true }), 15.0, 0, -8.6);
  const mirror = new T.Mesh(new T.PlaneGeometry(5.6, 2), F.mat('#cfd7dc', { metalness: 1, roughness: 0.05 })); mirror.position.set(15, 1.3, -8.84); scene.add(mirror);
  const gymTV = F.flatTV(1.1); add(gymTV.group, 17.85, 2.1, -5, -Math.PI / 2);
  const gymSign = F.sign('FITNESS CENTER\n5 AM – 11 PM · Room key required', { w: 1.2, h: 0.36, bg: '#24303f', font: 'bold 44px system-ui, sans-serif' });
  gymSign.position.set(14.5, 2.75, -0.885); scene.add(gymSign);
  add(lib.model('ph-korean-fire-extinguisher-01', { height: 0.6 }), 12.4, 0.9, -1.15);
  light(15, 2.6, -5, '#f4f8ff', 10, 8);
  // Gym door: glass, key card from the corridor, push from inside.
  {
    const d = openableDoor('GYM'); d.group.position.set(17.3, 0, -1); scene.add(d.group);
    d.group.getObjectByName('leaf').material = F.mat('#b9cfd8', { transparent: true, opacity: 0.35, roughness: 0.05 });
    const st = { open: false, angle: 0, timer: 0 };
    solid(16.8, 17.8, 0, 2.2, -1.08, -0.92, () => st.angle < 1.1);
    interact.push({ pos: new T.Vector3(17.3, 1.2, -0.75), r: 1.4, when: p => p.z > -1, label: () => game.has('key card') ? 'Gym door (tap key)' : 'Gym door',
      use: () => { if (!game.has('key card')) { game.sound.beep(false); return game.say('“Fitness center — room key required.”'); } game.sound.beep(true); st.open = true; st.timer = 6; } });
    interact.push({ pos: new T.Vector3(17.3, 1.2, -1.3), r: 1.2, when: p => p.z < -1, label: () => 'Open door', use: () => { st.open = true; st.timer = 5; } });
    updaters.push((dt, t, player) => {
      const inDoorway = player.y < 1 && player.x > 16.7 && player.x < 17.9 && player.z > -1.6 && player.z < -0.4;
      if (st.open) { st.timer -= dt; if (st.timer < 0 && !inDoorway) { st.open = false; game.sound.thud(); } }
      const target = st.open ? 1.45 : 0;
      st.angle += Math.sign(target - st.angle) * Math.min(Math.abs(target - st.angle), dt * 2);
      d.leaf.rotation.y = st.angle;
    });
    for (const x of [13.2, 14.6]) solid(x - 0.42, x + 0.42, 0, 1.4, -7.4, -5.4);
    solid(16.15, 16.65, 0, 1.2, -7.1, -5.9); solid(14.25, 15.75, 0, 0.9, -8.85, -8.35);
  }

  // ---------- corridors ----------
  // The Heartland series between guest-room doors on both floors, plus two in room 212.
  {
    let motif = 0;
    for (const x of [-12, -3, 16.5, 25.5]) painting(x + 3.2, FLOOR2 + 1.6, 0.895, Math.PI, 0.8, 0.6, motif++);
    for (const x of [-7.5, 1.5, 12, 21]) painting(x + 3.2, FLOOR2 + 1.6, -0.895, 0, 0.8, 0.6, motif++);
    for (const x of [16.5, 25.5]) painting(x + 3.2, 1.6, 0.895, Math.PI, 0.8, 0.6, motif++);
    for (const x of [18, 22]) painting(x + 2.7, 1.6, -0.895, 0, 0.8, 0.6, motif++);
    painting(16.38, FLOOR2 + 2.12, 6.6, -Math.PI / 2, 1.45, 0.58, 4); // centered above headboard
    painting(12.105, FLOOR2 + 2.25, 6.4, Math.PI / 2, 1.05, 0.42, 0);      // above the TV, with clear space above its cabinet
    painting(13.81, FLOOR2 + 1.6, 1.9, -Math.PI / 2, 0.45, 0.6, 3);   // entry hall
  }
  for (const x of [10, 22]) light(x, 2.7, 0, '#ffe7c7', 7, 8);
  for (const x of [-8, 2, 10, 20, 27]) light(x, FLOOR2 + 2.7, 0, '#ffe7c7', 7, 8);
  for (const [x, y] of [[20, 0], [-4, FLOOR2], [24, FLOOR2]]) add(lib.model('ph-korean-fire-extinguisher-01', { height: 0.6 }), x, y + 0.9, -0.85);
  // Directory signs on the south corridor wall, read by someone stepping out of the elevator (facing +z:
  // their left is east, their right is west). Placed on clear wall between the linen/staff door and room 212/102.
  const directory = F.sign('← 209–218        201–208 →', { w: 1.3, h: 0.2, bg: '#24303f', font: 'bold 44px system-ui, sans-serif' });
  directory.position.set(11.2, FLOOR2 + 1.6, 0.895); directory.rotation.y = Math.PI; scene.add(directory);
  const directory1 = F.sign('← 101–108        LOBBY · POOL →', { w: 1.3, h: 0.2, bg: '#24303f', font: 'bold 40px system-ui, sans-serif' });
  directory1.position.set(11.2, 1.6, 0.895); directory1.rotation.y = Math.PI; scene.add(directory1);
  // Guest room doors (locked) on both floors: one instanced Blender door model for all of them, plus a number plate each.
  const staticDoors = [];
  const doorAt = (number, x, y, side) => {
    const cx = x + 0.5, z = side > 0 ? 1 : -1, ry = side > 0 ? Math.PI : 0;
    staticDoors.push(new T.Matrix4().compose(new T.Vector3(cx, y, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ry), new T.Vector3(1, 1, 1)));
    const plate = F.sign(String(number), { w: 0.2, h: 0.12, bg: '#24303f', font: 'bold 150px system-ui, sans-serif' });
    plate.position.set(cx + (side > 0 ? -0.78 : 0.78), y + 1.5, z + (side > 0 ? -0.11 : 0.11)); plate.rotation.y = ry; scene.add(plate);
  };
  [12, 16.5, 21, 25.5].forEach((x, i) => doorAt(102 + i * 2, x + 0.4, 0, 1));
  [18, 22, 26].forEach((x, i) => doorAt(103 + i * 2, x + 0.4, 0, -1));
  doorAt('STAFF', 8.8, 0, 1);
  // West wing 202–208, east wing 212 (ours, built separately) through 218.
  south2.forEach((x, i) => { if (x !== 12) doorAt(i < 4 ? 202 + i * 2 : 212 + (i - 4) * 2, x + 0.4, FLOOR2, 1); });
  north2.forEach((x, i) => doorAt(201 + i * 2, x + 0.4, FLOOR2, -1));
  doorAt('LINEN', 9.4, FLOOR2, 1);
  instances('hotel-room-door', staticDoors);
  for (const [x, y, z] of [[9.3, 0, 1], [9.9, FLOOR2, 1]]) interact.push({ pos: new T.Vector3(x, y + 1.2, z - 0.2), r: 1.4, label: () => 'Staff door', use: () => game.say('Staff only. Locked.') });
  interact.push(...[12, 16.5, 21, 25.5].map(x => lockedDoor(x + 0.9, 0, 0.8)), ...[18, 22, 26].map(x => lockedDoor(x + 0.9, 0, -0.8)));
  interact.push(...south2.filter(x => x !== 12).map(x => lockedDoor(x + 0.9, FLOOR2, 0.8)), ...north2.map(x => lockedDoor(x + 0.9, FLOOR2, -0.8)));
  // An openable guest-room door: {group, leaf (hinge pivot), led (lock LED mesh)} like the old fixture.
  function openableDoor(label) {
    const group = lib.model('hotel-room-door', { origin: true });
    const leaf = group.getObjectByName('door_leaf'), led = group.getObjectByName('led');
    led.material = F.glow('#ff3b30', 0);
    const plate = F.sign(label, { w: 0.2, h: 0.12, bg: '#24303f', font: 'bold 150px system-ui, sans-serif' });
    plate.position.set(0.78, 1.5, 0.11); group.add(plate);
    return { group, leaf, led };
  }
  function lockedDoor(x, y, z) {
    return { pos: new T.Vector3(x, y + 1.2, z), r: 1.3, label: () => 'Knock', use: () => { game.sound.knock(); game.say(Math.random() < 0.3 ? 'A muffled TV goes quiet. Nobody answers.' : 'No answer. Not your room anyway.'); } };
  }

  // Ice alcove on floor 2.
  add(lib.model('hotel-ice-machine', { origin: true, rotate: Math.PI }), 7.5, FLOOR2, 3.6);
  light(7.5, FLOOR2 + 2.6, 2.5, '#f2f6ff', 6, 6);
  interact.push({ pos: new T.Vector3(7.5, FLOOR2 + 1, 3.1), r: 1.5, label: () => game.has('ice bucket') ? 'Fill ice bucket' : 'Ice machine',
    use: () => {
      if (game.has('ice bucket (full)')) return game.say('Your bucket is already full of ice.');
      if (!game.has('ice bucket')) return game.say('The ice machine rumbles. You need the ice bucket from your room.');
      game.sound.ice(); game.take('ice bucket'); game.give('ice bucket (full)'); game.say('Ice clatters into the bucket. Loudly. At this hour.');
    } });

  // ---------- elevator ----------
  const elevator = buildElevator();
  function buildElevator() {
    const car = new T.Group(), steel = F.mat('#b8bec4', { metalness: 0.9, roughness: 0.25 });
    const cabin = lib.model('hotel-elevator-car', { origin: true }); cabin.name = 'Elevator cabin'; car.add(cabin);             // Blender car interior (door side +Z)
    const display = F.canvasTexture(64, 64, (g, w, h) => { g.fillStyle = '#100'; g.fillRect(0, 0, w, h); });
    const disp = new T.Mesh(new T.PlaneGeometry(0.12, 0.12), new T.MeshBasicMaterial({ map: display })); disp.position.set(1.09, 1.6, 1.3); disp.rotation.y = -Math.PI / 2; car.add(disp);
    car.position.set(7.75, 0, -2.75);
    scene.add(car);
    const carLight = { pos: new T.Vector3(7.75, 2.2, -2.75), color: new T.Color('#fff4e0'), intensity: 5, distance: 4 };
    lightAnchors.push(carLight);
    // Hall doors on each floor (two leaves) and a pair of car doors riding with the car.
    const leafMat = F.mat('#aeb4ba', { metalness: 0.9, roughness: 0.28 });
    const hall = [0, FLOOR2].map(y => [0, 1].map(i => { const l = F.box(0.6, 2.2, 0.04, leafMat, 0, 0, 0); l.position.set(ELEV.x0 + 0.3 + i * 0.6, y + 1.1, -0.96); scene.add(l); return l; }));
    const carDoors = [0, 1].map(i => { const l = F.box(0.6, 2.2, 0.03, leafMat, 0, 0, 0); l.position.set(-0.3 + i * 0.6, 1.1, 1.6); car.add(l); return l; });
    for (const y of [0, FLOOR2]) {
      // Brushed-steel frame around the opening: two jambs and a header (the doorway itself stays clear).
      const steelFrame = F.mat('#7f868d', { metalness: 0.9, roughness: 0.3 });
      for (const x of [ELEV.x0 - 0.075, ELEV.x1 + 0.075]) F.box(0.15, 2.3, 0.06, steelFrame, x, y, -0.9, scene);
      F.box(1.5, 0.15, 0.06, steelFrame, 7.75, y + 2.2, -0.9, scene);
      const ind = F.sign(y ? '▲▼ 2' : '▲▼ 1', { w: 0.3, h: 0.12, bg: '#111', fg: '#ff9a3c', font: 'bold 80px system-ui, sans-serif', emissive: 1 }); ind.position.set(7.75, y + 2.42, -0.86); scene.add(ind);
      const cp = F.callPanel(); add(cp, 8.75, y, -0.89);
    }
    // Thresholds bridge the car/hall joint without overlapping either finished floor.
    for (const y of [0, FLOOR2]) slab(ELEV.x0, ELEV.x1, -1.15, -1.005, y + 0.012, steel, 0.012);
    const state = { y: 0, target: 0, doors: 0, open: false, timer: 0, moving: false, floor: 0, queue: null };
    floorAt(6.65, 8.85, -4.4, -1, () => state.y, 'elevator');
    // Doorway blockers: hall door on each floor when shut, car door whenever shut.
    for (const f of [0, 1]) solid(ELEV.x0, ELEV.x1, f * FLOOR2, f * FLOOR2 + 2.2, -1.05, -0.9, () => !(state.floor === f && !state.moving && state.doors > 0.8));
    const call = f => {
      if (state.moving) return;
      if (state.floor === f) { state.open = true; state.timer = 4; game.sound.ding(); return; }
      state.queue = f; state.open = false;
    };
    for (const f of [0, 1]) interact.push({ pos: new T.Vector3(7.95, f * FLOOR2 + 1.3, -0.85), r: 1.9, when: p => p.z > -0.95, label: () => 'Call elevator', use: () => { game.sound.click(); call(f); } });
    interact.push({ pos: new T.Vector3(7.95, 1.3, -1.3), r: 2.4, when: p => p.z < -1.1, dynamicY: () => state.y + 1.3, label: () => `Press ${state.floor === 0 ? '2' : '1'}`, use: () => { game.sound.click(); call(1 - state.floor); } });
    updaters.push((dt, t, player) => {
      const target = state.open ? 1 : 0;
      state.doors += Math.sign(target - state.doors) * Math.min(Math.abs(target - state.doors), dt * 1.2);
      // Don't close on someone standing in the doorway.
      const inDoorway = Math.abs(player.y - state.floor * FLOOR2) < 1 && player.x > ELEV.x0 - 0.1 && player.x < ELEV.x1 + 0.1 && player.z > -1.4 && player.z < -0.6;
      if (state.open && !state.moving) { state.timer -= dt; if (state.timer < 0 && !inDoorway) state.open = false; }
      if (state.queue !== null && state.doors <= 0.001 && !state.moving) { state.moving = true; state.target = state.queue * FLOOR2; state.queue = null; game.sound.hum(true); }
      if (state.moving) {
        state.y += Math.sign(state.target - state.y) * Math.min(Math.abs(state.target - state.y), 1.0 * dt);
        if (Math.abs(state.y - state.target) < 1e-4) { state.y = state.target; state.moving = false; state.floor = state.target ? 1 : 0; state.open = true; state.timer = 4; game.sound.hum(false); game.sound.ding(); }
      }
      car.position.y = state.y; carLight.pos.y = state.y + 2.2;
      const slide = state.doors * 0.58;
      carDoors[0].position.x = -0.3 - slide; carDoors[1].position.x = 0.3 + slide;
      hall.forEach((pair, f) => { const s = f === state.floor && !state.moving ? slide : 0; pair[0].position.x = ELEV.x0 + 0.3 - s; pair[1].position.x = ELEV.x0 + 0.9 + s; });
      display.redraw((g, w, h) => { g.fillStyle = '#120404'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7a2a'; g.font = 'bold 44px monospace'; g.textAlign = 'center'; g.fillText(String(state.y > FLOOR2 / 2 ? 2 : 1), w / 2, 50); });
    });
    return state;
  }

  // ---------- room 212 ----------
  const room = buildRoom();
  function buildRoom() {
    const y = FLOOR2;
    // Entry door from the corridor (hinge on the west side, opens into the room).
    const d = openableDoor('212');
    d.group.position.set(R.x0 + 0.9, y, 1); d.group.rotation.y = Math.PI; scene.add(d.group);
    const st = { angle: 0, open: false, timer: 0, lamps: true, bath: true, drapes: 1, tv: null };
    solid(R.x0 + 0.4, R.x0 + 1.4, y, y + 2.2, 0.92, 1.08, () => st.angle < 1.1);
    interact.push({ pos: new T.Vector3(R.x0 + 0.9, y + 1.1, 0.75), r: 1.3, when: p => p.z < 1, label: () => st.open ? 'Door' : game.has('key card') ? 'Tap key card' : 'Room 212',
      use: () => {
        if (st.open) { st.timer = 0; return; }
        if (!game.has('key card')) { d.led.material = F.glow('#ff3b30', 3); game.sound.beep(false); setTimeout(() => (d.led.material = F.glow('#ff3b30', 0)), 900); return game.say('The lock blinks red. You need a key card from the front desk.'); }
        d.led.material = F.glow('#34c759', 3); game.sound.beep(true); setTimeout(() => (d.led.material = F.glow('#ff3b30', 0)), 1500);
        st.open = true; st.timer = 7; game.event('room-open');
      } });
    interact.push({ pos: new T.Vector3(R.x0 + 0.9, y + 1.1, 1.5), r: 1.0, when: p => p.z > 1, label: () => st.open ? 'Close door' : 'Open door', use: () => { st.open = !st.open; st.timer = st.open ? 7 : 0; } });
    updaters.push((dt, t, player) => {
      const inDoorway = Math.abs(player.y - y) < 1 && player.x > R.x0 + 0.3 && player.x < R.x0 + 1.5 && player.z > 0.5 && player.z < 2.2;
      if (st.open) { st.timer -= dt; if (st.timer < 0 && !inDoorway) { st.open = false; game.sound.thud(); } }
      const target = st.open ? 1.45 : 0;
      st.angle += Math.sign(target - st.angle) * Math.min(Math.abs(target - st.angle), dt * 2.2);
      d.leaf.rotation.y = st.angle;
    });

    // Back of the door: the fire evacuation plan every US hotel room has. Hangs on the leaf, so it swings with it.
    const plan = F.canvasTexture(512, 360, (g, w, h) => {
      g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b3141a'; g.fillRect(0, 0, w, 44); g.fillStyle = '#fff'; g.font = 'bold 26px system-ui'; g.textAlign = 'center'; g.fillText('FIRE EVACUATION PLAN · FLOOR 2', w / 2, 30);
      const X = x => 20 + (x + 12) / 42 * (w - 40), Z = z => 200 + z * 14;
      g.strokeStyle = '#1d3557'; g.lineWidth = 2;
      for (let x = -12; x < 30; x += 4.5) { g.strokeRect(X(x), Z(-9), X(x + 4.5) - X(x), Z(-1) - Z(-9)); g.strokeRect(X(x), Z(1), X(x + 4.5) - X(x), Z(9) - Z(1)); }
      g.fillStyle = '#dfe7ee'; g.fillRect(X(-12), Z(-1), X(30) - X(-12), Z(1) - Z(-1));
      g.fillStyle = '#2a9d8f'; g.fillRect(X(9.5), Z(-8.5), X(12) - X(9.5), Z(-1) - Z(-8.5)); g.fillStyle = '#9aa0a6'; g.fillRect(X(6.5), Z(-4.5), X(9) - X(6.5), Z(-1) - Z(-4.5));
      g.strokeStyle = '#2a9d8f'; g.lineWidth = 5; g.beginPath(); g.moveTo(X(12.9), Z(1)); g.lineTo(X(12.9), Z(0)); g.lineTo(X(11.4), Z(0)); g.lineTo(X(11.4), Z(-2)); g.stroke();
      g.fillStyle = '#b3141a'; g.beginPath(); g.arc(X(12.9), Z(3), 8, 0, 7); g.fill();
      g.fillStyle = '#1d3557'; g.font = 'bold 16px system-ui'; g.textAlign = 'left';
      g.fillText('● YOU ARE HERE — ROOM 212', 24, h - 40); g.fillStyle = '#2a9d8f'; g.fillText('━ EXIT ROUTE: STAIR A (DO NOT USE ELEVATOR)', 24, h - 16);
    });
    const planMesh = new T.Mesh(new T.PlaneGeometry(0.34, 0.24), new T.MeshStandardMaterial({ map: plan, roughness: 0.6 }));
    planMesh.position.set(0.5, 1.45, -0.026); planMesh.rotation.y = Math.PI; d.leaf.add(planMesh);
    // Do Not Disturb hanger on the corridor-side handle.
    const dnd = F.sign('PLEASE\nDO NOT\nDISTURB', { w: 0.1, h: 0.24, bg: '#b3141a', font: 'bold 60px system-ui, sans-serif' });
    dnd.position.set(0.88, 0.8, 0.07); dnd.visible = false; d.leaf.add(dnd);
    interact.push({ pos: new T.Vector3(R.x0 + 0.5, y + 1.0, 1.7), r: 0.9, when: p => p.z > 1, label: () => dnd.visible ? 'Take in the Do Not Disturb sign' : 'Hang Do Not Disturb sign',
      use: () => { dnd.visible = !dnd.visible; game.sound.click(); game.say(dnd.visible ? 'Sign out. Housekeeping will knock anyway, just softer.' : 'Sign back inside.'); } });

    // Bathroom: vanity, toilet, tub/shower.
    const vanity = add(lib.model('hotel-vanity', { origin: true }), 15.0, y, 1.38); solid(14.3, 15.7, y, y + 1, 1.05, 1.65);
    // A real mirror: the environment map would show a photo of some other hotel room. Rendered only while you're in 212.
    {
      const old = vanity.getObjectByName('mirror');
      old.updateWorldMatrix(true, false);
      const box = new T.Box3().setFromObject(old), size = box.getSize(new T.Vector3()), mid = box.getCenter(new T.Vector3());
      const mirror = economy ? new T.Mesh(new T.PlaneGeometry(size.x, size.y), new T.MeshStandardMaterial({ color: 0xb8bcbf, metalness: 1, roughness: 0.12 })) : new Reflector(new T.PlaneGeometry(size.x, size.y), { textureWidth: 768, textureHeight: Math.round(768 * size.y / size.x), color: 0xb8bcbf, clipBias: 0.003 });
      mirror.position.set(mid.x, mid.y, box.max.z + 0.002);
      old.visible = false;
      scene.add(mirror);
      updaters.push((dt, t, player) => { mirror.visible = player.y > 2.5 && player.x > R.x0 && player.x < R.x1 && player.z > R.z0 && player.z < R.z1; });
    }
    add(lib.model('hotel-toilet', { origin: true, rotate: -Math.PI / 2 }), 16.15, y, 2.2); solid(15.72, 16.4, y, y + 0.8, 1.95, 2.45);
    const shower = add(lib.model('g3-shower-cabin', { height: 2.1, rotate: Math.PI }), 15.86, y + 0.02, 3.49); shower.name = 'Textured shower enclosure';
    solid(15.36, 16.36, y, y + 2.1, 2.99, 3.99);
    const bathLight = { pos: new T.Vector3(15.2, y + 2.5, 2.5), color: new T.Color('#fff6ea'), intensity: 6, distance: 5 };
    lightAnchors.push(bathLight);
    interact.push({ pos: new T.Vector3(13.95, y + 1.3, 2.4), r: 1.2, label: () => `Bathroom light ${st.bath ? 'off' : 'on'}`, use: () => { st.bath = !st.bath; bathLight.intensity = st.bath ? 6 : 0; game.sound.click(); } });
    interact.push({ pos: new T.Vector3(15.0, y + 1.0, 1.6), r: 1.0, label: () => 'Wash your hands', use: () => { game.sound.water(); game.say('Hot water takes a while, then arrives all at once.'); } });

    // Closet with luggage bench and the ice bucket.
    add(lib.model('hotel-closet', { origin: true, rotate: Math.PI / 2 }), R.x0 + 0.31, y, 2.7); solid(R.x0, R.x0 + 0.78, y, y + 2.03, 2.18, 3.22);
    const bucket = add(lib.model('hotel-ice-bucket', { origin: true }), R.x0 + 0.35, y + 0.492, 2.95);
    interact.push({ pos: new T.Vector3(R.x0 + 0.5, y + 0.8, 2.95), r: 1.0, label: () => bucket.visible ? 'Take ice bucket' : (game.has('ice bucket (full)') ? 'Put the ice bucket back' : 'Closet'),
      use: () => {
        if (bucket.visible) { bucket.visible = false; game.give('ice bucket'); return game.say('Ice bucket, with a fresh plastic liner.'); }
        if (game.has('ice bucket (full)')) { game.take('ice bucket (full)'); bucket.visible = true; game.say('A bucket of ice for… something. Achievement unlocked.'); }
      } });

    // Micro-fridge and microwave beside the closet.
    const mfModel = add(lib.model('hotel-microfridge', { origin: true, rotate: Math.PI / 2 }), R.x0 + 0.3, y, 3.75);
    const mf = { door: mfModel.getObjectByName('fridge_door') }; solid(R.x0, R.x0 + 0.71, y, y + 1.6, 3.42, 4.08);
    let fridgeOpen = false;
    interact.push({ pos: new T.Vector3(R.x0 + 0.6, y + 0.5, 3.75), r: 1.0, label: () => fridgeOpen ? 'Close the fridge' : 'Open the fridge',
      use: () => { fridgeOpen = !fridgeOpen; mf.door.rotation.y = fridgeOpen ? -1.6 : 0; game.sound.click(); if (fridgeOpen) game.say('Cold and empty, except for one ketchup packet from a previous guest.'); } });
    interact.push({ pos: new T.Vector3(R.x0 + 0.6, y + 1.05, 3.75), r: 0.8, label: () => game.has('coffee') ? 'Reheat your coffee' : 'Microwave',
      use: () => { game.sound.hum(true); setTimeout(() => { game.sound.hum(false); game.sound.beep(true); game.say(game.has('coffee') ? 'Thirty seconds. The lobby coffee is now hot and somehow worse.' : 'You run the microwave for ten seconds, empty. Old habit.'); }, 2500); } });

    // Bedroom: headboard wall (east), king bed, nightstands, lamps.
    add(lib.model('hotel-headboard', { origin: true, rotate: -Math.PI / 2 }), R.x1 - 0.03, y, 6.6);
    add(lib.model('hotel-king-bed', { rotate: -Math.PI / 2 }), R.x1 - 1.18, y, 6.6); solid(R.x1 - 2.52, R.x1 - 0.28, y, y + 0.7, 5.47, 7.73);
    const lamps = [];
    for (const z of [5.05, 8.15]) {
      add(lib.model('hotel-nightstand', { origin: true, rotate: -Math.PI / 2 }), R.x1 - 0.27, y, z); solid(R.x1 - 0.76, R.x1 - 0.28, y, y + 0.6, z - 0.27, z + 0.27);
      const l = add(lib.model('hotel-table-lamp', { origin: true }), R.x1 - 0.36, y + 0.572, z);
      l.traverse(n => { if (n.isMesh && n.material.name === 'lampshade') { n.material = n.material.clone(); n.material.emissive.set('#ffcf8a'); l.userData.shade = n; } });
      lamps.push(l);
    }
    const bedLights = [5.05, 8.15].map(z => ({ pos: new T.Vector3(R.x1 - 0.4, y + 1.1, z), color: new T.Color('#ffe0b5'), intensity: 1.8, distance: 4.5 }));
    const roomLight = { pos: new T.Vector3(14.2, y + 2.6, 6.5), color: new T.Color('#ffe9d0'), intensity: 3.5, distance: 7 };
    lightAnchors.push(...bedLights, roomLight);
    const setLamps = on => { st.lamps = on; lamps.forEach(l => (l.userData.shade.material.emissiveIntensity = on ? 0.8 : 0)); bedLights.forEach(b => (b.intensity = on ? 1.8 : 0)); roomLight.intensity = on ? 3.5 : 0.4; };
    setLamps(true);
    interact.push({ pos: new T.Vector3(R.x1 - 0.3, y + 0.9, 5.05), r: 1.3, label: () => `Lamps ${st.lamps ? 'off' : 'on'}`, use: () => { setLamps(!st.lamps); game.sound.click(); } });
    interact.push({ pos: new T.Vector3(R.x1 - 1.4, y + 0.6, 6.6), r: 1.6, label: () => 'Lie down', use: () => game.event('sleep') });
    // Credenza + TV on the west wall, desk by the window, armchair, PTAC, window with drapes.
    const credModel = add(lib.model('hotel-credenza-tv', { origin: true, rotate: Math.PI / 2 }), R.x0 + 0.33, y, 6.4);
    const cred = { screen: credModel.getObjectByName('tv_screen') };
    // Blender's cube UVs map only a rotated corner of the canvas onto the screen face; give it flat 0–1 UVs.
    {
      const g = cred.screen.geometry; g.computeBoundingBox();
      const { min, max } = g.boundingBox, p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - min.x) / (max.x - min.x), (p.getY(i) - min.y) / (max.y - min.y));
      uv.needsUpdate = true;
    } solid(R.x0, R.x0 + 0.55, y, y + 0.8, 5.2, 7.6);
    const desk = add(lib.model('hotel-desk', { origin: true, rotate: Math.PI / 2 }), R.x0 + 0.32, y, 8.27);
    desk.scale.z = 0.84; // leave a joint between the desk and TV cabinet, preserving desk height
    const deskLamp = add(lib.model('ph-desk-lamp-arm-01', { height: 0.6, rotate: Math.PI / 2 }), R.x0 + 0.35, y + 0.807, 8.0);
    deskLamp.updateMatrixWorld(true);
    const lampBounds = new T.Box3().setFromObject(deskLamp);
    deskLamp.position.x += Math.max(0, R.x0 + 0.12 - lampBounds.min.x);
    const deskBulb = { pos: new T.Vector3(deskLamp.position.x, y + 1.25, 8.0), color: new T.Color('#ffe0b0'), intensity: 1.8, distance: 3.5 };
    lightAnchors.push(deskBulb);
    let deskLampOn = true;
    const lampMaterials = [];
    deskLamp.traverse(n => { if (n.isMesh) {
      n.material = n.material.clone();
      if (/bulb|light|emiss/i.test(n.material.name)) { n.material.emissive.set('#ffd39a'); n.material.emissiveIntensity = 0.6; lampMaterials.push(n.material); }
    } });
    interact.push({ pos: new T.Vector3(deskLamp.position.x + 0.2, y + 1, 8.0), r: 1.25, label: () => `Desk lamp ${deskLampOn ? 'off' : 'on'}`, use: () => {
      deskLampOn = !deskLampOn; deskBulb.intensity = deskLampOn ? 1.8 : 0;
      lampMaterials.forEach(m => m.emissiveIntensity = deskLampOn ? 0.6 : 0); game.sound.click();
    } }); solid(R.x0, R.x0 + 0.71, y, y + 0.81, 7.72, 8.83);
    add(lib.model('ph-modern-arm-chair-01', { height: 0.88 }), R.x0 + 1.15, y, 8.1, -Math.PI / 2);
    add(lib.model('hotel-accent-chair-mustard', { origin: true }), R.x1 - 1.27, y, 8.3, -Math.PI / 2); solid(14.8, 15.66, y, y + 0.8, 7.89, 8.71);   // clear of nightstand and drapes   // window corner, clear of the nightstand
    add(lib.model('hotel-ptac', { origin: true, rotate: Math.PI }), 14.25, y, 8.82); solid(13.7, 14.8, y, y + 0.6, 8.6, 9);
    const roomWindow = placeWindow(14.25, y + 0.75, 8.95, 1.6, 1.5, Math.PI);
    interact.push({ pos: new T.Vector3(14.25, y + 1.4, 8.6), r: 1.5, label: () => st.drapes > 0.5 ? 'Close curtains' : 'Open curtains', use: () => { st.drapes = st.drapes > 0.5 ? 0 : 1; game.sound.swish(); } });
    updaters.push(dt => roomWindow.drapes.forEach((dr, i) => { const s = dr.scale.x + (((st.drapes > 0.5) ? 1 : 2.7) - dr.scale.x) * Math.min(1, dt * 4); dr.scale.x = s; }));
    const roomTV = tvSet(cred.screen, R.x0 + 1, y + 1.2, 6.4, 'room');
    st.tv = roomTV;
    // A little welcome card on the desk.
    const card = F.sign('Welcome!\nWi-Fi: HeartlandGuest\nPassword: route66', { w: 0.24, h: 0.16, bg: '#fbf8f1', fg: '#1d3557', font: '600 54px Georgia, serif' });
    card.rotation.set(-Math.PI / 2, 0, Math.PI / 2); card.position.set(R.x0 + 0.45, y + 0.828, 8.45); scene.add(card);
    // Check actual imported mesh bounds, rather than assuming the model's origin is its back edge.
    // Cabinets, the toilet, the headboard and the PTAC all protruded into structural walls.
    for (const prop of scene.children) {
      if (!prop.userData.hotelProp || prop.name === 'hotel-room-door' || prop.position.y < y || prop.position.x < R.x0 || prop.position.x > R.x1 || prop.position.z < R.z0 || prop.position.z > R.z1) continue;
      prop.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(prop);
      const bounds = { x0: R.x0 + 0.1, x1: R.x1 - 0.12, z0: R.z0 + 0.1, z1: R.z1 - 0.14 };
      if (['hotel-king-bed', 'hotel-nightstand', 'hotel-table-lamp'].includes(prop.name)) bounds.x1 = R.x1 - 0.30;
      prop.position.x += Math.max(0, bounds.x0 - box.min.x) - Math.max(0, box.max.x - bounds.x1);
      prop.position.z += Math.max(0, bounds.z0 - box.min.z) - Math.max(0, box.max.z - bounds.z1);
      if (box.min.y < y + 0.012 && box.min.y > y - 0.1) prop.position.y += y + 0.012 - box.min.y;
      prop.userData.clearanceBounds = bounds;
    }
    return st;
  }

  // ---------- TVs with channels ----------
  function tvSet(screen, x, y, z, where, { interactive = true, channel = 0 } = {}) {
    const tex = F.canvasTexture(512, 288, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); });
    screen.material = new T.MeshBasicMaterial({ map: tex, color: '#000000' });
    const st = { on: !interactive, channel, last: 0 };
    const channels = [weather, news, info, ballgame];
    if (!interactive) screen.material.color.set('#ffffff');
    if (interactive) interact.push({ pos: new T.Vector3(x, y, z), r: 2.4, label: () => st.on ? (st.channel === channels.length - 1 ? 'Turn TV off' : 'Change channel') : 'Turn TV on',
      use: () => {
        game.sound.click();
        if (!st.on) { st.on = true; st.channel = 0; } else if (st.channel < channels.length - 1) st.channel++; else st.on = false;
        screen.material.color.set(st.on ? '#ffffff' : '#000000');
        draw(performance.now() / 1000);
      } });
    function draw(t) { if (st.on) tex.redraw((g, w, h) => channels[st.channel](g, w, h, t)); }
    updaters.push((dt, t, player) => { if (st.on && t - st.last > 0.12 && player.pos.distanceTo(screen.getWorldPosition(new T.Vector3())) < 14) { st.last = t; draw(t); } });
    game.tvs.push({ st, where });
    return st;
  }
  function header(g, w, label, color) { g.fillStyle = color; g.fillRect(0, 0, w, 40); g.fillStyle = '#fff'; g.font = 'bold 24px system-ui'; g.textAlign = 'left'; g.fillText(label, 14, 28); }
  function ticker(g, w, h, t, text) { g.fillStyle = '#0b2545'; g.fillRect(0, h - 34, w, 34); g.fillStyle = '#fff'; g.font = '20px system-ui'; g.textAlign = 'left'; const x = w - ((t * 70) % (w + g.measureText(text).width)); g.fillText(text, x, h - 11); }
  function weather(g, w, h, t) {
    g.fillStyle = '#16324f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4c7a3d'; g.fillRect(20, 50, 300, 190);
    for (let i = 0; i < 6; i++) { g.strokeStyle = '#2d4a24'; g.beginPath(); g.moveTo(20, 60 + i * 30); g.lineTo(320, 70 + i * 28); g.stroke(); }
    const cx = 60 + (t * 8) % 300;
    for (const [dx, dy, r, c] of [[0, 0, 55, 'rgba(60,200,60,.65)'], [10, 5, 35, 'rgba(240,220,40,.75)'], [16, 8, 18, 'rgba(230,50,40,.85)']]) { g.fillStyle = c; g.beginPath(); g.arc(cx + dx, 140 + dy, r, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; g.font = 'bold 16px system-ui'; g.fillText('Springfield', 230, 120); g.fillText('Rolla', 120, 200); g.fillText('Joplin', 30, 100);
    g.font = 'bold 22px system-ui'; g.fillText('TONIGHT', 345, 80); g.font = 'bold 54px system-ui'; g.fillText('58°', 350, 140); g.font = '18px system-ui'; g.fillText('Scattered storms', 345, 170); g.fillText('after midnight', 345, 192);
    header(g, w, 'OZARKS FIRST WEATHER · LIVE DOPPLER', '#c1121f');
    ticker(g, w, h, t, 'Severe thunderstorm watch for Phelps, Pulaski and Laclede counties until 2 AM  ·  Wind gusts to 50 mph possible  ·  ');
  }
  function news(g, w, h, t) {
    g.fillStyle = '#20262e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9ad8e'; g.beginPath(); g.arc(256, 150, 46, 0, 7); g.fill();
    g.fillStyle = '#2b2d42'; g.fillRect(180, 195, 152, 70); g.fillStyle = '#3d5a80'; g.fillRect(0, 205, w, 4);
    g.fillStyle = '#d90429'; g.fillRect(0, 210, 210, 34); g.fillStyle = '#fff'; g.font = 'bold 20px system-ui'; g.textAlign = 'left'; g.fillText('BREAKING', 14, 234);
    g.fillStyle = '#edf2f4'; g.fillRect(210, 210, 302, 34); g.fillStyle = '#111'; g.fillText('I-44 resurfacing near exit 127', 222, 234);
    header(g, w, 'KY3 NEWS AT TEN', '#0b2545');
    ticker(g, w, h, t, 'County fair opens Saturday  ·  Gas $2.89 at the Route 66 Travel Stop  ·  High school football: Hornets 21, Tigers 17  ·  ');
  }
  function info(g, w, h, t) {
    g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h);
    header(g, w, 'HEARTLAND INN EXPRESS · GUEST INFORMATION', '#1d4f8f');
    g.fillStyle = '#1d3557'; g.font = 'bold 26px Georgia'; g.textAlign = 'left';
    const slides = [['Hot breakfast', '6:00 – 9:30 AM in the lobby', 'Waffles · eggs · biscuits & gravy'], ['Pool & hot tub', 'Open 6 AM – 10 PM', 'Towels by the pool door'], ['Check-out', '11:00 AM', 'Express check-out at the front desk'], ['Need anything?', 'Dial 0 for the front desk', 'We are here 24 hours']];
    const s = slides[Math.floor(t / 5) % slides.length];
    g.fillText(s[0], 30, 110); g.font = '22px system-ui'; g.fillText(s[1], 30, 150); g.fillText(s[2], 30, 185);
    g.fillStyle = '#1d4f8f'; g.fillRect(30, 220, (t % 5) / 5 * 450, 4);
  }
  function ballgame(g, w, h, t) {
    g.fillStyle = '#2f6b2f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b5835a'; g.beginPath(); g.moveTo(256, 90); g.lineTo(380, 190); g.lineTo(256, 280); g.lineTo(132, 190); g.fill();
    g.fillStyle = '#fff'; for (const [x, y] of [[256, 92], [378, 190], [134, 190], [256, 272]]) g.fillRect(x - 5, y - 5, 10, 10);
    const bx = 256 + Math.sin(t * 2) * 60, by = 200 - Math.abs(Math.sin(t * 2)) * 60; g.beginPath(); g.arc(bx, by, 4, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(10, 50, 170, 60); g.fillStyle = '#fff'; g.font = 'bold 18px system-ui'; g.textAlign = 'left';
    g.fillText('STL   3', 20, 74); g.fillText('KC    2', 20, 98); g.fillText('▲ 7th', 110, 86);
    header(g, w, 'BALLY SPORTS MIDWEST', '#11212d');
  }
  tvSet(loungeTV.screen, 5.2, 1.6, 5, 'lounge');
  tvSet(gymTV.screen, 16.5, 1.8, -1.0, 'gym', { interactive: false, channel: 3 });

  // ---------- vending and coffee ----------
  interact.push({ pos: new T.Vector3(5.4, 1.2, -6.6), r: 1.6, label: () => 'Vending machine', use: () => game.vend() });
  interact.push({ pos: new T.Vector3(5.5, 1.2, -5.4), r: 1.4, label: () => 'Cold drinks', use: () => game.vend('drinks') });
  interact.push({ pos: new T.Vector3(2.7, 1.1, -8.0), r: 1.6, label: () => game.has('coffee') ? 'Grab a cookie' : 'Pour a coffee',
    use: () => { if (!game.has('coffee')) { game.sound.pour(); game.give('coffee'); game.say('Decaf, regular, or “bold.” You pick bold. It is lukewarm.'); } else if (!game.has('cookie')) { game.give('cookie'); game.say('A plastic-wrapped chocolate chip cookie. Complimentary.'); } else game.say('Let’s not get greedy.'); } });

  // ---------- staff and guests ----------
  const clerk = lib.person('rb-sophia-formal', { tint: '#1d4f8f' });
  add(clerk.root, -7.65, 0, -4.1, 0);
  updaters.push(dt => clerk.update(dt));
  interact.push({ pos: new T.Vector3(-8.4, 1.2, -2.6), r: 2.0, label: () => game.has('key card') ? 'Talk to Dana' : 'Check in', use: () => game.checkIn(clerk) });
  const ringBell = { pos: new T.Vector3(-9.0, 1.2, -2.7), r: 0.7, label: () => 'Ring the bell', use: () => { game.sound.bell(); clerk.play('Wave'); setTimeout(() => clerk.play('Idle'), 2000); } };
  interact.push(ringBell);

  const walkers = [];
  function walker(id, tint, path, { speed = 1.1, pause = 2, cartObj = null, say = null } = {}) {
    const p = lib.person(id, { tint });
    scene.add(p.root);
    const w = { p, path: path.map(v => new T.Vector3(...v)), i: 0, wait: 0, speed, pause, cart: cartObj, say, said: 0 };
    w.p.root.position.copy(w.path[0]);
    walkers.push(w);
    return w;
  }
  const hkCart = lib.model('hotel-housekeeping-cart', { origin: true }); scene.add(hkCart);
  walker('rb-emma-casual', '#7a8b99', [[-10, FLOOR2, -0.2], [27, FLOOR2, -0.2]], { speed: 0.7, pause: 6, cartObj: hkCart, say: '“Evening! Need extra towels? I’ve got plenty.”' });
  // A guest walks along the dry deck; no scaled adult passed off as a child.
  walker('rb-andre-casual', null, [[-22, 0, -5], [-22, 0, 3.5]], { speed: 0.6, pause: 6 });
  walker('rb-andre-casual', '#a23b2a', [[18, 0, 24], [4, 0, 24], [-2, 0, 18], [-2, 0, 11.5], [-2, 0, 18], [4, 0, 24]], { speed: 1.0, pause: 3, say: '“Long drive?”' });
  const trucker = walker('rb-marcus-formal', '#6b4e2e', [[2.6, 0, -7.55], [2.6, 0, -7.55]], { pause: 9, say: '“Coffee’s better than the truck stop. Barely. You headed east or west?”' });
  trucker.p.root.rotation.y = Math.PI;
  walker('rb-emma-casual', '#3d6b4f', [[24.5, FLOOR2, -0.4], [7.6, FLOOR2, 0.2], [7.6, FLOOR2, 2.6], [7.6, FLOOR2, 0.2]], { speed: 0.9, pause: 5, say: '“Ice machine works, it just sounds like a car crash.”' });
  updaters.push((dt, t, player) => {
    for (const w of walkers) {
      w.p.update(dt);
      const pos = w.p.root.position, target = w.path[(w.i + 1) % w.path.length];
      if (w.wait > 0) { w.wait -= dt; w.p.play('Idle'); }
      else {
        const to = target.clone().sub(pos); to.y = 0;
        const dist = to.length();
        const blocked = player.pos.distanceTo(pos) < 1.1 && to.dot(player.pos.clone().sub(pos)) > 0;
        if (blocked) w.p.play('Idle');
        else if (dist < 0.05) { w.i = (w.i + 1) % w.path.length; w.wait = w.pause; }
        else { pos.addScaledVector(to.normalize(), Math.min(dist, w.speed * dt)); w.p.root.rotation.y = Math.atan2(to.x, to.z); w.p.play('Walk'); }
      }
      if (w.cart) { const fwd = new T.Vector3(Math.sin(w.p.root.rotation.y), 0, Math.cos(w.p.root.rotation.y)); w.cart.position.copy(pos).addScaledVector(fwd, 1.2); w.cart.rotation.y = w.p.root.rotation.y - Math.PI / 2; }   // cart +X (bag end) leads; she holds the near end
      if (w.say && player.pos.distanceTo(pos) < 2.2 && t - w.said > 40) { w.said = t; game.say(w.say); }
    }
  });

  // ---------- automatic entrance doors ----------
  {
    const doorGlass = F.mat('#b9cfd8', { transparent: true, opacity: 0.28, roughness: 0.04, metalness: 0.2 });
    const frameM = F.mat('#2e3136', { metalness: 0.6, roughness: 0.35 });
    const leaves = [0, 1].map(i => {
      const g = new T.Group();
      F.box(1.5, 2.5, 0.04, doorGlass, 0, 0, 0, g);
      for (const x of [-0.73, 0.73]) F.box(0.04, 2.5, 0.06, frameM, x, 0, 0, g);
      F.box(1.5, 0.08, 0.06, frameM, 0, 0, 0, g); F.box(1.5, 0.08, 0.06, frameM, 0, 2.42, 0, g);
      g.position.set(-2.75 + i * 1.5, 0, 9); scene.add(g); return g;
    });
    F.box(3.4, 0.25, 0.3, frameM, -2, 2.55, 9, scene);
    F.box(0.3, 0.06, 0.1, F.mat('#111'), -2, 2.5, 9.18, scene);   // motion sensor
    F.box(2.4, 0.01, 1.4, F.mat('#3a3a3a', { roughness: 1 }), -2, 0.014, 8.0, scene);
    const st = { open: 0 };
    solid(-3.5, -0.5, 0, 2.6, 8.9, 9.1, () => st.open < 0.7);
    updaters.push((dt, t, player) => {
      const near = Math.abs(player.x + 2) < 2.4 && Math.abs(player.z - 9) < 3.2 && player.y < 1;
      const near2 = walkers.some(w => Math.abs(w.p.root.position.x + 2) < 2 && Math.abs(w.p.root.position.z - 9) < 2.6);
      const target = near || near2 ? 1 : 0;
      if (target && st.open === 0) game.sound.slide();
      st.open += Math.sign(target - st.open) * Math.min(Math.abs(target - st.open), dt * 1.4);
      leaves[0].position.x = -2.75 - st.open * 1.4; leaves[1].position.x = -1.25 + st.open * 1.4;
    });
  }
  // Pool door: needs the key card, swings into the pool room.
  {
    const d = openableDoor('POOL'); d.group.position.set(-12, 0, -2.4); d.group.rotation.y = Math.PI / 2; scene.add(d.group);
    d.group.getObjectByName('leaf').material = F.mat('#b9cfd8', { transparent: true, opacity: 0.35, roughness: 0.05 });   // glass pool door
    const st = { open: false, angle: 0, timer: 0 };
    solid(-12.1, -11.9, 0, 2.2, -3, -1.8, () => st.angle < 1.1);
    interact.push({ pos: new T.Vector3(-11.6, 1.2, -2.4), r: 1.4, when: p => p.x > -12, label: () => game.has('key card') ? 'Pool door (tap key)' : 'Pool door', use: () => openPool() });
    interact.push({ pos: new T.Vector3(-12.6, 1.2, -2.4), r: 1.2, when: p => p.x < -12, label: () => 'Open door', use: () => { st.open = true; st.timer = 5; } });
    function openPool() {
      if (!game.has('key card')) { game.sound.beep(false); return game.say('“Pool access with room key.” The reader blinks red.'); }
      game.sound.beep(true); st.open = true; st.timer = 6;
    }
    updaters.push((dt, t, player) => {
      const inDoorway = player.y < 1 && Math.abs(player.x + 12) < 0.9 && player.z > -3.3 && player.z < -1.5;
      if (st.open) { st.timer -= dt; if (st.timer < 0 && !inDoorway) { st.open = false; game.sound.thud(); } }
      st.angle += Math.sign((st.open ? 1.45 : 0) - st.angle) * Math.min(Math.abs((st.open ? 1.45 : 0) - st.angle), dt * 2);
      d.leaf.rotation.y = st.angle;
    });
    const sgn = F.sign('POOL · HOT TUB', { w: 0.9, h: 0.18, bg: '#24303f', font: 'bold 60px system-ui, sans-serif' }); sgn.position.set(-11.885, 2.55, -2.4); sgn.rotation.y = Math.PI / 2; scene.add(sgn);
  }

  // ---------- outside: lot, roads, highway, scenery ----------
  buildOutside();
  function buildOutside() {
    for (const [x0, x1, z0, z1] of [[-450, 450, 9, 450], [-450, 450, -450, -9], [-450, -24, -9, 9], [30, 450, -9, 9]]) {
      const g = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), lawn); g.rotation.x = -Math.PI / 2; g.position.set((x0 + x1) / 2, -0.02, (z0 + z1) / 2); g.receiveShadow = true;
      g.geometry.attributes.uv.array.forEach((v, i, a) => (a[i] = v * (i % 2 ? (z1 - z0) : (x1 - x0)) / 4));
      scene.add(g);
    }
    lawn.map.repeat.set(1, 1); lawn.normalMap.repeat.set(1, 1);
    const flat = (x0, x1, z0, z1, m, y = 0.005) => { const p = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), m); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); p.receiveShadow = true; scene.add(p); return p; };
    const lot = lib.surface('asphalt', { repeat: [95 / 6, 34 / 6], color: '#6d6d6d' }); flat(-45, 50, 10.6, 44.5, lot, 0.006);
    const side = mbox(66, 0.12, 1.6, concrete); side.position.set(3, 0.06 - 0.1, 9.9); scene.add(side);
    const backLot = lib.surface('asphalt', { repeat: [10, 3], color: '#6a6a6a' }); flat(-30, 36, -26, -10, backLot, 0.006);
    flat(30.5, 40, -26, 10.6, lib.surface('asphalt', { repeat: [2, 6], color: '#6a6a6a' }), 0.006);
    // Stall lines.
    const lineM = F.mat('#e9e7df', { roughness: 0.8 }), lines = [];
    for (const [z0, z1] of [[18, 23.5], [30.5, 36], [36, 41.5]]) for (let x = -42; x <= 47; x += 2.75) lines.push([x, (z0 + z1) / 2, 0.1, z1 - z0]);
    for (let x = -42; x <= 47; x += 2.75) lines.push([x, -20, 0.1, 5]);
    const lineMesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), lineM, lines.length);
    lines.forEach(([x, z, w, d], i) => { dm.position.set(x, 0.012, z); dm.rotation.set(-Math.PI / 2, 0, 0); dm.scale.set(w, d, 1); dm.updateMatrix(); lineMesh.setMatrixAt(i, dm.matrix); });
    scene.add(lineMesh);
    for (const z of [17.9, 41.6]) { const curb = mbox(90, 0.15, 0.3, concrete); curb.position.set(2, 0.075, z + (z > 30 ? 1.3 : -0.2)); scene.add(curb); }
    const accessible = F.sign('♿', { w: 1.2, h: 1.2, bg: '#1f5fbf', fg: '#ffffff', font: 'bold 300px system-ui' }); accessible.rotation.x = -Math.PI / 2; accessible.position.set(-4.6, 0.013, 21); scene.add(accessible);
    // Parked cars. Ours sits nearest the canopy.
    // Parked cars (Grab3D, front = +Z), nose-in. Ours sits nearest the canopy.
    const carIds = ['sedan', 'suv', 'pickup-truck', 'minivan', 'station-wagon', 'hatchback'].map(k => 'g3-1990s-' + k);
    const paints = ['#8f1d1d', '#e9e9e4', '#1f2d44', '#6b7277', '#151515', '#c8bfa9', '#2f4f3a', '#3c6e91', '#7a5c3e'];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const vehicle = (id, ry, paint) => {
      const car = lib.model(id, { rotate: ry });
      if (paint) car.traverse(n => { if (n.isMesh && /body_pbr|paint/.test(n.material.name)) { n.material = n.material.clone(); n.material.color.set(paint); } });
      return car;
    };
    // Parked cars are instanced per model (paint via instance color): ~40 draw calls instead of ~400.
    const parked = new Map();
    const park = (x, z, ry, id, paint = paints[Math.floor(rnd() * paints.length)]) => {
      (parked.get(id) ?? parked.set(id, []).get(id)).push({ m: at(x, z, ry), paint });
      solid(x - 1, x + 1, 0, 1.7, z - 2.5, z + 2.5);
    };
    const at = (x, z, ry = 0) => new T.Matrix4().compose(new T.Vector3(x, 0, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ry), new T.Vector3(1, 1, 1));
    for (let x = -40.6; x <= 46; x += 2.75) for (const [z, ry] of [[20.75, Math.PI], [33.25, 0], [38.75, Math.PI]]) {
      if (Math.abs(x - 1.6) < 1 && z === 20.75) continue;   // our spot
      if (rnd() < (Math.abs(x) < 20 ? 0.42 : 0.14)) park(x, z, ry + (rnd() - 0.5) * 0.06, carIds[Math.floor(rnd() * carIds.length)]);
    }
    for (let x = -26.6; x < 34; x += 2.75) if (rnd() < 0.25) park(x, -20, 0, carIds[Math.floor(rnd() * carIds.length)]);
    park(1.6, 20.75, Math.PI + 0.02, 'g3-1990s-station-wagon', '#3c6e91');
    for (const [id, cars] of parked) instances(id, cars.map(c => c.m), false, cars.map(c => c.paint));
    interact.push({ pos: new T.Vector3(1.6, 1, 20.75), r: 2.8, label: () => 'Your car', use: () => game.say(game.has('key card') ? 'Everything you need is already in your bag. Room 212 awaits.' : 'Your car, ticking as it cools. Seven hours on I-44. Time to check in.') });
    // Parking lot lights.
    for (const [x, z] of [[-30, 27], [-10, 27], [10, 27], [30, 27], [-20, 42.5], [20, 42.5]]) {
      add(lightPole(), x, 0, z);
    }
    for (const [x, z] of [[0, 27], [-25, 27], [25, 27], [0, 40]]) outdoor.push(lightAnchors[lightAnchors.push({ pos: new T.Vector3(x, 7.6, z), color: new T.Color('#ffd59a'), intensity: 16, distance: 24, base: 16 }) - 1]);
    // Entrance bollards, a hydrant, the dumpster corral out back, a couple of cones.
    for (const x of [-4.4, -2.9, -1.1, 0.4]) { add(lib.model('g3-bollard'), x, 0, 11.3); solid(x - 0.12, x + 0.12, 0, 1, 11.18, 11.42); }
    add(lib.model('g3-fire-hydrant', { rotate: Math.PI }), 9.5, 0, 11.4);
    { const corral = F.mat('#8a8279', { roughness: 0.95 });
      for (const [w, d, x, z] of [[5, 0.2, 24, -26.5], [0.2, 2.6, 21.6, -25.3], [0.2, 2.6, 26.4, -25.3]]) { F.box(w, 1.8, d, corral, x, 0, z, scene); solid(x - w / 2, x + w / 2, 0, 1.8, z - d / 2, z + d / 2); }
      add(lib.model('g3-dumpster', { rotate: Math.PI, height: 1.5 }), 23, 0, -25.3); add(lib.model('g3-dumpster', { rotate: Math.PI, height: 1.5 }), 25, 0, -25.3); solid(21.7, 26.3, 0, 1.5, -26.3, -24.6);
      for (const [x, z] of [[28.5, -24], [29.4, -23.2], [-14, -12]]) add(lib.model('g3-traffic-cone'), x, 0, z, rnd() * 3); }
    // Landscaping islands along the facade.
    for (const [x0, x1] of [[-23, -7], [3, 29]]) {
      const bed = mbox(x1 - x0, 0.25, 1.4, F.mat('#5b4636', { roughness: 1 })); bed.position.set((x0 + x1) / 2, 0.02, 10.4); scene.add(bed);
      for (let x = x0 + 0.6; x < x1; x += 1.9) add(lib.model('ph-shrub-03', { height: 0.55 + rnd() * 0.25 }), x + rnd() * 0.3, 0.14, 10.4 + (rnd() - 0.5) * 0.6, rnd() * 6);
    }
    add(F.trashReceptacle(true), 2.9, 0, 11.2);
    // Frontage road, interstate (two carriageways), guard rails.
    const road = (z0, z1) => flat(-450, 450, z0, z1, lib.surface('asphalt', { repeat: [900 / 8, (z1 - z0) / 8], color: '#555555' }), 0.008);
    road(46, 53); road(62, 70); road(80, 88);
    flat(-3, 5, 44.5, 46, lib.surface('asphalt', { repeat: [1, 0.3], color: '#6d6d6d' }), 0.007);
    const dashes = [];
    for (let x = -450; x < 450; x += 12) dashes.push([x, 66], [x, 84], [x, 49.5]);
    const dashMesh = new T.InstancedMesh(new T.PlaneGeometry(3, 0.15), F.mat('#efeee6'), dashes.length);
    dashes.forEach(([x, z], i) => { dm.position.set(x, 0.013, z); dm.rotation.set(-Math.PI / 2, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); dashMesh.setMatrixAt(i, dm.matrix); });
    scene.add(dashMesh);
    for (const z of [62.2, 69.8, 80.2, 87.8]) flat(-450, 450, z - 0.08, z + 0.08, F.mat(z === 69.8 || z === 80.2 ? '#e8c547' : '#efeee6'), 0.013);
    // Guard rails, utility poles with sagging lines, and street lights along the frontage road (instanced).
    // ponytail: detailed rail only where you can see it (|x| < 48); plain beam beyond. Widen if the view distance grows.
    const rails = []; for (let x = -48; x < 48; x += 4) rails.push(at(x, 60.6), at(x, 89.4, Math.PI));
    instances('g3-guard-rail', rails);
    for (const z of [60.6, 89.4]) for (const [x0, x1] of [[-450, -50], [46, 450]]) { const r = mbox(x1 - x0, 0.32, 0.1, F.mat('#a9adb0', { metalness: 0.8, roughness: 0.4 })); r.position.set((x0 + x1) / 2, 0.6, z); scene.add(r); }
    const poleXs = []; for (let x = -220; x <= 220; x += 44) poleXs.push(x);
    instances('g3-utility-pole', poleXs.map(x => at(x, 57, Math.PI / 2)));
    const wire = new T.LineBasicMaterial({ color: '#1c1c1c' });
    for (const dz of [-1.05, 0, 1.05]) {
      const pts = [];
      for (let i = 0; i < poleXs.length - 1; i++) for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new T.Vector3(poleXs[i] + t * 44, 9.55 - (dz === 0 ? 0.35 : 0) - Math.sin(t * Math.PI) * 0.9, 57 + dz)); }
      scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), wire));
    }
    instances('g3-street-light', [-60, -20, 20, 60].map(x => at(x, 45.2)), true);
    // Traffic: cars and semis loop along the interstate and the frontage road (front = +Z, so face along X).
    const traffic = [];
    for (let i = 0; i < 22; i++) {
      const lane = [[64, 1, 31], [68, 1, 27], [82, -1, 31], [86, -1, 26], [51, -1, 15], [64.4, 1, 26]][i % 6];
      const semi = i % 6 === 5 || i === 3;
      const car = vehicle(semi ? 'g3-semi-truck' : carIds[i % carIds.length], lane[1] > 0 ? Math.PI / 2 : -Math.PI / 2, semi ? null : paints[i % paints.length]);
      car.traverse(n => (n.castShadow = false));
      scene.add(car);
      traffic.push({ car, z: semi && lane[1] > 0 ? 64 : semi ? 86 : lane[0], dir: lane[1], speed: (semi ? 26 : lane[2]) * (0.9 + (i % 4) * 0.06), x: -450 + i * 41 });
    }
    updaters.push(dt => { for (const c of traffic) { c.x += c.dir * c.speed * dt; if (c.x > 450) c.x = -450; if (c.x < -450) c.x = 450; c.car.position.set(c.x, 0, c.z); } });
    game.traffic = traffic;
    // The pole sign by the frontage road.
    add(F.poleSign('HEARTLAND\nINN EXPRESS'), 34, 0, 45, 0);
    // Gas station and billboard across the interstate.
    const station = new T.Group();
    const store = mbox(16, 4.5, 10, F.mat('#cbbfa8')); store.position.set(0, 2.25, -6); station.add(store);
    const canopy2 = mbox(18, 1, 10, F.mat('#f2f2f2')); canopy2.position.set(0, 5.4, 8); station.add(canopy2);
    const stripe = new T.Mesh(new T.PlaneGeometry(18, 0.5), F.glow('#e63946', 1.4)); stripe.position.set(0, 5.4, 13.02); station.add(stripe);
    for (const x of [-6, 0, 6]) { const p = mbox(0.4, 4.9, 0.4, F.mat('#ddd')); p.position.set(x, 2.45, 8); station.add(p); const pump = mbox(0.8, 1.6, 0.5, F.mat('#c1121f')); pump.position.set(x, 0.8, 8); station.add(pump); }
    const ss = F.sign('ROUTE 66 TRAVEL STOP\nFUEL · FOOD · FIREWORKS', { w: 9, h: 1.6, bg: '#1d3557', fg: '#ffd166', font: 'bold 64px system-ui', emissive: 1.1 }); ss.position.set(0, 3.4, -0.98); station.add(ss);
    station.position.set(-70, 0, 112); station.rotation.y = Math.PI; scene.add(station);
    flat(-95, -45, 98, 130, lib.surface('asphalt', { repeat: [8, 5], color: '#6a6a6a' }), 0.007);
    for (const [x, z] of [[-60, 126], [-76, 126.5]]) add(vehicle('g3-semi-truck', Math.PI / 2), x, 0, z);
    const bb = new T.Group();
    for (const x of [-3, 3]) { const p = mbox(0.5, 8, 0.5, F.mat('#5a5f63')); p.position.set(x, 4, 0); bb.add(p); }
    const face = F.sign('CAVE TOURS\nEXIT 129 · OPEN DAILY', { w: 12, h: 4, bg: '#3a2416', fg: '#ffe8a3', font: 'bold 96px Georgia, serif', emissive: 0.4 }); face.position.set(0, 9.5, 0.3); bb.add(face);
    const bback = mbox(12.2, 4.2, 0.4, F.mat('#2d2d2d')); bback.position.set(0, 9.5, 0); bb.add(bback);
    bb.position.set(55, 0, 96); bb.rotation.y = Math.PI * 0.95; scene.add(bb);
    const tower2 = lib.model('municipal-water-tower', { height: 34 }); add(tower2, -190, 0, -160);
    // Tree lines and scattered hardwoods (instanced, original low-poly).
    let s2 = 3; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 360; i++) {
      const band = i % 3;
      const x = -420 + r2() * 840, z = band === 0 ? -70 - r2() * 60 : band === 1 ? 120 + r2() * 160 : (r2() < 0.5 ? -1 : 1) * (60 + r2() * 300);
      const zz = band === 2 ? -40 + r2() * 130 : z, xx = band === 2 ? (z > 0 ? 70 + r2() * 300 : -80 - r2() * 300) : x;
      if (Math.abs(zz - 75) < 20 && band !== 1) continue;
      trees.push([xx, zz, 0.7 + r2() * 0.9]);
    }
    plantTrees();
  }
  // One InstancedMesh per mesh of a model, each placement a Matrix4 (model origin kept, bottom on the ground).
  function instances(id, placements, emissiveHeads = false, paints = null) {
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
      scene.add(im);
    });
  }
  function lightPole() {
    const g = new T.Group(), grey = F.mat('#3b3f44', { metalness: 0.6, roughness: 0.4 });
    F.cyl(0.35, 0.4, 0.6, concrete, 0, 0, 0, g, 12);
    F.box(0.16, 7.6, 0.16, grey, 0, 0.6, 0, g);
    for (const s of [-1, 1]) {
      F.box(1.0, 0.08, 0.08, grey, s * 0.5, 8.0, 0, g);
      F.box(0.6, 0.14, 0.4, grey, s * 1.15, 7.95, 0, g);
      F.box(0.5, 0.02, 0.32, F.glow('#fff1d6', 2.5), s * 1.15, 7.94, 0, g);
    }
    return g;
  }
  function plantTrees() {
    const trunk = new T.InstancedMesh(new T.CylinderGeometry(0.18, 0.28, 4, 6), F.mat('#4a3a2c', { roughness: 1 }), trees.length);
    const crown = new T.InstancedMesh(new T.IcosahedronGeometry(3, 1), F.mat('#4f6b35', { roughness: 1, flatShading: true }), trees.length);
    trees.forEach(([x, z, s], i) => {
      dm.rotation.set(0, i, 0); dm.scale.setScalar(s); dm.position.set(x, 2 * s, z); dm.updateMatrix(); trunk.setMatrixAt(i, dm.matrix);
      dm.scale.set(s * (1 + (i % 3) * 0.15), s * (0.9 + (i % 4) * 0.12), s); dm.position.set(x, 5.2 * s, z); dm.updateMatrix(); crown.setMatrixAt(i, dm.matrix);
      crown.setColorAt(i, new T.Color().setHSL(0.22 + (i % 7) * 0.012, 0.35, 0.22 + (i % 5) * 0.025));
    });
    crown.castShadow = trunk.castShadow = true;
    scene.add(trunk, crown);
  }

  // Exterior windows (glass + interior drapes) for every guest-room window; room 212 got its own above.
  const backdrops = ['lit', null, null, 'lit', null];
  let k = 0;
  for (const x of [12, 16.5, 21, 25.5]) placeWindow(x + 2.25, 0.8, 8.95, 1.6, 1.5, Math.PI, { drapes: false, backdrop: backdrops[k++ % 5] ?? 'shut' });
  for (const x of [-12, -7.5, 1.5, 16.5, 21, 25.5]) placeWindow(x + 2.25, FLOOR2 + 0.75, 8.95, 1.6, 1.5, Math.PI, { drapes: false, backdrop: backdrops[k++ % 5] ?? 'shut' });
  for (const x of [-12, -7.5, -3, 1.5, 12, 16.5, 21, 25.5]) placeWindow(x + 2.25, FLOOR2 + 0.75, -8.95, 1.6, 1.5, 0, { drapes: false, backdrop: backdrops[k++ % 5] ?? 'shut' });
  for (const x of [18, 22, 26]) placeWindow(x + 2, 0.8, -8.95, 1.6, 1.5, 0, { drapes: false, backdrop: backdrops[k++ % 5] ?? 'shut' });
  // Storefront and pool glazing.
  const pane = (w, h, x, y, z, ry = 0) => { const p = new T.Mesh(new T.PlaneGeometry(w, h), F.glass()); p.position.set(x, y, z); p.rotation.y = ry; scene.add(p); };
  pane(6.6, 2.3, -7.7, 1.45, 9); pane(5.6, 2.3, 3.2, 1.45, 9);
  pane(3, 3.1, -21, 2.05, 9); pane(4, 3.1, -15.5, 2.05, 9); pane(8.5, 3.1, -18.25, 2.05, -9);
  pane(4, 3.1, -24, 2.05, -4, Math.PI / 2); pane(5, 3.1, -24, 2.05, 3.5, Math.PI / 2);
  pane(4, 1.5, -2, 1.55, -9); pane(4, 1.5, 3.5, 1.55, -9); pane(4, 1.2, 15, 1.8, -9);
  pane(1.6, 1.5, 9.25, 1.55, 8.95); pane(1.6, 1.2, 7.5, FLOOR2 + 1.5, 8.95); pane(1.6, 1.2, 10.5, FLOOR2 + 1.5, 8.95);
  pane(1.2, 1.0, 10.8, FLOOR2 + 1.7, -8.95);
  for (const [y, h] of [[1.55, 1.5], [4.75, 1.5]]) pane(1.2, h, 30, y, 0, Math.PI / 2);
  pane(1.2, 1.5, -12, FLOOR2 + 1.55, 0, Math.PI / 2);
  // Mullions on the storefront.
  for (const x of [-11, -8.8, -6.6, -4.4, 0.4, 2.3, 4.2, 6]) F.box(0.06, 2.3, 0.1, F.mat('#2e3136', { metalness: 0.6 }), x, 0.3, 9, scene);

  // ponytail: merge static walls/slabs per material (~2000 → a few hundred draw calls); split by area if culling ever matters.
  const byMaterial = new Map();
  for (const m of statics) { m.updateMatrixWorld(true); (byMaterial.get(m.material) ?? byMaterial.set(m.material, []).get(m.material)).push(m); }
  for (const [material, meshes] of byMaterial) {
    if (meshes.length < 2) continue;
    const merged = new T.Mesh(mergeGeometries(meshes.map(m => m.geometry.clone().applyMatrix4(m.matrixWorld))), material);
    merged.castShadow = meshes.some(m => m.castShadow); merged.receiveShadow = true;
    meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); });
    scene.add(merged);
  }

  // Dusk: lot lights carry the outside; day: they're off.
  const setTimeOfDay = name => { outdoor.forEach(a => (a.intensity = name === 'dusk' ? a.base : 0)); breakfast.group.visible = name === 'day'; };

  return { setTimeOfDay, colliders, surfaces, interact, updaters, lightAnchors, zones, elevator, room, spawn: { x: 4.4, z: 17.0, yaw: 0.6 } };
}
