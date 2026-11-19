# Sources and licenses

## Reused runtime source

- **collect — Pickups**, author: the internet slop warehouse.
- License: **CC0-1.0**, as declared by the frozen catalog. CC0 legal text: https://creativecommons.org/publicdomain/zero/1.0/legalcode
- Exact record version/CID: `bafyreiboqbeceozw5nalignugur2crrjpdcywg7jhpcekgt4wx5bwk7yni`.
- Exact source CID: `bafkreiant6lyf5xsnypb32bv6wz4e3bfkcww2ozbw4jbbjkmkjysdx2tui`.
- Supplied source file: `inventory/sources/bafkreiant6lyf5xsnypb32bv6wz4e3bfkcww2ozbw4jbbjkmkjysdx2tui` (JSON envelope).
- Supplied envelope SHA-256: `0d9f9782f6f26e1e1de835f5b3c26c2550ad6d3b21b71210a54c527121df53a2`.
- Extracted module SHA-256: `6e872d976b717ee4d75f1edfd9e90ded1eee69713929db72383c21f1a953d290`.
- Modification: JSON `js` field extracted verbatim to `vendor/collect.mjs`; module code unchanged. The original canvas adapter provides position/rotation objects and custom callbacks, disables bobbing for planar collision, uses a 30-unit pickup radius.
- Frozen inventory snapshot captured 2026-11-16T23:13:18.955Z; checkout commit `e8df187100ba18bba920069f25c8d25d06fa666d`. No live warehouse access or newer records used.

## Inspected, not reused

- `trigger-zones`, source CID `bafkreieid7xttemo3ty6gk47tmb37f7ht7oztmevsgorvhuok4b5ly3iuy`. Inspected as a candidate; no code copied.
- `inventory/manifest.json`, `inventory/view.json`, `inventory/materialization.json` consulted to discover and identify available frozen sources.

## Original work and dependencies

All other game code, canvas drawing, styles, layout, synthesized tones, tests and documentation were authored for this run. Original source is offered under MIT; see LICENSE. No imported art, fonts, audio, packages, CDNs, analytics, paid services or network runtime dependencies. System fonts and native Canvas 2D/Web Audio APIs only.

Validation environment: Node.js v22.21.1 and Python 3.12.3. Neither is a browser runtime dependency. No package installs. Launch needs any ordinary static HTTP server; documented command uses Python 3.
