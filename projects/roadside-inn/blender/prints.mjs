// SPDX-License-Identifier: CC0-1.0
// Printed textiles and wall graphics drawn as SVG and rasterised with sharp (every design here is invented):
//   pillow.png  the navy ogee-lattice jacquard of the lobby throw pillows (after the Formula Blue 2.0 lobby pillows).
//               One tile = 0.27 m (sofa.py's cube-projection tile): 3 x 2 ogees, so each is 9 x 13.5 cm.
//   heather.jpg Poly Haven's jogging_melange colour map (CC0, parts/haven/ph-hotel-melange-color.jpg), mottling
//               contrast x1.6 so it survives mipmapping at standing distance, shifted to a light cool grey.
//   node projects/roadside-inn/blender/prints.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('./labels/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const png = (name, w, h, body, fmt = 'png') => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`))[fmt]({ quality: 90 })
  .toFile(new URL(`${name}.${fmt === 'jpeg' ? 'jpg' : fmt}`, OUT).pathname).then(() => console.log(name));

// ---------- pillow jacquard: interlocking ogees, navy ground, cobalt / sky fills, white and navy outlines ----------
function ogee(cx, cy, w, h, k = 0.28) {
  // the classic ogee cell: points top and bottom, each side an S-curve leaving the point vertically and arriving at
  // the waist vertically, so neighbouring cells share their curves exactly
  const [tx, ty, rx, ry, bx, by, lx, ly] = [cx, cy - h / 2, cx + w / 2, cy, cx, cy + h / 2, cx - w / 2, cy];
  const f = n => n.toFixed(1);
  return `M${f(tx)} ${f(ty)} C${f(tx)} ${f(ty + h * k)} ${f(rx)} ${f(ry - h * k)} ${f(rx)} ${f(ry)} ` +
    `C${f(rx)} ${f(ry + h * k)} ${f(bx)} ${f(by - h * k)} ${f(bx)} ${f(by)} ` +
    `C${f(bx)} ${f(by - h * k)} ${f(lx)} ${f(ly + h * k)} ${f(lx)} ${f(ly)} ` +
    `C${f(lx)} ${f(ly - h * k)} ${f(tx)} ${f(ty + h * k)} ${f(tx)} ${f(ty)}Z`;
}
function pillow(S = 1024) {
  const w = S / 3, h = S / 2, fills = ['#2b58b8', '#7ea4d4', '#1f4596', '#4f7fc6'];
  let s = `<rect width="${S}" height="${S}" fill="#13285a"/>`;
  let k = 0;
  for (let j = -1; j <= 2; j++) for (let i = -1; i <= 3; i++) for (const off of [0, 0.5]) {
    const cx = (i + off) * w, cy = (j + off) * h, d = ogee(cx, cy, w, h);
    const f = fills[((((i % 3) + 3) % 3) * 2 + (((j % 2) + 2) % 2) + (off ? 3 : 0)) % 4];   // period 3 x 2 cells: tiles seamlessly
    s += `<path d="${d}" fill="#eef1f6"/>`;
    s += `<path d="${ogee(cx, cy, w * 0.93, h * 0.95)}" fill="#13285a"/>`;
    s += `<path d="${ogee(cx, cy, w * 0.62, h * 0.72)}" fill="${f}"/>`;
    s += `<path d="${ogee(cx, cy, w * 0.2, h * 0.34)}" fill="#eef1f6" opacity="0.85"/>`;
    k++;
  }
  // jacquard: woven yarns soften every edge a little and add a faint weft stripe
  let weft = '';
  for (let y = 0; y < S; y += 4) weft += `<rect x="0" y="${y}" width="${S}" height="1.5" fill="#000" opacity="0.07"/>`;
  return `<defs><filter id="soft"><feGaussianBlur stdDeviation="1.4"/></filter></defs><g filter="url(#soft)">${s}</g>${weft}`;
}

await png('pillow', 1024, 1024, pillow(1024));

// ---------- heather: the sofa fabric's base colour ----------
await sharp(new URL('../../../parts/haven/ph-hotel-melange-color.jpg', import.meta.url).pathname)
  .linear([1.6, 1.6, 1.6], [166 - 285, 180 - 283, 212 - 274]).jpeg({ quality: 90 }).toFile(new URL('heather.jpg', OUT).pathname);
console.log('heather');

// ---------- great-room map mural: 3.1 x 2.81 m printed vinyl, 4096 px wide (0.76 mm a pixel) ----------
// An invented regional map of the Ozark Highlands along I-44 / old Route 66 in the Formula Blue mural style: a cyan to
// cobalt field, navy land blocks (national-forest tracts and the army post), white hairline rivers and roads, sparse big
// type, one mustard "you are here". Geography is loose on purpose (a graphic, not a survey).
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const T = (x, y, s, txt, { f = 'Nimbus Sans', w = 700, fill = '#f4f6f8', a = 'start', ls = 0, op = 1 } = {}) =>
  `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-family="${f}" font-size="${s}" font-weight="${w}" fill="${fill}" text-anchor="${a}" letter-spacing="${ls}" opacity="${op}">${txt}</text>`;
