// SPDX-License-Identifier: CC0-1.0
// Printed faces for the lobby coffee station pieces (coffee.py): the paper cup and kraft sleeve, the COFFEE / DECAF
// tower bands, the hot-water box's front panel and HOT sticker, sweetener packets, creamer foils and pump-bottle
// labels, plus small swatches (pump heads, paper, dried creamer, limescale, water spots). Every brand is invented.
// Fixed layout (no packing) in one 1024 atlas; labels/coffee.json holds UV rects (u0 v0 u1 v1, v up) for coffee.py.
//   node projects/roadside-inn/blender/coffee-labels.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const OUT = new URL('./labels/', import.meta.url);
const S = 1024, SANS = 'Liberation Sans', NARROW = 'Nimbus Sans Narrow', SERIF = 'C059';
const t = (x, y, s, txt, { f = SANS, w = 700, fill = '#fff', a = 'middle', ls = 0, it = false, op = 1 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${f}" font-size="${s}" font-weight="${w}" ${it ? 'font-style="italic"' : ''} fill="${fill}" opacity="${op}" text-anchor="${a}" letter-spacing="${ls}">${String(txt).replace(/&/g, '&amp;')}</text>`;
const r = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// soft speckle: n translucent dots (rubbed print, limescale, water spots)
const dots = (x, y, w, h, n, fill, rmin, rmax, op) => Array.from({ length: n }, () =>
  `<circle cx="${(x + rnd() * w).toFixed(1)}" cy="${(y + rnd() * h).toFixed(1)}" r="${(rmin + rnd() * (rmax - rmin)).toFixed(1)}" fill="${fill}" opacity="${(op * (0.4 + 0.6 * rnd())).toFixed(2)}"/>`).join('');

const items = {
  // cup wrap: lathe u runs once round, u 0.75 faces the viewer; v up the wall. Band at the foot, wordmark twice.
  cup: [0, 0, 640, 240, (w, h) => r(0, 0, w, h, '#f6f4ee') + r(0, h - 34, w, 34, '#16294d') + r(0, h - 40, w, 3, '#16294d') +
    [160, 480].map(x => t(x, 118, 34, 'Heartland Inn', { f: SERIF, it: true, fill: '#16294d' }) + t(x, 146, 13, 'E X P R E S S', { fill: '#16294d', ls: 2 })).join('') +
    t(320, 70, 10, 'CAREFUL, THE BEVERAGE YOU ARE ABOUT TO ENJOY IS EXTREMELY HOT', { fill: '#6b7280', w: 400 }) + t(20, h - 46, 9, '12 OZ', { fill: '#6b7280', a: 'start' })],
  sleeve: [0, 240, 640, 128, (w, h) => r(0, 0, w, h, '#9c7650') + Array.from({ length: 160 }, (_, i) => r(i * 4, 0, 1.4, h, '#00000022')).join('') +
    [160, 480].map(x => t(x, 66, 30, 'Heartland Inn', { f: SERIF, it: true, fill: '#2b1d10', op: 0.85 }) + t(x, 96, 13, 'CAREFUL · CONTENTS HOT', { fill: '#2b1d10', ls: 2, op: 0.8 })).join('')],
  // tower bands: u 0.75 (x 768) faces front. A little rubbed at the front bottom, where hands reach for the tap.
  band_coffee: [0, 368, 1024, 160, (w, h) => r(0, 0, w, h, '#1d3557') + t(768, 96, 40, 'COFFEE', { f: NARROW, ls: 2 }) + dots(690, 108, 160, 52, 140, '#9fb4d4', 0.5, 1.6, 0.07)],
  band_decaf: [0, 528, 1024, 160, (w, h) => r(0, 0, w, h, '#8fb8de') + t(768, 96, 40, 'DECAF', { f: NARROW, ls: 2 }) + dots(690, 108, 160, 52, 140, '#ffffff', 0.5, 1.6, 0.09)],
  hw_panel: [0, 688, 200, 336, (w, h) => r(0, 0, w, h, '#101112') + t(100, 214, 22, 'HOT', { w: 400, ls: 1 }) + t(100, 242, 22, 'WATER', { w: 400, ls: 1 }) +
    r(0, h - 34, w, 30, '#1f3f8a') + t(100, h - 14, 11, 'CAUTION · VERY HOT WATER', { ls: 0.5 })],
  hw_sticker: [200, 688, 96, 144, (w, h) => r(0, 0, w, h, '#f28c18') + `<path d="M48 18 L84 82 L12 82 Z" fill="none" stroke="#111" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="M40 70 q-6 -14 4 -24 q2 10 8 6 q-2 -10 4 -14 q8 16 -2 32z" fill="#111"/>` + t(48, 118, 26, 'HOT', { fill: '#111', f: NARROW })],
  scale: [200, 832, 96, 96, (w, h) => r(0, 0, w, h, '#d9d6cf') + dots(0, 0, w, h, 120, '#f6f4ef', 1, 5, 0.9) + dots(0, 0, w, h, 60, '#9c968a', 0.5, 2, 0.6)],
  tray_spots: [200, 928, 96, 96, (w, h) => r(0, 0, w, h, '#0d0d0e') + dots(0, 0, w, h, 40, '#bdbab2', 1, 4.5, 0.18) + dots(0, 0, w, h, 26, '#e8e4dc', 2, 6, 0.08)],
  lcd: [920, 688, 64, 32, (w, h) => r(0, 0, w, h, '#2c3a2e') + Array.from({ length: 6 }, (_, i) => r(6 + i * 9, 10, 6, 14, i < 4 ? '#9fd18e' : '#3b4c3c')).join('')],
};
const packets = [['pk_white', '#ffffff', 'SUGAR', '#1a4c9c'], ['pk_brown', '#cfae7f', 'PURE CANE', '#4e342e'], ['pk_pink', '#f6b7cc', 'sweet', '#ad1457'],
  ['pk_blue', '#8cc4f2', 'BLUE', '#0d47a1'], ['pk_yellow', '#ffe86b', 'SUCRALOSE', '#b26a00']];
packets.forEach(([id, bg, word, ink], k) => {
  items[id] = [296 + k * 120, 688, 120, 72, (w, h) => r(0, 0, w, h, bg) + r(0, 0, w, 6, '#00000014') + r(0, h - 6, w, 6, '#00000014') +
    t(60, 42, word.length > 6 ? 15 : 20, word, { fill: ink, f: NARROW }) + t(60, 58, 8, 'ONE PACKET · 1 g', { fill: ink, w: 400, op: 0.7 })];
});
const foil = (ring, a, b) => (w, h) => `<defs><radialGradient id="f${ring.slice(1)}"><stop offset="0" stop-color="#eef0f2"/><stop offset="1" stop-color="#a9adb3"/></radialGradient></defs>` +
  r(0, 0, w, h, `url(#f${ring.slice(1)})`) + `<circle cx="48" cy="48" r="34" fill="${ring}"/>` + t(48, 46, 12, a) + t(48, 60, 12, b);
items.foil_half = [296, 760, 96, 96, foil('#1a4c9c', 'HALF &', 'HALF')];
items.foil_van = [392, 760, 96, 96, foil('#8d6e4f', 'FRENCH', 'VANILLA')];
items.btl_vanilla = [488, 760, 256, 200, (w, h) => r(0, 0, w, h, '#f4f6fb') + r(0, 0, w, 30, '#1e4fa3') + t(128, 92, 40, 'Pour Over', { f: SERIF, it: true, fill: '#1e4fa3' }) +
  t(128, 122, 15, 'FRENCH VANILLA', { fill: '#1e4fa3' }) + t(128, 140, 11, 'COFFEE CREAMER', { fill: '#5c7fa8', w: 400 }) + `<ellipse cx="128" cy="176" rx="64" ry="18" fill="#8a5a33"/>` + r(0, h - 8, w, 8, '#1e4fa3')];
items.btl_hazel = [744, 760, 256, 200, (w, h) => r(0, 0, w, h, '#fff6e3') + r(0, 0, w, 30, '#e1561b') + t(128, 92, 40, 'Pour Over', { f: SERIF, it: true, fill: '#c2410c' }) +
  t(128, 122, 15, 'HAZELNUT', { fill: '#c2410c' }) + t(128, 140, 11, 'COFFEE CREAMER', { fill: '#b45309', w: 400 }) + `<ellipse cx="128" cy="176" rx="64" ry="18" fill="#8a5a33"/>` + r(0, h - 8, w, 8, '#e1561b')];
// flat swatches: pump heads, napkin paper, cup inner wall, dried creamer film
[['sw_red', '#d22b1f'], ['sw_blue', '#1e4fa3'], ['sw_orange', '#ef6c1a'], ['sw_white', '#f3f3f1'], ['sw_paper', '#f2f1ec'], ['sw_inner', '#e9e4d9'], ['sw_creamer', '#e8dcc4'], ['sw_kraft', '#9c7650']]
  .forEach(([id, col], k) => { items[id] = [296 + (k % 4) * 48, 856 + Math.floor(k / 4) * 48, 48, 48, (w, h) => r(0, 0, w, h, col)]; });

const rects = {}, parts = [];
for (const [id, [x, y, w, h, draw]] of Object.entries(items)) {
  parts.push(`<g transform="translate(${x} ${y})"><svg width="${w}" height="${h}" overflow="hidden">${draw(w, h)}</svg></g>`);
  rects[id] = [x / S, 1 - (y + h) / S, (x + w) / S, 1 - y / S];
}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${r(0, 0, S, S, '#808080')}${parts.join('')}</svg>`)).png().toFile(new URL('coffee.png', OUT).pathname);
writeFileSync(new URL('coffee.json', OUT), JSON.stringify(rects, null, 1));
console.log(`coffee.png ${Object.keys(rects).length} items`);
