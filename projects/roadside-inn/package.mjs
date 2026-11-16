// Package the hotel as one portable HTML game (the warehouse's game part format) plus its release manifest.
// node projects/roadside-inn/package.mjs   → artifacts/roadside-inn/heartland-inn.html, projects/roadside-inn/release.parts.json
import { build } from 'rolldown';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const here = import.meta.dirname, repo = resolve(here, '../..'), out = resolve(repo, 'artifacts/roadside-inn');
await mkdir(out, { recursive: true });

const built = await build({ input: resolve(here, 'main.js'), external: id => id === 'three' || id.startsWith('three/'), output: { format: 'esm', codeSplitting: false, minify: true } });
const js = built.output.find(x => x.type === 'chunk').code;

const { PART_IDS } = await import('./assets.js');
const ids = new Set(PART_IDS);

// Pins from every publish receipt in the repo (same publisher).
const pins = {};
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (e.name.endsWith('receipts.json')) for (const r of JSON.parse(await readFile(p, 'utf8'))) if (r.src && r.id) pins[r.id] = `https://ipfs-test.fangorn.network/ipfs/${r.src}`;
  }
}
for (const d of ['parts', 'projects', 'ingestion']) await walk(resolve(repo, d));
const missing = [...ids].filter(i => !pins[i]);

const modelNotices = await readFile(resolve(here, 'licenses/rocketbox-NOTICE.md'), 'utf8') + '\n' + await readFile(resolve(here, 'licenses/avatar-studio-LICENSE.txt'), 'utf8');
let html = await readFile(resolve(here, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">.*?<\/script>/s, '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script>')
  .replace('<script type="module" src="main.js"></script>', () => '<script type="module">' + js.replaceAll('</script', '<\\/script') + '</script>')
  .replace('</head>', () => `<!-- Original code, building and fixtures CC0-1.0. Poly Haven, Grab3D and Kenney assets CC0-1.0. Three.js MIT.\n${modelNotices} -->\n<script>window.WAREHOUSE_PARTS={...${JSON.stringify(Object.fromEntries([...ids].filter(i => pins[i]).map(i => [i, pins[i]])))},...{/*PARTS*/}};</script></head>`);
await writeFile(resolve(out, 'heartland-inn.html'), html);

await writeFile(resolve(here, 'release.parts.json'), JSON.stringify([{
  id: 'heartland-inn', type: 'game', file: '../artifacts/roadside-inn/heartland-inn.html',
  title: 'Heartland Inn Express · a night off I-44', author: 'the internet slop warehouse', license: 'CC0-1.0 AND MIT',
  description: 'Realistic first-person walk through an interstate chain hotel in rural Missouri at dusk. Check in with the desk clerk, take the working elevator or switchback stairs, open room 212 with your key card. Vending, lobby coffee, lounge and room TVs with channels, pool and hot tub, gym through glass, ice machine, housekeeping, parking lot, highway traffic, truck stop. Textured rigged human staff and guests, textured shower enclosure and cardio equipment, functional desk lamp, corrected wall-mounted art and signage, clear elevator shaft. Automatic mobile battery profile. Day/dusk toggle, desktop and touch controls. Exploration, no fail state.',
  tags: ['hotel', 'first-person', 'exploration', 'realistic', 'walking-sim', 'missouri', 'roadside', 'polyhaven', 'grab3d', 'cc0', 'mobile'],
  uses: [...ids].sort(),
}], null, 2) + '\n');
console.log(`Packaged ${html.length} characters; ${ids.size} parts, ${ids.size - missing.length} pinned.`);
if (missing.length) console.log(`Unpublished (publish before releasing the game): ${missing.join(', ')}`);
