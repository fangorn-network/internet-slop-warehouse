# Sources, exact versions and modifications

All runtime files are local and inline in the static artifact. No network runtime dependencies, fonts, images, music or packages are used. All game code and reused source are **CC0-1.0**; the original license notice is retained in `LICENSE` and `frozen-v1/LICENSE`. Canvas geometry and art were drawn procedurally for this implementation. No paid services, assets or publication were used.

| Source | Exact version / identity | Local copy | Modification |
|---|---|---|---|
| Supplied neutral Rescue Relay fixture | starter 1.0.0, RR1/schema1; original `MANIFEST.json` SHA-256 inventory | `frozen-v1/` | None. Entire supplied starter retained byte-for-byte; unchanged standalone v1 remains reproducible. |
| Supplied movement dependency update | 2.0.0; SHA-256 `47b60511b14b92395f4dccd9ce113b0458595b81c1825a81bf4e5d9333cf1df4` | `vendor/relay-core-2.0.0.cjs` | None. API adapted in mission wrapper. |
| Bounded grid navigation, author “the internet slop warehouse”, publisher `0x7b16387c5a8c514880e48bcacd52782fcf9da936`, repository `internet-slop-warehouse`, part `grid-navigation` | Record CID `bafyreibfa3thki4lzs3jbi2r5lm2td4cvuc2kgpzpbktjqhqav6ivkfbpq`; source CID `bafkreig3624wdnu7surrhjssmijvgxalwrcvmzbxvpypjt45h67ipwqctq`; CC0-1.0 | `vendor/grid-navigation.original.mjs`, `vendor/grid-navigation.cjs` | Frozen response source literal newline sequences decoded; original ESM saved. Adapted copy removes `export` and adds CommonJS/browser global wrapper. A* algorithm unchanged. Mission converts X/Y positions into its X/Z API and supplies blocked-cell rows. |
| Return Signal mission and UI adaptation | 2.1.0, RR2/schema2, exact hashes in `MANIFEST.json` | `v2/`, `build.cjs`, tests | New component/repair state, flood gate, routed escort, save validation/migration, feedback and canvas presentation. Movement controls, original geometry and tower/start/extraction coordinates retained. |

The navigation source was discovered through one semantic frozen-adapter search (`grid pathfinding obstacle avoidance escort follower navigation`, k=3) and one get, under the exact ACCESS.md command. The returned JSON including record metadata and full source is retained as `grid-navigation-retrieval.json`. No live warehouse, checkout, fixture implementation, caches, other conditions or prior runs were inspected. Search returned patrol/perception alternatives; these were not retrieved or used. No retrieval failure occurred.

Search implementation: local EmbeddingGemma q8, revision `5090578d9565bb06545b4552f76e6bc2c93e4a66`, frozen snapshot 2026-11-16-pilot-02. Adapter telemetry is outside the artifact in `../adapter-metrics.jsonl`. Documentation read was the supplied `documentation/0-README.md` only; it is contextual and is not a runtime dependency.

The starter/build/test scripts are original benchmark CC0 work, not warehouse-derived material. The v1 copy's manifest pins all original package files. Current `MANIFEST.json` pins every shipped stable source and generated artifact. No floating version references are resolved at runtime.
