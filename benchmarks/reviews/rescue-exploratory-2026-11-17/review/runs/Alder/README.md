# Rescue Relay: The Last Signal

Open `index.html` directly in a modern browser. All game code, graphics and styling are inline; no build, network, account, backend or audio is needed. Procedural Canvas map. Expedition **1.0.0** uses the exact supplied neutral relay core **2.0.0**.

Recover each gold diamond with E / Interact; bring its unique component to its matching tower and interact again. Choose any repair order. North drains the flood barrier, opening the central shortcut; outer approaches remain available. Once all towers are repaired, interact with the surveyor in the northeast. Lead them to southwest extraction; F / Wait or Follow works by radio. Both must reach the pad. The field guide lists all coordinates. WASD/arrows and holdable touch buttons move. Pause (P), restart, export and load work throughout the mission. Victory is stationary; restart/export/load remain available. Changing tabs or losing focus automatically pauses. Restart immediately clears the mission; export first to keep it.

## Reproduce

From output/, with Node.js 18+ and built-in modules only:

```
node build.cjs
node test.cjs
node ui-source-test.cjs
node frozen-v1/test.cjs
```

Build deterministically inlines sources into `index.html` and writes SHA-256 `MANIFEST.json`. No npm dependencies or fetching. Repeated builds produce identical bytes. The manifest pins exact source/dependency hashes. `frozen-v1/` is an unchanged copy of the entire original fixture with original manifest and standalone `v1/index.html`. Open that page to reproduce the old artifact; do not replace its movement core. Its original build need not run and was not used to modify the frozen package.

## Dependency adaptation

`vendor/relay-core-2.0.0.cjs` is byte-identical to the supplied v2 update. Extension calls `advance(state, {x, y}, seconds)`, never removed `move`. Original dimensions, ridges, radius, normalized speed, player start, towers and extraction coordinates remain. New dynamic obstruction is checked in substeps of at most 25ms. The dependency receives a transient view with empty objective signals, letting this extension own the later escort completion instead of ending before rescue. Extension returns actual `distance` and `clamped`; time beyond 250ms is discarded.

Surveyor navigation uses a deterministic half-cell four-neighbor graph with collision-tested segments. It routes around obstacles, waits indefinitely when told, and resumes from its saved position. Navigation is derived from actor positions; no transient cache is required in saves. Surveyor speed is slightly below player speed, so wait at the pad for them. There is no irreversible timeout or combat.

## Saves and migration

Export writes an RR2 envelope. Copy its complete text, open a fresh page, paste in Portable Save and Load. Inventory is `collected − repaired`: each component is either uncollected, carried or consumed, never duplicated. Repaired towers must be a subset of collected components. Escort requires three repairs; completion requires both actors at extraction. Positions and wait/follow are portable. Bad schema, duplicate/unknown IDs, wall positions, inconsistent escort/completion and corrupt/malformed envelopes are rejected before UI state assignment. Rejection leaves the active expedition intact. Checksum detects accidental damage, not forgery. No automatic storage is used.

RR1 saves use the untouched v2 loader. Player coordinates and activated towers survive exactly; active towers become repaired and their components stay consumed. Original completed status is retained as `legacyCompleted`, shown as ORIGINAL EXPEDITION COMPLETE. The new escort stays pending. Loading explains this policy. An old player inside the newly introduced barrier is not relocated: their exact position is accepted and they may walk out; later approach is blocked until north repair. RR2 preserves that egress policy. New missions cannot enter a closed barrier. All supplied v1 fixtures are tested.

## Evidence and limits

`TEST-RESULTS.txt` records deterministic source/simulation checks. All six repair orders are traversed with ordinary movement calls, testing once-only recovery/repair, obstacle-safe escort, wait/follow, mid-escort export/load and two-person extraction. Tests cover RR1 fixtures, schema/corruption rejection, no early rescue/extraction, meaningful flood shortcut, v2 lag behavior, exact vendor/frozen bytes, manifest integrity and embedded JavaScript parsing. Frozen original tests are also run. A separate minimal DOM/canvas-fake harness executes the actual browser sources to check keyboard/touch/cancel, pause/resume, tab-blur pause, restart before/after victory and save rejection wiring. This is source-level event simulation, not native-browser evidence.

**Browser and localhost were not attempted**, per known environment restriction. Simulation does not establish rendered graphics, real keyboard/focus, touch/pointer capture, responsive layout, screen-reader usability or UI save controls. Before public use, open on desktop and phone; play a full route; test simultaneous movement/action, escort around ridges, pause/tab return, restart before/after victory, three RR1 loads, fresh-page RR2 load and rejection during an active expedition. No publication performed.
