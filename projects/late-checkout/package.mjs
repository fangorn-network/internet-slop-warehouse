// Package Late Checkout as one portable HTML game (the warehouse's game part format) plus its release manifest.
//   node projects/late-checkout/package.mjs
//   node publish-batch.js projects/late-checkout/release.parts.json --local /tmp/late-checkout   # preview
//   node publish-batch.js projects/late-checkout/release.parts.json --network baseSepolia        # publish
// The page holds only Late Checkout's code; the hotel loads as the heartland-hotel part (publish roadside-inn's release first).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { IMPORTMAP } from '../roadside-inn/imports.mjs';
import { buildGame } from '../roadside-inn/release.mjs';

const here = import.meta.dirname, repo = resolve(here, '../..'), out = resolve(repo, 'artifacts/late-checkout');
await mkdir(out, { recursive: true });
// Only Late Checkout's own code: the hotel (building, engine, every asset) loads as the heartland-hotel part.
const { js, parts } = await buildGame(resolve(here, 'main.js'));

let html = await readFile(resolve(here, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">.*?<\/script>/s, () => IMPORTMAP)
  .replace('<script type="module" src="main.js"></script>', () => '<script type="module">' + js.replaceAll('</script', '<\\/script') + '</script>')
  .replace('</head>', () => `<!-- Late Checkout, a remix of Heartland Inn Express. Original code CC0-1.0; the hotel is the heartland-hotel part (its credits and notices travel with it). Three.js MIT. -->\n<script>window.WAREHOUSE_PARTS={/*PARTS*/};</script></head>`);
await writeFile(resolve(out, 'late-checkout.html'), html);

await writeFile(resolve(here, 'release.parts.json'), JSON.stringify([{
  id: 'late-checkout', type: 'game', file: '../artifacts/late-checkout/late-checkout.html',
  title: 'Late Checkout · a night at the Heartland Inn',
  description: 'A first-person horror mystery remix of Heartland Inn Express. It starts as a hotel sim: check in with Dana, find room 212. Then you fall asleep. At 3 AM someone knocks, your car keys are gone, and a door marked 113 appears at the end of a ground floor that ends at 108. The notice on your door is always honest and never plain. Piece together a torn page that says who did what at the Heartland, find your keys and drive away before six, or become the night clerk. Every night is generated from a seed: a different culprit and crime, hiding places across the hotel and the travel stop over the interstate, generated puzzles (riddles, split codes, time windows, vending, knocks) and hauntings (an endless corridor, a third floor that does not exist, a figure at the end of the hall). Time is the currency; the road costs an hour. Mobile texture budget and streaming, one-pass dream effects, desktop and touch controls.',
  tags: ['horror', 'mystery', 'first-person', 'hotel', 'procedural', 'roguelike', 'puzzle', 'twin-peaks', 'missouri', 'roadside', 'remix', 'cc0', 'mobile'],
  author: 'the internet slop warehouse', license: 'CC0-1.0 AND MIT',
  parent: { id: 'heartland-inn' },
  uses: parts,
}], null, 2) + '\n');
console.log(`Packaged ${html.length} characters; loads ${parts.join(', ')}; parent heartland-inn.`);
