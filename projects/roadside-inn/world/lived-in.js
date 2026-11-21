// SPDX-License-Identifier: CC0-1.0
// Proof of life: outlets and cords, things guests left behind, and wear where people actually walk.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { economy } from '../quality.js';

export function buildLivedIn(ctx) {
  const {
    scene, lib, add, seeded, loose, cordGeometry, socket,
    plugMat, R,
  } = ctx;
  // ---------- proof of life: outlets and cords, things guests left behind ----------
  {
    const cords = [], whiteCords = [];
    const cord = (pts, list = cords) => list.push(cordGeometry(pts));
    // A wall outlet (receptacles 0.3 m up, facing out of the wall) and a plug in its lower socket; socket() (lamps.js)
    // makes it something a cord plugs into.
    const outlet = (x, z, ry, plugged = true, y = 0) => {
      const o = add(lib.model('hotel-outlet', { origin: true }), x, y, z, ry);
      if (plugged) { const p = F.box(0.034, 0.03, 0.026, plugMat, 0, 0.266, 0.013); o.add(p); }
      socket(o, plugged, true, y);
      return o;
    };
    // A floor box: the same outlet turned face-up, flush with the floor, for lamps out in the room.
    const floorBox = (x, z) => { const g = new T.Group(), o = lib.model('hotel-outlet', { origin: true }); o.position.y = -0.3; g.add(o); g.rotation.x = -Math.PI / 2; g.position.set(x, 0.018, z); scene.add(g); socket(o, false, false); return g; };
    const W = -11.905, E = 6.42, N = -8.89;            // wall faces
    // west living room: the two floor lamps and the reading lamp plug in here (lamps.js floorLamp, tableLamp)
    outlet(W, 3.35, Math.PI / 2, false);
    outlet(W, 7.25, Math.PI / 2, false);
    outlet(W, 0.15, Math.PI / 2, false);
    // great room: the side-table lamp to a floor box; the TV wall outlet
    floorBox(2.0, 8.75);   // the side-table lamp's cord is live (tableLamp)
    outlet(E, 7.75, -Math.PI / 2, false);
    // pantry: vending machine cord to the outlet between the two machines; a spare by the clock
    outlet(E, -5.99, -Math.PI / 2); cord([[6.3, 0.02, -6.12], [6.36, 0.016, -6.03], [E - 0.03, 0.05, -6.0], [E - 0.03, 0.27, -5.99]]);
    outlet(0.4, N, 0, false); outlet(-3.2, N, 0, false);
    // business center: the PCs' power strip cord runs from the grommet down the back to the wall
    outlet(E, -2.15, -Math.PI / 2); cord([[6.18, 0.74, -2.9], [6.24, 0.4, -2.75], [6.3, 0.02, -2.5], [6.38, 0.016, -2.25], [E - 0.03, 0.05, -2.16], [E - 0.03, 0.27, -2.15]]);
    // market: the cooler and the office face; a spare by the brochure rack
    outlet(-4.925, -7.3, Math.PI / 2, false);   // between the cooler and the shelves (that wall runs z -9..-5 only)
    // room 212: beside the nightstand (the headboard wall's accent panel is 2 cm proud of the wall) and on the west wall
    // between the micro-fridge and the credenza: carry a lamp up and it plugs in here
    outlet(R.x1 - 0.09, 4.5, -Math.PI / 2, false, R.y); outlet(R.x0 + 0.07, 4.65, Math.PI / 2, false, R.y);
    // a phone left charging on the communal table, a half-finished coffee, the morning papers
    const ph = add(lib.model('hotel-phone', { origin: true }), -1.98, 1.05, -5.13, 0.5);
    cord([[-2.055, 1.0585, -5.4], [-2.05, 1.07, -5.33], [-2.03, 1.052, -5.25], [-1.98 + 0.085 * Math.sin(0.5), 1.054, -5.13 + 0.085 * Math.cos(0.5)]], whiteCords);
    loose(add(lib.model('hotel-coffee-cup', { origin: true }), -1.15, 1.05, -5.62, 2.1), { rest: true });
    loose(add(lib.model('hotel-coffee-cup', { origin: true }), 4.05, 0.42, 6.5, -0.7), { rest: true });
    loose(add(lib.model('hotel-coffee-cup', { origin: true }), 5.86, 0.763, -2.25, 0.9), { rest: true });
    loose(add(lib.model('hotel-newspaper', { origin: true }), 4.4, 0.421, 6.85, 0.35), { rest: true }).userData.edition = 'today';
    loose(add(lib.model('hotel-newspaper', { origin: true }), -8.15, 0.401, 5.45, -1.9), { rest: true }).userData.edition = 'yesterday';
    // The morning papers: five separate copies, each one you can take and read (main.js), squared
    // up the way they come off the bundle, each a few millimetres off the last. Before, one "stack" model, taken as a lump.
    const off = seeded(31);
    for (let i = 0; i < 5; i++) loose(add(lib.model('hotel-newspaper', { origin: true }), 2.35 + (off() - 0.5) * 0.02, 1.0 + i * 0.0062, -5.4 + (off() - 0.5) * 0.02, 0.2 + (off() - 0.5) * 0.06), { rest: true, stack: 'lobby-newspapers' }).userData.edition = 'today';
    loose(add(lib.model('hotel-newspaper', { origin: true }), 2.37, 1.0 + 5 * 0.0062, -5.41, 1.1), { rest: true, stack: 'lobby-newspapers' }).userData.edition = 'yesterday';   // yesterday's, left crosswise on top
    const black = F.mat('#141414', { roughness: 0.55 }), white = F.mat('#e9e9e6', { roughness: 0.4 });
    for (const [list, m] of [[cords, black], [whiteCords, white]]) if (list.length) { const mesh = new T.Mesh(mergeGeometries(list), m); mesh.name = 'Cords'; scene.add(mesh); }
  }

  // ---------- lived in: wear where people actually go ----------
  // Faint and seeded. Floor traffic dulls the oak along the walking lines (mat to desk, in front of the pods, the coffee
  // bar, the machines); shoes scuff the pods' toe kicks; luggage carts leave rubber on the corridor jambs; the coffee
  // counter keeps a few rings and drips. Each kind is one merged mesh over one canvas texture (a draw call each).
  {
    const canvasTex = (size, draw) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
    const decalMat = (map, opacity, color = '#ffffff') => new T.MeshStandardMaterial({ map, color, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 1 });
    const blotches = (seed, n, rgb, alpha, minR, maxR, squash = 1) => (g, S) => {
      const r = seeded(seed);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * S * 0.36, x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * squash, rad = minR + r() * (maxR - minR);
        const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${rgb},${alpha * (0.4 + r() * 0.6)})`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
      }
    };
    const flat = (w, d, x, y, z, ry) => new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2).rotateY(ry).translate(x, y, z);
    const onWall = (w, h, x, y, z, ry) => new T.PlaneGeometry(w, h).rotateY(ry).translate(x, y, z);
    const merged = (geos, mat, name) => { const m = new T.Mesh(mergeGeometries(geos), mat); m.name = name; m.renderOrder = 1; scene.add(m); return m; };
    const FLOOR = 0.0104;                                   // the lobby floor's top is 0.01
    // traffic: soft, wide, low-contrast dulling (it should read as worn finish, never as a stain)
    const traffic = canvasTex(256, blotches(11, 140, '96,88,78', 0.08, 30, 70, 0.75));
    const r = seeded(5), paths = [];
    const walk = (x0, z0, x1, z1, width, step = 0.45) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step)); for (let i = 0; i <= n; i++) { const t = i / n; paths.push(flat(width * (1.1 + r() * 0.3), width * (1.6 + r() * 0.4), x0 + (x1 - x0) * t + (r() - 0.5) * 0.12, FLOOR, z0 + (z1 - z0) * t + (r() - 0.5) * 0.12, Math.atan2(x1 - x0, z1 - z0) + (r() - 0.5) * 0.25)); } };
    walk(-2, 7.0, -7.2, -1.6, 1.3);                         // in the doors and straight to the desk
    walk(-8.8, -2.05, -6.8, -2.05, 1.1, 0.4);              // standing at the pods
    walk(1.9, -7.85, 4.9, -7.85, 1.0, 0.4);               // along the coffee bar
    walk(5.25, -6.6, 5.25, -5.2, 0.9, 0.4);                // at the machines
    walk(-2, 7.0, 0.8, -3.5, 1.1);                          // doors to the pantry
    merged(paths, decalMat(traffic, 0.2), 'Floor wear');
    // shoe scuffs on the pods' white toe kicks (front face at z -2.64, 0.1-0.3 m up)
    const scuffTex = canvasTex(256, (g, S) => { const q = seeded(23); for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(30,30,32,${0.15 + q() * 0.35})`; g.lineWidth = 1 + q() * 3; g.lineCap = 'round'; const x = q() * S, y = S * (0.35 + q() * 0.5); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (q() - 0.3) * 50, y + (q() - 0.5) * 10); g.stroke(); } });
    const scuffs = [];
    for (const x of [-9.9, -7.65]) for (let k = 0; k < 3; k++) scuffs.push(onWall(0.32, 0.16, x + (r() - 0.5) * 0.9, 0.2 + r() * 0.06, -2.633, 0));
    // luggage-cart rubber at hub height on the corridor jambs (east wall, x 6.42, opening z -1..1)
    for (const z of [-1.18, 1.18]) scuffs.push(onWall(0.3, 0.14, 6.413, 0.24, z, -Math.PI / 2), onWall(0.22, 0.1, 6.413, 0.33, z + (z > 0 ? 0.12 : -0.12), -Math.PI / 2));
    merged(scuffs, decalMat(scuffTex, 0.85), 'Scuffs');
    // coffee rings and a couple of drips by the dispensers (counter top 0.94; grates at x 2.0-2.6, z -8.6)
    const ringTex = canvasTex(128, (g, S) => { g.strokeStyle = 'rgba(92,52,24,0.55)'; g.lineWidth = 3; g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, 0.2, Math.PI * 1.85); g.stroke(); g.fillStyle = 'rgba(92,52,24,0.12)'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, 0, Math.PI * 2); g.fill(); });
    const rings = [[2.3, -8.43, 0.085], [2.75, -8.38, 0.08], [3.05, -8.47, 0.07], [2.1, -8.36, 0.05], [2.92, -8.42, 0.04]].map(([x, z, d]) => flat(d, d, x, 0.9412, z, r() * 6));
    merged(rings, decalMat(ringTex, 0.9), 'Coffee rings');
    // and what the last guest left on it: a used stir stick and two sugar packets that missed the cubby (counter top about 0.941, where the rings sit).
    // ponytail: static, not loose: a 1.5 mm stick is below what the physics should be asked to rest (ask God if they must be takeable).
    const stick = F.box(0.14, 0.0015, 0.005, F.mat('#d9c39a', { roughness: 0.8 }), 3.42, 0.9412, -8.36, scene); stick.rotation.y = 0.42; stick.name = 'Stir stick';
    const stain = F.box(0.035, 0.0003, 0.0055, F.mat('#6b4426', { roughness: 0.6 }), 3.42 - 0.052 * Math.cos(0.42), 0.9427, -8.36 + 0.052 * Math.sin(0.42), scene); stain.rotation.y = 0.42;   // the wet end
    for (const [x, z, ry, c] of [[3.6, -8.33, 0.9, '#f2b8c6'], [3.53, -8.43, -0.3, '#9cc6ea']]) { const k = F.box(0.05, 0.003, 0.034, F.mat(c, { roughness: 0.7 }), x, 0.9412, z, scene); k.rotation.y = ry; k.name = 'Sugar packet'; }
  }
}

