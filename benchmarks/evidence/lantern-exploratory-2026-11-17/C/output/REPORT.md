# Implementation and evidence report

## Delivered experience

A flood-darkened settlement on authored causeways, seen from a following third-person perspective. The courier wears an ochre raincoat and carries a visible parcel and glowing lantern. Architecture, causeway posts, trees, a beacon tower, storm funnels, fog, shadows and locally generated signs establish depth and landmark identity. The camera keeps north fixed; steering uses smoothed acceleration and sliding collision against the walkable route union.

The western arc is a safer alternative to a narrow central cut patrolled by a storm. A second storm moves along the eastern arc. Entry signs warn about recall risk. The live minimap shows both storms and the route choices. Safe lamps set checkpoints; recall keeps the carried parcel and all successful deliveries, gives explicit text/visual feedback, and grants 2.8 seconds of grace. Lantern protection lasts 3.2 seconds, recharge lasts 10 seconds from activation, and unavailable activation produces a message. No jump, fall trap, health attrition, precision timing gate, or item loss prevents recovery.

Each destination and parcel has a unique name, color, and symbol. The manifest, carried-item status, next-action prompt, progress, ability meter, timer and recall counter are visible. Finish results and a local best passage encourage trying a faster or safer route. Pause provides resume and full restart. Restart restores parcels, destination signs/lights, courier position/motion, checkpoint, timer, hazards, cooldown, carry state, delivery list, recalls and transient feedback. Optional personal-best storage persists separately.

## Evidence actually obtained

- **Simulation: 8 tests passed.** Matching rules, single carry slot, two independent moving hazards, checkpoint recall with preserved cargo/progress and grace, lantern protection/cooldown rejection, pause and complete run reset, normalized movement and boundary collisions, flood-filled reachability of parcels/destinations/all road centers, complete delivery run, and shortcut length comparison.
- **Input tests: 4 passed.** Actual shared input module with injected standard EventTargets: keyboard vector and keyup; repeated key rejection; pointer capture/release; competing-pointer rejection; blur, hidden-page, pointercancel and restart cleanup; menu gating; Escape and disposal. These are not browser touch tests.
- **Static/module checks: 3 passed.** All entry references/imports resolve locally, no network loading in source, supplied Three revision 170/license, and referenced DOM IDs exist. `node --check` passed for modules.
- Full-run simulation used ordinary movement calls and interactions, not teleportation; it completed in 198.8 seconds with no recalls. Targeted unit tests use direct positions to isolate collision/interaction states. The shortcut geometry test uses test-only immunity to compare route lengths without storm delays.
- Search: two exact frozen semantic queries. No retrieved/adopted warehouse module. Source notes document the results and decision.

## Unverified and remaining limitations

- **No real browser, WebGL render, screenshot, audio playback, keyboard device, touch device, or localhost-server behavior was tested.** Browser/loopback execution is unavailable by task constraint; no installation or browser retry was attempted. The 3D scene and responsive layouts are source-implemented, not visually approved.
- GPU performance, shadow quality, font glyph rendering, visual contrast under varied screens, camera occlusion and small-screen overlap need device QA. Pixel ratio is capped at 1.7; scene uses simple low-poly geometry and shared materials, but no measured frame-rate claim is made.
- Human first-route time is estimated from a 3m19s scripted simulation; learning, choosing routes and mistiming the lantern may add time.
- The camera follows with a fixed heading and has no manual orbit. Collision follows 2D authored causeway boundaries at one elevation rather than general mesh physics. Buildings are decorative outside traversable road space.
- This is a visual-action game, not a screen-reader-complete experience. Buttons are keyboard accessible, text feedback does not require sound, and reduced-motion preference disables walk bob, but the world still requires spatial interpretation.
- Optional best score is browser-local and may be unavailable in restricted storage; no failure affects the game.

No publication was performed. No paid service or asset was used. Exact model tokens and cost are unavailable to this builder and left null for external collection.
