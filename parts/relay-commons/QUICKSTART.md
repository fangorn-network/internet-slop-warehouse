# Relay Commons: exploration, shared supplies and a home

Original CC0 modules and model library for a calm real-street RPG prototype.
They compose the already-published relay-skirmish, resource-inventory, health,
ability-clock, OSM district and P2P session parts. Map data remains ODbL.

- settlement-models: eleven original meter-scale 3D models, plus the named GLB
  library. Load the GLB with GLTFLoader and index scene.children by name; do not
  render the entire library at once. Its children intentionally share the origin.
- semantic-architecture: infer facade profiles from OSM building/amenity/shop
  tags. Adds shop windows/signs/awnings, café tables, home porches, apartment
  balconies, civic columns/steps, school entries, medical bays and loading docks.
  Supplies benches/planters/cache prototypes from the published model library.
  These are fictional designs, not real facades, interiors or permissions.
- settlement-rules: renderer-free discoveries, XP/rank, fictional supply drops,
  shared atomic resources, dry-land placement, street/footprint/water exclusion,
  reclaim refunds and five camp milestones. 64 structure limit. Data and hooks
  can be remixed for alternate economies, building permissions or stories.
- relay-homestead: composes exploration and camp rules with the existing ranged
  combat engine. No bot, timed match or score victory. Combat is off by default;
  opt-in sparring expeditions retain host-authoritative 160m pulse weapons,
  armor and cover. A drawn weapon in a peaceful expedition cannot harm peers.
- settlement-view: shared construction, fictional supply drops, a camp guide,
  and a green/red placement preview from the published GLB assets.

Explore marked locations, collect wood/stone/cloth from fictional supply drops,
then walk onto dry open space. Build a shelter, hearth and workbench; expand
with walls, storage, bedrolls, lights and planters. Buildings must stay clear of
mapped streets and footprints. A hearth enables rest and return-to-camp travel. Build a workbench to craft
field gear while standing nearby.
There is no timer. Shared camp progress supports up to four peers. Host must
stay active; public relay connectivity varies; no host migration. Save codes
preserve the exact mapped district and shared camp; storage permission is not
required. Export before leaving or switching location. No persistence service.

Models: shelter (5m square), wall (3m wide), workbench, hearth, stash, lantern,
bedroll, planter, bench, café table and supply-cache. Editable geometry source
is settlement-models, rebuild with scripts/make-settlement-models.mjs. Y up,
meters, ground origin. Collision and costs live in settlement-rules, separately
from art. Placement defaults to a 3m grid, 5m ahead, quarter-turn rotations.

Sparse vector tiles omit many building-use tags. Where no mapped category exists,
visual home/apartment/workshop fallbacks use footprint area and height. They are
explicitly inferred scenery and are not factual building classifications.

### Desktop camera input

Hold the right mouse button and drag the world to look. The `fps-controls` module cancels canvas context menus and native selection during a camera drag; menus and text fields retain normal editing behavior. Blur, cancellation and lost pointer capture clear drag input. Validate with `PLAYWRIGHT_MODULE=/tmp/warehouse-validation/node_modules/playwright-core/index.mjs node scripts/test-fps-controls-browser.mjs`.
