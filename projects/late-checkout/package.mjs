// Package Late Checkout as one portable HTML game (the warehouse's game part format) plus its release manifest.
//   node projects/late-checkout/package.mjs
//   node publish-batch.js projects/late-checkout/release.parts.json --local /tmp/late-checkout   # preview
//   node publish-batch.js projects/late-checkout/release.parts.json --network baseSepolia        # publish
// Every asset is a part the Heartland Inn already published; the game pins them all and names heartland-inn as its parent.
import { build } from 'rolldown';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { IMPORTMAP, external, bundledCredits } from '../roadside-inn/imports.mjs';

const here = import.meta.dirname, repo = resolve(here, '../..'), out = resolve(repo, 'artifacts/late-checkout');
await mkdir(out, { recursive: true });

const built = await build({ write: false, input: resolve(here, 'main.js'), external, output: { format: 'esm', codeSplitting: false, minify: true } });
const js = built.output.find(x => x.type === 'chunk').code;

const { PART_IDS } = await import('../roadside-inn/assets.js');   // the Heartland's parts, travel stop included
const pins = {}, publishers = {};
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (e.name.endsWith('receipts.json')) for (const r of JSON.parse(await readFile(p, 'utf8'))) if (r.src && r.id) { pins[r.id] = `https://ipfs-test.fangorn.network/ipfs/${r.src}`; publishers[r.id] = r.publisher; }
  }
}
for (const d of ['parts', 'projects', 'ingestion']) await walk(resolve(repo, d));
const missing = PART_IDS.filter(i => !pins[i]);
if (missing.length) throw Error(`Unpublished parts (publish them first): ${missing.join(', ')}`);

const notices = await readFile(resolve(repo, 'projects/roadside-inn/licenses/rocketbox-NOTICE.md'), 'utf8') + '\n' + await readFile(resolve(repo, 'projects/roadside-inn/licenses/avatar-studio-LICENSE.txt'), 'utf8');
let html = await readFile(resolve(here, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">.*?<\/script>/s, () => IMPORTMAP)
  .replace('<script type="module" src="main.js"></script>', () => '<script type="module">' + js.replaceAll('</script', '<\\/script') + '</script>')
  .replace('</head>', () => `<!-- Late Checkout, a remix of Heartland Inn Express. Original code, building and fixtures CC0-1.0. Poly Haven, Grab3D and Kenney assets CC0-1.0. Three.js MIT.\n${notices.replaceAll('-->', '- ->')} -->\n<script>window.WAREHOUSE_PARTS={...${JSON.stringify(Object.fromEntries(PART_IDS.map(i => [i, pins[i]])))},...{/*PARTS*/}};</script></head>`);
await writeFile(resolve(out, 'late-checkout.html'), html);

await writeFile(resolve(here, 'release.parts.json'), JSON.stringify([{
  id: 'late-checkout', type: 'game', file: '../artifacts/late-checkout/late-checkout.html',
  title: 'Late Checkout · a night at the Heartland Inn',
  description: 'A first-person horror mystery remix of Heartland Inn Express. It starts as a hotel sim: check in with Dana, find room 212. Then you fall asleep. At 3 AM someone knocks, your car keys are gone, and a door marked 113 appears at the end of a ground floor that ends at 108. The notice on your door is always honest and never plain. Piece together a torn page that says who did what at the Heartland, find your keys and drive away before six, or become the night clerk. Every night is generated from a seed: a different culprit and crime, hiding places across the hotel and the travel stop over the interstate, generated puzzles (riddles, split codes, time windows, vending, knocks) and hauntings (an endless corridor, a third floor that does not exist, a figure at the end of the hall). Time is the currency; the road costs an hour. Mobile texture budget and streaming, one-pass dream effects, desktop and touch controls.',
  tags: ['horror', 'mystery', 'first-person', 'hotel', 'procedural', 'roguelike', 'puzzle', 'twin-peaks', 'missouri', 'roadside', 'remix', 'cc0', 'mobile'],
  author: 'the internet slop warehouse', license: 'CC0-1.0 AND MIT',
  parent: { id: 'heartland-inn' },
  uses: [...PART_IDS, ...bundledCredits(publishers)].sort(),
}], null, 2) + '\n');
console.log(`Packaged ${html.length} characters; ${PART_IDS.length} parts pinned; parent heartland-inn.`);