function meander(pts, W, H, rnd, amp = 0.012, steps = 14) {
  // a polyline through pts (0..1) that wanders smoothly between them (two random sines, pinned at each point)
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
    const f1 = 1 + Math.floor(rnd() * 3), f2 = 3 + Math.floor(rnd() * 4), a1 = (rnd() - 0.5) * 2 * amp, a2 = (rnd() - 0.5) * amp * 0.6;
    for (let k = 0; k < steps; k++) {
      const t = k / steps, wob = Math.sin(t * Math.PI * f1) * a1 + Math.sin(t * Math.PI * f2) * a2;
      out.push([(x0 + (x1 - x0) * t + nx / L * wob) * W, (y0 + (y1 - y0) * t + ny / L * wob) * H]);
    }
  }
  const [lx, ly] = pts.at(-1); out.push([lx * W, ly * H]);
  return out;
}
const smoothPath = p => {   // Catmull-Rom through the points as cubic Beziers
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i], b = p[i], c = p[i + 1], e = p[i + 2] ?? c;
    d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  return d;
};
const blob = (cx, cy, rx, ry, W, H, rnd, n = 22, rough = 0.28) => {   // an irregular land tract
  const p = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = 1 + (rnd() - 0.5) * rough * 2; p.push([(cx + Math.cos(a) * rx * r) * W, (cy + Math.sin(a) * ry * r) * H]); }
  p.push(p[0], p[1]);
  return smoothPath(p) + 'Z';
};
function mural(W = 4096, H = 3713) {
  const rnd = rng(1944);
  let s = `<defs><linearGradient id="field" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3596d4"/><stop offset="0.55" stop-color="#2a74c6"/><stop offset="1" stop-color="#1d4fb8"/></linearGradient>
    <filter id="relief" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.0016 0.0022" numOctaves="5" seed="7"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.07  0 0 0 0 0.15  0 0 0 0 0.29  1.4 0 0 0 -0.62"/></filter></defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#field)"/>`;
  s += `<rect width="${W}" height="${H}" filter="url(#relief)" opacity="0.55"/>`;                  // Ozark hill shading, faint
  // county lines: a jittered survey grid, very faint
  let grid = '';
  for (let gx = 0; gx <= W; gx += 410) grid += `<path d="${smoothPath(meander([[gx / W, 0], [gx / W + 0.01, 0.5], [gx / W - 0.005, 1]], W, H, rnd, 0.006, 6))}"/>`;
  for (let gy = 0; gy <= H; gy += 380) grid += `<path d="${smoothPath(meander([[0, gy / H], [0.5, gy / H + 0.008], [1, gy / H - 0.004]], W, H, rnd, 0.005, 6))}"/>`;
  s += `<g fill="none" stroke="#e8f1fb" stroke-width="3" opacity="0.18" stroke-dasharray="26 12">${grid}</g>`;
  // navy land: Mark Twain forest tracts, the army post, a state forest, a wildlife area
  const tracts = [[0.64, 0.74, 0.08, 0.13], [0.46, 0.84, 0.06, 0.1], [0.83, 0.62, 0.08, 0.1], [0.2, 0.95, 0.1, 0.06], [0.74, 0.93, 0.07, 0.06], [0.92, 0.84, 0.06, 0.08], [0.33, 0.86, 0.04, 0.06]];
  // public land follows the survey: each tract is a cluster of section-grid cells, so its edges step at right angles
  const cell = 0.03;
  for (const [cx, cy, rx, ry] of tracts) {
    let cells = '';
    for (let u = cx - rx; u < cx + rx; u += cell) for (let v = cy - ry; v < cy + ry; v += cell) {
      const e = ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
      if (e < 0.5 + rnd() * 0.7) cells += `<rect x="${(u * W - 1).toFixed(0)}" y="${(v * H - 1).toFixed(0)}" width="${(cell * W + 2).toFixed(0)}" height="${(cell * H + 2).toFixed(0)}"/>`;
    }
    s += `<g fill="#13264a">${cells}</g>`;
  }
  s += `<path d="M${0.47 * W} ${0.53 * H} L${0.545 * W} ${0.52 * H} L${0.55 * W} ${0.61 * H} L${0.5 * W} ${0.635 * H} L${0.465 * W} ${0.6 * H}Z" fill="#13264a"/>`;
  // local roads: many faint white hairlines (the street-grid look of the reference)
  let local = '';
  for (let i = 0; i < 260; i++) {
    let x = rnd(), y = rnd(), a = rnd() * 6.28; const p = [[x, y]];
    for (let k = 0; k < 5; k++) { a += (rnd() - 0.5) * 1.2; x += Math.cos(a) * 0.035; y += Math.sin(a) * 0.035; p.push([x, y]); }
    local += `<path d="${smoothPath(p.map(([u, v]) => [u * W, v * H]))}"/>`;
  }
  s += `<g fill="none" stroke="#f4f6f8" stroke-width="2.5" opacity="0.3" stroke-linecap="round">${local}</g>`;
  // water: Lake of the Ozarks (lighter, wide), rivers as white hairlines
  const lake = meander([[0.1, 0.47], [0.17, 0.44], [0.23, 0.49], [0.28, 0.45], [0.33, 0.49]], W, H, rnd, 0.008, 10);
  s += `<path d="${smoothPath(lake)}" fill="none" stroke="#9fd2f0" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const arm of [[[0.17, 0.44], [0.16, 0.52]], [[0.23, 0.49], [0.22, 0.56]], [[0.28, 0.45], [0.3, 0.4]]])
    s += `<path d="${smoothPath(meander(arm, W, H, rnd, 0.006, 8))}" fill="none" stroke="#9fd2f0" stroke-width="22" stroke-linecap="round"/>`;
  const rivers = [
    [[[0, 0.13], [0.22, 0.17], [0.44, 0.09], [0.62, 0.15], [0.8, 0.11], [1, 0.08]], 11],         // Missouri River
    [[[0.36, 1], [0.42, 0.76], [0.47, 0.6], [0.555, 0.4], [0.58, 0.26], [0.62, 0.15]], 7],      // Gasconade
    [[[0.5, 0.97], [0.52, 0.72], [0.53, 0.54]], 5],                                             // Big Piney
    [[[0.6, 0.8], [0.68, 0.6], [0.75, 0.46], [0.86, 0.34], [0.97, 0.25], [1, 0.24]], 7],         // Meramec
    [[[0.72, 0.62], [0.76, 0.8], [0.8, 1]], 6],                                                 // Current
    [[[0.24, 0.66], [0.25, 0.57], [0.23, 0.49]], 5],                                            // Niangua
    [[[0.14, 1], [0.2, 0.84], [0.22, 0.77]], 5],                                                // James
    [[[0, 0.5], [0.05, 0.48], [0.1, 0.47]], 7],                                                // Osage
  ];
  for (const [pts, wd] of rivers) s += `<path d="${smoothPath(meander(pts, W, H, rnd, 0.018, 16))}" fill="none" stroke="#f4f6f8" stroke-width="${wd}" stroke-linecap="round" opacity="0.92"/>`;
  // highways: state routes thin, old Route 66 dashed, I-44 bold
  const towns = [['JOPLIN', 0.06, 0.885, 0], ['SPRINGFIELD', 0.215, 0.745, 1], ['MARSHFIELD', 0.31, 0.665, 0], ['LEBANON', 0.405, 0.585, 1], ['ST. ROBERT', 0.5, 0.5, 0],
    ['ROLLA', 0.6, 0.445, 1], ['CUBA', 0.69, 0.38, 0], ['SULLIVAN', 0.78, 0.315, 0], ['ST. LOUIS', 0.935, 0.165, 1]];
  for (const [a, b] of [[[0.215, 0.745], [0.2, 0.4]], [[0.6, 0.445], [0.66, 0.85]], [[0.405, 0.585], [0.36, 0.95]], [[0.69, 0.38], [0.75, 0.62]], [[0.5, 0.5], [0.44, 0.2]], [[0.215, 0.745], [0.3, 1]], [[0.6, 0.445], [0.56, 0.12]]])
    s += `<path d="${smoothPath(meander([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], W, H, rnd, 0.01, 8))}" fill="none" stroke="#f4f6f8" stroke-width="5" opacity="0.8"/>`;
  const route = towns.map(([, x, y]) => [x * W, y * H]);
  s += `<path d="${smoothPath(route.map(([x, y]) => [x + 10, y + 46]))}" fill="none" stroke="#f4f6f8" stroke-width="6" stroke-dasharray="34 18" opacity="0.9"/>`;
  s += `<path d="${smoothPath(route)}" fill="none" stroke="#13264a" stroke-width="30" stroke-linecap="round"/>`;
  s += `<path d="${smoothPath(route)}" fill="none" stroke="#f4f6f8" stroke-width="16" stroke-linecap="round"/>`;
  // shields
  const shield = (x, y, n) => `<g transform="translate(${x * W} ${y * H})"><path d="M-62 -70 L62 -70 Q74 30 0 80 Q-74 30 -62 -70Z" fill="#f4f6f8"/><path d="M-50 -58 L50 -58 Q60 26 0 66 Q-60 26 -50 -58Z" fill="#13264a"/>${T(0, 28, 70, n, { a: 'middle' })}</g>`;
  s += shield(0.36, 0.69, '44') + shield(0.8, 0.4, '44');
  s += `<g transform="translate(${0.27 * W} ${0.75 * H})"><rect x="-58" y="-58" width="116" height="116" rx="14" fill="none" stroke="#f4f6f8" stroke-width="7"/>${T(0, -12, 30, 'ROUTE', { a: 'middle' })}${T(0, 44, 64, '66', { a: 'middle' })}</g>`;
  // towns: white dots, big sparse names
  for (const [name, x, y, big] of towns) {
    s += `<circle cx="${x * W}" cy="${y * H}" r="${big ? 30 : 20}" fill="#f4f6f8"/><circle cx="${x * W}" cy="${y * H}" r="${big ? 15 : 9}" fill="#13264a"/>`;
    // names sit off the interstate: south-east of the dot in the west, north-west of it further east
    const se = x < 0.3 || name === 'ROLLA', dx = se ? 52 : -52, dy = se ? (big ? 150 : 120) : -50;
    s += T(x * W + dx, y * H + dy, big ? 118 : 84, name, { a: se ? 'start' : 'end', ls: 4, w: big ? 700 : 400 });
  }
  // you are here: the Heartland, south of I-44 between St. Robert and Rolla
  const hx = 0.565 * W, hy = 0.505 * H;
  s += `<circle cx="${hx}" cy="${hy}" r="74" fill="none" stroke="#e8b400" stroke-width="10" opacity="0.7"/><circle cx="${hx}" cy="${hy}" r="44" fill="#e8b400" stroke="#13264a" stroke-width="10"/>`;
  s += T(hx + 96, hy + 130, 92, 'YOU ARE HERE', { fill: '#e8b400', ls: 6 });
  // water names, italic and quiet
  s += T(0.5 * W, 0.075 * H, 70, 'MISSOURI RIVER', { w: 400, ls: 14, op: 0.8, a: 'middle' });
  s += T(0.1 * W, 0.6 * H, 60, 'LAKE OF THE OZARKS', { w: 400, ls: 8, op: 0.8 });
  // title block, lower left over the open field
  const ty = 0.29 * H;
  s += T(0.045 * W, ty, 280, 'OZARK', { f: 'URW Gothic', w: 700, ls: 26 });
  s += T(0.045 * W, ty + 290, 280, 'HIGHLANDS', { f: 'URW Gothic', w: 700, ls: 26 });
  s += `<rect x="${0.047 * W}" y="${ty + 350}" width="1100" height="8" fill="#e8b400"/>`;
  s += T(0.047 * W, ty + 440, 64, 'INTERSTATE 44  ·  OLD ROUTE 66', { w: 400, ls: 10 });
  // a compass rose, upper right
  s += `<g transform="translate(${0.93 * W} ${0.44 * H})" fill="#f4f6f8"><path d="M0 -120 L26 0 L0 120 L-26 0Z" opacity="0.9"/><path d="M-120 0 L0 -20 L120 0 L0 20Z" opacity="0.6"/>${T(0, -150, 80, 'N', { a: 'middle' })}</g>`;
  // printed in 54-inch (1.37 m) panels, butted: two faint seams
  for (const x of [1810, 3620]) s += `<rect x="${x}" y="0" width="2" height="${H}" fill="#0b1a33" opacity="0.28"/><rect x="${x + 2}" y="0" width="1" height="${H}" fill="#ffffff" opacity="0.12"/>`;
  return s;
}
await png('mural', 4096, 3713, mural(), 'jpeg');

// ---------- wall art: a geometric series (navy, cobalt, greys, one mustard) and graded CC0 photographs ----------
// art.json lists every framed piece for blender/art.py: outer size (painting()'s w x h, unless the row overrides it),
// frame finish, mat border and its print. Photos: Buffalo National River (Arkansas Ozarks), CC0, see
// photos/provenance.json.
const NAVY = '#13264a', COB = '#1d4fb8', MID = '#4f7fc6', G1 = '#c9ccd1', G2 = '#8e939b', PAPER = '#eeece6', MUST = '#e8b400';
const paper = (w, h) => `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0.09 0"/></filter><rect width="${w}" height="${h}" filter="url(#grain)"/>`;
const GEO = {
  lattice(w, h, rnd) {   // interlocking hexagonal lattice in navy line on paper (after the RDU great-room print)
    let s = `<rect width="${w}" height="${h}" fill="${PAPER}"/><g fill="none" stroke="${NAVY}" stroke-width="${w * 0.006}">`;
    const r = w / 9, dx = r * 1.732, dy = r * 1.5;
    for (let row = -1; row * dy < h + r; row++) for (let col = -1; col * dx < w + r; col++) {
      const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy;
      for (const k of [1, 0.62]) s += `<polygon points="${[0, 1, 2, 3, 4, 5].map(i => [cx + Math.cos(Math.PI / 6 + i * Math.PI / 3) * r * k, cy + Math.sin(Math.PI / 6 + i * Math.PI / 3) * r * k].map(n => n.toFixed(1)).join(',')).join(' ')}"/>`;
      s += `<path d="M${cx} ${cy - r * 0.62} V${cy - r} M${cx} ${cy + r * 0.62} V${cy + r}"/>`;
    }
    return s + `</g>`;
  },
  arcs(w, h, rnd) {      // a grid of quarter circles, one mustard
    const n = 4, rows = Math.max(1, Math.round(h / (w / n))), c = w / n, ch = h / rows, cols = [NAVY, COB, G1, MID, G2];
    let s = `<rect width="${w}" height="${h}" fill="${PAPER}"/>`, must = Math.floor(rnd() * n * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
      const x = i * c, y = j * ch, q = Math.floor(rnd() * 4), cx = x + (q % 2) * c, cy = y + (q > 1 ? ch : 0);
      s += `<rect x="${x}" y="${y}" width="${c}" height="${ch}" fill="${cols[(i + j * 2) % 5] === NAVY ? G1 : NAVY}"/>`;
      s += `<clipPath id="q${i}_${j}"><rect x="${x}" y="${y}" width="${c}" height="${ch}"/></clipPath><ellipse cx="${cx}" cy="${cy}" rx="${c}" ry="${ch}" clip-path="url(#q${i}_${j})" fill="${j * n + i === must ? MUST : cols[(i * 3 + j) % 5]}"/>`;
    }
    return s;
  },
  ridges(w, h, rnd) {    // layered ridgelines, far grey to near navy, a mustard sun
    let s = `<rect width="${w}" height="${h}" fill="${PAPER}"/><circle cx="${w * 0.7}" cy="${h * 0.3}" r="${h * 0.12}" fill="${MUST}"/>`;
    const bands = ['#d5d8dd', G1, '#a9b4c6', MID, COB, NAVY];
    bands.forEach((col, k) => {
      const base = h * (0.38 + k * 0.1); let d = `M0 ${h} L0 ${base}`;
      for (let x = 0; x <= w; x += w / 12) d += ` L${x.toFixed(0)} ${(base - Math.abs(Math.sin(x / w * (3 + k) + k * 1.7)) * h * 0.08 - rnd() * h * 0.015).toFixed(0)}`;
      s += `<path d="${d} L${w} ${h}Z" fill="${col}"/>`;
    });
    return s;
  },
  contours(w, h, rnd) {  // topographic contours of an invented hollow, a mustard spring
    let s = `<rect width="${w}" height="${h}" fill="#dfe2e6"/><g fill="none" stroke="${NAVY}">`;
    const cx = w * 0.45, cy = h * 0.55, ph = [rnd() * 6, rnd() * 6];
    for (let k = 1; k < 26; k++) {
      let d = '';
      for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2, r = k * w * 0.028 * (1 + 0.22 * Math.sin(a * 2 + ph[0]) + 0.12 * Math.sin(a * 3 + ph[1] + k * 0.08));
        d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r * 0.8).toFixed(1)}`; }
      s += `<path d="${d}Z" stroke-width="${k % 5 ? w * 0.002 : w * 0.005}" opacity="${k % 5 ? 0.7 : 1}"/>`;
    }
    return s + `</g><circle cx="${cx + w * 0.02}" cy="${cy}" r="${w * 0.02}" fill="${MUST}"/>`;
  },
  bars(w, h, rnd) {      // vertical bars of varied width, one mustard
    let s = `<rect width="${w}" height="${h}" fill="${PAPER}"/>`, x = w * 0.08;
    const cols = [NAVY, G1, COB, G2, NAVY, MID, G1, MUST, NAVY, G2];
    for (const col of cols) { const bw = w * (0.03 + rnd() * 0.08); if (x + bw > w * 0.92) break; s += `<rect x="${x}" y="${h * 0.1}" width="${bw}" height="${h * 0.8}" fill="${col}"/>`; x += bw + w * 0.012; }
    return s;
  },
  circles(w, h, rnd) {   // overlapping discs, multiplied
    let s = `<rect width="${w}" height="${h}" fill="${PAPER}"/><g style="mix-blend-mode:multiply">`;
    for (const [x, y, r, col] of [[0.35, 0.45, 0.3, MID], [0.6, 0.55, 0.28, G2], [0.48, 0.32, 0.18, NAVY], [0.72, 0.3, 0.06, MUST]])
      s += `<circle cx="${x * w}" cy="${y * h}" r="${r * Math.min(w, h) * 1.2}" fill="${col}" opacity="0.85"/>`;
    return s + `</g>`;
  },
  quilt(w, h, rnd) {     // half-square triangles, an Ozark quilt block abstracted
    const n = 4, rows = Math.max(1, Math.round(h / (w / n))), c = w / n, ch = h / rows, cols = [NAVY, COB, G1, G2, MID];
    let s = `<rect width="${w}" height="${h}" fill="${PAPER}"/>`;
    for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) {
      const x = i * c, y = j * ch, a = cols[(i + j) % 5], b = (i === 2 && j === 1) ? MUST : cols[(i * 2 + j + 2) % 5];
      const flip = (i + j) % 2;
      s += `<path d="M${x} ${y} H${x + c} ${flip ? `V${y + ch}` : `L${x} ${y + ch}`}Z" fill="${a}"/><path d="${flip ? `M${x} ${y} L${x} ${y + ch} H${x + c}Z` : `M${x + c} ${y} V${y + ch} H${x}Z`}" fill="${b}"/>`;
    }
    return s;
  },
};
// [name, painting() w x h, kind, source, frame, mat (m), outer override]
const ART = [
  ['lobby', 1.0, 0.75, 'photo', 'carver-landing-001', 'black', 0, [1.2, 0.9]],      // Natasha: may grow to 1.2 x 0.9
  ['corr0', 0.8, 0.6, 'geo', 'lattice', 'white', 0.07],
  ['corr1', 0.8, 0.6, 'photo', 'steel-creek-001', 'black', 0],
  ['corr2', 0.8, 0.6, 'geo', 'arcs', 'white', 0.07],
  ['corr3', 0.8, 0.6, 'geo', 'contours', 'black', 0.07],
  ['corr4', 0.8, 0.6, 'geo', 'ridges', 'white', 0.07],
  ['corr5', 0.8, 0.6, 'photo', 'steel-creek-002', 'black', 0],
  ['corr6', 0.8, 0.6, 'geo', 'bars', 'white', 0.07],
  ['corr7', 0.8, 0.6, 'geo', 'circles', 'black', 0.07],
  ['head', 1.45, 0.58, 'geo', 'ridges', 'white', 0.05, [1.45, 0.5]],             // clears the headboard's top (1.575)
  ['tv', 1.05, 0.42, 'photo', 'carver-landing-002', 'black', 0],
  ['entry', 0.45, 0.6, 'geo', 'quilt', 'white', 0.06],
];
const FRAME = 0.022, art = [];
for (const [name, pw, ph, kind, src, frame, mat, outer] of ART) {
  const [W, H] = outer ?? [pw, ph], ww = W - 2 * (FRAME + mat), wh = H - 2 * (FRAME + mat);
  const long = Math.max(ww, wh) > 0.9 ? 2048 : 1280, px = Math.round(long * ww / Math.max(ww, wh)), py = Math.round(long * wh / Math.max(ww, wh));
  const file = `art-${name}.jpg`, out = new URL(file, OUT).pathname;
  if (kind === 'photo') {   // centre crop, a little cooler and less saturated, like a lobby print under LED
    await sharp(new URL(`./photos/${src}.jpg`, import.meta.url).pathname).resize(px, py, { fit: 'cover', position: 'attention' })
      .modulate({ saturation: 0.86, brightness: 1.03 }).linear([0.95, 0.99, 1.06], [2, 2, 6]).jpeg({ quality: 90 }).toFile(out);
  } else {
    const body = GEO[src](px, py, rng(name.length * 7919 + px)) + paper(px, py);
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}">${body}</svg>`)).jpeg({ quality: 90 }).toFile(out);
  }
  art.push({ name, w: pw, h: ph, outer: [+W.toFixed(3), +H.toFixed(3)], frame, mat, window: [+ww.toFixed(3), +wh.toFixed(3)], image: file, source: kind === 'photo' ? `photos/${src}.jpg` : `prints.mjs ${src}` });
  console.log(file, px, py);
}
writeFileSync(new URL('art.json', OUT).pathname, JSON.stringify(art, null, 2) + '\n');

