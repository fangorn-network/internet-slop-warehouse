# The Last Conservatory

A static browser scavenger scene. Collect the Sun seed, Moon water and Glass bloom, then walk into the eastern gate. The inventory tracks each distinct object. All three are required to open the gate.

## Launch

From this output directory:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000 in a modern browser. Serve as HTTP, since the game uses ES modules. No build, npm install, API keys or internet access required. Deploying is unnecessary; this artifact has not been published.

## Controls

- Click **Enter the garden** to start and enable synthesized pickup sounds.
- Move with WASD, arrow keys, or hold the on-screen directional buttons (touch or mouse).
- Walk into glowing keepsakes to collect them automatically.
- Click **Sound on/off** or press M to toggle sound. AudioContext is created/resumed only inside a user gesture handler. If browser audio is unavailable, gameplay still works.
- Click **Restart**, press R, or select **Explore again** after finishing.

The canvas scales to narrow screens; touch controls use pointer capture and release on cancellation. Keyboard/touch input clears when focus leaves or the page becomes hidden. Screen reader progress uses a live status region, but the scene itself remains a visual spatial game.

## Validation

```sh
node test.mjs
node --check game.mjs
node --check core.mjs
```

Node v22.21.1: eight simulation tests pass, including a complete walking route without teleportation, collection deduplication, gate lock, collisions, movement normalization, time-step clamping, reset defaults and reused collector disposal. See TEST-RESULTS.txt.

No actual browser rendering, touch device or audio output was tested: browser execution and localhost sockets are known blocked in this environment. Syntax checks and simulation evidence do not establish visual or device compatibility. Use the manual checks in FINAL-REPORT.md when a browser is available.

Dependencies, exact reused versions, licenses and modifications: SOURCES.md and LICENSE.
