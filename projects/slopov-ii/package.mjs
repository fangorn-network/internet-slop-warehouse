// Package Escape from Slopov II: write the release manifest (the game page is game.html as is).
//   node projects/slopov-ii/package.mjs
//   node publish-batch.js projects/slopov-ii/release.parts.json --local /tmp/slopov-ii    # preview
//   node publish-batch.js projects/slopov-ii/release.parts.json --network baseSepolia     # publish
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const here = import.meta.dirname, repo = resolve(here, '../..');
const PARENT = { publisher: '0xa6bdff4d59d418de726153b53a5bed69dad760b6', id: 'escape-from-slopov' };

// The hotel is the heartland-hotel part, published with the Heartland Inn (projects/roadside-inn/package.mjs): this
// game loads it at runtime and only credits it.
// Credits: the parent, and every part the game loads (the parent's, pinned at the versions its page loads, plus ours).
const html = await readFile(resolve(here, 'game.html'), 'utf8');
const parentParts = Object.keys(JSON.parse(/const PARTS = (\{.*?\});/.exec(html)[1]));
const catalog = JSON.parse(await readFile(resolve(repo, 'parts/parts.json'), 'utf8'));
const ours = new Set(catalog.map(p => p.id));
const uses = [...parentParts.map(id => ours.has(id) ? id : `${PARENT.publisher}/${id}`), 'heartland-hotel', 'trystero-027'];

const game = {
  id: 'escape-from-slopov-ii', type: 'game', file: '../projects/slopov-ii/game.html',
  title: 'Escape from Slopov II',
  description: 'A co-op remix of Escape from Slopov: up to four players raid the abandoned town together, peer to peer. Host a raid and share a link or QR code. The town now reaches south to the Heartland Inn Express, a full hotel ground floor with its own loot, zombies and a faction squad. The host runs the AI; everyone keeps their own stash and loots their own copy of every container and body. Save codes from Escape from Slopov still load.',
  tags: ['extraction-shooter', 'fps', 'co-op', 'p2p', 'multiplayer', 'zombies', 'looting', 'hotel', 'three.js', 'remix', 'qr-code'],
  author: 'the internet slop warehouse', license: 'CC0-1.0',
  parent: PARENT,
  uses,
};
await writeFile(resolve(here, 'release.parts.json'), JSON.stringify([game], null, 2) + '\n');
console.log(`Game credits ${uses.length} parts (heartland-hotel among them) and its parent ${PARENT.publisher}/${PARENT.id}.`);
