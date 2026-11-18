// Package Escape from Slopov II: bundle the Heartland Inn as the heartland-hotel logic part, and write the release manifest.
//   node projects/slopov-ii/package.mjs
//   node publish-batch.js projects/slopov-ii/release.parts.json --local /tmp/slopov-ii    # preview
//   node publish-batch.js projects/slopov-ii/release.parts.json --network baseSepolia     # publish
import { build } from 'rolldown';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const here = import.meta.dirname, repo = resolve(here, '../..'), out = resolve(repo, 'artifacts/slopov-ii');
const PARENT = { publisher: '0xa6bdff4d59d418de726153b53a5bed69dad760b6', id: 'escape-from-slopov' };
await mkdir(out, { recursive: true });

// Pins for the hotel's assets, from every publish receipt in the repo (all ours).
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
const { PART_IDS } = await import('../roadside-inn/assets.js');
const missing = PART_IDS.filter(i => !pins[i]);
if (missing.length) throw Error(`Hotel parts not published yet: ${missing.join(', ')}`);

const built = await build({ write: false, input: resolve(here, 'hotel-part.js'), external: id => id === 'three' || id.startsWith('three/'), output: { format: 'esm', codeSplitting: false, minify: true } });
let js = built.output.find(x => x.type === 'chunk').code;
const pinned = JSON.stringify(Object.fromEntries(PART_IDS.map(i => [i, pins[i]])));
const sentinel = /(["'`])__HOTEL_PINS__\1/g;
if ((js.match(sentinel) ?? []).length !== 1) throw Error('expected one __HOTEL_PINS__ in the bundle');
js = js.replace(sentinel, () => pinned);
const notices = await readFile(resolve(repo, 'projects/roadside-inn/licenses/rocketbox-NOTICE.md'), 'utf8');
await writeFile(resolve(out, 'heartland-hotel.js'), `/* Heartland Inn Express building: CC0-1.0 (projects/roadside-inn). Three.js MIT. Character models loaded by this part:\n${notices.replaceAll('*/', '* /')}\n*/\n` + js);

// Credits: the parent, and every part the game loads (the parent's, pinned at the versions its page loads, plus ours).
const html = await readFile(resolve(here, 'game.html'), 'utf8');
const parentParts = Object.keys(JSON.parse(/const PARTS = (\{.*?\});/.exec(html)[1]));
const catalog = JSON.parse(await readFile(resolve(repo, 'parts/parts.json'), 'utf8'));
const ours = new Set(catalog.map(p => p.id));
const uses = [...parentParts.map(id => ours.has(id) ? id : `${PARENT.publisher}/${id}`), 'heartland-hotel', 'trystero-027'];

const hotelPart = {
  id: 'heartland-hotel', type: 'logic', kind: 'effect', file: '../artifacts/slopov-ii/heartland-hotel.js',
  title: 'Heartland Inn Express building',
  description: 'The two-storey interstate hotel from Heartland Inn Express as a drop-in for any three.js scene: lobby, front desk, pantry, lounge, pool wing, gym, elevator, switchback stair, corridors and room 212, with working doors, lights, TVs and its pinned Poly Haven, Grab3D and original Blender furniture. Returns box colliders, walkable surfaces, light anchors and interactions in the hotel plan (x -24..30, z -9..9, front +z, floor 2 at y 3.2). Optional parking lot and highway, optional staff and guests.',
  tags: ['hotel', 'building', 'level', 'interior', 'realistic', 'three.js', 'map', 'effect', 'cc0'],
  author: 'the internet slop warehouse', license: 'CC0-1.0 AND MIT',
  exports: [
    { name: 'attach', signature: 'attach(parent, opts) → Promise<{ colliders, surfaces, interact, lightAnchors, zones, elevator, room, setTimeOfDay, update(dt, player), dispose() }>', does: 'Load the pinned assets and build the hotel into parent; player is { x, y, z, pos } in hotel coordinates' },
    { name: 'PART_IDS', signature: 'string[]', does: 'Every warehouse part the hotel loads' },
    { name: 'FLOOR2', signature: 'number', does: 'Height of the second floor (3.2 m)' },
  ],
  options: [
    { name: 'outside', type: 'boolean', default: false, does: 'Also build the parking lot, roads, interstate and scenery' },
    { name: 'people', type: 'boolean', default: false, does: 'Also add the desk clerk, housekeeper and guests' },
    { name: 'parts', type: 'object', default: '{}', does: 'id → URL overrides for the pinned assets' },
    { name: 'onProgress', type: 'function', default: 'noop', does: 'Loading progress, 0..1' },
  ],
  hooks: [
    { name: 'say', default: 'noop', does: 'Show a line of hotel text (signs, locked doors)' },
    { name: 'has', default: '() => true', does: 'Whether the player holds an item (the key card opens the pool, gym and room 212)' },
  ],
  uses: [...PART_IDS].sort(),
};
const game = {
  id: 'escape-from-slopov-ii', type: 'game', file: '../projects/slopov-ii/game.html',
  title: 'Escape from Slopov II',
  description: 'A co-op remix of Escape from Slopov: up to four players raid the abandoned town together, peer to peer. Host a raid and share a link or QR code. The town now reaches south to the Heartland Inn Express, a full hotel ground floor with its own loot, zombies and a faction squad. The host runs the AI; everyone keeps their own stash and loots their own copy of every container and body. Save codes from Escape from Slopov still load.',
  tags: ['extraction-shooter', 'fps', 'co-op', 'p2p', 'multiplayer', 'zombies', 'looting', 'hotel', 'three.js', 'remix', 'qr-code'],
  author: 'the internet slop warehouse', license: 'CC0-1.0',
  parent: PARENT,
  uses,
};
await writeFile(resolve(here, 'release.parts.json'), JSON.stringify([hotelPart, game], null, 2) + '\n');
console.log(`heartland-hotel: ${js.length} characters, ${PART_IDS.length} assets pinned. Game credits ${uses.length} parts and its parent ${PARENT.publisher}/${PARENT.id}.`);
