// Package the hotel: the heartland-hotel part (the building and engine every hotel game shares) and the Heartland Inn
// game, whose page holds only its own code and loads the hotel as that part.
// node projects/roadside-inn/package.mjs   → artifacts/roadside-inn/{heartland-hotel.js,heartland-inn.html}, release.parts.json
// Publish in order (the game pins the part): node publish-batch.js projects/roadside-inn/release.parts.json --network baseSepolia
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { IMPORTMAP } from './imports.mjs';
import { buildGame, buildHotelPart } from './release.mjs';

const here = import.meta.dirname, repo = resolve(here, '../..'), out = resolve(repo, 'artifacts/roadside-inn');
await mkdir(out, { recursive: true });

const hotel = await buildHotelPart();
await writeFile(resolve(out, 'heartland-hotel.js'), hotel.js);
const { js, parts } = await buildGame(resolve(here, 'main.js'));

let html = await readFile(resolve(here, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">.*?<\/script>/s, () => IMPORTMAP)
  .replace('<script type="module" src="main.js"></script>', () => '<script type="module">' + js.replaceAll('</script', '<\\/script') + '</script>')
  .replace('</head>', () => `<!-- Heartland Inn Express. Original code CC0-1.0; the hotel is the heartland-hotel part (its credits and notices travel with it). Three.js MIT. -->\n<script>window.WAREHOUSE_PARTS={/*PARTS*/};</script></head>`);
await writeFile(resolve(out, 'heartland-inn.html'), html);

await writeFile(resolve(here, 'release.parts.json'), JSON.stringify([hotel.entry, {
  id: 'heartland-inn', type: 'game', file: '../artifacts/roadside-inn/heartland-inn.html',
  title: 'Heartland Inn Express · a night off I-62', author: 'the internet slop warehouse', license: 'CC0-1.0 AND MIT',
  description: 'Realistic first-person walk through an interstate chain hotel somewhere in the rural Midwest at dusk. Check in with the desk clerk, take the working elevator or switchback stairs, open room 212 with your key card. Vending, lobby coffee, lounge and room TVs with channels, pool and hot tub, gym through glass, ice machine, housekeeping, parking lot, highway traffic, truck stop. Textured rigged human staff and guests, textured shower enclosure and cardio equipment, functional desk lamp, corrected wall-mounted art and signage, clear elevator shaft. Automatic mobile battery profile. Day/dusk toggle, desktop and touch controls. Exploration, no fail state.',
  tags: ['hotel', 'first-person', 'exploration', 'realistic', 'walking-sim', 'missouri', 'roadside', 'polyhaven', 'grab3d', 'cc0', 'mobile'],
  uses: parts,
}], null, 2) + '\n');
console.log(`heartland-hotel: ${hotel.js.length} characters, ${hotel.entry.uses.length} parts. Heartland Inn: ${html.length} characters, loads ${parts.join(', ')}.`);
