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
