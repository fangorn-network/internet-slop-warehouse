# Exact sources and changes

All runtime sources/assets are local. No external fonts, images, sounds, packages, services or paid work were used.

| Source | Exact pin | License | Use / changes |
|---|---|---|---|
| Supplied neutral Rescue Relay fixture | 1.0.0; complete unchanged package in `v1-frozen/`, original `MANIFEST.json` retained | CC0-1.0 | Preserved route geometry, coordinates, movement controls, save support, pause/restart/export/load baseline. Presentation extended in `game/app.js`, CSS/template rewritten for the rescue mission. |
| Supplied RescueRelay dependency update | 2.0.0, `game/dependency-2.0.0.cjs`, byte-identical to frozen `v2-update/core.cjs` | CC0-1.0 | Used via `advance`; mission logic wraps movement without modifying dependency bytes. |
| Frozen inventory `grid-navigation` / Bounded grid navigation, author “the internet slop warehouse” | record CID `bafyreibfa3thki4lzs3jbi2r5lm2td4cvuc2kgpzpbktjqhqav6ivkfbpq`; source CID `bafkreig3624wdnu7surrhjssmijvgxalwrcvmzbxvpypjt45h67ipwqctq` | CC0-1.0 | Four-neighbor A* for surveyor routes and reachability simulations. `sources/grid-navigation.source.json` is the exact frozen source payload. `game/navigation.cjs` replaces `export function attach` with `function attach` and adds a browser/CommonJS wrapper exporting `attach`; algorithm unchanged. World Z maps to mission Y. No live warehouse access used. |
| Rescue Relay extension | 2.1.0; checked-in `game/mission.cjs`, app/style/template, build/tests/docs | CC0-1.0 | New component/repair rules, shutter, escort, mission UI, RR2 codec, migration adapter, procedural canvas map and deterministic tests. |
| Build/test tool | Node.js 22.21.1, built-in modules only | Node license (tool only) | Not shipped as runtime code; no npm dependencies. |

Frozen inventory was searched locally for navigation, pathfinding, inventory and collision material. `grid-navigation` was selected because its renderer-independent, bounded route search fits the supplied authored grid. Other inventory entries were not copied or used. Source payload and manifest pins allow exact reconstruction without a network gateway.

`MANIFEST.json` provides SHA-256 and byte counts for every source, dependency, artifact and preserved v1 file. `LICENSE` retains the original CC0 dedication; original provenance is retained in `v1-frozen/SOURCES.md`.
