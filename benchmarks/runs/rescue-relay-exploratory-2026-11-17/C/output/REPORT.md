# Delivery and verification report

Return Signal is a coherent extension of the supplied Rescue Relay route: recover three labeled component caches, consume each in its matching tower, drain a central flood crossing with North, resolve the stranded surveyor's signal after three repairs, meet them, and escort them home. Repairs can happen in all six orders. Repaired towers and component state persist; wait/follow is explicit over radio. The mission ends only when the player and surveyor reach the original southwest extraction.

The standalone page includes objective, inventory and tower progress, nearby prerequisites, arrival/repair/rescue/extraction messages, numbered map markers, keyboard and pointer controls, pause/resume, safe blur pause, restart, and portable saves. All runtime code and artwork are local. No audio is present. Reduced motion requires no special animation replacement: there are no decorative moving effects or transitions.

## Evidence obtained

`node test.cjs` passes 34,354 tracked invariant checks across 11,204 simulated ticks, plus direct assertions. Tests use the same mission/core/navigation source inlined into the shipped page. Ordinary movement follows authored free-cell routes and interacts near components/towers; it does not teleport through the six full repair/escort expeditions. Every tick checks player collision, surveyor collision and state validity. Tests cover:

- All six repair orders, missing prerequisites, once-only collection/consumption/repair, rescue gating, wait/follow, and successful extraction around walls.
- Reachability between every authored objective for all eight repair subsets, plus a shorter central route when North drains the flood.
- All three supplied RR1 states preserved on import and each continued to a completed escort; legacy completion preserved.
- RR2 repeated export/load at component, repair, waiting, following and completed stages; idempotent canonical saves; post-victory stationary behavior; clean fresh restart state.
- Corrupt envelopes, checksum errors, excessive length, invalid wall positions and semantically inconsistent inventory/rescue/completion states rejected.
- V2 lag travel/clamping and collision/bounds, original package integrity, unchanged v2 core bytes, inline JavaScript syntax, local-only artifact and deterministic rebuild.

`node ui-smoke.cjs` additionally executes the actual app in a VM with a small simulated DOM/canvas. It verifies initialization/drawing, keyboard movement, pointer hold/release, pause/resume input clearing, restart, export/load, rejected load and blur pause. This is source-level event simulation, **not** a real browser or touch-device result. The initial test run revealed a test expectation incorrectly treating canonical array order as mission meaning; that assertion was corrected to compare normalized state. No gameplay defect was hidden by dropping a failing test.

`node manifest.cjs --verify` verifies shipped stable files against the exact dependency/source inventory. Original `starter/` was never edited. `frozen-v1/` retains the entire unchanged starter and its original manifest.

## Limits and operator acceptance

Browser and localhost use are blocked; no launch, installation, or retry was attempted. Actual rendered layout, frame cadence, desktop key focus, browser save controls, physical touch/pointer capture and phone readability remain unverified. Source review and VM simulation do not establish those properties. Map labels scale to a minimum intended CSS size and shorten on narrow layouts, but this needs visual confirmation.

Before relying on the artifact as browser-tested, an operator should open `index.html` on desktop and a narrow touch viewport, play one full mission, try alternate repair order, wait/follow near a ruin, pause/resume, restart before/after extraction, import each RR1 fixture, export to a fresh page, and reject a damaged save. Check scroll, map label legibility, button hit areas and held inputs during blur. The untouched v1 baseline likewise remains browser-unverified as declared by its supplied README.

No public publication, paid service, external account, new package installation, backend or live warehouse access was used. Token/cost telemetry is collected externally and is not inferred here.
