// SPDX-License-Identifier: CC0-1.0
// heartland-hotel: the Heartland Inn Express as one warehouse logic part, shared by every game set in it (Heartland
// Inn, Late Checkout, Escape from Slopov II). Games load it instead of bundling the hotel, so a game's page holds only
// its own code. Bundled by projects/roadside-inn/package.mjs, with every asset pinned.
//
// Two ways in:
// - attach(parent, opts): drop the building into any three.js scene (Slopov II).
// - the engine, for games that are the hotel: loadLibrary, buildWorld, createPlayer, createSound, attachInput, quality.
// - the stage, for games told in scenes: createDream (one post pass: dream look, fades, peephole, eyelids),
//   createDirector (named acts with fades), createSoundscape (placed sounds and loops), createReel/pickScenes (scenes spliced into a reel).
import { loadLibrary, PART_IDS, captureEnv } from './assets.js';
import { buildWorld, FLOOR2 } from './world.js';

// package.mjs prepends `globalThis.__HOTEL_PINS__ = { id: url }` to the bundle; a game's own pins win.
globalThis.WAREHOUSE_PARTS = { ...globalThis.__HOTEL_PINS__, ...globalThis.WAREHOUSE_PARTS };
export { PART_IDS, FLOOR2, loadLibrary, buildWorld, captureEnv };
export { attach as attachInput } from './input.js';
export { createSound } from './sound.js';
export { quality } from './quality.js';
export { createPlayer, RADIUS, EYE } from './player.js';
export { createDream } from './stage/dream.js';
export { createDirector } from './stage/director.js';
export { createSoundscape } from './stage/audio.js';
export { createReel, pickScenes } from './stage/scenes.js';

const SOUNDS = new Proxy({}, { get: () => () => {} });

/**
 * Build the hotel into `parent` (a Scene or Group; the plan is x -24..30, z -9..9, front facing +z, floor 2 at y 3.2).
 * Everything comes back in the hotel's own coordinates: move the group after attach() resolves, not before
 * (static walls are merged in world space while it builds).
 */
export async function attach(parent, { outside = false, people = false, parts = {}, onProgress = () => {}, say = () => {}, has = () => true } = {}) {
    globalThis.WAREHOUSE_PARTS = { ...globalThis.WAREHOUSE_PARTS, ...parts };
    const lib = await loadLibrary(onProgress, { skies: false, people });   // the host scene brings its own sky
    const game = { say, has, give() {}, take() {}, event() {}, vend() {}, checkIn() {}, sound: SOUNDS, tvs: [], traffic: [] };
    const world = buildWorld(parent, lib, game, { outside, people });
    world.setTimeOfDay('dusk');
    let t = 0;
    return {
        ...world, lib,
        // player: { x, y, z, pos: Vector3 } in hotel coordinates (doors and the elevator react to it)
        update(dt, player) { t += dt; for (const u of world.updaters) u(dt, t, player); },
        dispose() { parent.clear?.(); },
    };
}
