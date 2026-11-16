# Sorted Donations verification

Reference: user-supplied Brodie Lane Goodwill floorplan. The game adapts its parallel fixture banks, perimeter displays and circulation pattern. The reference drawing/branding is not embedded or republished.

- `rules.test.mjs`: seven transaction/campaign tests pass.
- `parking.test.mjs`: two continuity/local-hazard tests pass.
- `stock.test.mjs`: two tests verify deterministic fixture-specific assortments, nonuniform occupancy/gaps, stacked dishes/flat books and bank topology.
- `check-v5.mjs`: A* routes and physical ray selection pass for all nine goals; printed mug inspection, teapot pickup/return and paid checkout pass. 22 shelf modules, 12 clothing fixtures, 1,675 individual items. No page/shader errors. See `browser-qa.json`.
- `check-v5-release.mjs`: packaged phone game in opaque-origin warehouse sandbox; remote asset loading, pickup, inspection, checkout, staged cat ignition and rendering pass with no errors or failed requests. See `release-qa.json`.
- The reused horse figurine's static morph pose is baked into display/inspection clones so instancing and ray selection use the same intended shape. The original source is preserved.

Visual evidence: `entrance.png`, `hardgoods-aisle.png`, `books.png`, `mug-inspection.png`. Native phone/GPU frame rates are not measured; phone checks use Chrome emulation. The revised stock and layout remain stylized and use a limited prop library.

Publication index verified after release: all 62 expected latest game, asset and runtime records match the live 225-record index. See `public-index-qa.json`.
The actual public phone player also passed: Sorted Donations / 1,675 items, list selection, physical touch joystick movement and floor map; zero page errors. See `live-player-qa.json` and live map/player screenshots. The owned local preview server was stopped after validation.
