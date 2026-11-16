# Stillwater Field Station

A small solo first-person exploration playground and reusable world-building starter.
There is no required quest or ending. Toggle the generator, tune the radio, toss
stones at three differently pitched bells and wander the supply trails. Optional
finds fill a field bag. There is no combat, timer, networking or persistence.

## Composition

- `world.json`: deterministic seed, bounds, spawn, trails, sites and relay frequency.
- `world-prop-kit`: load pinned GLBs, normalize their ground pivot/height, place
  clones and scatter instanced props. Includes explicit circular collision data.
  Use `register(id, prototype)` for caller-generated geometry. Props are static;
  skinned/animated instancing is outside this module's contract.
- `trail-walker`: terrain following and disk collisions; inject the published
  `fps-controls` handle, height sampler, bounds and obstacles. Exported `moveDisk`
  substeps large moves to avoid tunneling. Static circle obstacles, no jumping,
  stairs or general mesh physics. Camera always remains on the sampled terrain.
- `trail-playground`: bounded ballistic stone tossing, terrain bounces, target hits
  and callbacks for bell animation and sound.
- `signal-trail`: renderer-free supply collection, power prerequisites, radio
  tuning, proximity rechecks and victory for optional objective-driven remixes.
  The playground uses `openPlay: true` to remove prerequisites and endings. Hooks expose events for UI/audio.
- `woodland-sound`: gesture-started generated wind, birds, steps and spatial
  generator hum; no audio recordings. Sound is off until enabled.
- Existing warehouse parts supply camera controls, textured branching pine
  geometry, the mossy rocks, ground albedo, wood texture, table, crate and lamp.

The renderer uses Three.js 0.170.0, ACES tone mapping, the Misty Pines HDRI for
image-based lighting, a shadowed directional sun, normal/roughness ground maps,
instanced vegetation, terrain-conforming paths and light pollen. Seeded geometry
and placement stay deterministic. Authored GLB axes are preserved and wrappers
normalize size in meters. Shared resources are disposed with the game.

## Asset pack

Five new source models: fern_02, tree_stump_01, dead_tree_trunk,
portable_generator, vintage_radio_transceiver. Each is a self-contained GLB
with 1K maps, original geometry and PBR materials. New lighting/maps: misty_pines
1K Radiance HDR, forrest_ground_01 OpenGL normal and roughness JPEGs.

All eight source assets are CC0 from Poly Haven, https://polyhaven.com/license.
Model artist names, upstream URLs, file sizes, MD5 verification and SHA-256
fingerprints are retained in `ingestion/polyhaven/batches/field-station/`.
An additional original CC0 green pine spray texture is generated with
`scripts/make-field-pine.mjs`. No Sketchfab files were imported. Tree geometry, gameplay, world layout and all
new code are original CC0; Three.js retains its MIT license. CDN dependencies
remain online dependencies, not offline-bundled assets.

## Rebuild, preview and validate

```
node ingestion/polyhaven/ingest.js --batch field-station
node ingestion/polyhaven/batches/field-station/lighting.mjs
node publish-batch.js parts/field-station-game.parts.json --local /tmp/stillwater-preview
npx vitest run parts/field-station.test.js ingestion/polyhaven/packing.test.js
PLAYWRIGHT_MODULE=/tmp/warehouse-validation/node_modules/playwright-core/index.mjs node scripts/test-stillwater-browser.mjs
```

Publish `parts/field-station-foundation.parts.json` first. Its on-chain receipts
must exist before publishing `parts/field-station-game.parts.json`, which pins
all dependencies. `parts/parts.json` is the shared inventory used by local
previews and publication. No new Worker endpoints are necessary.

Desktop: WASD/arrows, Shift, right-drag to look, E to interact, Space to toss a stone, J for notes,
Escape to pause. Touch: left movement pad, drag the world to look, nearby-object
button. The inherited controls prevent native right-click menus on the world.

The radio carrier becomes audible when Sound is on. Generator hum is spatial;
each bell has a distinct synthesized pitch. These toys have no mandatory order.

Hardware WebGL keeps the original PBR materials. Touch screens use fewer
scattered props and skip dynamic shadows. Software WebGL additionally lowers
render resolution and uses simpler diffuse lighting, preserving source color
maps; the source GLBs remain unchanged and fully PBR for other worlds.
