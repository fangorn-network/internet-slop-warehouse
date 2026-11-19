# The Last Conservatory

A small static browser scavenger game. Find the Sun seed, Tide glass, and Moon dial, then enter the northern gate. Relics collect automatically when touched. The three inventory chips show progress.

## Launch

Serve **this output directory** using any static server, for example:

```sh
cd /home/driemworks/fangorn/internet-slop-warehouse/benchmarks/runs/2026-11-17-recovery-01/C/output
python3 -m http.server 8080
```

Open `http://localhost:8080` in a modern browser with ES modules, Canvas 2D (`roundRect`), Pointer Events, and optional Web Audio. No installation, build process, internet connection, or third-party runtime dependencies are needed. This sandbox cannot bind localhost or launch a browser; execute the launch command on a machine that permits it.

Click **Enter the conservatory**, then use WASD / arrow keys or hold the on-screen direction buttons. Touch controls also support mouse and simultaneous pointers. Collect all three relics and walk into the northeastern gate. **Restart** resets the expedition. **Explore again** starts another game after victory.

Audio defaults off. **Sound off** toggles it on; the Web Audio context is created only inside a user gesture. Audio support is optional. Input clears on focus loss, visibility loss, and pointer cancellation.

## Verification

```sh
node test.mjs
node --check app.mjs
node --check game.mjs
```

See TEST-RESULTS.txt and REPORT.md. Tests execute the actual core movement and collection code, using BFS routes around collision geometry. A separate DOM/Canvas/WebAudio substitute exercises the browser adapter. Desktop and mobile browser rendering, physical touch behavior, and audible playback remain unverified.

## Dependencies and licenses

Only a browser is required at runtime. Tests use Node built-ins. Python is an optional static server, not shipped or required by the game. System fonts are used. All visuals are procedural Canvas drawings; sound uses synthesized sine tones. There are no remote URLs in the playable artifact.

See SOURCES.md for frozen source identifiers, license and modification information. The local `vendor/collect.mjs` file is reused unchanged from the warehouse's CC0 source. Other game files were authored for this task and are released under CC0-1.0 (LICENSE).
