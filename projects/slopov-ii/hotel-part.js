// SPDX-License-Identifier: CC0-1.0
// The Heartland Inn Express building as a drop-in logic part: load its pinned assets, build it into any three.js scene.
// Bundled by package.mjs from projects/roadside-inn (world.js, fixtures.js, assets.js, people.js); PINS is filled in there.
import { loadLibrary, PART_IDS } from '../roadside-inn/assets.js';
import { buildWorld, FLOOR2 } from '../roadside-inn/world.js';

const PINS = '__HOTEL_PINS__';   // package.mjs swaps in { id: url } (a string survives minifying)
export { PART_IDS, FLOOR2 };

const SOUNDS = new Proxy({}, { get: () => () => {} });

/**
 * Build the hotel into `parent` (a Scene or Group; the plan is x -24..30, z -9..9, front facing +z, floor 2 at y 3.2).
 * Everything comes back in the hotel's own coordinates: move the group after attach() resolves, not before
 * (static walls are merged in world space while it builds).
 */
export async function attach(parent, { outside = false, people = false, parts = {}, onProgress = () => {}, say = () => {}, has = () => true } = {}) {
    globalThis.WAREHOUSE_PARTS = { ...PINS, ...globalThis.WAREHOUSE_PARTS, ...parts };
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
