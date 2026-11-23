// Package Night Audit as one portable HTML game, its sound assets and its release manifest (after catherine/package.mjs).
//   node projects/night-audit/package.mjs
//   node publish-batch.js projects/night-audit/assets.parts.json --network baseSepolia     # sounds first
//   node publish-batch.js projects/night-audit/release.parts.json --network baseSepolia    # then the game
// The page holds only this scene's code; the hotel and its stage load as the heartland-hotel part.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { IMPORTMAP } from '../roadside-inn/imports.mjs';
import { buildGame } from '../roadside-inn/release.mjs';

const here = import.meta.dirname, repo = resolve(here, '../..'), out = resolve(repo, 'artifacts/night-audit');
await mkdir(out, { recursive: true });
const SOUNDS = [
  { id: 'night-audit-lobby-music', file: 'lobby-music.mp3', title: 'Lobby music: Ascension excerpts (mallsoft loop)', license: 'CC0-1.0', author: '식료품groceries',
    description: 'A 204 s mono loop for a hotel lobby at night: three 70 s excerpts of 식료품groceries, 인터넷 쇼핑 (Ascension) (2017), "Add To Cart" from 40 s, "Continue Shopping" from 15 s and "Quick-Start Guide" from 30 s, crossfaded over 3 s, loudness-normalised to -18 LUFS, 48 kbps MP3. Source: https://archive.org/details/ascension-raw-flac (CC0, published by the artist).', tags: ['music', 'mallsoft', 'vaporwave', 'lobby', 'loop', 'ambient', 'mp3'] },
  { id: 'night-audit-tv-hoteland', file: 'tv-hoteland.mp3', title: 'Hotel and Restaurant Workers (150 s, film soundtrack)', license: 'CC0-1.0', author: 'Prelinger Archives',
    description: '150 s of the soundtrack of the vocational film Hotel and Restaurant Workers, from 120 s; mono, 40 kbps MP3, loudness-normalised. Public domain, Prelinger Archives via the Internet Archive: https://archive.org/details/Hoteland.', tags: ['broadcast', 'narration', 'film', 'public-domain', 'tv', 'hotel', 'mp3'] },
  { id: 'night-audit-tv-duck', file: 'tv-duck.mp3', title: 'Duck and Cover, 1951 (150 s, film soundtrack)', license: 'CC0-1.0', author: 'Federal Civil Defense Administration',
    description: '150 s of the soundtrack of Duck and Cover (1951), from 200 s; mono, 40 kbps MP3, loudness-normalised. US federal work, public domain; Prelinger Archives via the Internet Archive: https://archive.org/details/DuckandC1951.', tags: ['broadcast', 'narration', 'civil-defense', 'film', 'public-domain', 'tv', 'mp3'] },
  { id: 'night-audit-tv-arctic', file: 'tv-arctic.mp3', title: 'Arctic Sentinels, Universal Newsreel 1956 (150 s)', license: 'CC0-1.0', author: 'Universal Newsreel',
    description: '150 s of the Universal Newsreel of 9 April 1956 (Arctic Sentinels: DEW Line radar), from 20 s; mono, 40 kbps MP3, loudness-normalised. Public domain via the Internet Archive: https://archive.org/details/1956-04-09_Arctic_Sentinels.', tags: ['broadcast', 'newsreel', 'narration', 'public-domain', 'tv', '1950s', 'mp3'] },
];
const sounds = SOUNDS.map(({ file, ...s }) => ({ ...s, file: `../projects/night-audit/assets/${file}`, type: 'asset', mime: 'audio/mpeg' }));
await writeFile(resolve(here, 'assets.parts.json'), JSON.stringify(sounds, null, 2) + '\n');

const { js, parts } = await buildGame(resolve(here, 'main.js'));
let html = await readFile(resolve(here, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">.*?<\/script>/s, () => IMPORTMAP)
  .replace('<script type="module" src="main.js"></script>', () => '<script type="module">' + js.replaceAll('</script', '<\\/script') + '</script>')
  .replace('</head>', () => `<!-- Night Audit, a scene at the Heartland Inn. Original code CC0-1.0; the hotel is the heartland-hotel part (its credits and notices travel with it). Lobby music: 식료품groceries, 인터넷 쇼핑 (Ascension), CC0. TVs: Prelinger Archives and Universal Newsreel, public domain. Three.js MIT. -->\n<script>window.WAREHOUSE_PARTS={/*PARTS*/};</script></head>`);
await writeFile(resolve(out, 'night-audit.html'), html);

// publish-batch.js checks every `uses` against its own manifest: the sounds ride along (unchanged ones are skipped).
await writeFile(resolve(here, 'release.parts.json'), JSON.stringify([...sounds, {
  id: 'heartland-night-audit', type: 'game', file: '../artifacts/night-audit/night-audit.html',
  title: 'Night Audit · locked out at the Heartland Inn',
  description: 'First-person horror at the Heartland Inn. 3:13 AM, room 212: three slow knocks. Through the peephole a shape stands across the hall that the light doesn\'t land on; look again and it is against the lens. Step out and the door locks behind you, your key card blinks red, the elevator never comes. Stair A goes dark and keeps going down, onto floors the building doesn\'t have: remixes of its own corridors generated from a seed every night (doors numbered wrong, then every door 212, then the lobby\'s carpet and numbers counting down past 100; beds, ice machines and the breakfast bar leaked into dead ends). The only guide is the lobby\'s music, heard by walking distance and arriving round corners, muffled by every wall. TVs in the halls play public-domain films and newsreels louder than the music when you\'re near them; turn them off to hear the way. Find Dana at the front desk. A revision of Night Audit (the ringing-phone WFC hotel) as a scene on the hotel\'s stage: ?scenes=checkin,audit checks in first, ?seed= shares a night. Desktop and touch.',
  tags: ['horror', 'liminal', 'hotel', 'first-person', 'procedural', 'seeded', 'maze', 'spatial-audio', 'scenes', 'minigame', 'remix', 'mobile'],
  author: 'the internet slop warehouse', license: 'CC0-1.0 AND MIT',
  made: { method: 'hand', ai: 'code', tool: 'Claude Code' },
  parent: { id: 'night-audit' },
  uses: [...parts, ...SOUNDS.map(s => s.id)].sort(),
}], null, 2) + '\n');
console.log(`Packaged ${html.length} characters; loads ${parts.join(', ')}; ${SOUNDS.length} sounds.`);
