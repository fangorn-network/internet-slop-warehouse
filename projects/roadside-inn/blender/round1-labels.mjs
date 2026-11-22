// SPDX-License-Identifier: CC0-1.0
// Print for the round-1 models (round1.py): the spare toilet roll's paper band (faint grey, no brand) and the
// roll's kraft core (the band is drawn 1.45x tall: it maps onto a 6 x 35 cm strip), one 1024 x 512 sheet: band in the top half (v 0.5-1), core in the bottom half (v 0-0.5).
//   node projects/roadside-inn/blender/round1-labels.mjs
import sharp from 'sharp';

const OUT = new URL('./labels/r1-print.png', import.meta.url).pathname;
const t = (x, y, s, txt, fill = '#bcbcb9', w = 400, ls = 2) =>
  `<text x="${x}" y="${y}" font-family="Liberation Sans" font-size="${s}" font-weight="${w}" fill="${fill}" text-anchor="middle" letter-spacing="${ls}">${txt}</text>`;
let band = `<rect width="1024" height="256" fill="#f3f2ee"/>`;
band += `<rect y="50" width="1024" height="2" fill="#c9c9c6"/><rect y="204" width="1024" height="2" fill="#c9c9c6"/>`;
for (let i = 0; i < 2; i++) {                                    // two repeats round the roll (35 cm)
  const x = 256 + i * 512;
  band += t(x, 92, 30, 'BATH TISSUE', '#b4b4b1', 700, 5);
  band += t(x, 132, 19, '2-PLY · 400 SHEETS', '#c0c0bd');
  band += t(x, 166, 15, 'SEPTIC SAFE · 100% RECYCLED FIBER', '#c8c8c5', 400, 1);
  band += `<path d="M${x - 40} 196 q10 -10 20 0 t20 0 t20 0 t20 0" stroke="#bdbdba" stroke-width="2" fill="none"/>`;
}
let core = `<rect width="1024" height="256" fill="#a8845a"/>`;
for (let k = -8; k < 16; k++) core += `<path d="M${k * 90} 256 L${k * 90 + 256} 0" stroke="#8d6c46" stroke-width="3" opacity="0.7"/>`;
for (let k = 0; k < 400; k++) { const x = (k * 733) % 1024, y = (k * 389) % 256; core += `<circle cx="${x}" cy="${y}" r="${1 + (k % 3)}" fill="${k % 2 ? '#b8956a' : '#93724c'}" opacity="0.6"/>`; }
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512"><g transform="scale(1,1.45) translate(0,-40)">${band}</g><g transform="translate(0,256)">${core}</g></svg>`;
await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log(OUT);
