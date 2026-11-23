// Package the Heartland games (the run, and Onyx Caverns by itself) as portable HTML plus their release manifests.
// Night Audit packages itself (night-audit/package.mjs); its sound parts are reused here.
//   node projects/heartland/package.mjs
//   node publish-batch.js projects/heartland/release.parts.json --network baseSepolia
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { IMPORTMAP } from '../roadside-inn/imports.mjs';
import { buildGame } from '../roadside-inn/release.mjs';

const repo = resolve(import.meta.dirname, '../..');
const sounds = JSON.parse(await readFile(resolve(repo, 'projects/night-audit/assets.parts.json'), 'utf8'));
const made = { method: 'hand', ai: 'code', tool: 'Claude Code' };
const GAMES = [
  { dir: 'caves', out: 'caves/onyx-caverns.html', note: 'Onyx Caverns, a morning at the Heartland Inn. Original code CC0-1.0; the hotel is the heartland-hotel part (its credits and notices travel with it). Three.js MIT.',
    entry: { id: 'heartland-onyx-caverns', title: 'Onyx Caverns · a morning drive from the Heartland Inn',
      description: 'The morning after a night at the Heartland Inn: get in your station wagon, back out of the spot, east on the frontage road and down Route V through the trees to Onyx Caverns, the tourist trap from the lobby\'s brochure rack. Nobody in the ticket hut: SELF-GUIDED TOURS TODAY, $14 in the honour box. A tour path strung with bare bulbs, down to the Onyx Room. Break off a piece; the bulbs go out behind you one by one, coming your way, and your steps get an echo that doesn\'t stop quite when you do. Flashlight, drips, the drive back. Drivable car (W/S, A/D), first-person on foot. A day scene for the Heartland run, playable by itself; ?seed= picks the cave.',
      tags: ['driving', 'cave', 'horror', 'first-person', 'hotel', 'roadside', 'tourist-trap', 'scenes', 'minigame', 'mobile'] } },
  { dir: 'heartland', out: 'heartland/the-heartland.html', note: 'The Heartland: nights at the Heartland Inn, a run of its minigames. Original code CC0-1.0; the hotel is the heartland-hotel part (its credits and notices travel with it). Lobby music: 식료품groceries, 인터넷 쇼핑 (Ascension), CC0. TVs: Prelinger Archives and Universal Newsreel, public domain. Three.js MIT.',
    sounds: true,
    entry: { id: 'the-heartland', title: 'The Heartland · how many nights can you last?',
      description: 'A roguelite run at the Heartland Inn Express, off I-62, made of the hotel\'s minigames. Check in at dusk and sleep in 212 ($59 a night). At 3 AM: Night Audit, locked out, down stairs that keep going through remixed floors of the hotel, following the lobby\'s music while something that was at your door comes down after you; lock yourself in a guest room, take the money off the nightstand, get back to Dana. In the morning: drive to Onyx Caverns and take the self-guided tour. Back at dusk; another night. Money pays for the room, nerve is what the nights take; run out of either and the run is over (permadeath). What you learned is kept as memories for the next time you check in. Each run is seeded. First-person and driving, spatial audio, desktop and touch.',
      tags: ['roguelite', 'horror', 'survival', 'hotel', 'first-person', 'driving', 'procedural', 'seeded', 'permadeath', 'spatial-audio', 'scenes', 'mobile'] } },
];
const manifest = [...sounds];
for (const g of GAMES) {
  const here = resolve(repo, 'projects', g.dir), out = resolve(repo, 'artifacts', g.out);
  await mkdir(resolve(out, '..'), { recursive: true });
  const { js, parts } = await buildGame(resolve(here, 'main.js'));
  let html = await readFile(resolve(here, 'index.html'), 'utf8');
  html = html.replace(/<script type="importmap">.*?<\/script>/s, () => IMPORTMAP)
    .replace('<script type="module" src="main.js"></script>', () => '<script type="module">' + js.replaceAll('</script', '<\\/script') + '</script>')
    .replace('</head>', () => `<!-- ${g.note} -->\n<script>window.WAREHOUSE_PARTS={/*PARTS*/};</script></head>`);
  await writeFile(out, html);
  manifest.push({ ...g.entry, type: 'game', file: `../artifacts/${g.out}`, author: 'the internet slop warehouse', license: 'CC0-1.0 AND MIT', made,
    parent: { id: 'heartland-inn' }, uses: [...parts, ...(g.sounds ? sounds.map(s => s.id) : [])].sort() });
  console.log(`${g.entry.id}: ${html.length} characters; loads ${parts.join(', ')}`);
}
// publish-batch.js checks every `uses` against its own manifest: the sounds ride along (unchanged ones are skipped).
await writeFile(resolve(import.meta.dirname, 'release.parts.json'), JSON.stringify(manifest, null, 2) + '\n');
