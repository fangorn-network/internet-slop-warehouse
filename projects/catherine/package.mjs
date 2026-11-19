// Package Catherine as one portable HTML game plus its release manifest (after late-checkout/package.mjs).
//   node projects/catherine/package.mjs
//   node publish-batch.js projects/catherine/release.parts.json --local /tmp/catherine      # preview
//   node publish-batch.js projects/catherine/release.parts.json --network baseSepolia       # publish
// The page holds only Catherine's code; the hotel and its stage load as the heartland-hotel part, and her own assets
// (projects/catherine/assets.parts.json, published first) are pinned by `uses`.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { IMPORTMAP } from '../roadside-inn/imports.mjs';
import { buildGame } from '../roadside-inn/release.mjs';

const here = import.meta.dirname, repo = resolve(here, '../..'), out = resolve(repo, 'artifacts/catherine');
await mkdir(out, { recursive: true });
const { js, parts } = await buildGame(resolve(here, 'main.js'));
const assets = JSON.parse(await readFile(resolve(here, 'assets.parts.json'), 'utf8')).map(p => p.id);

let html = await readFile(resolve(here, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">.*?<\/script>/s, () => IMPORTMAP)
  .replace('<script type="module" src="main.js"></script>', () => '<script type="module">' + js.replaceAll('</script', '<\\/script') + '</script>')
  .replace('</head>', () => `<!-- Catherine, a dream at the Heartland Inn. From a dream report in the Sleep and Dream Database (SDDb), melvin-dreams 1993-01-10, via Zenodo doi:10.5281/zenodo.18076716, CC BY 4.0; adapted. Original code CC0-1.0; the hotel is the heartland-hotel part (its credits and notices travel with it). Three.js MIT. -->\n<script>window.WAREHOUSE_PARTS={/*PARTS*/};</script></head>`);
await writeFile(resolve(out, 'catherine.html'), html);

await writeFile(resolve(here, 'release.parts.json'), JSON.stringify([{
  id: 'catherine', type: 'game', file: '../artifacts/catherine/catherine.html',
  title: 'Catherine · a dream at the Heartland Inn',
  description: 'A short first-person dream in room 212 of the Heartland Inn, adapted from a real dream report (Sleep and Dream Database, melvin-dreams, 1993; CC BY 4.0). 3 AM: heavy footsteps on a wooden floor come down a carpeted hall and stop at your door. Through the peephole, a woman with her head bowed to it. Open the door and the hall is the house that stood there before the hotel: floorboards, wainscot, bare bulbs on pull chains, a grandfather clock ticking. Her steps walk away from you; she is at the end of the hall, her back to you. Reach out. Built as scenes on the hotel\'s stage: ?scenes=checkin,catherine plays an ordinary evening first. Spatial audio with reverb; desktop and touch controls.',
  tags: ['horror', 'dream', 'first-person', 'hotel', 'ghost', 'short', 'scenes', 'spatial-audio', 'sddb', 'remix', 'cc0', 'mobile'],
  author: 'the internet slop warehouse', license: 'CC0-1.0 AND MIT AND CC-BY-4.0',
  parent: { id: 'heartland-inn' },
  uses: [...parts, ...assets, 'ph-wooden-bookshelf-worn'].sort(),
}], null, 2) + '\n');
console.log(`Packaged ${html.length} characters; loads ${parts.join(', ')}; pins ${assets.length + 1} assets; parent heartland-inn.`);
