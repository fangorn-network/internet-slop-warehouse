# Maira’s Dream — Second Chances, revision 2

Play: https://internet-slop-warehouse.quickbeam.workers.dev/?part=0x7b16387c5a8c514880e48bcacd52782fcf9da936/mairas-dream

Run locally from repository root:

```sh
node projects/mairas-dream/serve.mjs
```

Open http://localhost:4190. WASD/arrows move; drag or enable Mouse look; E/left click picks up or uses; Q/right click inspects; B opens the basket; C crouches for low shelves; Shift hurries; Escape closes inspection or pauses. The inspector supports drag rotation and scroll zoom. Select an item in the basket to inspect, return, change its price tag or conceal it. Inspection and checkout do not stop the store; explicit pause freezes the game. Touch has movement, look and action controls. Sound can be muted.

Complete an errand, settle the counter with Joan, and reach the car. Each successful visit unlocks the next: budgets shrink, cats increase in number and speed, and the fire equipment moves. Visits 1–2 are affordable; from visit 3, ordinary prices exceed the budget. Unobserved tag switching or theft can complete the errand; witnesses can bring the manager. The tool’s use is deliberately left to discovery in the game.

There are **1,152 separately identified merchandise items**. Every visible merchandise instance can be picked up and inspected; fixtures, vehicles, NPCs and furniture used as environmental set dressing are not basket items. Books have readable original covers. Poly Haven supplies textured shelving, cabinetry, furniture, lighting and selected appliances/housewares. Quaternius supplies animated people. Kenney supplies recorded footsteps and material impacts; NPC murmurs, fluorescent hum, door motor, fire and spray audio are synthesized.

```sh
node projects/mairas-dream/rules.test.mjs
node projects/mairas-dream/check-v2.mjs
node projects/mairas-dream/check-release.mjs
node projects/mairas-dream/package.mjs
```

The browser check uses the existing playwright-core installation under `/tmp/warehouse-validation` and `/usr/bin/google-chrome`. It verifies dense stock pickup/return, 3D inspection, visits 1–3, budget rejection, tag switching, cats, random equipment, pause, a physical walk to the car, manager detection and mobile movement. Artifacts: `../../artifacts/mairas-dream/v2/`.

`package.mjs` creates a portable HTML game and a standalone bundled rules module. Published models/audio load from pinned Fangorn URLs; Three.js 0.170.0 loads from jsDelivr. Fonts are optional. No account, storage or persistence is required. Campaign progress is session-only.

Original code/geometry/covers: CC0-1.0. Poly Haven, Quaternius and Kenney assets: CC0-1.0; evidence and acquisition checksums live under `../../ingestion/polyhaven/batches/mairas-store/` and `../../ingestion/mairas-cc0/`. Three.js remains MIT. Meshoptimizer is an offline MIT tool used to generate index-only display LODs; runtime inspection uses the full original meshes. Source reference photographs are not redistributed.

See [PLAN.md](PLAN.md), [ASSETS.md](ASSETS.md), and [FIRE-SAFETY.md](FIRE-SAFETY.md). Publication manifests and on-chain read-back receipts live beside the source. The original prototype is preserved under `../../artifacts/mairas-dream/v1-source/`.
