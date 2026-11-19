# Delivery report

The Last Conservatory is implemented as static HTML/CSS/ES modules. It contains a top-down garden with collision beds, three distinct collectibles, visible inventory and status, an exit that opens only after all three pickups, a victory screen, and restart controls. Keyboard and pointer-based touch controls are included. Optional synthesized sound is initialized only by user gestures and defaults off.

## Evidence

- `node test.mjs` passes: BFS finds routes around the actual collision predicate; the actual `step` method follows those routes and collects all three relics before entering the gate. Repeated pickup checks do not increase the count. The gate cannot complete the game before all three; the all-collected callback runs once. Fresh game state restores all relics, spawn, count and lock state. Diagonal speed is normalized.
- The same test executes `app.mjs` against instrumented DOM, Canvas and WebAudio substitutes. It checks startup/render, keyboard prevention, pointer down/cancellation, focus-loss clearing, restart UI, no audio context or playback on initial load, context creation after start gesture, and sound-toggle playback.
- All three runtime modules pass Node syntax checks. HTML references resolve to local files. Responsive viewport metadata and a narrow-screen layout are present. No external network dependencies are required by the playable artifact.
- Actual desktop/mobile rendering, browser input delivery, real touch ergonomics and audible output are **unverified**. Browser and loopback sockets were declared unavailable; no browser launch, installation, socket or live deployment was attempted. DOM substitutes are simulation evidence only.

## Reuse and environment

One unchanged CC0 Collectibles module was retrieved through the frozen read-only local semantic adapter; source, metadata, version CIDs and integration details are retained in SOURCES.md and vendor/. One search and one get succeeded. No binary assets were fetched. The search condition was warmed local q8 semantic search, not hosted production search.

Implementation and checks used the inherited agent configuration; no model configuration or spending configuration was changed, no subagents or paid services were used, and no publication occurred. Token usage and model cost were unavailable to this worker and remain null in result.json. Static server launch instructions are in README.md. Test output is retained in TEST-RESULTS.txt.
