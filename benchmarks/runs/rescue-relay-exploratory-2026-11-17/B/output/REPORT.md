# Rescue Relay delivery report

The supplied expedition is now a short component-recovery and escort rescue. Its original 20×14 route, walls, movement speed/radius, signal locations and southwest extraction remain recognizable. Three distinct components collect once and install only in their corresponding towers. The north repair opens an upper flood shutter, shortening the eastward route; the southern route preserves reachability in every repair order. Vale begins following only after all repairs and explicit contact, navigates four-neighbor safe paths around the original ridges, and supports remote wait/follow. Both people must reach extraction for victory.

The offline standalone delivery is `index.html`. Source, build, test, dependency, migration, license and exact hash manifest are supplied. The supplied 2.0.0 movement dependency is unchanged and locally pinned. The complete original v1 package remains unchanged in `v1-frozen/`; its own reproducible artifact and build remain available. Frozen inventory reuse is limited to the CC0 grid-navigation source, with only a local module wrapper adaptation. No live warehouse, public sources, browser, localhost, installs, paid service, backend or publication was used.

## Evidence

`TEST-RESULTS.txt` records **22,104 passing assertions across 7,162 simulated advance steps**. Assertions include repeated state/collision invariants and are not a count of independent acceptance criteria. The deterministic suite covers:

- Every permutation of tower repair order, traversed via movement, including component prerequisites, once-only recovery/repair, contact gating, wait/follow and escort extraction.
- Shutter collision, a meaningful shorter route after north repair, and reachability of every objective under every repair prefix.
- All three supplied RR1 fixture migrations: exact position and activated towers retained, old completion preserved, consumed components absent, and the extended rescue completed from each fixture.
- A legacy player inside the newly introduced obstruction can leave without teleportation; grace then expires. The first test harness attempted to route this exceptional start through the intentionally blocked navigation grid. The harness was corrected to use ordinary directional movement; no mission change was needed for that case.
- RR2 round trips during recovery, repairs, following, waiting, mid-route movement and completed extraction; repeated loads are idempotent. Corruption and inconsistent state reject without a caller commit.
- New movement API, normalized diagonal input, 50–250ms lag equivalence and long-frame clamping.
- Standalone deterministic build, exact dependency byte identity, no runtime network/imports, script syntax parsing, browser-branch save codec interoperability in a Node VM, and unchanged reused navigation algorithm.

`V1-TEST-RESULTS.txt` records all **10** original simulation/package checks passing. `package.cjs` verifies every original frozen manifest hash before producing the new SHA-256 manifest. The preserved package was also compared recursively against `starter/` and is byte-identical.

## Verification limits

These are **source, VM and simulation results**, not real browser play. No screenshot, desktop interaction, touch interaction, render/layout, focus/pointer-capture or clipboard/save-text usability has been observed in an actual browser. Browser and localhost were explicitly prohibited; no launch, installation or retry occurred. Keyboard/touch/pause/restart/visibility behavior is implemented and source-inspected, with graphics procedurally drawn on canvas, but usability acceptance remains pending real play.

Recommended operator checks: open the page on desktop and a phone-sized viewport; finish one mission; test diagonal keyboard and touch movement; wait/call Vale around a ridge; pause/resume, background/resume and restart before/after victory; load each RR1 fixture; export a moving escort to a fresh page; and reject a corrupt save. Do the same baseline pass on `v1-frozen/v1/index.html` if baseline interaction evidence is needed. No browser result is inferred from the simulation suite.

## Declared choices

There is no audio or mute control, no autosave, no network and no reward counter. Inventory is derived from collected minus repaired IDs. Original completion persists as a visible separate achievement while the rescue objective remains. Paused and held-input UI state are cleared on load. Waypoints are a derived cache; portable saves retain actual physical position and follow/wait mode and safely reconstruct navigation. See `MIGRATION.md` for validation details and the `gateGrace` migration exception.
