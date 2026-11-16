# Maira’s Dream — Second Chances, revision 2

Source brief: `game-ideas/mairas-dream-1/index.md`. Revision responds to playtest feedback: clunky shopping, sparse displays, missing sound, and a need for escalating visits and reused CC0 art.

## Current experience

A bright, ordinary 30 × 26 meter thrift store, twelve textured shelves, six densely packed clothing fixtures, a shared shoe wall, furniture department and staffed front registers. A continuous parking lot leads to the player’s car. Poly Haven scanned/PBR props sit alongside the original low-poly stock. References guide layout and color, not distributed image pixels.

1,152 pieces of visible merchandise have independent stable IDs. E/left click takes an item immediately; Q/right click opens a rotatable, zoomable 3D inspection. A small aim-assist region handles thin wires and hollow handles without selecting through shelving. Items return to their exact original instances. Books have original readable covers. B opens a compact basket with per-item actions. C crouches for low stock. Shift hurries. Inspection, the basket and checkout leave NPC simulation running; explicit pause freezes it.

The cashier takes payment for items on the counter and gives a receipt. Concealed items remain off the counter. Price tags can be changed while inspecting a basket item through a deliberate hold action. Unobserved changes can pass checkout; witnessed tampering or concealment alerts the manager. The manager patrols with directional sight, fixture occlusion and grid-based A* pursuit. Reaching the player ends the run.

## Progression

| Visit | Starting cash | Cats | Shopping pressure |
| --- | --- | --- | --- |
| 1 | $30 | 1 | All errands affordable |
| 2 | $22 | 2 | Affordable, less spare cash |
| 3 | $10 | 3 | Dinner errand costs $16.23; pricing trick or theft required |
| 4+ | Decreases to a $3.50 floor | Increases to 8 | More expensive errands; more tampering/stealth pressure |

Cats get faster each visit, ignite more frequently, and the car has a shorter grace period. A single extinguisher appears at a seeded choice of eight accessible positions each visit. It receives no tutorial, location marker or explanatory prompt. Car/health/charge values are game rules, not physical fire simulation. Campaign progress lives in memory and resets on reload.

## Audio and people

Distance-driven alternating concrete footsteps with pitch variation; material-specific pickup/return Foley; checkout chime and cashier murmur; soft collision impact and NPC grunt; manager warning; fluorescent hum, automatic door motor, cat chirps, nearby fire and spray hiss. Recorded Foley is Kenney CC0. Voices and ambience are synthesized. Sound starts on a user gesture and can be muted. Animated Quaternius civilians idle, walk, react and pursue; browsing routes and pauses give the store movement. A true NPC checkout queue and item scanning/bagging animation remain later work.

## Warehouse reuse and acquisition

Existing warehouse: Shelf 01, worn armchair, wooden table, ceramic vase, boombox, original thrift model kit and grid navigation. The original FPS input contract informed revised game controls. New Poly Haven batch: mounted fluorescent lights, worn wooden bookshelf, desk lamp, enamel pot, vintage kettle, extinguisher and painted cabinet. New Quaternius CC0 civilian/cashier/manager models, and a Kenney six-clip Foley bank.

All acquired models and Foley were published before game integration. The cashier model was subsequently changed from Worker to Casual in the same CC0 women’s pack. Source URLs, creators, archive licenses and checksums are recorded in `ASSETS.md` and ingestion provenance.

## Rendering and structure

- `stock.js`: deterministic fixture/merchandise layout, stable IDs, prices, names and variants.
- `rules.js`: integer-cent transactions, returns, concealment, tag switching, witnesses and increasing visit difficulty; no DOM dependency.
- `assets.js`: bounded concurrent GLB loading, ground-origin scale, skeleton-safe character cloning, full-detail inspection models and reduced display geometry.
- `world.js`: textured store/lot, per-item instancing, physical tags, collision, selection, randomized equipment and navigation grid.
- `input.js`, `inspect.js`, `sound.js`: immediate controls, 3D inspection and recorded/generated audio.
- `main.js`: campaign, UI, manager/shoppers/cats, fire/tool effects and scene updates.

Repeated high-detail assets use precomputed index-only meshoptimizer LODs. Original UVs, normals, positions, rigs and materials remain intact; inspection uses full original geometry. Small stock skips shadow casting; bodies, large props and fixtures retain it. The portable build loads independently published assets at pinned Fangorn URLs. No shelf backdrop is used.

## Remaining work

This is still a prototype. No save/resume, physical hand/grip simulation, cloth physics, full rigidbody drop/throw system, actual checkout queues, lip sync, modeled office escort or physically propagated fire. Some merchandise uses original simple geometry. Difficulty needs hands-on tuning after this revision. The acquisition/rendering path now supports adding more licensed props without rebuilding everything procedurally.

Validation: seven renderer-independent rule tests; desktop source/portable browser checks covering visits 1–3, stock/inspection, affordable and over-budget checkout, successful tag swap, witness/capture, increasing cats, randomized tool location, pause, tool use, walk to car, audio and phone input. Receipts/screenshots: `artifacts/mairas-dream/v2/`.

