// SPDX-License-Identifier: CC0-1.0
// Printed art for the lobby props: packaging, newspapers, brochures, screens, keyboard legends, the entry mat logo and
// the area rug. Every brand here is invented. Each atlas is SVG drawn by this script, rasterised with sharp, and
// shelf-packed; <atlas>.json maps each item to its UV rect (Blender convention: origin bottom-left) for props.py.
//   node projects/roadside-inn/blender/labels.mjs
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('./labels/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const SANS = 'Liberation Sans', NARROW = 'Nimbus Sans Narrow', SERIF = 'C059', SLAB = 'URW Bookman', ROUND = 'URW Gothic', MONO = 'DejaVu Sans Mono';

// ---------- drawing helpers (all return SVG fragments) ----------
// Text; with mw, squeezed horizontally to fit mw pixels (estimated glyph widths, as librsvg has no textLength).
const em = txt => [...txt].reduce((a, ch) => a + (ch === ' ' ? 0.3 : /[A-Z0-9]/.test(ch) ? 0.7 : /[a-z]/.test(ch) ? 0.54 : 0.45), 0);
const t = (x, y, s, txt, { f = SANS, w = 700, fill = '#fff', a = 'middle', ls = 0, st = '', sw = 0, it = false, mw = 0 } = {}) => {
  txt = String(txt); const sx = mw ? Math.min(1, mw / (em(txt) * s + ls * txt.length)) : 1;
  const pos = sx < 1 ? `x="0" y="0" transform="translate(${x} ${y}) scale(${sx.toFixed(3)} 1)"` : `x="${x}" y="${y}"`;
  return `<text ${pos} font-family="${f}" font-size="${s}" font-weight="${w}" ${it ? 'font-style="italic"' : ''} fill="${fill}" text-anchor="${a}" letter-spacing="${ls}" ${st ? `stroke="${st}" stroke-width="${sw}" paint-order="stroke"` : ''}>${txt.replace(/&(?!amp;|lt;)/g, '&amp;')}</text>`;
};
const r = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const c = (x, y, rr, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${fill}" ${extra}/>`;
const grad = (id, a, b, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
let gid = 0;
const uid = p => `${p}${gid++}`;
// Greeked body copy: rows of short gray bars, like small print seen from a metre away.
const lines = (x, y, w, n, gap, fill = '#0006', hgt = 3, seed = 1) => {
  let s = '', k = seed;
  for (let i = 0; i < n; i++) { k = (k * 9301 + 49297) % 233280; const len = w * (0.55 + 0.45 * (k / 233280)); s += r(x, y + i * gap, i === n - 1 ? len * 0.5 : len, hgt, fill); }
  return s;
};
const gloss = (w, h) => { const id = uid('gl'); return `<defs>${grad(id, '#ffffff55', '#ffffff00')}</defs>` + r(0, 0, w, h * 0.38, `url(#${id})`); };
const barcode = (x, y, w, h) => { let s = r(x - 4, y - 4, w + 8, h + 14, '#fff'), k = 7, px = x; while (px < x + w) { k = (k * 69069 + 1) % 4096; const bw = 1 + (k % 3); s += r(px, y, bw, h, '#111'); px += bw + 1 + (k >> 9) % 3; } return s; };
const nutrition = (x, y, w, h) => r(x, y, w, h, '#fff') + r(x + 4, y + 4, w - 8, 10, '#111') + lines(x + 6, y + 20, w - 12, Math.floor((h - 26) / 7), 7, '#0009', 2);

// ---------- packaging templates ----------
function bag(w, h, { brand, flavor, bg, bg2, band, ink = '#fff', illus = 'chips', chip = '#f0c060', font = SLAB }) {
  const g = uid('bg');
  let s = `<defs>${grad(g, bg, bg2)}</defs>` + r(0, 0, w, h, `url(#${g})`);
  s += r(0, 0, w, 22, '#0003') + r(0, h - 22, w, 22, '#0003');                         // crimp zones
  for (let x = 0; x < w; x += 6) s += r(x, 0, 2, 22, '#0002') + r(x, h - 22, 2, 22, '#0002');
  s += `<ellipse cx="${w / 2}" cy="${h * 0.3}" rx="${w * 0.44}" ry="${h * 0.12}" fill="${band}"/>`;
  s += t(w / 2, h * 0.3 + h * 0.035, h * 0.1, brand, { f: font, fill: ink, st: '#0006', sw: 2, mw: w * 0.84 });
  s += r(w * 0.12, h * 0.46, w * 0.76, h * 0.085, '#fff', 6) + t(w / 2, h * 0.52, h * 0.055, flavor, { fill: bg2 === '#fff' ? bg : bg2 === bg ? '#222' : bg, mw: w * 0.7 });
  if (illus === 'chips') for (let i = 0; i < 6; i++) s += `<ellipse cx="${w * (0.25 + (i % 3) * 0.25)}" cy="${h * (0.68 + Math.floor(i / 3) * 0.1)}" rx="${w * 0.12}" ry="${h * 0.045}" fill="${chip}" stroke="#a06a20" stroke-width="2" transform="rotate(${i * 27 - 40} ${w * (0.25 + (i % 3) * 0.25)} ${h * (0.68 + Math.floor(i / 3) * 0.1)})"/>`;
  if (illus === 'pretzel') for (let i = 0; i < 3; i++) { const cx = w * (0.28 + i * 0.22), cy = h * 0.72; s += `<path d="M${cx - 30} ${cy} q0 -34 30 -10 q30 -24 30 10 q0 30 -30 14 q-30 16 -30 -14 M${cx - 18} ${cy + 18} l36 -30 M${cx + 18} ${cy + 18} l-36 -30" fill="none" stroke="#8a4b16" stroke-width="10" stroke-linecap="round"/>`; }
  if (illus === 'mix') for (let i = 0; i < 18; i++) s += c(w * (0.2 + ((i * 37) % 60) / 100), h * (0.64 + ((i * 53) % 24) / 100), 8 + (i % 3) * 3, ['#7a4a1e', '#c99d58', '#9b2b22', '#e8d7a8', '#5a3317'][i % 5]);
  if (illus === 'gummy') for (let i = 0; i < 8; i++) { const cx = w * (0.18 + (i % 4) * 0.21), cy = h * (0.66 + Math.floor(i / 4) * 0.13); const col = ['#e8352b', '#f6c21a', '#3cb44b', '#f58231'][i % 4]; s += c(cx, cy, 15, col) + c(cx - 10, cy - 14, 7, col) + c(cx + 10, cy - 14, 7, col); }
  if (illus === 'puffs') for (let i = 0; i < 7; i++) s += `<path d="M${w * (0.2 + (i % 4) * 0.2)} ${h * (0.66 + Math.floor(i / 4) * 0.12)} q20 -18 40 0 q-6 14 -20 10 q-14 4 -20 -10z" fill="#f39c12" stroke="#c0640a" stroke-width="2"/>`;
  if (illus === 'popcorn') for (let i = 0; i < 14; i++) s += c(w * (0.25 + ((i * 41) % 50) / 100), h * (0.64 + ((i * 29) % 22) / 100), 12, '#fff8dc', 'stroke="#e0c070" stroke-width="2"');
  s += t(w * 0.12, h - 34, h * 0.035, 'NET WT 1.5 OZ (42g)', { a: 'start', fill: ink, w: 400 });
  return s + gloss(w, h);
}

function wrap(w, h, { brand, sub, bg, bg2 = bg, ink = '#fff', accent = '#fff', style = 'band', font = SANS, size = 0.36 }) {
  const g = uid('wr');
  let s = `<defs>${grad(g, bg, bg2, false)}</defs>` + r(0, 0, w, h, `url(#${g})`);
  if (style === 'band') s += r(0, h * 0.62, w, h * 0.12, accent);
  if (style === 'wave') s += `<path d="M0 ${h * 0.7} C${w * 0.25} ${h * 0.5} ${w * 0.5} ${h * 0.9} ${w} ${h * 0.62} L${w} ${h} L0 ${h}z" fill="${accent}"/>`;
  if (style === 'mountain') s += `<path d="M0 ${h * 0.78} L${w * 0.15} ${h * 0.45} L${w * 0.27} ${h * 0.62} L${w * 0.42} ${h * 0.3} L${w * 0.6} ${h * 0.66} L${w * 0.72} ${h * 0.5} L${w} ${h * 0.8} L${w} ${h} L0 ${h}z" fill="${accent}" opacity="0.85"/>` + `<path d="M${w * 0.42} ${h * 0.3} L${w * 0.47} ${h * 0.4} L${w * 0.38} ${h * 0.38}z" fill="#fff"/>`;
  if (style === 'bolt') s += `<path d="M${w * 0.62} ${h * 0.05} L${w * 0.5} ${h * 0.55} L${w * 0.58} ${h * 0.55} L${w * 0.5} ${h * 0.95} L${w * 0.7} ${h * 0.4} L${w * 0.62} ${h * 0.4} L${w * 0.7} ${h * 0.05}z" fill="${accent}"/>`;
  if (style === 'fruit') for (let i = 0; i < 3; i++) s += c(w * (0.62 + i * 0.12), h * 0.62, h * 0.18, accent) + c(w * (0.62 + i * 0.12) - h * 0.05, h * 0.56, h * 0.05, '#fff8');
  // Print the brand twice so a label wrapped around a bottle shows it from any side.
  for (const x of [w * 0.25, w * 0.75]) {
    s += t(x, h * 0.42, h * size, brand, { f: font, fill: ink, st: '#0005', sw: 1.5, mw: w * 0.44 });
    s += t(x, h * 0.58, h * 0.11, sub, { fill: ink, w: 400, ls: 1, mw: w * 0.44 });
  }
  s += barcode(w * 0.47, h * 0.78, 30, h * 0.12);
  return s + gloss(w, h);
}

function carton(w, h, { brand, sub, bg, ink = '#fff', accent = '#e33', style = 'med', count = '', font = SANS }) {
  let s = r(0, 0, w, h, bg);
  if (style === 'med') s += r(0, h * 0.06, w, h * 0.22, accent) + t(w / 2, h * 0.21, h * 0.13, brand, { f: font, fill: '#fff', mw: w * 0.9 }) + t(w / 2, h * 0.42, h * 0.075, sub, { fill: ink, mw: w * 0.9 }) + t(w / 2, h * 0.53, h * 0.06, count, { fill: ink, w: 400, mw: w * 0.9 }) + c(w * 0.5, h * 0.74, h * 0.1, '#fff', `stroke="${accent}" stroke-width="4"`) + c(w * 0.5 - 6, h * 0.74, h * 0.04, accent);
  if (style === 'box') s += r(w * 0.08, h * 0.08, w * 0.84, h * 0.84, 'none', 10, `stroke="${accent}" stroke-width="5"`) + t(w / 2, h * 0.36, h * 0.15, brand, { f: font, fill: ink, mw: w * 0.78 }) + t(w / 2, h * 0.5, h * 0.07, sub, { fill: ink, w: 400, mw: w * 0.78 }) + r(w * 0.2, h * 0.6, w * 0.6, h * 0.22, accent, 8) + t(w / 2, h * 0.75, h * 0.08, count, { fill: '#fff', mw: w * 0.56 });
  if (style === 'cookie') { s += t(w / 2, h * 0.2, h * 0.12, brand, { f: SERIF, fill: ink, it: true, mw: w * 0.9 }) + t(w / 2, h * 0.3, h * 0.06, sub, { fill: ink, w: 400, mw: w * 0.9 }); for (let i = 0; i < 3; i++) { const cx = w * (0.28 + i * 0.22), cy = h * 0.6; s += c(cx, cy, h * 0.12, '#c88a45', 'stroke="#8a5a26" stroke-width="3"'); for (let k = 0; k < 5; k++) s += c(cx + Math.cos(k * 1.3 + i) * h * 0.06, cy + Math.sin(k * 1.3 + i) * h * 0.06, 5, '#3b2414'); } s += t(w / 2, h * 0.9, h * 0.06, count, { fill: ink, w: 400 }); }
  if (style === 'blister') s += r(0, 0, w, h * 0.3, accent) + c(w / 2, h * 0.08, 10, bg) + t(w / 2, h * 0.24, h * 0.1, brand, { fill: '#fff', mw: w * 0.9 }) + r(w * 0.15, h * 0.36, w * 0.7, h * 0.48, '#ffffff40', 16, 'stroke="#fff9" stroke-width="3"') + r(w * 0.44, h * 0.4, w * 0.12, h * 0.4, accent, 12) + r(w * 0.38, h * 0.4, w * 0.24, h * 0.1, '#fff', 8) + t(w / 2, h * 0.93, h * 0.06, sub, { fill: ink, w: 400, mw: w * 0.9 });
  s += lines(w * 0.12, h * 0.86, w * 0.5, 2, 8, ink === '#fff' ? '#fff8' : '#0007', 3);
  return s + gloss(w, h);
}

function bar(w, h, { brand, sub, bg, ink = '#fff', accent = '#fc0', font = SLAB }) {
  let s = r(0, 0, w, h, bg);
  for (let x = 0; x < 20; x += 4) s += r(x, 0, 2, h, '#0003') + r(w - 20 + x, 0, 2, h, '#0003');
  s += `<path d="M${w * 0.1} ${h} L${w * 0.25} 0 L${w * 0.35} 0 L${w * 0.2} ${h}z" fill="${accent}" opacity="0.9"/>`;
  s += t(w * 0.6, h * 0.58, h * 0.4, brand, { f: font, fill: ink, st: '#0006', sw: 2, mw: w * 0.6 }) + t(w * 0.6, h * 0.85, h * 0.14, sub, { fill: ink, w: 400, mw: w * 0.6 });
  return s + gloss(w, h);
}

function cup(w, h, { brand, sub, bg, ink = '#fff', accent = '#fc0' }) {
  let s = r(0, 0, w, h, bg) + r(0, h * 0.7, w, h * 0.3, accent);
  for (const x of [w * 0.25, w * 0.75]) s += t(x, h * 0.4, h * 0.26, brand, { f: ROUND, fill: ink, st: '#0005', sw: 1.5, mw: w * 0.44 }) + t(x, h * 0.62, h * 0.12, sub, { fill: ink, w: 400, mw: w * 0.44 });
  s += t(w * 0.5, h * 0.9, h * 0.1, 'MICROWAVE 1 MIN  ·  ADD WATER TO LINE', { fill: '#fff', w: 400 });
  return s + gloss(w, h);
}

// ---------- the product catalogue (every name invented) ----------
const products = [
  // 12 oz cans: label covers the body, 436x256 ~ circumference : height
  ['can-cola', 436, 256, w => wrap(...w, { brand: 'Ozark Cola', sub: 'CLASSIC · 12 FL OZ', bg: '#b3121b', bg2: '#d81e27', style: 'wave', accent: '#fff', font: SERIF })],
  ['can-diet', 436, 256, w => wrap(...w, { brand: 'Ozark Cola', sub: 'ZERO SUGAR · 12 FL OZ', bg: '#9fa3a8', bg2: '#d6d9dc', ink: '#b3121b', style: 'wave', accent: '#b3121b', font: SERIF })],
  ['can-lemon', 436, 256, w => wrap(...w, { brand: 'ZIP', sub: 'LEMON-LIME SODA', bg: '#0e8a3a', bg2: '#4cc152', accent: '#f4e04d', style: 'band', size: 0.42 })],
  ['can-orange', 436, 256, w => wrap(...w, { brand: 'Sunburst', sub: 'ORANGE SODA', bg: '#f57c00', bg2: '#ffa726', accent: '#fff3', style: 'fruit', font: ROUND })],
  ['can-rootbeer', 436, 256, w => wrap(...w, { brand: 'Mill Creek', sub: 'OLD FASHIONED ROOT BEER', bg: '#4a2511', bg2: '#6d3a1d', accent: '#e9c46a', style: 'band', font: SLAB, size: 0.3 })],
  ['can-energy', 436, 256, w => wrap(...w, { brand: 'VOLT', sub: 'ENERGY DRINK · 16 FL OZ', bg: '#111', bg2: '#222', accent: '#9be41b', style: 'bolt', ink: '#9be41b', size: 0.44 })],
  ['can-coldbrew', 436, 256, w => wrap(...w, { brand: 'Night Shift', sub: 'COLD BREW COFFEE', bg: '#d8c7a6', bg2: '#ede1c7', ink: '#3b2414', accent: '#3b2414', style: 'band', font: SERIF, size: 0.3 })],
  // 20 oz bottle labels: a band ~ 560 x 180
  ['bottle-water', 560, 180, w => wrap(...w, { brand: 'Cedar Springs', sub: 'NATURAL SPRING WATER · 16.9 FL OZ', bg: '#e8f4fb', bg2: '#ffffff', ink: '#0b4f8a', accent: '#3d8fd1', style: 'mountain', font: SERIF, size: 0.3 })],
  ['bottle-tea', 560, 180, w => wrap(...w, { brand: 'Porch Tea', sub: 'SWEET TEA WITH LEMON', bg: '#f6e7b4', bg2: '#fff4cc', ink: '#5b3a12', accent: '#e9a03b', style: 'fruit', font: SLAB, size: 0.32 })],
  ['bottle-sports', 560, 180, w => wrap(...w, { brand: 'HYDRA', sub: 'ELECTROLYTE DRINK · GLACIER', bg: '#0b3d91', bg2: '#1e88e5', accent: '#9ad0ff', style: 'band', size: 0.42 })],
  ['bottle-oj', 560, 180, w => wrap(...w, { brand: 'Sunny Grove', sub: '100% ORANGE JUICE', bg: '#ff9800', bg2: '#ffc107', accent: '#ff6f00', style: 'fruit', font: ROUND, size: 0.3 })],
  ['bottle-apple', 560, 180, w => wrap(...w, { brand: 'Sunny Grove', sub: '100% APPLE JUICE', bg: '#c62828', bg2: '#e53935', accent: '#8bc34a', style: 'fruit', font: ROUND, size: 0.3 })],
  ['bottle-cola', 560, 180, w => wrap(...w, { brand: 'Ozark Cola', sub: 'CLASSIC · 20 FL OZ', bg: '#b3121b', bg2: '#d81e27', style: 'wave', accent: '#fff', font: SERIF, size: 0.34 })],
  ['bottle-lemon', 560, 180, w => wrap(...w, { brand: 'ZIP', sub: 'LEMON-LIME · 20 FL OZ', bg: '#0e8a3a', bg2: '#4cc152', accent: '#f4e04d', style: 'band', size: 0.42 })],
  ['milk', 300, 380, w => carton(...w, { brand: 'Prairie Farm', sub: '1% LOWFAT MILK', count: '1 PINT (473 mL)', bg: '#fbfbf8', ink: '#1a4c9c', accent: '#1a4c9c', style: 'box', font: SERIF })],
  ['milk-choc', 300, 380, w => carton(...w, { brand: 'Prairie Farm', sub: 'CHOCOLATE MILK', count: '1 PINT (473 mL)', bg: '#fbfbf8', ink: '#5b3418', accent: '#5b3418', style: 'box', font: SERIF })],
  // single-serve chip bags, pillow front 300 x 420
  ['chips-salt', 300, 420, w => bag(...w, { brand: 'Crunch Ridge', flavor: 'SEA SALT KETTLE', bg: '#f6c400', bg2: '#ffdd33', band: '#1d3f8f', chip: '#f3cf72' })],
  ['chips-bbq', 300, 420, w => bag(...w, { brand: 'Crunch Ridge', flavor: 'HICKORY BBQ', bg: '#7a1d10', bg2: '#b33a1d', band: '#f6c400', ink: '#3a0c05', chip: '#c56a2c' })],
  ['chips-sco', 300, 420, w => bag(...w, { brand: 'Crunch Ridge', flavor: 'SOUR CREAM & ONION', bg: '#2e7d32', bg2: '#66bb6a', band: '#fff', ink: '#1b5e20', chip: '#ead27f' })],
  ['chips-jalapeno', 300, 420, w => bag(...w, { brand: 'Crunch Ridge', flavor: 'JALAPEÑO', bg: '#1b1b1b', bg2: '#3a3a3a', band: '#4caf50', chip: '#e7c25b' })],
  ['puffs', 300, 420, w => bag(...w, { brand: 'Cheddar Pops', flavor: 'BAKED CHEESE PUFFS', bg: '#ef6c00', bg2: '#ff9800', band: '#1565c0', illus: 'puffs', font: ROUND })],
  ['pretzels', 300, 420, w => bag(...w, { brand: 'Twist & Co.', flavor: 'SOURDOUGH PRETZELS', bg: '#1565c0', bg2: '#42a5f5', band: '#fff', ink: '#0d47a1', illus: 'pretzel', font: SERIF })],
  ['trailmix', 300, 420, w => bag(...w, { brand: 'Ridgeline', flavor: 'TRAIL MIX', bg: '#a07c4f', bg2: '#c9a877', band: '#2e4a2e', illus: 'mix', font: SLAB })],
  ['gummies', 300, 420, w => bag(...w, { brand: 'Gummi Pals', flavor: 'FRUIT GUMMY BEARS', bg: '#7b1fa2', bg2: '#ba68c8', band: '#ffeb3b', ink: '#4a148c', illus: 'gummy', font: ROUND })],
  ['popcorn', 300, 420, w => bag(...w, { brand: 'Pop Shack', flavor: 'BUTTER POPCORN', bg: '#d32f2f', bg2: '#f44336', band: '#fff', ink: '#b71c1c', illus: 'popcorn', font: SLAB })],
  // candy and snack bars 360 x 120
  ['bar-choc', 360, 120, w => bar(...w, { brand: 'Cocoa Ridge', sub: 'MILK CHOCOLATE', bg: '#4e2a14', accent: '#c8a165' })],
  ['bar-caramel', 360, 120, w => bar(...w, { brand: 'Nutty Trail', sub: 'PEANUT CARAMEL NOUGAT', bg: '#a8201a', accent: '#f6c400' })],
  ['bar-wafer', 360, 120, w => bar(...w, { brand: 'Krisp', sub: 'CHOCOLATE WAFER', bg: '#ef6c00', accent: '#5d2e0f', font: ROUND })],
  ['bar-granola', 360, 120, w => bar(...w, { brand: 'PEAK', sub: 'OATS & HONEY GRANOLA', bg: '#2e7d32', accent: '#f9a825', font: SANS })],
  ['bar-protein', 360, 120, w => bar(...w, { brand: 'FORGE', sub: '20G PROTEIN · CHOC PB', bg: '#212121', accent: '#e53935', font: SANS })],
  ['bar-mint', 360, 120, w => bar(...w, { brand: 'Polar', sub: 'DARK CHOCOLATE MINT', bg: '#0d47a1', accent: '#80deea' })],
  // boxes: crackers, cookies, medicine, toiletries 260 x 340
  ['cookies', 260, 340, w => carton(...w, { brand: "Mae's", sub: 'CHOCOLATE CHIP COOKIES', count: '2 COOKIES · 3 OZ', bg: '#f4e2c3', ink: '#5b3418', style: 'cookie' })],
  ['crackers', 260, 340, w => carton(...w, { brand: 'Golden', sub: 'PEANUT BUTTER CRACKERS', count: '6 SANDWICHES', bg: '#f8c537', ink: '#7a3e00', accent: '#c0392b', style: 'box', font: SLAB })],
  ['ibuprofen', 260, 340, w => carton(...w, { brand: 'Ibuprofen', sub: 'PAIN RELIEVER / FEVER REDUCER', count: '200 mg · 2 TABLETS', bg: '#fff', ink: '#1a237e', accent: '#1565c0', style: 'med' })],
  ['acetaminophen', 260, 340, w => carton(...w, { brand: 'Acetaminophen', sub: 'EXTRA STRENGTH', count: '500 mg · 2 CAPLETS', bg: '#fff', ink: '#b71c1c', accent: '#c62828', style: 'med' })],
  ['antacid', 260, 340, w => carton(...w, { brand: 'Calm Tummy', sub: 'ANTACID CHEWS · MIXED FRUIT', count: '3 TABLETS', bg: '#e0f2f1', ink: '#00695c', accent: '#00897b', style: 'med' })],
  ['coldmed', 260, 340, w => carton(...w, { brand: 'DayRelief', sub: 'COLD & FLU · NON-DROWSY', count: '2 LIQUID CAPS', bg: '#fff8e1', ink: '#e65100', accent: '#ef6c00', style: 'med' })],
  ['bandages', 260, 340, w => carton(...w, { brand: 'FlexAid', sub: 'ADHESIVE BANDAGES', count: '10 ASSORTED', bg: '#fbe9e7', ink: '#bf360c', accent: '#d84315', style: 'box' })],
  ['toothpaste', 260, 340, w => carton(...w, { brand: 'BrightSmile', sub: 'FLUORIDE TOOTHPASTE', count: '0.85 OZ TRAVEL', bg: '#e3f2fd', ink: '#0d47a1', accent: '#e53935', style: 'box', font: ROUND })],
  ['toothbrush', 260, 340, w => carton(...w, { brand: 'BrightSmile', sub: 'SOFT TOOTHBRUSH', bg: '#e3f2fd', ink: '#0d47a1', accent: '#1e88e5', style: 'blister', font: ROUND })],
  ['razor', 260, 340, w => carton(...w, { brand: 'EdgeLine', sub: '3-BLADE DISPOSABLE · 2 PK', bg: '#eceff1', ink: '#263238', accent: '#37474f', style: 'blister' })],
  ['deodorant', 260, 340, w => carton(...w, { brand: 'Fresh 24', sub: 'TRAVEL DEODORANT 0.5 OZ', bg: '#e8eaf6', ink: '#283593', accent: '#3949ab', style: 'blister' })],
  ['cable', 260, 340, w => carton(...w, { brand: 'ChargeIt', sub: 'USB-C CABLE · 3 FT', bg: '#fafafa', ink: '#212121', accent: '#111', style: 'blister' })],
  ['podsbox', 260, 340, w => carton(...w, { brand: 'FreshLoad', sub: 'LAUNDRY DETERGENT PODS', count: '2 PODS', bg: '#e1f5fe', ink: '#01579b', accent: '#0288d1', style: 'box', font: ROUND })],
  ['stainpen', 260, 340, w => carton(...w, { brand: 'Spot Off', sub: 'INSTANT STAIN REMOVER PEN', bg: '#fffde7', ink: '#f57f17', accent: '#fbc02d', style: 'blister' })],
  // microwave cups, wrap 520 x 150
  ['cup-mac', 520, 150, w => cup(...w, { brand: 'Easy Mac', sub: 'MACARONI & CHEESE', bg: '#1565c0', accent: '#fbc02d' })],
  ['cup-soup', 520, 150, w => cup(...w, { brand: "Mae's", sub: 'CHICKEN NOODLE SOUP', bg: '#c62828', accent: '#fff3e0', ink: '#fff' })],
  ['cup-noodle', 520, 150, w => cup(...w, { brand: 'Ramen Go', sub: 'BEEF NOODLES', bg: '#ef6c00', accent: '#4e342e' })],
  // coffee counter
  ['airpot-regular', 220, 130, w => r(0, 0, ...w, '#111') + t(110, 62, 34, 'REGULAR', { f: NARROW }) + t(110, 100, 20, 'MEDIUM ROAST', { w: 400, fill: '#bbb' })],
  ['airpot-decaf', 220, 130, w => r(0, 0, ...w, '#e65100') + t(110, 62, 34, 'DECAF', { f: NARROW }) + t(110, 100, 20, 'MEDIUM ROAST', { w: 400, fill: '#ffe0b2' })],
  ['airpot-bold', 220, 130, w => r(0, 0, ...w, '#3e2723') + t(110, 62, 34, 'BOLD', { f: NARROW }) + t(110, 100, 20, 'DARK ROAST', { w: 400, fill: '#d7ccc8' })],
  ['airpot-hot', 220, 130, w => r(0, 0, ...w, '#1a4c9c') + t(110, 62, 30, 'HOT WATER', { f: NARROW }) + t(110, 100, 20, 'FOR TEA', { w: 400, fill: '#bbdefb' })],
  ['cup-sleeve', 600, 120, w => r(0, 0, ...w, '#8d6e4f') + lines(0, 6, 600, 1, 0, '#0002', 108) + [150, 450].map(x => t(x, 66, 34, 'Heartland Inn', { f: SERIF, it: true, fill: '#fff' }) + t(x, 98, 16, 'CAREFUL · CONTENTS HOT', { w: 400, fill: '#f4e2c3', ls: 2 })).join('')],
  ['cup-white', 600, 220, w => r(0, 0, ...w, '#f7f5f0') + r(0, 180, 600, 40, '#13264a') + [150, 450].map(x => t(x, 120, 30, 'Heartland Inn', { f: SERIF, it: true, fill: '#13264a' }) + t(x, 150, 14, 'EXPRESS', { fill: '#13264a', ls: 6 })).join('')],
  ['cookie-wrap', 260, 200, w => r(0, 0, ...w, '#f3ead9') + c(130, 110, 72, '#c88a45', 'stroke="#8a5a26" stroke-width="4"') + [0, 1, 2, 3, 4, 5, 6].map(k => c(130 + Math.cos(k) * 40, 110 + Math.sin(k * 1.7) * 40, 7, '#3b2414')).join('') + r(0, 0, 260, 34, '#13264a') + t(130, 24, 18, 'FRESH BAKED · CHOCOLATE CHIP', { w: 700 }) + gloss(260, 200)],
  ['sugar-white', 120, 180, w => r(0, 0, ...w, '#fff') + t(60, 100, 26, 'SUGAR', { fill: '#1a4c9c', f: NARROW })],
  ['sugar-pink', 120, 180, w => r(0, 0, ...w, '#f8bbd0') + t(60, 100, 22, 'SWEET', { fill: '#ad1457', f: NARROW })],
  ['sugar-blue', 120, 180, w => r(0, 0, ...w, '#90caf9') + t(60, 100, 22, 'EQUAL-ish', { fill: '#0d47a1', f: NARROW })],
  ['sugar-yellow', 120, 180, w => r(0, 0, ...w, '#fff176') + t(60, 100, 22, 'SPLENDA-ish', { fill: '#f57f17', f: NARROW })],
  ['sugar-raw', 120, 180, w => r(0, 0, ...w, '#d7b98e') + t(60, 100, 22, 'RAW CANE', { fill: '#4e342e', f: NARROW })],
  ['creamer', 160, 160, w => r(0, 0, ...w, '#fff') + c(80, 80, 70, '#1a4c9c') + t(80, 78, 22, 'HALF &amp;', { w: 700 }) + t(80, 104, 22, 'HALF', { w: 700 })],
  ['creamer-vanilla', 160, 160, w => r(0, 0, ...w, '#fff') + c(80, 80, 70, '#8d6e4f') + t(80, 78, 22, 'FRENCH', { w: 700 }) + t(80, 104, 20, 'VANILLA', { w: 700 })],
  ['tea-box', 300, 200, w => r(0, 0, ...w, '#2e5a3a') + t(150, 80, 36, 'Hillside', { f: SERIF, it: true }) + t(150, 120, 18, 'ASSORTED HERBAL TEAS', { w: 400, ls: 2 }) + r(30, 140, 240, 40, '#d4b26a', 6) + t(150, 168, 18, 'GREEN · CHAMOMILE · EARL GREY', { fill: '#2e5a3a', w: 700 })],
  ['vend-price', 640, 40, w => r(0, 0, ...w, '#f5f5f5') + ['A1', 'A2', 'A3', 'A4', 'A5'].map((k, i) => t(64 + i * 128, 28, 20, `${k}  $1.75`, { fill: '#c62828', f: MONO })).join('')],
  ['vend-header', 980, 160, w => `<defs>${grad('vh', '#0d2350', '#1a4c9c', false)}</defs>` + r(0, 0, ...w, 'url(#vh)') + t(490, 72, 58, 'SNACKS', { f: NARROW, ls: 12 }) + t(490, 124, 28, 'CREDIT · DEBIT · TAP TO PAY', { w: 400, fill: '#bbdefb', ls: 4 })],
  ['market-price', 400, 60, w => r(0, 0, ...w, '#fff') + [0, 1, 2, 3].map(i => t(50 + i * 100, 40, 22, ['$2.49', '$3.29', '$1.99', '$4.79'][i], { fill: '#13264a', f: MONO })).join('')],
];

// ---------- print: newspapers, brochures, screens, keyboard, mat logo ----------
function newspaper(w, h, { name, headline, sub, photo1 = '#7a8a9a', photo2 = '#a08060', seed = 3 }) {
  let s = r(0, 0, w, h, '#f1eee6');
  s += t(w / 2, 92, 82, name, { f: 'UnifrakturMaguntia, ' + SERIF, fill: '#111', w: 700 });
  s += r(30, 112, w - 60, 3, '#111') + t(36, 136, 20, 'SPRINGFIELD, MO · THURSDAY', { a: 'start', f: SERIF, fill: '#111', w: 400 }) + t(w - 36, 136, 20, '$2.00', { a: 'end', f: SERIF, fill: '#111', w: 400 }) + r(30, 146, w - 60, 1.5, '#111');
  s += t(w / 2, 218, 62, headline, { f: SERIF, fill: '#111', mw: w - 70 }) + t(w / 2, 262, 28, sub, { f: SERIF, fill: '#333', w: 400, it: true });
  s += r(36, 290, w * 0.6, 380, photo1) + `<path d="M36 ${600} L${36 + w * 0.2} 480 L${36 + w * 0.35} 560 L${36 + w * 0.6} 430 L${36 + w * 0.6} 670 L36 670z" fill="#0003"/>` + lines(36, 684, w * 0.6, 2, 14, '#555', 4, seed);
  for (let col = 0; col < 2; col++) s += lines(w * 0.66 + col * w * 0.16, 296, w * 0.14, 38, 12, '#3338', 3, seed + col);
  for (let col = 0; col < 4; col++) s += r(36 + col * (w - 72) / 4, 730, (w - 72) / 4 - 16, 28, 'none') + t(36 + col * (w - 72) / 4, 752, 22, ['Council OKs', 'Bass season', 'Weather', 'Obituaries'][col], { a: 'start', f: SERIF, fill: '#111' }) + lines(36 + col * (w - 72) / 4, 770, (w - 72) / 4 - 20, 44, 12, '#3338', 3, seed + col + 5);
  s += r(w * 0.66, 780, w * 0.3, 240, photo2) + c(w * 0.81, 860, 50, '#0002');
  s += r(36, h - 250, w - 72, 2, '#111') + t(w / 2, h - 200, 40, 'Ozark Days return to the square', { f: SERIF, fill: '#111' }) + lines(36, h - 170, w - 72, 12, 12, '#3338', 3, seed + 9);
  return s;
}
function brochure(w, h, { title, sub, sky, ground, sun = '#ffd54f', font = SERIF, scene = 'hills' }) {
  const g = uid('br');
  let s = `<defs>${grad(g, sky, '#fff')}</defs>` + r(0, 0, w, h, `url(#${g})`);
  s += c(w * 0.72, h * 0.26, w * 0.12, sun);
  if (scene === 'hills') s += `<path d="M0 ${h * 0.55} Q${w * 0.3} ${h * 0.38} ${w * 0.6} ${h * 0.52} T${w} ${h * 0.46} L${w} ${h * 0.75} L0 ${h * 0.75}z" fill="${ground}"/><path d="M0 ${h * 0.62} Q${w * 0.4} ${h * 0.5} ${w} ${h * 0.6} L${w} ${h * 0.75} L0 ${h * 0.75}z" fill="#0003"/>`;
  if (scene === 'cave') s += r(0, 0, w, h * 0.75, '#2b1d14') + `<path d="M${w * 0.1} 0 L${w * 0.16} ${h * 0.22} L${w * 0.22} 0 M${w * 0.5} 0 L${w * 0.55} ${h * 0.3} L${w * 0.6} 0 M${w * 0.78} 0 L${w * 0.82} ${h * 0.16} L${w * 0.86} 0" fill="#c8a882"/><path d="M${w * 0.3} ${h * 0.75} L${w * 0.35} ${h * 0.5} L${w * 0.4} ${h * 0.75}z" fill="#c8a882"/>` + c(w * 0.6, h * 0.45, w * 0.18, '#ffb74d55');
  if (scene === 'lake') s += r(0, h * 0.5, w, h * 0.25, ground) + `<path d="M${w * 0.3} ${h * 0.52} l${w * 0.3} 0 l-${w * 0.04} ${h * 0.04} l-${w * 0.22} 0z" fill="#fff"/><path d="M${w * 0.44} ${h * 0.52} l0 -${h * 0.16} l${w * 0.12} ${h * 0.14}z" fill="#fff"/>`;
  if (scene === 'road') s += r(0, h * 0.5, w, h * 0.25, ground) + `<path d="M${w * 0.42} ${h * 0.5} L${w * 0.58} ${h * 0.5} L${w * 0.9} ${h * 0.75} L${w * 0.1} ${h * 0.75}z" fill="#444"/>` + r(w * 0.495, h * 0.55, w * 0.01, h * 0.04, '#ffeb3b') + r(w * 0.49, h * 0.63, w * 0.02, h * 0.06, '#ffeb3b') + c(w * 0.5, h * 0.3, w * 0.13, '#fff', 'stroke="#111" stroke-width="5"') + t(w * 0.5, h * 0.33, w * 0.1, '66', { fill: '#111', f: SANS });
  s += r(0, h * 0.75, w, h * 0.25, '#fff') + t(w / 2, h * 0.84, w * 0.12, title, { f: font, fill: '#13264a', mw: w * 0.9 }) + t(w / 2, h * 0.92, w * 0.065, sub, { fill: '#c0392b', w: 700, mw: w * 0.9 });
  return s;
}
function screen(w, h, kind) {
  const g = uid('sc');
  if (kind === 'login') return `<defs>${grad(g, '#0d2350', '#1a6fb0')}</defs>` + r(0, 0, w, h, `url(#${g})`) + c(w / 2, h * 0.36, 52, '#ffffff30') + c(w / 2, h * 0.33, 20, '#fff') + `<path d="M${w / 2 - 34} ${h * 0.44} q34 -40 68 0z" fill="#fff"/>` + t(w / 2, h * 0.58, 34, 'Guest', { f: SANS, w: 400 }) + r(w / 2 - 130, h * 0.64, 260, 36, '#ffffffd0', 4) + t(w / 2 - 118, h * 0.64 + 24, 16, 'Press Enter to sign in', { a: 'start', fill: '#555', w: 400 }) + t(w - 24, h - 24, 30, '10:42', { a: 'end', w: 300 }) + t(24, h - 24, 16, 'Heartland Inn guest computer · please log out when finished', { a: 'start', w: 400, fill: '#ffffffb0' });
  if (kind === 'boarding') return r(0, 0, w, h, '#f4f6f8') + r(0, 0, w, 36, '#2b3138') + c(18, 18, 6, '#ff5f57') + c(36, 18, 6, '#febc2e') + c(54, 18, 6, '#28c840') + r(90, 8, w - 180, 20, '#454c55', 10) + t(110, 23, 13, 'checkin.skywayair.example/boarding-pass', { a: 'start', fill: '#ddd', w: 400 }) + r(0, 36, w, 64, '#0b5cad') + t(30, 78, 28, 'Skyway Air', { a: 'start', f: SANS, it: true }) + t(w / 2, 150, 30, 'Your boarding pass is ready', { fill: '#222' }) + r(w * 0.2, 180, w * 0.6, 200, '#fff', 8, 'stroke="#ccd" stroke-width="2"') + t(w * 0.26, 230, 40, 'SGF', { a: 'start', fill: '#0b5cad' }) + t(w * 0.74, 230, 40, 'DFW', { a: 'end', fill: '#0b5cad' }) + t(w / 2, 226, 22, '✈', { fill: '#888' }) + t(w * 0.26, 270, 16, 'GROUP 3  ·  SEAT 21C  ·  06:05', { a: 'start', fill: '#444', w: 400 }) + barcode(w * 0.3, 300, w * 0.4, 50) + r(w / 2 - 90, 400, 180, 44, '#0b5cad', 22) + t(w / 2, 428, 18, 'Print', { w: 700 });
  return r(0, 0, w, h, '#111');
}
function keyboard(w, h) {
  // Matches props.py keyboard(): 15 units wide by 5.6 deep (ANSI-ish rows, the top-down projection of the keycaps).
  let s = r(0, 0, w, h, '#1d1e21');
  const u = w / 15.4, rows = [['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Del'],
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '⌫'], ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
    ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'], ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'], ['Ctrl', 'Win', 'Alt', '', 'Alt', 'Fn', 'Ctrl']];
  for (const [ri, row] of rows.entries()) for (const [k, x, wu] of layout(row, ri)) {
    const px = (0.2 + x) * u, py = (0.2 + ri * 0.9) * u;
    s += r(px + 3, py + 3, wu * u - 6, u * 0.84 - 6, '#2a2c30', 5);
    if (k) s += t(px + (k.length > 1 ? 10 : wu * u / 2), py + u * 0.5, k.length > 2 ? u * 0.2 : u * 0.34, k.replace('&', '&amp;').replace('<', '&lt;'), { a: k.length > 1 ? 'start' : 'middle', fill: '#e8e8e8', w: 400, f: SANS });
  }
  return s;
}
export function layout(row, ri) {   // [label, x in key units, width in key units] - shared shape with props.py (mirrored there)
  const widths = { '⌫': 2, Tab: 1.5, '\\': 1.5, Caps: 1.75, Enter: 2.25, Shift: 2.25, Ctrl: 1.25, Win: 1.25, Alt: 1.25, '': 6.25, Fn: 1.25 };
  let x = 0; const out = [];
  for (const [i, k] of row.entries()) { let wu = ri === 0 ? 1.1 : widths[k] ?? 1; if (ri === 4 && i === row.length - 1) wu = 2.75; out.push([k, x, wu]); x += wu; }
  return out;
}
function pegboard(w, h) {
  let s = r(0, 0, w, h, '#17181a');
  for (let y = 18; y < h; y += 26) for (let x = 18; x < w; x += 26) s += c(x, y, 4.2, '#050505') + c(x - 0.8, y - 0.8, 3.2, '#000');
  s += t(70, 150, 92, 'BREWED.', { a: 'start', w: 800, fill: '#f2f2f0' }) + t(70, 250, 92, 'HOT.', { a: 'start', w: 800, fill: '#f2f2f0' }) + t(70, 350, 92, 'ALL NIGHT.', { a: 'start', w: 800, fill: '#5ab4e8' });
  s += r(70, 390, 60, 5, '#f2f2f0') + t(70, 440, 30, 'Heartland EXPRESS', { a: 'start', w: 700, fill: '#f2f2f0', ls: 3 });
  // a clipboard frame outline and two pegboard hooks, like a real merchandising board
  s += r(w * 0.58, h * 0.16, w * 0.32, h * 0.62, 'none', 4, 'stroke="#3a3c40" stroke-width="3"');
  s += t(w * 0.74, h * 0.3, 28, 'TODAY', { w: 700, fill: '#c9ced6', ls: 6 }) + t(w * 0.74, h * 0.42, 24, 'House Blend · Medium', { w: 400, fill: '#9aa1ab' }) + t(w * 0.74, h * 0.5, 24, 'Ozark Dark · Bold', { w: 400, fill: '#9aa1ab' }) + t(w * 0.74, h * 0.58, 24, 'Decaf · Medium', { w: 400, fill: '#9aa1ab' }) + t(w * 0.74, h * 0.7, 20, 'Fresh pot every 2 hours', { w: 400, fill: '#5ab4e8', it: true });
  return s;
}
const print = [
  ['news-1', 1024, 1400, w => newspaper(...w, { name: 'The Ozark Ledger', headline: 'I-44 RESURFACING STARTS MONDAY', sub: 'Expect lane closures from Strafford to Marshfield through May', seed: 3 }), 0.75],
  ['news-2', 1024, 1400, w => newspaper(...w, { name: 'Traveler Today', headline: 'STORMS ROLL ACROSS PLAINS', sub: 'Flights delayed at three hubs; more rain expected Friday', photo1: '#5a6878', photo2: '#8a9a6a', seed: 11 }), 0.75],
  ['brochure-caverns', 210, 440, w => brochure(...w, { title: 'Onyx Caverns', sub: 'GUIDED TOURS DAILY', sky: '#000', ground: '#000', scene: 'cave' })],
  ['brochure-lake', 210, 440, w => brochure(...w, { title: 'Table Rock', sub: 'DINNER CRUISES', sky: '#64b5f6', ground: '#1565c0', scene: 'lake' })],
  ['brochure-66', 210, 440, w => brochure(...w, { title: 'Route 66', sub: 'DRIVE-IN & MUSEUM', sky: '#ffb74d', ground: '#c8a165', scene: 'road', font: SLAB })],
  ['brochure-float', 210, 440, w => brochure(...w, { title: 'Big Spring', sub: 'FLOAT TRIPS · CANOES', sky: '#81d4fa', ground: '#2e7d32' })],
  ['brochure-village', 210, 440, w => brochure(...w, { title: 'Pioneer Village', sub: '1880s LIVING HISTORY', sky: '#ffe082', ground: '#8d6e4f', font: SLAB })],
  ['brochure-outlets', 210, 440, w => brochure(...w, { title: 'Silver Fork', sub: 'OUTLET SHOPPING', sky: '#ce93d8', ground: '#6a1b9a', sun: '#fff' })],
  ['brochure-byway', 210, 440, w => brochure(...w, { title: 'Glade Top', sub: 'SCENIC BYWAY', sky: '#ff8a65', ground: '#4e342e' })],
  ['brochure-rewards', 210, 440, w => r(0, 0, ...w, '#13264a') + t(105, 150, 34, 'Heartland', { f: SERIF, it: true }) + t(105, 186, 18, 'REWARDS', { ls: 6 }) + r(30, 220, 150, 90, '#1a6fb0', 8) + t(105, 272, 18, 'JOIN TODAY', {}) + t(105, 400, 13, 'Ask at the front desk', { w: 400, fill: '#bbdefb' })],
  ['screen-login', 800, 450, w => screen(...w, 'login')],
  ['screen-boarding', 800, 450, w => screen(...w, 'boarding')],
  ['keyboard', 1232, 448, w => keyboard(...w)],
  ['mat-logo', 1024, 512, w => r(0, 0, ...w, '#26292e') + r(28, 28, 968, 456, 'none', 18, 'stroke="#13264a" stroke-width="20"') + t(512, 250, 120, 'Heartland Inn', { f: SERIF, fill: '#2f62b4', it: true }) + t(512, 360, 64, 'EXPRESS', { fill: '#c9ced6', ls: 24 })],
  ['phone-screen', 180, 380, w => `<defs>${grad('ph', '#3949ab', '#00897b')}</defs>` + r(0, 0, ...w, 'url(#ph)') + t(90, 110, 58, '6:47', { w: 300 }) + t(90, 140, 15, 'Thursday, November 19', { w: 400 }) + r(18, 190, 144, 50, '#ffffff40', 12) + t(30, 212, 12, 'Messages · now', { a: 'start', w: 700 }) + t(30, 230, 12, 'running late, save me a waffle', { a: 'start', w: 400 }) + r(64, 350, 52, 4, '#fff', 2)],
  ['notepad', 300, 400, w => r(0, 0, ...w, '#fbfaf5') + r(0, 0, 300, 50, '#13264a') + t(150, 34, 22, 'Heartland Inn', { f: SERIF, it: true }) + [...Array(12)].map((_, i) => r(20, 80 + i * 26, 260, 1.5, '#9ec5e8')).join('') + `<path d="M30 120 q20 -14 40 0 t40 0 t30 -4 M30 150 q30 10 60 -2 t50 4" stroke="#1a237e" stroke-width="3" fill="none"/>` + t(40, 210, 20, 'Wi-Fi: HEARTLAND-GUEST', { a: 'start', fill: '#1a237e', w: 400, f: 'URW Chancery L, ' + SERIF, it: true })],
];

// ---------- lobby: the coffee bar, bins, vending display and the front desk's paperwork ----------
const lobby = [
  ['server-coffee', 260, 120, w => r(0, 0, ...w, '#13264a') + t(130, 58, 40, 'COFFEE', { f: NARROW, ls: 3 }) + t(130, 96, 20, 'HOUSE BLEND', { w: 400, fill: '#9ec5e8', ls: 3 })],
  ['server-bold', 260, 120, w => r(0, 0, ...w, '#13264a') + t(130, 58, 40, 'COFFEE', { f: NARROW, ls: 3 }) + t(130, 96, 20, 'DARK ROAST', { w: 400, fill: '#ffb74d', ls: 3 })],
  ['server-decaf', 260, 120, w => r(0, 0, ...w, '#e8e8e4') + t(130, 58, 40, 'DECAF', { f: NARROW, ls: 3, fill: '#13264a' }) + t(130, 96, 20, 'HOUSE BLEND', { w: 400, fill: '#e65100', ls: 3 })],
  ['hot-water', 160, 220, w => r(0, 0, ...w, '#111') + `<path d="M80 40 q-28 40 0 70 q28 -30 0 -70z" fill="#e53935"/>` + t(80, 150, 30, 'HOT', { f: NARROW }) + t(80, 186, 30, 'WATER', { f: NARROW })],
  ['creamer-bottle', 420, 200, w => r(0, 0, ...w, '#f4efe6') + r(0, 0, 420, 36, '#5d4037') + t(210, 108, 46, 'Country Pour', { f: SERIF, it: true, fill: '#5d4037', mw: 380 }) + t(210, 146, 22, 'FRENCH VANILLA CREAMER', { fill: '#8d6e4f', mw: 380 }) + r(0, 170, 420, 30, '#c9a46a')],
  ['creamer-bottle-2', 420, 200, w => r(0, 0, ...w, '#eef3f8') + r(0, 0, 420, 36, '#1565c0') + t(210, 108, 46, 'Country Pour', { f: SERIF, it: true, fill: '#1565c0', mw: 380 }) + t(210, 146, 22, 'ORIGINAL CREAMER', { fill: '#5c7fa8', mw: 380 }) + r(0, 170, 420, 30, '#90caf9')],
  ['bin-trash', 300, 90, w => r(0, 0, ...w, '#2b2b2b', 10) + t(150, 60, 38, 'TRASH', { f: NARROW, ls: 8, fill: '#e0e0e0' })],
  ['bin-recycle', 300, 90, w => r(0, 0, ...w, '#1e5aa8', 10) + `<path d="M40 62 l14 -26 l14 26z M232 30 a18 18 0 1 1 -2 30" fill="none" stroke="#fff" stroke-width="5"/>` + t(150, 60, 34, 'RECYCLE', { f: NARROW, ls: 5, fill: '#fff' })],
  ['vend-display', 320, 90, w => r(0, 0, ...w, '#06140a') + t(160, 40, 26, 'MAKE SELECTION', { f: MONO, fill: '#5dff8a', w: 400 }) + t(160, 74, 22, 'CREDIT $0.00', { f: MONO, fill: '#3ad06a', w: 400 })],
  ['remote-face', 180, 640, w => { let g = r(0, 0, ...w, '#1b1c1f'); g += c(40, 44, 16, '#c62828') + t(40, 50, 12, '⏻', { fill: '#fff', w: 400 });
    g += t(130, 50, 14, 'INPUT', { fill: '#9aa0a8', w: 700 });
    [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, ''].forEach((n, i) => { if (n === '') return; const x = 36 + (i % 3) * 54, y = 110 + Math.floor(i / 3) * 52; g += r(x - 20, y - 16, 40, 30, '#2c2e33', 12) + t(x, y + 6, 18, n, { fill: '#e8e8e8', w: 400 }); });
    g += r(18, 330, 44, 110, '#2c2e33', 20) + t(40, 360, 22, '+', { fill: '#ddd', w: 400 }) + t(40, 395, 11, 'VOL', { fill: '#9aa0a8' }) + t(40, 430, 24, '−', { fill: '#ddd', w: 400 });
    g += r(118, 330, 44, 110, '#2c2e33', 20) + t(140, 360, 18, '▲', { fill: '#ddd', w: 400 }) + t(140, 395, 11, 'CH', { fill: '#9aa0a8' }) + t(140, 430, 18, '▼', { fill: '#ddd', w: 400 });
    g += c(90, 385, 26, '#2c2e33') + t(90, 391, 12, 'MUTE', { fill: '#ddd' });
    g += c(90, 520, 50, '#2c2e33') + c(90, 520, 22, '#3a3d43') + t(90, 525, 11, 'OK', { fill: '#ddd' }) + ['▲', '▶', '▼', '◀'].map((a, i) => t(90 + [0, 36, 0, -36][i], 520 + [-32, 6, 40, 6][i], 13, a, { fill: '#bbb', w: 400 })).join('');
    return g + t(90, 615, 12, 'Heartland Inn · Please do not remove', { fill: '#6c7078', w: 400, mw: 170 }); }],
  ['terminal-screen', 200, 140, w => `<defs>${grad('ts', '#0d2350', '#1a6fb0')}</defs>` + r(0, 0, ...w, 'url(#ts)') + t(100, 50, 20, 'Insert, tap', { w: 400 }) + t(100, 76, 20, 'or swipe', { w: 400 }) + r(70, 92, 60, 30, '#ffffff30', 6) + t(100, 113, 14, '))) TAP', { w: 700 })],
  ['receipt', 120, 300, w => r(0, 0, ...w, '#fdfcf8') + t(60, 26, 12, 'HEARTLAND INN', { fill: '#222' }) + lines(12, 44, 96, 18, 13, '#0007', 2, 9) + r(12, 285, 96, 1, '#0006')],
  ['pen-barrel', 400, 40, w => r(0, 0, ...w, '#13264a') + t(200, 27, 18, 'Heartland Inn  ·  I-44 Exit 77', { fill: '#e8e8e8', w: 400, ls: 1 })],
  ['coffee-board', 1200, 520, w => pegboard(...w)],
  ['keycard', 344, 216, w => `<defs>${grad('kc', '#0d2350', '#1a6fb0', false)}</defs>` + r(0, 0, ...w, 'url(#kc)', 14) + t(28, 80, 40, 'Heartland Inn', { a: 'start', f: SERIF, it: true }) + t(30, 116, 18, 'EXPRESS', { a: 'start', ls: 6, fill: '#bbdefb' }) + r(250, 150, 66, 40, '#d4b26a', 6) + t(28, 190, 13, 'Please return at checkout', { a: 'start', w: 400, fill: '#bbdefb' })],
  ['key-sleeve', 300, 420, w => r(0, 0, ...w, '#fbfaf6') + r(0, 0, 300, 120, '#13264a') + t(150, 62, 34, 'Heartland Inn', { f: SERIF, it: true }) + t(150, 96, 14, 'EXPRESS · I-44 EXIT 77', { ls: 3, fill: '#bbdefb' }) + t(40, 180, 18, 'ROOM', { a: 'start', fill: '#13264a' }) + r(40, 192, 220, 56, 'none', 4, 'stroke="#13264a" stroke-width="3"') + t(40, 290, 16, 'Breakfast 6:00 - 9:30 AM', { a: 'start', w: 400, fill: '#333' }) + t(40, 316, 16, 'Wi-Fi  HEARTLAND-GUEST', { a: 'start', w: 400, fill: '#333' }) + t(40, 342, 16, 'Checkout 11:00 AM', { a: 'start', w: 400, fill: '#333' })],
  ['tent-wifi', 400, 260, w => r(0, 0, ...w, '#13264a') + t(200, 70, 30, 'Stay connected', { f: SERIF, it: true }) + r(40, 96, 320, 2, '#5ab4e8') + t(200, 140, 22, 'NETWORK  HEARTLAND-GUEST', { w: 700, fill: '#fff' }) + t(200, 180, 22, 'PASSWORD  route66', { w: 400, fill: '#bbdefb' }) + t(200, 228, 15, 'Ask us about late checkout', { w: 400, fill: '#9ec5e8', it: true })],
  ['reg-card', 300, 400, w => r(0, 0, ...w, '#fff') + r(0, 0, 300, 44, '#13264a') + t(150, 30, 18, 'GUEST REGISTRATION', { ls: 2 }) + lines(20, 70, 260, 12, 22, '#0005', 3, 5) + r(20, 340, 160, 1.5, '#000') + t(20, 366, 12, 'Guest signature', { a: 'start', w: 400, fill: '#666' }) + `<path d="M30 332 q20 -20 34 0 t30 -6 t40 2" stroke="#1a237e" stroke-width="2.5" fill="none"/>`],
  ['sticky', 160, 160, w => r(0, 0, ...w, '#fff176') + r(0, 0, 160, 18, '#f9e65a') + `<path d="M18 50 q14 -8 28 0 t28 0 t26 -4 M18 82 q20 6 40 -2 t40 4 M18 114 q16 -6 32 0 t20 -2" stroke="#1a237e" stroke-width="3" fill="none"/>` + t(118, 140, 18, '118 LCO', { fill: '#c62828', w: 700 })],
  ['next-agent', 400, 160, w => r(0, 0, ...w, '#fbfaf6') + r(0, 0, 400, 12, '#13264a') + t(200, 78, 30, 'Please see', { fill: '#13264a', f: SERIF, it: true }) + t(200, 124, 30, 'next agent', { fill: '#13264a', f: SERIF, it: true })],
];

// ---------- rug: low-pile geometric, printed over the carpet texture's grain ----------
function rug(w, h) {
  let s = r(0, 0, w, h, '#20304f') + r(40, 40, w - 80, h - 80, '#c9ccd1');
  const n = 12, cw = (w - 120) / n, ch = (h - 120) / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = 60 + i * cw, y = 60 + j * ch, k = (i * 7 + j * 3) % 4;
    const fill = ['#9aa1ab', '#b3b8bf', '#7d8591', '#20304f'][k];
    s += (i + j) % 2 ? `<path d="M${x} ${y} L${x + cw} ${y} L${x} ${y + ch}z" fill="${fill}"/>` : `<path d="M${x + cw} ${y} L${x + cw} ${y + ch} L${x} ${y + ch}z" fill="${fill}"/>`;
  }
  return s + r(52, 52, w - 104, h - 104, 'none', 0, 'stroke="#20304f" stroke-width="10"');
}

