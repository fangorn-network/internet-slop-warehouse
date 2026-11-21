// SPDX-License-Identifier: CC0-1.0
// Printed faces for the 2026-11-21 models (room.py, elevator.py, hardware.py): the elevator car operating panel's
// legends and tactile plates, the RFID lock face, fire-alarm devices, the Bible, the soap and amenity bottles, the
// nightstand power module, the fridge's badge and dial, the carry-on's patch. Every brand is invented.
// Same conventions as labels.mjs: SVG -> sharp, skyline-packed; labels/room.json holds UV rects (v up).
//   node projects/roadside-inn/blender/room-labels.mjs
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('./labels/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const SANS = 'Liberation Sans', SERIF = 'C059', NARROW = 'Nimbus Sans Narrow';
const t = (x, y, s, txt, { f = SANS, w = 700, fill = '#fff', a = 'middle', ls = 0, it = false } = {}) =>
  `<text x="${x}" y="${y}" font-family="${f}" font-size="${s}" font-weight="${w}" ${it ? 'font-style="italic"' : ''} fill="${fill}" text-anchor="${a}" letter-spacing="${ls}">${String(txt).replace(/&/g, '&amp;')}</text>`;
const r = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const c = (x, y, rr, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${fill}" ${extra}/>`;
const lines = (x, y, w, n, gap, fill = '#0006', h = 3, seed = 1) => {
  let s = '', k = seed;
  for (let i = 0; i < n; i++) { k = (k * 9301 + 49297) % 233280; const len = w * (0.55 + 0.45 * (k / 233280)); s += r(x, y + i * gap, i === n - 1 ? len * 0.5 : len, h, fill); }
  return s;
};
// Grade-1 braille for a few letters and digits (dots 1-6), drawn as raised-looking dots.
const BR = { a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5], k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5], p: [1, 2, 3, 4], r: [1, 2, 3, 5], s: [2, 3, 4], t: [2, 3, 4, 5], '#': [3, 4, 5, 6] };
const braille = (x, y, txt, d = 5) => {
  let s = '';
  [...txt].forEach((ch, i) => (BR[ch] || []).forEach(n => { const col = n > 3 ? 1 : 0, row = (n - 1) % 3; s += c(x + i * d * 2.6 + col * d, y + row * d, d * 0.32, '#e8e8e8'); }));
  return s;
};
const plate = (sym, br) => ([w, h]) => r(0, 0, w, h, '#16181b', 6) + sym(w, h) + braille(w / 2 - br.length * 6.5 + 2, h - 26, br);

