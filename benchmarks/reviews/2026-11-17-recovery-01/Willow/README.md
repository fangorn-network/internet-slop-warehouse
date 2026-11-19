# The Midnight Conservatory

A static browser scavenger scene. Find the moon seed, rain bottle, and sun stone, then walk through the glowing gate at the top. Progress appears in the satchel and a live status message. Restart is always available. Use WASD / arrow keys, or the on-screen directional buttons on touch devices. Sound defaults off; the Sound button enables synthesized collection notes after a gesture.

## Launch

Serve this directory with any static HTTP server. For example, from `output/`, run `python3 -m http.server 8000`, then visit `http://localhost:8000` in a modern browser. This is a launch instruction, not a server verified in this environment. JavaScript modules require serving over HTTP rather than opening index.html directly. No build step or installation is required. Touch buttons appear for coarse pointers and screens at most 700 CSS pixels wide.

## Sources, dependencies, and modifications

All HTML, CSS, JavaScript, game rules, scene art, and synthesized sound were written for this artifact. No external assets, packages, fonts, copied source, or reused game components. No Internet Slop Warehouse resources were accessed. Runtime dependencies: modern browser Canvas 2D, JavaScript modules, Pointer Events, and optionally Web Audio. System fonts are used. Test dependency: Node.js built-in assertion module. Python is optional for local serving. No external network requests occur.

Source files in this output directory are supplied under the MIT license in LICENSE. No third-party modifications or attribution obligations apply.

## Checks and evidence

Run `node test.mjs` from this directory. Seven deterministic simulation checks cover locked exit, distinct and one-time collection, planter collision, normalized diagonal speed, step clamp and bounds, a complete walkable route to victory, post-win immobility, and clean restart. `TEST-RESULTS.txt` records actual execution. Both application modules also passed `node --check`.

Source inspection confirms HTML connects the canvas, restart and sound controls, progress display, and touch buttons to the application. Pointer capture and blur/visibility clearing prevent sticky movement; the audio context is created only by a key or pointer gesture. This is source evidence, not interaction verification.

Browser evidence: none. Browser launches and localhost sockets are known blocked in the assigned environment, so no browser installs, launches, screenshots, or server retries were attempted. Rendering, visual fit, touch behavior, screen-reader behavior, and actual audio remain unverified in a browser. The scene uses Canvas `roundRect`, supported by modern browsers.
