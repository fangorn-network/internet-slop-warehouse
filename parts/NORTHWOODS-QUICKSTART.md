# Northwoods kit · CC0

**Where the Pines Keep Winter** is a solo first-person winter walk inspired by
northern Wisconsin: pines, bare maples, snow, glacial stones and a quiet trail.
The species are procedural botanical approximations, not scanned trees or a
survey of a real Wisconsin location.

## Run and remix

From the warehouse checkout:

```sh
node scripts/make-northwoods-textures.mjs
node scripts/make-northwoods-assets.mjs
node publish-batch.js parts/northwoods.parts.json --local /tmp/northwoods-preview
python3 -m http.server 8080 --directory /tmp/northwoods-preview
```

Open `/northwoods.html`. The preview needs Three.js from jsDelivr; the game loads
its catalog modules from the prepared local directory. WASD/arrows walk, mouse
drag looks, Shift hurries, Escape rests. Touch buttons move; the right circle
looks. Audio starts with the Enter button. Another forest changes the seed;
enter a specific seed to revisit or share the same forest. No local storage,
cookies or pointer lock are required.

The game loads five modules through its `PARTS` map. The batch publisher replaces
that map with pinned IPFS URLs and records `uses`. Logic files are JSON `{js}`
wrappers; import their `js` through a data URL. Bare `three` imports use the
import map. The game uses the catalog's existing CC0 Poly Haven snow texture;
if it cannot load, the vertex-colored snow terrain remains playable.

## Compose a different world

```js
const layout = layoutModule.generate({
  seed: 1848, size: 256, cellSize: 16, density: .55,
  terrain: (x,z,seed) => layoutModule.heightAt(x,z,seed),
  path: (z,seed) => layoutModule.trailX(z,seed),
  place(tree) { /* mutate tree transform, or return false to reject */ }
});
const forest = worldModule.attach(scene, {
  layout, trees: treesModule, snowTexture: pinnedSnowURL,
  treeFactory: opts => treesModule.makeTree({...opts, snow: .9})
});
const walker = walkerModule.attach(camera, {
  element: canvas, heightAt: layout.heightAt, bounds: layout.size/2,
  obstacles: layout.trees.map(t => ({x:t.x,z:t.z,radius:.22*t.scale})),
  canMove: () => playing,
  onStep: e => { forest.footprint(e.x,e.z,e.yaw,e.side); audio.step(e); }
});
// Each frame:
walker.update(dt);
forest.update(dt, camera.position);
// On teardown: walker.dispose(); forest.dispose(); audio.dispose();
```

`northwoods-trees` also works alone. `makeTree({species:'maple',seed:5,height:12})`
returns a Group rooted at zero, meters, Y up, with independently editable meshes. Optional needleTexture and barkTexture inputs
add the published original CC0 textures; the pine atlas includes baked snow coverage.
The stand-alone GLBs are generated from exactly this source, seed 50; they have
no external texture dependencies. Change forks, needle sprays, branch whorls,
snow coverage or color in the source. Instance the meshes for large groves.

`northwoods-world` restores scene fog/background and disposes its geometry,
materials, texture, shadow resources and instances. The caller owns the scene,
renderer, camera and animation loop. It assumes ownership of meshes returned
by `treeFactory`; return fresh resources rather than shared external assets.

## How the constraint generation works

`collapse({width,height,seed,tiles,fixed,maxRestarts})` is renderer independent.
Each tile has `{id,weight,neighbors}`. Adjacent tiles must mutually accept one
another. The solver chooses the cell with minimum weighted Shannon entropy,
selects a tile by weight, and propagates reductions through a queue. A
contradiction restarts with a deterministic derived seed, up to the configured
budget, then throws. This is simple WFC with restarts, not a full backtracking
solver. It works for arbitrary tile IDs; `generate()` recognizes `pine`,
`mixed`, `maple`, `glade` for species/density interpretation.

```js
const grid = collapse({
  width: 16, height: 16, seed: 7,
  tiles: [
    {id:'trees',weight:5,neighbors:['trees','edge']},
    {id:'edge',weight:2,neighbors:['trees','edge','clearing']},
    {id:'clearing',weight:1,neighbors:['edge','clearing']}
  ],
  fixed: [{x:8,z:8,id:'clearing'}]
});
```

The walking trail is carved as a continuous analytic curve after ecology
collapse. It does not rely on WFC to discover a connected path. Terrain and
placement use deterministic CPU math; there is no GPU randomness in world data.

## Use in peer-to-peer worlds

This demo is **solo**; it does not establish a network room. The reusable layout
is designed to avoid transmitting thousands of transforms: agree on the pinned
layout module/version, numeric seed, size, cellSize, density, grammar and hook
code, then generate locally. Exchange avatar poses and explicit world edits,
using stable IDs such as `tree:<index>` within that pinned layout. Regenerating
with changed rules changes indices; version your save/network protocol.

A shared seed alone does not synchronize players or edits. Add a transport,
validate inbound poses/edits, decide authority and conflict handling, and send
persistent deltas to late joiners. The existing warehouse `p2p-homestead` is an
example of transport and authoritative state composition. Keep its transport's
MIT notice if reusing it. The original code in this kit is CC0.

For LLM remixes, start with ecology weights and tree source, then change the
terrain/path functions, landmark rules, footprint hook or tree factory. The renderer switches between full branches within 36 meters and simplified
branches farther away, and omits trees beyond 150 meters. Add
chunk streaming for much larger worlds; this renderer currently builds one
bounded square. Physics covers trunk circles and one erratic; decorative rocks
are pass-through. Footprints use a rolling 600-mark buffer and are local.

## Validation and licenses

```sh
npx vitest run parts/northwoods.test.js
node scripts/test-northwoods-browser.mjs
```

The browser check expects the prepared `/tmp/northwoods-preview`, Chrome and
`playwright-core` (set `PLAYWRIGHT_MODULE` to its entry path). It uses a local
Three.js copy for repeatable testing. Results and screenshots:
`artifacts/northwoods/`.

All original kit source and generated GLBs: **CC0-1.0**.
Snow diffuse: Poly Haven `snow_02`, **CC0-1.0**, via existing catalog asset
`snow-texture`. Three.js is a separate MIT dependency, pinned to 0.170.0.
No AI-generated media, copied recordings or external tree models are included.
The original pine needle atlas and bark texture are synthesized by the included
Node script and embedded into both stand-alone GLBs where applicable.

The catalog also publishes `northwoods-remix-kit`, a portable ZIP with original
source, textures, models, rebuild scripts and a prepared index.html. Its README
contains the standalone commands (no warehouse checkout required).