const ITEMS = [
  // ---- elevator car operating panel ----
  ['cop_display', 240, 160, ([w, h]) => r(0, 0, w, h, '#0a1440') + r(6, 6, w - 12, h - 12, '#1a3cff', 4) + t(w * 0.58, h * 0.8, 120, '1', { fill: '#dfe6ff', f: NARROW }) + `<path d="M40 ${h * 0.62} l24 -40 l24 40 z" fill="#dfe6ff"/>`],
  ['t_2', 100, 100, plate((w, h) => t(w / 2, 56, 50, '2'), 'b')],
  ['t_1', 100, 100, plate((w, h) => `<path d="M22 22 l5 11 l12 1 l-9 8 l3 12 l-11 -7 l-11 7 l3 -12 l-9 -8 l12 -1 z" fill="#fff"/>` + t(64, 56, 50, '1'), 'a')],
  ['t_open', 100, 100, plate((w, h) => `<path d="M46 20 v40 l-22 -20 z M54 20 v40 l22 -20 z" fill="#fff"/>` + r(48, 18, 4, 44, '#fff'), 'op')],
  ['t_close', 100, 100, plate((w, h) => `<path d="M24 20 v40 l20 -20 z M76 20 v40 l-20 -20 z" fill="#fff"/>` + r(48, 18, 4, 44, '#fff'), 'cl')],
  ['t_alarm', 100, 100, plate((w, h) => `<path d="M50 16 c-14 0 -18 12 -18 24 v10 l-6 8 h48 l-6 -8 v-10 c0 -12 -4 -24 -18 -24 z" fill="#fff"/>` + c(50, 62, 5, '#fff'), 'al')],
  ['t_phone', 100, 100, plate((w, h) => `<path d="M30 18 q-10 4 -6 18 q8 22 28 32 q12 4 16 -6 l-10 -10 l-8 6 q-12 -6 -16 -18 l6 -8 z" fill="#fff"/>`, 'ph')],
  ['t_fire', 100, 100, plate((w, h) => `<path d="M18 52 q2 -30 32 -32 q30 2 32 32 h8 v6 h-80 v-6 z" fill="#fff"/>` + r(46, 24, 8, 28, '#16181b'), 'fi')],
  ['t_stop', 140, 70, ([w, h]) => r(0, 0, w, h, '#16181b', 6) + t(w / 2, 48, 36, 'STOP', { fill: '#ff3b2f' })],
  ['cop_cap', 600, 150, ([w, h]) => r(0, 0, w, h, '#1b1d20', 8) + t(150, 62, 44, 'HEARTLAND', { a: 'middle', fill: '#d9d9d9', ls: 2 }) + t(470, 62, 44, 'ELEV. 1', { fill: '#d9d9d9' }) + t(w / 2, 118, 30, 'CAPACITY 2500 LBS  ·  16 PERSONS', { fill: '#bdbdbd', w: 400 })],
  ['cop_fire', 400, 480, ([w, h]) => r(0, 0, w, h, '#00000000') + r(20, 18, w - 40, 80, '#c8102e', 6) + t(w / 2, 52, 30, "FIREFIGHTERS'", { fill: '#fff' }) + t(w / 2, 86, 30, 'OPERATION', { fill: '#fff' })
    + t(w / 2 - 110, 220, 28, 'OFF', { fill: '#1a1a1a' }) + t(w / 2, 168, 28, 'HOLD', { fill: '#1a1a1a' }) + t(w / 2 + 110, 220, 28, 'ON', { fill: '#1a1a1a' })
    + t(w / 2, 330, 22, 'CALL CANCEL', { fill: '#1a1a1a', w: 400 }) + t(w / 2, 440, 20, 'FIRE SERVICE PHASE II', { fill: '#c8102e' })],
  ['cop_cert', 400, 560, ([w, h]) => r(0, 0, w, h, '#f4f1e6') + c(70, 70, 40, '#d8d2b8') + c(70, 70, 30, '#c9b97a') + t(250, 60, 22, 'STATE OF KANSAS', { fill: '#222', w: 400 }) + t(250, 92, 26, 'CERTIFICATE OF', { fill: '#222' }) + t(250, 122, 26, 'OPERATION', { fill: '#222' })
    + lines(30, 160, 340, 14, 16, '#0008', 4, 3) + r(30, 400, 340, 2, '#333') + t(110, 440, 18, 'EXPIRES 08/2027', { fill: '#222', w: 400 }) + c(70, 500, 30, 'none', 'stroke="#c8102e" stroke-width="6"') + r(46, 497, 48, 6, '#222') + `<line x1="49" y1="479" x2="91" y2="521" stroke="#c8102e" stroke-width="6"/>` + t(250, 512, 30, 'NO SMOKING', { fill: '#222' })],
  ['cop_help', 600, 90, ([w, h]) => r(0, 0, w, h, '#00000000') + t(w / 2, 30, 22, 'FLASHING LIGHT INDICATES ALARM RECEIVED', { fill: '#222', w: 400 }) + t(w / 2, 62, 22, 'HELP IS ON THE WAY', { fill: '#222', w: 400 })],
  ['cop_phone_txt', 300, 60, ([w, h]) => r(0, 0, w, h, '#00000000') + t(w / 2, 26, 20, 'PUSH TO TALK', { fill: '#222', w: 400 }) + t(w / 2, 52, 20, 'EMERGENCY PHONE', { fill: '#222', w: 400 })],
  // ---- RFID lock outside face: gloss black polycarbonate, card-and-waves mark, tiny maker's mark ----
  ['lock_face', 240, 380, ([w, h]) => r(0, 0, w, h, '#08090a') + r(w / 2 - 34, 120, 68, 46, 'none', 6, 'stroke="#9aa0a6" stroke-width="5"') + r(w / 2 - 22, 132, 18, 14, '#9aa0a6', 2)
    + [0, 1, 2].map(i => `<path d="M${w / 2 - 30 + i * 0} ${96 - i * 16} q30 -${14 + i * 6} 60 0" stroke="#9aa0a6" stroke-width="5" fill="none"/>`).join('') + t(w / 2, 330, 20, 'KEYWELL', { fill: '#55595e', ls: 4 })],
  // ---- fire alarm devices ----
  ['horn_fire', 300, 80, ([w, h]) => r(0, 0, w, h, '#c4161c') + t(w / 2, 62, 62, 'FIRE', { fill: '#fff', ls: 6 })],
  ['pull_face', 400, 520, ([w, h]) => r(0, 0, w, h, '#c4161c') + t(w / 2, 70, 52, 'FIRE  ALARM', { fill: '#fff' }) + r(60, 440, 280, 50, '#b8b8b8', 4) + t(w / 2, 478, 34, 'KESTREL', { fill: '#222', ls: 6 })],
  ['pull_handle', 300, 80, ([w, h]) => r(0, 0, w, h, '#efefef', 6) + t(w / 2, 56, 40, 'PULL  DOWN', { fill: '#c4161c' })],
  ['smoke_test', 120, 120, ([w, h]) => c(60, 60, 58, '#f4f4f0') + t(60, 70, 28, 'TEST', { fill: '#777', w: 400 })],
  ['exit_face', 600, 260, ([w, h]) => r(0, 0, w, h, '#f6f6f2') + t(w / 2, 190, 170, 'EXIT', { fill: '#d0101a', ls: 10 }) + `<path d="M40 130 l40 -40 v24 h40 v32 h-40 v24 z M560 130 l-40 -40 v24 h-40 v32 h40 v24 z" fill="#d0101a"/>`],
  // ---- Bible (placed by an invented fellowship) ----
  ['bible_front', 540, 800, ([w, h]) => r(0, 0, w, h, '#1d2a44') + r(24, 24, w - 48, h - 48, 'none', 0, 'stroke="#b8963e" stroke-width="3"') + t(w / 2, 300, 64, 'HOLY', { f: SERIF, fill: '#c9a54a', ls: 8 }) + t(w / 2, 380, 64, 'BIBLE', { f: SERIF, fill: '#c9a54a', ls: 8 })
    + `<path d="M${w / 2} 470 c-14 18 -14 30 0 40 c14 -10 14 -22 0 -40 z" fill="#c9a54a"/>` + r(w / 2 - 22, 512, 44, 10, '#c9a54a', 3) + t(w / 2, 690, 22, 'PLACED BY THE WAYSIDE FELLOWSHIP', { f: SERIF, fill: '#b8963e', w: 400 })],
  ['bible_spine', 120, 800, ([w, h]) => r(0, 0, w, h, '#1a263d') + r(0, 60, w, 4, '#b8963e') + r(0, h - 64, w, 4, '#b8963e') + `<g transform="translate(${w / 2 + 12} ${h / 2}) rotate(-90)">${t(0, 0, 44, 'HOLY BIBLE', { f: SERIF, fill: '#c9a54a', ls: 6 })}</g>`],
  ['bible_pages', 64, 64, ([w, h]) => r(0, 0, w, h, '#efe8d6') + lines(0, 2, w, 15, 4, '#0000000f', 1, 5)],
  // ---- bath amenities ----
  ['soap_wrap', 800, 520, ([w, h]) => r(0, 0, w, h, '#f3efe6') + [...Array(40)].map((_, i) => r(i * 20, 0, 9, h, '#0000000a')).join('') + r(0, h * 0.32, w, h * 0.36, '#1f3b63')
    + t(w / 2, h * 0.47, 54, 'HEARTLAND INN', { f: SERIF, fill: '#f3efe6', ls: 4 }) + t(w / 2, h * 0.6, 26, 'oat & honey bath bar · 1.06 oz', { f: SERIF, fill: '#d8cfb8', w: 400, it: true })],
  ...[['bottle_sh', 'shampoo', '#1f3b63'], ['bottle_co', 'conditioner', '#5a6b3a'], ['bottle_lo', 'body lotion', '#8a5a2b']].map(([id, name, ink]) =>
    [id, 400, 240, ([w, h]) => r(0, 0, w, h, '#f7f4ec') + r(0, 0, w, 36, ink) + t(w / 2, 104, 34, 'HEARTLAND INN', { f: SERIF, fill: ink, ls: 2 }) + t(w / 2, 152, 30, name, { f: SERIF, fill: '#333', w: 400, it: true }) + t(w / 2, 206, 18, '1 FL OZ  30 mL', { fill: '#666', w: 400 })]),
  // ---- nightstand power module (black face, white legends) ----
  ['power_face', 400, 200, ([w, h]) => r(0, 0, w, h, '#141516') + t(300, 186, 16, 'USB-A   USB-C  3.1A', { fill: '#cfcfcf', w: 400 }) + t(100, 186, 16, '125V  15A', { fill: '#cfcfcf', w: 400 })],
  // ---- mini fridge ----
  ['fridge_badge', 300, 60, ([w, h]) => r(0, 0, w, h, '#1a1a1a') + t(w / 2, 42, 34, 'NORTHFIELD', { fill: '#c9cdd1', ls: 6 })],
  ['fridge_dial', 200, 200, ([w, h]) => c(100, 100, 98, '#f2f2f2') + ['OFF', '1', '2', '3', '4', '5', '6', '7'].map((s, i) => { const a = (-200 + i * 32) * Math.PI / 180; return t(100 + 74 * Math.cos(a), 108 + 74 * Math.sin(a), i ? 22 : 18, s, { fill: '#333' }); }).join('') + c(100, 100, 42, '#d9d9d9')],
  ['ketchup', 300, 200, ([w, h]) => r(0, 0, w, h, '#c1121f') + r(0, 0, w, 14, '#ffffff55') + r(0, h - 14, w, 14, '#ffffff55') + t(w / 2, 96, 40, 'Fancy', { f: SERIF, fill: '#fff', it: true }) + t(w / 2, 146, 44, 'KETCHUP', { fill: '#ffd34d' })],
  // ---- carry-on ----
  ['bag_patch', 300, 100, ([w, h]) => r(0, 0, w, h, '#1b1c1e', 18) + r(6, 6, w - 12, h - 12, 'none', 14, 'stroke="#55585c" stroke-width="3"') + t(w / 2, 64, 40, 'TRAVERSE', { fill: '#a7abb0', ls: 6 })],
];

