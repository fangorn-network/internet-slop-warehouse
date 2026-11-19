# Lantern Courier

A static, local 3D browser game. Bring medicine to the west clinic, power cells to the east beacon, and seeds to the north glasshouse. The causeways surround a flooded settlement; the middle bridge offers a short storm crossing.

## Launch

Use a WebGL capable modern browser. From **this output directory**:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Any ordinary static HTTP server also works. Double-clicking `index.html` with a `file:` URL is not supported because the game uses ES modules. All runtime scripts, assets and styles are local. No build, package installation, account, backend, network asset loading, or paid API is needed.

This environment prohibited browser/local socket testing; the command is a launch instruction for the recipient and was not run here.

## Play

- WASD or arrow keys move; the camera follows with north at the top of the screen. On touch devices, drag the left joystick.
- E or the touch **Collect / Deliver** button interacts. You carry exactly one parcel. Match its color and symbol to its destination.
- Space or the **Lantern** button gives 3 seconds of protection, with an 11 second cooldown measured from activation. Holding the key does not repeat it. Unavailable presses show recharge feedback.
- The middle bridge is the shortcut. Purple moving funnels show the hazard footprint. The east causeway is the fully safe long route; a second storm roams the upper west road. Watch the map, wait, or shield through.
- Shelter lights save your recall location. Storm contact returns you there with your parcel and completed deliveries intact, plus a short grace period.
- P / Escape or **Pause** pauses/resumes. Blur or a hidden page automatically pauses. M or **Sound off/on** toggles optional synthesized feedback. Sound defaults off and starts only after a gesture.
- R restarts the entire run immediately. Pause also has a fresh-run button; the finish screen offers another run. Best time is stored locally when available.

The in-game introduction and HUD contain the useful rules, progress, next action, map, current parcel, cooldown, timer, and recall count. Audio carries no exclusive information.

## Files and sources

- `index.html`, `style.css`, `game.mjs`: original interface, procedural 3D art, input, camera, weather, synthesized sound, and scene.
- `core.mjs`: original deterministic game rules and authored route collision graph.
- `test-core.mjs`, `test-integration.mjs`: original verification tools, Node.js 18+ (tested using 22.21.1).
- `vendor/three.module.min.js`: supplied **Three.js 0.170.0**, unmodified, MIT. Source project: https://github.com/mrdoob/three.js/tree/r170 ; license retained in `vendor/THREE-LICENSE.txt`.
- No other reused assets, code components, fonts, textures, audio files, or runtime dependencies. System fonts are used. Canvas labels, low-poly geometry, rain and sound are generated locally. No warehouse content was accessed.
- Original source is licensed MIT in `LICENSE`; the vendor license remains separate.

## Verification

```sh
node --check game.mjs
node --check core.mjs
node test-core.mjs
node test-integration.mjs
```

Ten deterministic simulation tests cover matching/carrying restrictions, complete finish and reset, frozen paused/intro state, protection/cooldown rejection, both hazards, safe checkpoints, grace, constrained normalized movement, graph reachability, and a complete moved delivery route. The sample safe route completed in **136.4 simulated seconds over 443.4 meters**, excluding reading, decisions and interactions. This supports a short journey but does not establish real player pacing.

The integration test uses real Three.js geometry/material classes and a small DOM / renderer stub. It constructs the actual scene and runs **106 frames**, checking keyboard and touch wiring, held-key rejection, pause, blur, pointer cancellation, hidden-page pause, unavailable WebAudio, finish UI, best record, and restart. Static checks verify local dependencies and element references. It performs **no actual WebGL rendering or browser layout**.

## Remaining limitations

- Real browser play, rendered appearance, occlusion quality, mobile layout/performance, actual touch gestures and the intended 3–5 minute new-player pacing are **unverified**. Browser and localhost sockets were unavailable; no browser tooling was installed or retried.
- The camera keeps a fixed north-facing angle; it has no orbit control. Keyboard and touch are supported; gamepad, screen-reader navigation of the 3D world, and remapping are not implemented.
- Procedural point lights and geometry may cost performance on older phones. Rendering pixel ratio is capped, shadows are limited to one directional light, and reduced-motion preference disables rain and camera smoothing.
- Progress is in memory until the page closes; only the best finish is stored locally. Storage/audio failure is tolerated. A lost WebGL context shows a reload instruction.

See `RUN-LOG.md` for the append-only implementation record and `REPORT.md` for the acceptance summary.