// Contact shade and grime on the floor-1 floor, painted once from what actually stands on it. Where a thing meets the
// floor, light is blocked and the mop doesn't reach: a tight warm-dark line at every foot, base and wall, and a wide soft
// falloff by height. Phones have no shadow maps, so without this everything there floats. Called last (world.js), when
// everything static is in the scene. One canvas, one multiply-blended plane: one draw call, ~0.4 MB on phones.
// ponytail: statics only; loose chairs and stools rely on shadow maps (desktop). Add blob shadows if phones need them.
export function buildFloorShade({ scene, colliders, updaters }) {
  const X0 = -12, X1 = 9.5, Z0 = -9, Z1 = 9, PX = economy ? 24 : 48;   // lobby, elevator alcove, corridor mouth; px per m
  const W = Math.round((X1 - X0) * PX), H = Math.round((Z1 - Z0) * PX);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  // Painted on the first frame, not here: the highway's cars are still parked at the origin until their updaters run.
  let painted = false;
  updaters.push(() => { if (painted) return; painted = true; paint(); tex.needsUpdate = true; });
  function paint() {
  const box = new T.Box3(), world = new T.Matrix4(), feet = [];
  scene.traverse(n => {
    if (!n.isMesh || n.isSkinnedMesh || [].concat(n.material).some(m => m.transparent)) return;
    for (let p = n; p; p = p.parent) if (p.userData.loose || !p.visible || /elevator/.test(p.name)) return;   // movable things (the car too) carry no baked shade
    // world box from the local chain: frozen statics (matrixWorldAutoUpdate off) still hold an identity matrixWorld here
    world.identity(); for (let p = n; p; p = p.parent) { if (p.matrixAutoUpdate) p.updateMatrix(); world.premultiply(p.matrix); }
    if (n.isInstancedMesh) n.computeBoundingBox(); else n.geometry.boundingBox ?? n.geometry.computeBoundingBox();
    box.copy(n.isInstancedMesh ? n.boundingBox : n.geometry.boundingBox).applyMatrix4(world);
    if (box.min.y > 0.06 || box.min.y < -0.05 || box.max.y < 0.04 || box.max.x < X0 || box.min.x > X1 || box.max.z < Z0 || box.min.z > Z1) return;
    const w = box.max.x - box.min.x, d = box.max.z - box.min.z;
    if (w * d > 6 || Math.max(w, d) > 4) return;   // merged geometry (walls, trees, the lot) spans everything: walls come from colliders below
    feet.push([box.min.x, box.min.z, box.max.x, box.max.z, Math.min(1, box.max.y - box.min.y)]);
  });
  // walls and columns: the tall colliders (the low ones include invisible gap closers, which must cast nothing)
  for (const c of colliders) if (!c.loose && c.y0 < 0.1 && c.y1 > 1.5 && c.x1 > X0 && c.x0 < X1 && c.z1 > Z0 && c.z0 < Z1) feet.push([c.x0, c.z0, c.x1, c.z1, 1]);
  // A blurred rect via the canvas shadow (filter: blur() isn't in older Safari): draw it off-canvas, its shadow lands in place.
  g.fillStyle = '#000';
  // Small things (pots, bins, legs) get an ellipse: a square shade under a round pot reads as a bug. Walls and casework keep the rect.
  const shade = ([x0, z0, x1, z1], sigma, rgba) => {
    g.shadowColor = rgba; g.shadowBlur = sigma * PX * 2; g.shadowOffsetX = W * 2;
    const w = Math.max(1, (x1 - x0) * PX), h = Math.max(1, (z1 - z0) * PX), x = (x0 - X0) * PX - W * 2, y = (z0 - Z0) * PX;
    if (x1 - x0 < 1.2 && z1 - z0 < 1.2) { g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w * 0.4, h * 0.4, 0, 0, Math.PI * 2); g.fill(); } else g.fillRect(x, y, w, h);
  };
  for (const f of feet) shade(f, 0.1 + 0.18 * f[4], `rgba(70,58,44,${0.12 + 0.14 * f[4]})`);   // occlusion: taller things block more sky
  for (const f of feet) shade(f, 0.02, 'rgba(52,42,32,0.4)');                                  // the contact line, and grime the mop misses
  }
  const mat = new T.MeshBasicMaterial({ map: tex, blending: T.MultiplyBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  mat.userData.noEnv = true;   // main.js tagInterior: a reflection map on a multiply overlay blacks out the floor
  const plane = new T.Mesh(new T.PlaneGeometry(X1 - X0, Z1 - Z0).rotateX(-Math.PI / 2), mat);
  plane.position.set((X0 + X1) / 2, 0.0112, (Z0 + Z1) / 2); plane.name = 'Floor shade'; plane.renderOrder = 1; plane.receiveShadow = false; plane.castShadow = false;
  scene.add(plane);
  return plane;
}

// 4-inch rubber cove base on every painted wall run in the lobby (no real commercial wall meets the floor bare). Built
// from the wall pieces themselves (statics: boxes whose bottom is on the floor), a strip on each face that looks into the
// lobby; glass and millwork aren't wall pieces, so they get none. One merged mesh, one draw call.
export function buildCoveBase({ scene, statics }) {
  const X0 = -12, X1 = 9.5, Z0 = -9, Z1 = 9, H = 0.1, T_ = 0.004, inside = (x, z) => x > X0 && x < X1 && z > Z0 && z < Z1;
  const geos = [];
  for (const m of statics) {
    const p = m.geometry?.parameters; if (!m.isMesh || m.isInstancedMesh || !p?.width || !p.depth) continue;
    const { x, y, z } = m.position, bottom = y - p.height / 2;
    if (Math.abs(bottom) > 0.02 || p.height < 0.5 || Math.min(p.width, p.depth) > 0.2 || Math.max(p.width, p.depth) < 0.1 || m.rotation.y) continue;
    const alongX = p.width > p.depth, len = alongX ? p.width : p.depth, half = (alongX ? p.depth : p.width) / 2 + T_ / 2;
    for (const s of [-1, 1]) {
      const fx = alongX ? x : x + s * half, fz = alongX ? z + s * half : z;
      if (!inside(fx, fz)) continue;
      geos.push((alongX ? new T.BoxGeometry(len, H, T_) : new T.BoxGeometry(T_, H, len)).translate(fx, 0.01 + H / 2, fz));
    }
  }
  if (!geos.length) return;
  const cove = new T.Mesh(mergeGeometries(geos), F.mat('#3b3835', { roughness: 0.55 })); cove.name = 'Cove base'; cove.receiveShadow = true;
  scene.add(cove); statics.push(cove);
}