async function atlas(name, items, size, k = 1) {
  const sorted = items.map(([id, w, h, d]) => [id, w, h, d, Math.round(w * k), Math.round(h * k)]).sort((a, b) => b[5] - a[5]);
  const pad = 6, sky = new Int32Array(size), rects = {}, parts = [];
  for (const [id, vw, vh, draw, w, h] of sorted) {
    let best = -1, by = Infinity;
    for (let x = 0; x + w <= size; x += 4) { let y = 0; for (let i = x; i < x + w; i++) if (sky[i] > y) y = sky[i]; if (y < by) { by = y; best = x; } }
    if (best < 0 || by + h > size) throw new Error(`${name}: atlas full at ${id}`);
    for (let i = best; i < Math.min(size, best + w + pad); i++) sky[i] = by + h + pad;
    parts.push(`<g transform="translate(${best} ${by})"><svg width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}" overflow="hidden" preserveAspectRatio="none">${draw([vw, vh])}</svg></g>`);
    rects[id] = [best / size, 1 - (by + h) / size, (best + w) / size, 1 - by / size];
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${r(0, 0, size, size, '#d8d8d8')}${parts.join('')}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(new URL(`${name}.png`, OUT).pathname);
  writeFileSync(new URL(`${name}.json`, OUT), JSON.stringify(rects, null, 1));
  console.log(`${name}.png ${size}px, ${items.length} items`);
}
await atlas('room', ITEMS, 2048, 1);
