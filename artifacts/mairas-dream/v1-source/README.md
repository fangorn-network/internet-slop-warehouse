# Maira’s Dream — Second Chances

An initial playable slice of the thrift-store dream in `../../game-ideas/mairas-dream-1/index.md`.

Warehouse player: https://internet-slop-warehouse.quickbeam.workers.dev/?part=0x7b16387c5a8c514880e48bcacd52782fcf9da936/mairas-dream

Publication is verified in `release.parts.receipts.json`; the public index may take a minute to catch up.

Run from repository root:

```sh
node projects/mairas-dream/serve.mjs
```

Open http://localhost:4188. WASD moves, drag looks, Shift runs, E inspects/uses, B opens the bag, F sprays an equipped extinguisher, Escape pauses. Touch uses the on-screen directional pad, right-side drag and action buttons. Finish the shopping list, pay at the left-front register, and reach your car.

```sh
node --test projects/mairas-dream/rules.test.mjs
node projects/mairas-dream/check-browser.mjs
node projects/mairas-dream/export-assets.mjs
node projects/mairas-dream/package.mjs
```

The browser check uses the existing `/tmp/warehouse-validation/node_modules/playwright-core` installation and `/usr/bin/google-chrome`. Packaged game: `../../artifacts/mairas-dream/mairas-dream.html`. Publish via the repository’s standard `publish-batch.js` flow; manifests and verified receipts live here. The source preview uses local Three.js; the portable published game uses pinned Three.js 0.170.0 from jsDelivr. Google Fonts are optional; serif/sans-serif fallbacks work without them. No account or persistence is required to play.

See [PLAN.md](PLAN.md) for scope, warehouse discovery, asset choices, implemented systems and follow-up work. [FIRE-SAFETY.md](FIRE-SAFETY.md) records primary sources and the limits of the fictional layout. Screenshots and browser receipts are under `../../artifacts/mairas-dream/`.

Original game code, generated geometry and documentation: CC0-1.0. Reused `vendor/fps-controls.js` and `vendor/proximity-interaction.js`: CC0-1.0 from the warehouse. Three.js: MIT, https://github.com/mrdoob/three.js/blob/r170/LICENSE. Reference photographs are not redistributed in the game/model assets and are not granted a new license by this project.

Current limitations: nine individually purchasable items, abstract receipt-based bag, stationary browsing customers, simple manager pursuit, result-card office ending, and stylized fire simulation. This is a first slice for playtesting, not the finished game.
