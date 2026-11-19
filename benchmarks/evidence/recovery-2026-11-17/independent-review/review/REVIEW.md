# Initial acceptance review: Larch and Willow

Scope: TASK.md and these two submitted artifacts only. Source and Node simulations inspected; no network, publication, browser installation, browser launch, or localhost sockets attempted. Logs/results/reports supplied by authors were not consulted as evidence. Reuse provenance is visible, so this review does not claim perfect blinding. No aesthetic or economic ranking is made.

## Evidence and overall assessment

Both artifacts provisionally satisfy the functional task at source and simulated-runtime levels. Actual browser playability remains unverified. Supplied tests ran successfully: Larch 8 core tests and its mocked DOM smoke test; Willow 7 core tests. Application syntax checks passed. Independent evidence is executable in `state-probes.mjs` and `probes.mjs`; input results are persisted in `probe-results.json`. Instrumented application copies add only an inspection export and redirect the core import to the submitted source.

Independent state probes exercise all eight subsets of the three collectibles, repeated pickup attempts, and an independently chosen complete route using movement rather than teleportation. Both remain locked for every incomplete subset, win with all three, deduplicate pickups, and have reachable objects and exits. Teleportation is used only for exhaustive gate/subset isolation; full-route probes use normal movement.

## Requirement matrix

| Requirement | Larch | Willow |
| --- | --- | --- |
| Browser scavenger scene | Canvas scene and module entry wired in HTML; mocked frame executes | Canvas scene and module entry wired in HTML; mocked frame executes |
| Keyboard controls | WASD/arrows; directional ownership defect below | WASD/arrows; directional ownership defect below |
| Touch controls | Pointer buttons, capture, cancellation; ownership defect below | Pointer buttons, capture, cancellation; ownership defect below |
| Three distinct objects | Three unique IDs, Set inventory; independently verified | Three unique IDs, deduplicated array; independently verified |
| Exit opens only after all three | Count-based visual gate and win check; all subsets verified | Count-based visual gate and win check; all subsets verified |
| Visible progress | Count, item state, live status wired | Count, item state, live status wired |
| Restart | Recreates core and collector, clears input and UI | Recreates core, clears input and UI |
| Sound after user gesture | Context created/resumed only from event actions; no startup audio in simulation | Context created/resumed only from event actions; no startup audio in simulation |
| Static files and launch | Local module imports, no runtime fetch; Python HTTP instructions | Local module imports, no runtime fetch; Python HTTP instructions |
| Dependencies/licenses/sources/modifications | README, SOURCES.md and MIT LICENSE; vendored collector identified as CC0 with exact provenance and adapter modifications | README and MIT LICENSE; declares original source, browser APIs and no reused assets/components |

## Reproduced defects affecting both

1. **Keyboard alias ownership (minor functional defect).** Press ArrowRight, press D, release D while ArrowRight remains physically held. The direction disappears from the internal input set because both keys share a single `right` entry and either keyup deletes it. Movement stops until another keydown/repeat. Equivalent alias pairs behave the same. Reproduced by `probes.mjs`, not merely inferred from source.
2. **Multiple pointer ownership (minor touch edge case).** Two pointerdown events on the same directional button followed by pointerup for the first remove the shared direction, although the second pointer remains held. The callbacks do not track pointer IDs. Source also shows that a stale lostpointercapture event from an earlier captured pointer can clear a newer hold after reset. The direct two-pointer case is reproduced by `probes.mjs`; the stale-event scenario is source evidence only.

Neither defect blocks ordinary single-key/single-pointer completion. Keyboard and touch use separate sets, so releasing touch does not erase a keyboard direction and vice versa. Both clear all input on blur and hidden-document notification; pointercancel clears the relevant touch direction. Restart resets progress and input in integration simulation; core construction/reset and victory are covered separately.

## Additional source-level limitation

Willow `gesture()` does not catch an AudioContext constructor exception or a rejected resume promise. If a present Web Audio implementation throws during construction, keyboard movement is not registered because `gesture()` runs before `held.add`, and restart exits before resetting. A rejected resume promise is unhandled. This is an optional-audio failure-path robustness issue established by source inspection, not observed audio-device behavior. Larch guards construction and catches resume rejection, allowing gameplay to continue without audio.

## Evidence boundaries

No actual browser screenshots, rendering, mobile layout, native pointer capture ordering, keyboard default behavior, assistive technology interaction, or audible output were verified. Synthetic DOM probes do not establish browser compatibility or trusted user activation semantics; they establish that application startup does not create audio and normal handler wiring executes. Browser restrictions are environmental and are not counted as submission defects. No artifacts were modified; all reviewer-created files are under review/.

# Third artifact: Birch

Birch was reviewed within the same source/Node-only boundary. Its supplied `node test.mjs` passes both its core BFS-route checks and substitute DOM/Canvas/WebAudio adapter checks. Both application modules pass syntax checks. Independent executable probes and persisted results are `birch-probes.mjs` and `birch-results.json`.

## Requirements and independent evidence

Three distinct numeric item IDs use the vendored collector's Set-based collect-once behavior. All eight collectible subsets independently pass exit gating and repeated-pickup checks; an independent normal-movement route reaches every relic and the gate. The count, item chips and live status are wired to collection and unlock callbacks. The canvas, start, restart, sound, directional buttons and victory action are wired in HTML. Local imports and procedural visuals require no external runtime service; launch instructions identify a static HTTP server. README and SOURCES identify browser APIs, optional audio, Node tests, CC0 licensing, exact collector provenance, unchanged reused code and integration modifications. Absent reports/transport logs are not treated as defects. Its README contains a provenance-bearing original launch path; no underlying location was accessed or condition classification inferred.

Physical keyboard keys and pointer IDs are stored separately. Independent adapter probes confirm that releasing D preserves held ArrowRight, and releasing one pointer preserves another pointer on the same button. Blur, visibility loss and pointercancel clear corresponding input. Startup/frame execution creates no audio; starting through the simulated user action creates the context without sound while muted. No actual trusted activation or audible playback was tested.

## Concrete findings

1. **Restart does nothing after victory (minor functional defect, reproduced).** Victory sets `active=false`; the Restart handler only calls reset when active. A completed game remains won with count 3 after clicking Restart. The separate Explore again action does recreate the game and restore activity, so replay remains available. Restart during active play resets progress and input correctly. Before initial start it is likewise a no-op on already-empty progress.
2. **Optional audio failure prevents starting (robustness defect, reproduced in substitute runtime).** `enableAudio()` does not catch AudioContext constructor errors. A present constructor that throws makes the Enter action throw before setting active or hiding the welcome screen. A fresh instrumented import with a throwing constructor reproduced this. Resume promise rejection is caught. Unsupported audio with no constructor is handled by optional chaining; this finding concerns constructor failure, not ordinary absence of Web Audio.
3. **Multi-pointer held styling is cleared early (source-only feedback issue).** Although pointer ownership correctly preserves movement, every pointer release removes the button's held CSS class even if a second pointer still owns that button. This does not erase remaining pointer movement.

Functional assessment: provisional acceptance with a post-victory Restart defect and optional-audio failure-path defect. Core reachability, deduplication, gate rules, normal reset, keyboard/touch ownership, progress, static packaging and documentation are established by source and simulation. Actual browser rendering, physical touch capture ordering, mobile fit and audio output remain unverified. The first two artifact findings above are unchanged.