// ---------- pack and rasterise ----------
async function atlas(name, items, size, k = 1) {
  const sorted = [...items].map(([id, w, h, d, ik = 1]) => [id, w, h, d, Math.round(w * k * ik), Math.round(h * k * ik)]).sort((a, b) => b[5] - a[5]);
  // Skyline packing: each item drops to the lowest spot it fits along the top edge of what is already placed.
  const pad = 4, sky = new Int32Array(size), rects = {}, parts = [];
  let used = 0;
  for (const [id, vw, vh, draw, w, h] of sorted) {
    let best = -1, by = Infinity;
    for (let x = 0; x + w <= size; x += 4) { let y = 0; for (let i = x; i < x + w; i++) if (sky[i] > y) y = sky[i]; if (y < by) { by = y; best = x; } }
    if (best < 0 || by + h > size) throw new Error(`${name}: atlas full at ${id}`);
    const x = best, y = by;
    for (let i = x; i < Math.min(size, x + w + pad); i++) sky[i] = y + h + pad;
    parts.push(`<g transform="translate(${x} ${y})"><svg width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}" overflow="hidden" preserveAspectRatio="none">${draw([vw, vh])}</svg></g>`);
    rects[id] = [x / size, 1 - (y + h) / size, (x + w) / size, 1 - y / size];      // u0 v0 u1 v1, v up
    used = Math.max(used, y + h);
  }
  const x = 0, y = used, rowH = 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${r(0, 0, size, size, '#808080')}${parts.join('')}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(new URL(`${name}.png`, OUT).pathname);
  writeFileSync(new URL(`${name}.json`, OUT), JSON.stringify(rects, null, 1));
  console.log(`${name}.png ${size}px, ${items.length} items, used to y=${y + rowH}`);
}
await atlas('products', products, 2048, 0.8);
await atlas('print', print, 2048, 0.8);
await atlas('lobby', lobby, 1024, 0.7);
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${rug(1024, 1024)}</svg>`)).png().toFile(new URL('rug.png', OUT).pathname);
console.log('rug.png');
// The vending machine and coffee counter are seen from further off: they share a 1K copy (same UV rects).
await sharp(new URL('products.png', OUT).pathname).resize(1024).png().toFile(new URL('products-1k.png', OUT).pathname);
console.log('products-1k.png');
