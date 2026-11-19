// Package Escape from Night Audit: write the release manifest (the game page is game.html as is).
//   node projects/escape-from-night-audit/package.mjs
//   node publish-batch.js projects/escape-from-night-audit/release.parts.json --local /tmp/efna    # preview
//   node publish-batch.js projects/escape-from-night-audit/release.parts.json --network baseSepolia
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const here = import.meta.dirname, repo = resolve(here, '../..');
const SLOPOV = '0xa6bdff4d59d418de726153b53a5bed69dad760b6', US = '0x7b16387C5A8c514880E48bcacd52782FCF9Da936';
const html = await readFile(resolve(here, 'game.html'), 'utf8');
const pinned = Object.keys(JSON.parse(/const PARTS = (\{.*?\});/.exec(html)[1]));
const catalog = new Set(['parts.json', 'lite.parts.json'].flatMap((f) => JSON.parse(readFileSync(resolve(repo, 'parts', f), 'utf8'))).map((p) => p.id));
// Night Audit's furniture and surfaces are filled in by publish-batch; pinned parts are ours (catalog or procgen batch) or Slopov's.
const nightAudit = JSON.parse(await readFile(resolve(repo, 'parts/procgen.parts.json'), 'utf8')).find((p) => p.id === 'night-audit').uses;
const procgen = new Set(['worldgen', 'hotel-wfc', 'socket-mesher']);
const credit = (id) => catalog.has(id) ? id : procgen.has(id) ? `${US}/${id}` : `${SLOPOV}/${id}`;
const uses = [...new Set([...pinned.map(credit), ...nightAudit.map(credit), 'p2p-room', 'trystero-027'])];

const game = {
  id: 'escape-from-night-audit', type: 'game', file: '../projects/escape-from-night-audit/game.html',
  title: 'Escape from Night Audit',
  description: 'Escape from Slopov II remixed into Night Audit: an extraction shooter in a hotel that wave function collapse rebuilds every night. Gear up from your stash and the trader, check in at the lobby, search nightstands, credenzas, vending machines and housekeeping carts, and fight other auditors, guests who never checked out and the management guarding the front desk line. The only way out is the ringing phone in the farthest room: follow the ring by walking distance, then hold the line for seven seconds. Co-op for up to four, peer to peer: host, copy the invite code, and friends paste it to raid the same hotel. Die and you lose what you brought. Escape from Slopov save codes still load. ?seed= replays the same run of nights.',
  tags: ['extraction-shooter', 'fps', 'procedural', 'wfc', 'hotel', 'horror', 'zombies', 'looting', 'three.js', 'remix'],
  author: 'the internet slop warehouse', license: 'CC0-1.0',
  made: { method: 'hand', ai: 'code', tool: 'Claude Code' },
  parent: { id: 'escape-from-slopov-ii' },
  uses,
};
await writeFile(resolve(here, 'release.parts.json'), JSON.stringify([game], null, 2) + '\n');
console.log(`Game credits ${uses.length} parts and its parent escape-from-slopov-ii.`);
