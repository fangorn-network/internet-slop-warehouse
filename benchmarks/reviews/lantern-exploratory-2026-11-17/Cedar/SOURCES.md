# Sources, versions and modifications

## Three.js

- Version: **0.170.0** (supplied identically with the task).
- Local file: `vendor/three.module.min.js`.
- Upstream: https://github.com/mrdoob/three.js/tree/r170
- License: MIT; supplied license retained at `vendor/THREE-LICENSE.txt`.
- SHA-256: `08fd7545d13d2c7fb65ab691530a802dafefd638596501854f267d0fb13c39e7`.
- Modifications: none. The supplied minified module was not read into model context.

## Ability clock

- Local file: `src/ability-clock.mjs`.
- Author: **the internet slop warehouse**.
- License: **CC0-1.0**; original SPDX header retained.
- Source: supplied frozen inventory, captured **2026-11-16T23:13:18.955Z**.
- Publisher: `0x7b16387c5a8c514880e48bcacd52782fcf9da936`.
- Repository: `internet-slop-warehouse`; part ID: `ability-clock`.
- Exact record CID: `bafyreidgcsaecxbc3g2qzivncznsxupq44ecct56mbdvna62osmvdkbtxq`.
- Exact content CID: `bafkreiar5imxyfin6suovhtej2gja4z2nms4e66zdbv46lyxdvbmmckjhu`.
- Source materialized at `inventory/sources/<content CID>` as JSON; its `js` value was extracted verbatim into the local module.
- Extracted-module SHA-256: `f56db489ae43d52d4bfc4e02c93b1d28f11b23ec49c05381a50f93bf79fedc54`.
- Modifications: **none**. The game configures an 11-second cooldown, a run-state availability gate, and activation/rejection callbacks. No resource inventory dependency is needed because no resource costs are configured.
- Role: cooldown countdown, activation gating and unavailable-activation rejection. Shield duration, game state, input, presentation, movement and delivery behavior are original code.

## Original work

`index.html`, `style.css`, `src/model.mjs`, `src/main.mjs`, `src/scene.mjs`, tests and documentation were authored for this build. License: MIT (`LICENSE.txt`). All meshes, material colors, canvas labels, rain and audio tones are generated locally by these files. Fonts use the browser’s installed system and Georgia fallbacks. There are no downloaded art, font or audio assets, and no runtime CDNs, requests or backend services.

Frozen inventory discovery used ordinary file/text search for checkpoint, third-person, touch and camera systems. The inventory README and follow-camera source were inspected; their implementation was not copied. There was no live warehouse search, no access to newer records, and no publication.
