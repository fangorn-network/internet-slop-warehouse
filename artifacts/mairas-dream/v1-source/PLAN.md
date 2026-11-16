# Maira’s Dream — Second Chances

First playable slice, 2026-11-15. Source brief: ../../game-ideas/mairas-dream-1/index.md. Reference images guide layout and silhouettes only; no source-photo pixels are distributed.

## Direction

Bright, ordinary thrift store first. Muted sage, cream, mismatched merchandise, suspended section signs, fluorescent panels and roomy concrete/tile aisles. Smooth low-poly geometry, not a dark horror corridor. Manager is a dark gray sad clown in a faded costume. Four black cats carry visibly lit matches. Fictional shop name: Second Chances.

One continuous first-person store/parking-lot world. Three random errands, all purchasable within $30. Inspect a real world object, read its price and description, add it to a bag, return it, pay a staffed register, keep a receipt, cross motion-sensor sliding doors and reach the car. Tag switching is an optional bad idea with price-check rejection and manager pursuit. Shopping has no countdown. Escape starts after completing the errand and leaving.

## Warehouse discovery before implementation

Searches: “thrift store supermarket shop shelves clothing racks cash register furniture low poly” and “first person interaction inventory pickup inspect shopping cashier stealth patrol fire extinguisher automatic door”.

Publisher for the reusable results: 0x7b16387c5a8c514880e48bcacd52782fcf9da936, repo internet-slop-warehouse.

| Part | Decision |
| --- | --- |
| fps-controls | Reuse source unchanged: WASD, drag, touch, blur clearing. Published src bafkreifdkkwxdfthnenma3vyoypfvyr6zj5igr3ltzlycmg2wx2h3gtieu. |
| proximity-interaction | Reuse source unchanged with world occlusion and aim eligibility hooks. Published src bafkreidpsbbv4melntnd2utbunkzcigm2ilaqwgmtp5p7kycz3koh7on6e. |
| perception-brain / patrol | Useful later; slice uses a small local manager patrol/pursuit tied to shopping suspicion. |
| trail-walker | Considered; rectangular fixtures need box collision, so this slice uses bounded axis sliding. |
| Mercy, Moving | Examined local project structure, packaging and QA patterns. No game code/world remixed. |
| ph-shelf-01 | CC0 Gabriel Radić; 182 polygons. Viable future unique furniture. |
| ph-vintage-suitcase | CC0 Maximilian Schuster. Candidate rare purchase. |
| ph-woodentable-01 / ph-plastic-monobloc-chair-01 | CC0 Ethan Place / Kuutti Siitonen. Candidate furniture variations. |
| ph-crowbar-01 | CC0 Alexander Otterbeck. Candidate hardware objective. |

Existing realistic PBR props were not imported in the first slice: an original coherent texture-free kit better matches the requested cat style and makes stocking cheap. No external asset download was necessary. The newly generated kit is published independently before the game.

## Asset inventory

`assets/thrift-kit.glb`: 20 original, meter-scale, Y-up, ground-origin named prototypes. Children overlap intentionally. `prop-kit.js` is the editable generator, `export-assets.mjs` regenerates the GLB.

Shelf, straight rack, round rack, shirt, trousers, lamp, mug, plate, hammer, hanger, radio, book, sofa, register, extinguisher, cat/match, cashier, shopper, manager and car. Color variants use a restrained six-color palette. The game instantiates source generators; the GLB is a reusable export of the same assets.

Published foundation manifest and verified on-chain receipts: `foundation.parts.json`, `foundation.parts.receipts.json`. Public network: Base Sepolia. Original code and geometry: CC0-1.0. Three.js retains MIT.

## Store layout

30 × 26 m floor. Front registers and automatic sliding entrance at z=13; car at z=46. Six clothing fixtures: men’s tops/bottoms, women’s tops/bottoms, children, socks/basics. Shared shoe wall. Rear books/media and furniture; east housewares, hardware, electronics, lamps. Visible department signs. Wide center path; shelf and rack collisions. Static geometry batches by shared material; dynamic and interactive roots remain separate. Rear emergency door, front/rear extinguishers. No locking an emergency exit to enforce objectives.

## Slice versus follow-up work

Implemented: nine named purchasable items and dense noninteractive display stock; integer-cent budget; three randomized objectives; examine/take/return; bag and receipt; staffed checkout; tag swapping with rejection; suspicious manager patrol/chase; customer figures; automatic doors; four cats; fire patches; aim-based extinguisher; car timer; health; win/loss/retry; desktop/touch controls; pause on blur.

Next passes: rummage/separate hangers by hand; expand casual/formal and sleeve-length subsections; individually purchasable display stock; customer browsing/checkout queues; animated cashier scanning and bagging; richer item inspection/rotation; checkout theft choices beyond the current exit alarm; route-aware manager navigation and office escort; persistent consequences within a run; better cat limb animation, fire propagation/smoke/sound and car ignition presentation; art/performance pass after playtesting. Current fire spread and extinction are game rules, not a physical fire model. The office ending is a result card rather than a modeled escort scene.

## Validation

`node --test projects/mairas-dream/rules.test.mjs`
`node projects/mairas-dream/check-browser.mjs` (installed Chrome / playwright-core path documented in script)
`node projects/mairas-dream/package.mjs`

Browser receipts/screenshots: `../../artifacts/mairas-dream/`. QA movement helpers are available only with `?qa=1`; production controls/actions remain the normal keyboard, touch and UI handlers.
