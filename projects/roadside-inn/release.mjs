// SPDX-License-Identifier: CC0-1.0
// Packaging shared by every game set in the Heartland Inn (Heartland Inn, Late Checkout, Escape from Slopov II).
// The hotel itself ships once, as the heartland-hotel logic part; a game's page carries only its own code and loads
// the hotel (and zone-culling) as parts at runtime, so its credits and its dark matter say what it really is.
import { build } from 'rolldown';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { external, bundledCredits } from './imports.mjs';

const here = import.meta.dirname, repo = resolve(here, '../..');

/** Every published part's pin and publisher, from the publish receipts in the repo. */
export async function receipts() {
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
  return { pins, publishers };
}

// Source modules a game imports that are published parts: file → [part id, { name it imports: name the part exports }].
const inn = (f) => resolve(here, f);
export const PART_MODULES = {
  [inn('input.js')]: ['heartland-hotel', { attach: 'attachInput' }],
  [inn('assets.js')]: ['heartland-hotel', { loadLibrary: 'loadLibrary', PART_IDS: 'PART_IDS' }],
  [inn('world.js')]: ['heartland-hotel', { buildWorld: 'buildWorld', FLOOR2: 'FLOOR2' }],
  [inn('sound.js')]: ['heartland-hotel', { createSound: 'createSound' }],
  [inn('quality.js')]: ['heartland-hotel', { quality: 'quality' }],
  [inn('player.js')]: ['heartland-hotel', { createPlayer: 'createPlayer', RADIUS: 'RADIUS', EYE: 'EYE' }],
  [resolve(repo, 'parts/zone-culling.js')]: ['zone-culling', { attach: 'attach' }],
};
// One shared loader: a logic part's stored JSON holds its module as { js }; import it once, from the page's pins.
const LOADER = `const __part = globalThis.__warehousePart ??= ((c) => (id) => c[id] ??= fetch(globalThis.WAREHOUSE_PARTS[id]).then((r) => r.json()).then((j) => import('data:text/javascript;charset=utf-8,' + encodeURIComponent(j.js))))({});\n`;
const asParts = {
  name: 'as-parts',
  resolveId(source, importer) {
    if (!importer || !source.startsWith('.')) return null;
    const p = resolve(dirname(importer), source);
    return PART_MODULES[p] ? `\0part:${p}` : null;
  },
  load(id) {
    if (!id.startsWith('\0part:')) return null;
    const [part, names] = PART_MODULES[id.slice(6)];
    return LOADER + `const m = await __part(${JSON.stringify(part)});\n` + Object.entries(names).map(([as, from]) => `export const ${as} = m.${from};`).join('\n');
  },
};

/** A game's own code, with the hotel and other parts left as runtime loads → { js, parts: ids it loads } */
export async function buildGame(input) {
  const loaded = new Set();
  const spy = { name: 'spy', load(id) { if (id.startsWith('\0part:')) loaded.add(PART_MODULES[id.slice(6)][0]); return null; } };
  const out = await build({ write: false, input, external, plugins: [spy, asParts], output: { format: 'esm', codeSplitting: false, minify: true } });
  return { js: out.output.find((x) => x.type === 'chunk').code, parts: [...loaded].sort() };
}