## Full Shelves revision (v3)

1,300 independent merchandise IDs across 14 shelves, six clothing fixtures and the shoe wall. Imported CC0 books, ceramic coffee/tea cups, porcelain plates, garments, boots, hammer, register, sofa and vehicles replace the corresponding placeholder meshes. Real floor/asphalt/fabric PBR maps and environment lighting improve surface detail.

Clickable shopping-list entries choose an exact target. Gold floor breadcrumbs follow the static navigation grid around fixtures; a close-range outline, object marker and heading/distance bar identify it. An optional floor map shows fixture layout, current route and player direction. Guide toggle: H; map: M. No guide points to the randomized equipment.

A rigged idle cat is visible at the entrance before checkout. Leaving with an unfinished errand explains the missing item/checkout. After obtaining required purchases, the first cat pauses with a match, visibly lights a fire and follows a continuous parking-lot route. Later cats join after staggered delays. The route never wraps positions. Fire uses shared instanced flame/smoke billboards. Car damage requires a nearby active fire; no off-screen timer damages the car.

Validation artifacts are under `artifacts/mairas-dream/v3/`. `parking.test.mjs` exercises continuity and observable ignition plus damage locality. `check-v3.mjs` adds selected-item guidance, map and actual projected cat geometry to the campaign/interaction/touch checks. The public player must report 1,300 items before release is considered complete.

Still a browser prototype: authored people/cars are stylized, source asset coverage is incomplete, fire does not physically propagate, and large downloads/desktop GPU requirements need further streaming work. No claim of AAA production quality or hardware-wide performance validation.

## Little Treasures revision (v4)

Phone HUD: default closed shopping list behind a 44px-tall progress button; selected-item direction strip, with the center of the view kept open. The full shopping list is an explicit, dismissible bottom sheet. Selecting a find closes the sheet and points the guide to it. Mobile movement uses an analog thumbstick with independent multi-touch look. Touch controls disappear during inspection, shopping-list/map browsing and menus. Portrait/landscape layouts use safe-area padding and 44–48px controls. Audio/direction toggles remain in pause settings on phones.

The store now has 1,643 independently collectable items. Home shelves carry twelve finds per tier with porcelain, glazed mugs, sculpture and vintage oil lamps. Two front-window tables carry 24 individual finds. Potted ferns, furniture seating, hardware storage, counter fruit, community prints and exterior details add local character. Shoppers have six distinct route starts, turn toward displays and briefly gesture while browsing.

Phone validation: `check-v4.mjs` checks the closed-list footprint, list selection/dismissal, simultaneous movement/look touches and release, landscape control bounds, map/inspection control visibility, window-display pickup, desktop list and scene rendering. Artifacts: `artifacts/mairas-dream/v4/`.

## Sorted Donations revision (v5)

The supplied Brodie Lane Goodwill floorplan reference (https://mir-s3-cdn-cf.behance.net/project_modules/fs/18c7dd67023737.5b2af2af04149.jpg) informs fixture topology: long parallel banks, grouped clothing rails, perimeter stock and cross-aisles. Its blank legend does not establish department names, and this is an adaptation to the existing fictional shop footprint, rather than a scale reproduction. The reference image and Goodwill branding are not redistributed in the game.

Three double-sided hardgoods banks each join three shelf modules end-to-end. Perimeter media remains at the back left; twelve aligned clothing fixtures occupy the left block. The front entrance/checkout cross-aisle and longitudinal aisles remain open. Free-standing aisle plants are removed: only the two front perimeter corners and rear furniture nook have potted greenery. Display tables sit ahead of the hardgoods banks instead of interrupting their aisles.

Stock generation now uses seeded fixture-specific assortments, varied occupancy, clusters separated by gaps, size/angle variation and caps on repeated appliances/ornaments. China bays include plate stacks and matching tea pieces; books have leaning groups and flat piles; clothing hangs with variable spacing and occasional gaps. A stack's full-detail book thickness determines its vertical spacing at runtime. Rotated item bounds are grounded to the shelf surface. Smaller price stickers face the actual aisle and do not obscure dishes. Every goal has an explicit approach point on its accessible side; guidance uses these for the rotated banks.

Additional authored pieces: Poly Haven teapot with lid, sugar bowl with lid, handled tea cup and square plate, extracted from the already published Tea Set 01; existing warehouse shortwave radio, watering can, horse sculpture and lantern. Original assets and full-detail inspection are retained. Source geometry, procedural repetition and prop coverage still limit realism; this revision addresses layout and merchandising rather than claiming photorealism.

Validation: `stock.test.mjs` covers deterministic assortments, nonuniform gaps and occupancy, distinct fixture pools, book/dish stacks and bank topology. `check-v5.mjs` checks aisle paths and ray selection for all nine goals, inspection, assorted-object pickup/return and checkout. Source artifacts: `artifacts/mairas-dream/v5/`.
