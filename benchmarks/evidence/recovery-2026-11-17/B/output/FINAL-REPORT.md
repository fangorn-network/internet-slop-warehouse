# Final report

Completed The Last Conservatory: a dependency-free static canvas scavenger game with keyboard and touch movement, three distinct collectible keepsakes, visible progress, an exit requiring all three, restart, and user-gesture-gated synthesized sound. The original garden scene is drawn entirely in Canvas 2D. Nothing was published.

Launch from this directory with `python3 -m http.server 8000`, then open http://localhost:8000. No installation or network runtime dependency is required.

## Evidence

- **Game-state simulation:** 8/8 tests pass using Node v22.21.1. The complete route uses movement updates rather than teleporting and verifies three distinct pickups, a single unlock event, a single win event, and the completed-state freeze.
- **Mock integration:** `node smoke.mjs` passes with simulated DOM, Canvas and Web Audio objects. Covers first render, no audio context before a gesture, start, keyboard and pointer handlers, blur cleanup, and restart. This is not browser evidence.
- **Source checks:** JavaScript syntax checks pass for game, core and reused collector. All local HTML file references exist. No package installs or remote runtime resources.
- **Browser/device evidence:** none. Known environment restrictions block browser execution/localhost sockets; no retries or installations attempted. Visual quality, real touch interaction, real sound and browser support remain unverified.

## Manual verification when a browser is available

1. Launch and verify the welcome card; no sound should play before a gesture.
2. Enter, move using WASD/arrows, and verify planter/perimeter collision.
3. On a phone, hold each directional button, release outside it, and switch application focus; movement should stop.
4. Gather the three differently colored/shaped keepsakes. Each inventory row should check once; gate should open only at 3/3.
5. Enter the eastern gate to see completion. Restart and confirm empty inventory and locked gate.
6. Toggle sound or M and check pickup tones, including with the browser denying audio access.

## Reuse

One unchanged CC0 warehouse module, `collect`, extracted from the supplied frozen inventory. Exact record/source CIDs, hashes, author, license, and adapter configuration are in SOURCES.md. All other runtime files are original MIT-licensed work. No external assets, fonts, services or packages were imported.

## Delivery

Runtime: index.html, style.css, game.mjs, core.mjs, vendor/collect.mjs.
Documentation: README.md, SOURCES.md, LICENSE, FINAL-REPORT.md.
Evidence: test.mjs, smoke.mjs, TEST-RESULTS.txt, RUN-LOG.md, result.json.