/** The heartland-hotel part: the engine bundled, every asset pinned → { js, entry (its release manifest entry) } */
export async function buildHotelPart() {
  const { PART_IDS } = await import('./assets.js');
  const { pins, publishers } = await receipts();
  const missing = PART_IDS.filter((i) => !pins[i]);
  if (missing.length) throw Error(`Hotel parts not published yet: ${missing.join(', ')}`);
  const out = await build({ write: false, input: inn('hotel-part.js'), external, output: { format: 'esm', codeSplitting: false, minify: true } });
  const notices = await readFile(inn('licenses/rocketbox-NOTICE.md'), 'utf8');
  const js = `/* Heartland Inn Express: CC0-1.0 (projects/roadside-inn). Three.js MIT. Rapier Apache-2.0. Character models loaded by this part:\n${notices.replaceAll('*/', '* /')}\n*/\n`
    + `globalThis.__HOTEL_PINS__ = ${JSON.stringify(Object.fromEntries(PART_IDS.map((i) => [i, pins[i]])))};\n` + out.output.find((x) => x.type === 'chunk').code;
  const entry = {
    id: 'heartland-hotel', type: 'logic', kind: 'effect', file: '../artifacts/roadside-inn/heartland-hotel.js',
    title: 'Heartland Inn Express (building and engine)',
    description: 'The two-storey interstate hotel from Heartland Inn Express, shared by every game set in it. attach(parent) drops the building into any three.js scene: lobby, front desk, pantry, lounge, pool wing, gym, elevator, switchback stair, corridors and room 212, with colliders, walkable floors, doors, the elevator and interactions. Games that are the hotel use its engine instead: loadLibrary (every asset, pinned, lite models for phones), buildWorld (also the parking lot, interstate and travel stop, plus zones and what each zone sees, for zone-culling), createPlayer (a physics first-person player on physics-world), createSound, attachInput (keyboard, mouse and touch) and quality (a battery-conscious phone profile). Heartland Inn, Late Checkout and Escape from Slopov II load it rather than bundling the hotel.',
    tags: ['hotel', 'building', 'level', 'interior', 'engine', 'first-person', 'realistic', 'three.js', 'effect', 'cc0'],
    author: 'the internet slop warehouse', license: 'CC0-1.0 AND MIT',
    exports: [
      { name: 'attach', signature: 'attach(parent, opts) → Promise<{ colliders, surfaces, interact, lightAnchors, zones, sees, elevator, room, setTimeOfDay, update(dt, player), dispose() }>', does: 'Load the pinned assets and build the hotel into parent' },
      { name: 'loadLibrary', signature: 'loadLibrary(onProgress, { skies, people, stream }) → Promise<lib>', does: 'Load the hotel’s models, surfaces, skies and people' },
      { name: 'buildWorld', signature: 'buildWorld(scene, lib, game, { outside, people, station }) → world', does: 'Build the hotel and its surroundings; world.zones and world.sees feed zone-culling' },
      { name: 'createPlayer', signature: 'createPlayer(scene, world, { sound }) → Promise<{ player, physics, move(dt, controls, camera), use(), zone() }>', does: 'The first-person player: physics when Rapier loads, a walker otherwise' },
      { name: 'createSound', signature: 'createSound(foley) → sound', does: 'Footsteps, ambience and effects' },
      { name: 'attachInput', signature: 'attachInput(canvas, { onUse, onInspect, onMenu }) → controls', does: 'Keyboard, mouse look and touch controls' },
      { name: 'quality', signature: '{ economy, fps, pixelRatio, lights }', does: 'The phone profile: 30 fps, pixel ratio 1, four lights' },
      { name: 'PART_IDS', signature: 'string[]', does: 'Every warehouse part the hotel loads' },
      { name: 'FLOOR2', signature: 'number', does: 'Height of the second floor (3.2 m)' },
      { name: 'EYE', signature: 'number', does: 'Eye height, metres' },
      { name: 'RADIUS', signature: 'number', does: 'Player radius, metres' },
    ],
    options: [
      { name: 'outside', type: 'boolean', default: false, does: 'attach: also build the parking lot, roads, interstate and scenery' },
      { name: 'people', type: 'boolean', default: false, does: 'attach: also add the desk clerk, housekeeper and guests' },
      { name: 'parts', type: 'object', default: '{}', does: 'attach: id → URL overrides for the pinned assets' },
      { name: 'onProgress', type: 'function', default: 'noop', does: 'Loading progress, 0..1' },
    ],
    hooks: [
      { name: 'say', default: 'noop', does: 'Show a line of hotel text (signs, locked doors)' },
      { name: 'has', default: '() => true', does: 'Whether the player holds an item (the key card opens the pool, gym and room 212)' },
    ],
    uses: [...PART_IDS, ...bundledCredits(publishers)].sort(),
  };
  return { js, entry };
}