// ---------- front-desk gear: one atlas (desk.png) and its layout (desk.json) for blender/desk.py ----------
// Faces are drawn in print space (x right, y down, as the user sees the device); key rects are kept normalised to the
// face so desk.py raises each key exactly where it is drawn. Brands invented: FrontLine PMS, Cardwell, Ridgeline,
// TallyPoint.
{
  const AW = 2048, AH = 1024, SANS = 'Liberation Sans';
  const rect = {}, keys = {};
  const put = (name, x, y, w, h) => { rect[name] = [x / AW, 1 - (y + h) / AH, (x + w) / AW, 1 - y / AH]; return [x, y, w, h]; };
  const tx = (x, y, s, txt, { fill = '#fff', w = 700, a = 'middle', f = SANS, op = 1 } = {}) => `<text x="${x}" y="${y}" font-family="${f}" font-size="${s}" font-weight="${w}" fill="${fill}" text-anchor="${a}" opacity="${op}">${txt}</text>`;
  let svg = `<rect width="${AW}" height="${AH}" fill="#202226"/>`;
  // PMS on the staff monitor, 16:9
  {
    const [X, Y, W, H] = put('pms', 0, 0, 1152, 648);
    let s = `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#eef1f5"/><rect x="${X}" y="${Y}" width="${W}" height="54" fill="#13264a"/>`;
    s += tx(X + 20, Y + 36, 24, 'FrontLine PMS', { a: 'start' }) + tx(X + 260, Y + 36, 20, 'Heartland Inn Express #2172 · Front Desk 2', { a: 'start', w: 400, fill: '#c9d6ea' }) + tx(X + W - 20, Y + 36, 20, 'Thu Nov 19 · 10:42 PM · DANA', { a: 'end', w: 400, fill: '#c9d6ea' });
    s += `<rect x="${X}" y="${Y + 54}" width="170" height="${H - 54}" fill="#dfe4ec"/>`;
    ['Arrivals', 'In House', 'Departures', 'Room Rack', 'Folios', 'Keys', 'Night Audit', 'Reports'].forEach((n, i) =>
      s += (i === 0 ? `<rect x="${X}" y="${Y + 70 + i * 46}" width="170" height="40" fill="#1d4fb8"/>` : '') + tx(X + 18, Y + 97 + i * 46, 19, n, { a: 'start', w: i ? 400 : 700, fill: i ? '#253552' : '#fff' }));
    s += tx(X + 190, Y + 92, 24, 'Arrivals · 14 expected · 9 checked in', { a: 'start', fill: '#13264a' });
    const cols = [190, 270, 520, 600, 690, 800], heads = ['Room', 'Guest', 'Nts', 'Rate', 'Source', 'Status'];
    s += `<rect x="${X + 182}" y="${Y + 106}" width="700" height="34" fill="#c9d3e3"/>`;
    heads.forEach((hd, i) => s += tx(X + cols[i], Y + 130, 17, hd, { a: 'start', fill: '#253552' }));
    const guests = [['104', 'HALVERSON, J', 1, '109.00', 'Walk-in', 'IN'], ['112', 'OKAFOR, T', 2, '119.00', 'Direct', 'IN'], ['118', 'MERCER, L', 1, '99.00', 'OTA', 'DUE'],
      ['203', 'BRANDT, K', 3, '119.00', 'Corp', 'IN'], ['207', 'NGUYEN, M', 1, '109.00', 'Direct', 'IN'], ['212', 'GUEST, WALK-IN', 1, '89.00', 'Walk-in', 'DUE'],
      ['215', 'CASTILLO, R', 2, '99.00', 'OTA', 'IN'], ['219', 'PRUITT, D', 1, '109.00', 'Direct', 'DUE'], ['221', 'SOKOLOV, A', 4, '94.00', 'Corp', 'IN'], ['226', 'WEBB, S', 1, '109.00', 'OTA', 'DUE']];
    guests.forEach((g, r) => {
      const yy = Y + 170 + r * 40;
      if (r % 2) s += `<rect x="${X + 182}" y="${yy - 27}" width="700" height="40" fill="#e3e8ef"/>`;
      if (g[0] === '212') s += `<rect x="${X + 182}" y="${yy - 27}" width="700" height="40" fill="#fff3c4"/>`;
      g.forEach((v, i) => i < 5 && (s += tx(X + cols[i], yy, 18, v, { a: 'start', w: 400, fill: '#1b2333' })));
      s += `<rect x="${X + 800}" y="${yy - 20}" width="70" height="26" rx="13" fill="${g[5] === 'IN' ? '#2e8b57' : '#e8b400'}"/>` + tx(X + 835, yy - 1, 15, g[5], { fill: g[5] === 'IN' ? '#fff' : '#13264a' });
    });
    // room rack strip, right
    for (let i = 0; i < 24; i++) s += `<rect x="${X + 900 + (i % 4) * 58}" y="${Y + 110 + Math.floor(i / 4) * 58}" width="50" height="50" rx="4" fill="${['#2e8b57', '#1d4fb8', '#1d4fb8', '#e07b39', '#1d4fb8', '#9aa3ad'][(i * 7) % 6]}"/>` + tx(X + 925 + (i % 4) * 58, Y + 141 + Math.floor(i / 4) * 58, 15, 101 + i + (i > 11 ? 88 : 0));
    s += `<rect x="${X + 182}" y="${Y + H - 70}" width="160" height="44" rx="6" fill="#1d4fb8"/>` + tx(X + 262, Y + H - 41, 18, 'Check In');
    s += `<rect x="${X + 356}" y="${Y + H - 70}" width="160" height="44" rx="6" fill="#fff" stroke="#1d4fb8" stroke-width="2"/>` + tx(X + 436, Y + H - 41, 18, 'Encode Key', { fill: '#1d4fb8' });
    svg += s;
  }
  // card terminal face (0.082 x 0.187 m), screen at the top (far from the guest)
  {
    const [X, Y, W, H] = put('term', 1168, 0, 330, 750);
    let s = `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#1c1d20"/>`;
    s += `<g fill="none" stroke="#e8e8e8" stroke-width="5" stroke-linecap="round">${[14, 26, 38].map(r => `<path d="M${X + W / 2 - 10 + r * 0.5} ${Y + 40 - r} A${r} ${r} 0 0 1 ${X + W / 2 - 10 + r * 0.5} ${Y + 40 + r}"/>`).join('')}</g>`;
    s += `<rect x="${X + 26}" y="${Y + 92}" width="${W - 52}" height="230" rx="6" fill="#0d2350"/><rect x="${X + 34}" y="${Y + 100}" width="${W - 68}" height="214" fill="#2a74c6"/>`;
    s += tx(X + W / 2, Y + 150, 22, 'HEARTLAND INN', { w: 400 }) + tx(X + W / 2, Y + 205, 34, '$89.00') + tx(X + W / 2, Y + 250, 20, 'Insert, tap', { w: 400 }) + tx(X + W / 2, Y + 278, 20, 'or swipe', { w: 400 });
    s += tx(X + W / 2, Y + 352, 16, 'CARDWELL', { fill: '#9aa0a8', w: 700 });
    const k = [];
    for (let i = 0; i < 4; i++) k.push([28 + i * 72, 372, 62, 26, '#5a5e66', ['', '▲', '▼', ''][i]]);
    const lab = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', ''], ['#', '']];
    lab.forEach(([n, l], i) => k.push([30 + (i % 3) * 94, 418 + Math.floor(i / 3) * 70, 82, 56, '#2b2d31', n, l]));
    [['#c8352b', '✕'], ['#e8b400', '‹'], ['#2e8b57', '○']].forEach(([c, n], i) => k.push([30 + i * 94, 700, 82, 40, c, n]));
    for (const [x, y, w, h, c, n, l] of k) {
      s += `<rect x="${X + x}" y="${Y + y}" width="${w}" height="${h}" rx="9" fill="${c}"/>` + tx(X + x + (l ? w * 0.32 : w / 2), Y + y + h * 0.68, h * 0.55, n, { fill: '#f2f2f2' });
      if (l) s += tx(X + x + w * 0.72, Y + y + h * 0.64, h * 0.26, l, { fill: '#c9ccd1', w: 400 });
    }
    keys.term = k.map(([x, y, w, h]) => [x / W, y / H, (x + w) / W, (y + h) / H]);
    keys.term_screen = [26 / W, 92 / H, (W - 26) / W, 322 / H];
    svg += s;
  }
  // desk phone face (0.257 x 0.229 m): handset cradle on the left, colour screen, line keys, softkeys, nav, keypad
  {
    const [X, Y, W, H] = put('phone', 1520, 0, 528, 470);
    let s = `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#2a2c30"/><rect x="${X}" y="${Y}" width="${W * 0.27}" height="${H}" fill="#232428"/>`;
    s += `<rect x="${X + 150}" y="${Y + 26}" width="250" height="170" rx="6" fill="#0c0d0f"/><rect x="${X + 158}" y="${Y + 34}" width="234" height="154" fill="#e9eef5"/>`;
    s += `<rect x="${X + 158}" y="${Y + 34}" width="234" height="22" fill="#13264a"/>` + tx(X + 166, Y + 50, 13, 'Front Desk 2 · x2002', { a: 'start' }) + tx(X + 385, Y + 50, 13, '10:42 PM', { a: 'end', w: 400 });
    ['Front Desk', 'Housekeeping', 'Maintenance', 'Manager'].forEach((n, i) => s += `<circle cx="${X + 376}" cy="${Y + 70 + i * 23}" r="5" fill="${i ? '#9aa3ad' : '#2e8b57'}"/>` + tx(X + 365, Y + 75 + i * 23, 14, n, { a: 'end', w: 400, fill: '#1b2333' }));
    s += tx(X + 166, Y + 180, 12, 'Redial', { a: 'start', w: 400, fill: '#1b2333' }) + tx(X + 230, Y + 180, 12, 'New call', { a: 'start', w: 400, fill: '#1b2333' }) + tx(X + 305, Y + 180, 12, 'Fwd all', { a: 'start', w: 400, fill: '#1b2333' });
    const k = [];
    for (let i = 0; i < 5; i++) k.push([412, 34 + i * 32, 52, 24, '#3a3d43', '']);                     // line keys, right of the screen
    for (let i = 0; i < 4; i++) k.push([156 + i * 62, 206, 54, 18, '#3a3d43', '']);                    // softkeys
    k.push([168, 238, 96, 96, '#3a3d43', '']);                                                        // nav cluster
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].forEach((n, i) => k.push([300 + (i % 3) * 66, 238 + Math.floor(i / 3) * 52, 58, 42, '#3a3d43', n]));
    [['#3a3d43', '◄)'], ['#3a3d43', '⌒'], ['#8a2a24', 'MUTE']].forEach(([c, n], i) => k.push([150 + i * 44, 360, 38, 30, c, n]));
    k.push([150, 410, 126, 26, '#3a3d43', '–  +']);
    for (const [x, y, w, h, c, n] of k) s += `<rect x="${X + x}" y="${Y + y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2.5}" fill="${c}"/>` + (n ? tx(X + x + w / 2, Y + y + h * 0.68, Math.min(22, h * 0.5), n, { fill: '#eceff3' }) : '');
    s += `<circle cx="${X + 216}" cy="${Y + 286}" r="20" fill="#2a2c30"/>` + tx(X + 470, Y + 450, 14, 'RIDGELINE', { fill: '#8e939b', a: 'end' });
    for (let i = 0; i < 5; i++) s += `<rect x="${X + 470}" y="${Y + 42 + i * 32}" width="10" height="8" rx="2" fill="${i ? '#444' : '#2ecc71'}"/>`;
    keys.phone = k.map(([x, y, w, h]) => [x / W, y / H, (x + w) / W, (y + h) / H]);
    keys.phone_screen = [150 / W, 26 / H, 400 / W, 196 / H];
    svg += s;
  }
  // receipt printer: front fascia with its badge
  {
    const [X, Y, W, H] = put('printer', 1168, 770, 290, 150);
    svg += `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="#2b2c2f"/>` + tx(X + 24, Y + 70, 26, 'TALLYPOINT', { a: 'start', fill: '#d9dbde' }) + tx(X + 24, Y + 96, 14, 'TP-80 thermal', { a: 'start', w: 400, fill: '#9aa0a8' });
  }
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${AW}" height="${AH}">${svg}</svg>`)).png().toFile(new URL('desk.png', OUT).pathname);
  writeFileSync(new URL('desk.json', OUT).pathname, JSON.stringify({ rect, keys }, null, 1) + '\n');
  console.log('desk');
}
