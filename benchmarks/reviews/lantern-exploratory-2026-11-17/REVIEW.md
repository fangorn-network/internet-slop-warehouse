# Lantern Courier functional review

Reviewed only TASK.md and the supplied Aspen, Cedar and Redwood artifacts. No artifact source was changed. Browser/localhost execution was known unavailable and was not retried. No network, publication, or external service was used. Source provenance is visible, so this is not a perfectly blinded review. Logs/results/reports intentionally withheld from the artifact packages were not treated as omissions.

No core delivery blocker was reproduced in the feasible source/simulation checks. All supplied test entrypoints passed in this environment. Independent common probes also passed for matching, one-slot carrying, deduplication, both hazards preserving progress/cargo, immediate recall grace, lantern rejection/recovery, pause, finish freezing, reset, and grid reachability of all parcels, destinations and checkpoints. These findings establish simulation support, not actual browser acceptance or play quality.

One minor input issue was reproduced in Aspen: holding W while moving with the stick, then releasing the owning stick pointer, clears W too. Keyboard movement stops until W is released and pressed again. The pointerup handler calls clearInput(), which clears both input sources. This does not block a keyboard-only or touch-only run. Secondary stick pointers cannot steal or release the owning pointer. Cedar's independent direction pointers release separately; Redwood's stick owner release preserves held keyboard input.

## Required-spec evidence

Status “supported” below means supported at the explicitly stated source/simulation level. Visual feedback clarity and controls/layout in a real browser remain unverified even where the corresponding logic is supported.

| Requirement | Aspen | Cedar | Redwood |
|---|---|---|---|
| 1. Three distinguishable parcels/destinations, one carry slot, matching-only delivery, destination completion | Supported: simulation and scene/HUD wiring | Supported: simulation and scene/HUD wiring | Supported: simulation and scene/HUD wiring |
| 2. Real shorter hazardous shortcut and longer safer choice, advance risk information | Supported: connected geometry, moving hazard intersection, warning signs/map wiring | Supported: connected geometry, moving hazard intersection, warning signs/map wiring | Supported: connected geometry, moving hazard intersection, warning signs/map wiring |
| 3. Two moving hazards, checkpoint recall, saved progress and damage grace | Supported: simulation plus flash/message/shield wiring | Supported: simulation plus flash/message/shield wiring | Supported: simulation plus flash/message/shield wiring |
| 4. Brief lantern protection, cooldown/rejection, keyboard/touch parity, no held bypass | Supported: model, repeat-key handler, button wiring and CPU/DOM harness | Supported: model, repeat-key handler and button wiring | Supported: model, input module and button wiring |
| 5. Consistent route/carry/collision behavior; reachable parcels/destinations | Supported in simulation; minor mixed keyboard/stick release defect | Supported in simulation | Supported in simulation |
| 6. Useful action, cargo, progress, cooldown, controls, pause/mute/restart and input clearing | Supported in source and CPU/DOM harness; mixed-input caveat above | Supported in source and extracted input handler harness | Supported in source and actual input-module tests |
| 7. Finish time/recalls and fully fresh second attempt | Supported in simulation and CPU/DOM UI harness | Supported in simulation and UI source wiring | Supported in simulation and UI source wiring |
| 8. Gesture-gated optional audio, mute, failure isolation and nonaudio feedback | Supported by source and unavailable-WebAudio CPU harness | Supported by guarded audio source and nonaudio feedback wiring; real failure path unverified | Supported by guarded audio source and nonaudio feedback wiring; real failure path unverified |

All three include local static entrypoints, vendored Three.js, launch instructions and license/source notes. No account or paid runtime service is required by the inspected code. Third-person character geometry, perspective cameras, camera following, depth-tested scene objects, HUD updates, resizing and mobile CSS/control branches are wired in all three. This does not verify that any scene actually renders or that the camera is readable and unobstructed in play.

## Route evidence

Independent probes sampled the full centerlines for walkability and found the following genuine route choices (world-coordinate lengths, not scores):

| Artifact | Segment endpoints | Hazardous center | Safer perimeter |
|---|---|---:|---:|
| Aspen | (0,25) to (0,-48) | 73 | 125 via east |
| Cedar | (0,20) to (0,-36) | 56 | 104 via west |
| Redwood | (0,-14) to (0,-64) | 50 | 98 via west |

A moving hazard intersects each direct segment. The chosen comparison perimeters avoid those storm corridors; this is not a claim that every outer-road trip in the whole map is hazard-free. Supplied ordinary-movement simulations complete all three deliveries without teleporting; independent direct positioning was used only to isolate matching/hazard/state transitions. Flood fill establishes connected walkable vicinities, not human route comprehension. Hazard placement in tests is deliberately injected; visual timing and actual human hazard avoidance are unverified.

## Evidence and remaining checks

- `review/supplied-tests.tap`: all supplied test entrypoints run successfully using `node --test`.
- `review/probes.mjs`, `review/probe-results.json`, `review/probe-output.txt`: independent common model checks, checkpoint/parcel/destination reachability and route geometry.
- `review/input-probes.mjs`, `review/input-output.txt`: Redwood input module and Cedar's actual extracted input handlers, including simultaneous pointers and ownership.
- `review/aspen-input-harness.mjs`, `review/aspen-input-output.txt`: supplied CPU/DOM integration harness reused with added independent pointer/mixed-input probes. It uses real Three.js classes with a renderer stub; no WebGL or native browser event dispatch.

Required live checks remain: static-host loading, WebGL, native pointer capture/cancel/click/focus behavior, audio, performance and essential-control clipping at 1280×800 and 390×844; complete matching deliveries and restart in a browser; novice identification of parcel/destination/ability, initial-route pacing, camera/occlusion quality, readability, responsiveness, feel, replay motivation and fun. User play-quality ratings are intentionally left open. No ranking or aesthetic/economic comparison was made.
