// SPDX-License-Identifier: CC0-1.0
// Scenes: self-contained pieces of a night at the Heartland, spliced into a reel (checkin → a haunting, checkin → a
// quiet night, a hotel-sim day…). A scene is
//
//   { acts: { name: act },   // director acts (stage/director.js): enter, exit, update, fades
//     start: 'name',         // the act it begins on
//     install(ctx) }         // optional, once at load: build what it needs (hidden), add interactions
//
// and calls ctx.next() when it's done; after the last scene, onEnd() runs. Scenes agree on hand-offs by convention:
// checkin ends with you asleep in bed in 212, so whatever follows starts there.
//
//   const reel = await createReel(ctx, pickScenes(SCENES, 'catherine'), { fx, onEnd });
//   await reel.start();        // director.update(dt) each frame: reel.director
import { createDirector } from './director.js';

/** Scenes named in ?scenes=a,b (or `fallback`), from a { name: scene } map. Unknown names are skipped. */
export function pickScenes(all, fallback, search = globalThis.location?.search ?? '') {
  return (new URLSearchParams(search).get('scenes') ?? fallback).split(',').map(n => all[n.trim()]).filter(Boolean);
}

export async function createReel(ctx, scenes, { fx, onEnd = () => {} }) {
  for (const sc of new Set(scenes)) await sc.install?.(ctx);
  const director = createDirector({ fx, ctx, acts: Object.assign({}, ...scenes.map(sc => sc.acts)) });
  let at = 0;
  ctx.director = director;
  ctx.next = opts => ++at < scenes.length ? director.go(scenes[at].start, opts) : onEnd();
  return { director, scenes, start: opts => director.go(scenes[(at = 0)].start, opts) };
}
