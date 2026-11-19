# Lantern Courier

A short, single-player 3D night route through a storm-darkened settlement. Deliver three supplies, one at a time. Walk the sheltered perimeter or time your lantern through the exposed central bridge. All runtime files are local.

## Launch

From this `output/` directory:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080` in a modern WebGL-capable browser. Serve the directory over HTTP; opening the HTML directly as a `file:` URL may block ES modules. No installation or build step is needed. No server was launched during implementation because browser and localhost execution were unavailable in the build environment.

## Play

- WASD or arrow keys move in screen-aligned compass directions. On touch screens, hold the four direction buttons; adjacent directions combine diagonally.
- Walk near a depot parcel and press **E** or **Collect parcel**. Medicine (pink cross) goes to the Clinic; grain (gold diamond) goes to the Mill; cells (cyan bolt) go to the Signal tower.
- Walk onto the matching colored delivery pad and press **E** or **Deliver parcel**.
- **Space** or **Lantern ready** protects for 2.8 seconds. It recharges for 11 seconds from activation. Unavailable attempts show a message. Holding Space never auto-repeats.
- The perimeter is sheltered. Two moving wisps patrol the shorter center bridge; their rings show contact range. A hit returns you to your most recent cyan-lit shelter while retaining cargo and deliveries. Recall protection prevents immediate repeated damage.
- **Esc** / **Pause** stops time. The pause menu offers **Restart the whole route**. Losing focus or hiding the page also pauses and clears held movement. The finish screen starts a fully fresh second run.
- Sound defaults off. **Sound off/on** toggles optional synthesized feedback after a gesture. Sound failure does not block play.

The minimap shows the whole route; the marker follows your courier. The gold floating diamond points at the next parcel or your carried parcel’s destination. Completed destinations show **SUPPLIED** and receive a checkmark in the HUD. Your quickest completed route is saved locally if browser storage is available.

## Verification

Requires Node 22 or another recent Node release with `node:test`:

```sh
node tests/model.test.mjs
node tests/package.test.mjs
node --check src/main.mjs
node --check src/model.mjs
node --check src/scene.mjs
```

Seven model checks and two packaging checks pass. The route simulation physically follows the safe walkways, collects/delivers all parcels, and finishes in **166.2 simulated seconds with 0 recalls**. Other tests exercise wrong delivery rejection, one-parcel carrying, progress/cargo retention on recall, checkpoint selection, recall grace, shield/cooldown gating, pause, route bounds, normalized diagonal speed, finish freeze, and restart. Packaging checks verify local module paths, no runtime fetch/socket calls in game modules, and key input-lifecycle wiring. They are not browser playtests.

## Remaining limitations

- Actual WebGL rendering, visual composition, mobile pointer capture and audio were not exercised in a browser in this environment. First-run completion time is an estimate from simulation, not a measured novice playtest.
- The fixed camera follows smoothly but has no manual orbit. The scene uses procedural geometry rather than production art.
- Roads are a collision union with sliding boundary response; scenery outside them is decorative. There are no falls or jump mechanics.
- There is no persistent in-progress save. Only the fastest completed time is optionally stored in the browser.
- Keyboard controls use physical WASD positions, plus arrow keys. Touch controls are shown for coarse pointers.

See `SOURCES.md` for exact reused versions and modifications, `LICENSE.txt` for original work, and `RUN-LOG.md` for append-only implementation checkpoints.
