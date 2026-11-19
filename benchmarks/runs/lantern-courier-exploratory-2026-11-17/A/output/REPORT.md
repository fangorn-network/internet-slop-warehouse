# Submission report

The implemented game is a deliberately authored causeway settlement with three colored/symbol-coded parcels and destinations, one-at-a-time carrying, two moving storm funnels, saved recalls, lantern protection, a narrow central bridge shortcut, and a safe long east route. The third-person camera follows a visible courier. Procedural buildings, warm destination lights, rain, water, shelters, signs, and a live route map supply context and depth.

All requested gameplay and interface features are implemented in source. Ten simulation tests pass, including complete route traversal with actual movement and three deliveries. The CPU integration harness builds the actual scene with Three.js and exercises input/UI flows, but substitutes the renderer and DOM. That distinction matters: **actual browser play is unverified**.

| Requirement | Implementation and evidence |
| --- | --- |
| Three parcels / matching destinations | Medicine / Clinic, Power cells / Beacon, Seeds / Glasshouse; exact-ID match, single cargo, saved completion; simulation and UI tests |
| Safer long route / hazardous shortcut | Outer east causeway stays clear of storms; middle bridge is shorter and signposted with visible moving hazard and map footprint; source and route tests |
| Two moving hazards / recall | Bridge funnel and upper-west funnel; contact saves deliveries and cargo, returns to latest safe shelter, grants 2.5 seconds of grace; both tested |
| Lantern | 3 second shield, 11 second cooldown; key repeat rejected, explicit cooldown rejection; keyboard/touch share activation; tested |
| Consistent movement / route | Capsule-road and plaza union constrains normalized movement with sliding; BFS reachability and complete moved route pass; camera/occlusion require browser review |
| Useful HUD / controls | Next action, cargo, map, 0–3 restoration progress, time/recalls, cooldown; keyboard/touch; pause, mute, full restart; wiring tested |
| Input lifecycle | Clear input on blur, hidden page, pointer cancellation, lost capture, pause and restart; CPU harness tests major paths |
| Finish and replay | Finish time and recall count, local best, full fresh run; core and integration tests |
| Gesture audio / failure | Sound defaults off; synthesis only after gesture; visual messages and shield remain; unavailable WebAudio tested |
| Local static delivery | Local Three.js 0.170.0 plus original code/art; no remote runtime assets; static checks pass |

No browser test was attempted, no package tooling installed, no paid service used, no public publication made, and no warehouse or other-condition content accessed. Timing is recorded from the first system UTC observation through finalization; token/cost telemetry is external and left null in `result.json`.

The scripted safe route took 136.4 simulated seconds. Reading/navigation may bring first play into the requested 3–5 minutes, but this has not been measured with a player. See README for launch, source/license notes, tests, and limitations.
