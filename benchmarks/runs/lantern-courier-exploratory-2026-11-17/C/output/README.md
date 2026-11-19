# Lantern Courier

A complete, local static Three.js game: deliver medicine to the Clinic, bread to the Hearth, and batteries to the Beacon through a flooded settlement. Carry one parcel at a time. The wide western causeway is safer; the narrow central storm cut saves travel time. Two moving storms recall you to your last safe lamp without losing cargo or completed deliveries. Your lantern grants 3.2 seconds of protection and recharges over 10 seconds from activation.

## Launch

From this `output/` directory, run:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000` in a WebGL-capable browser. HTTP serving is required for ES modules; opening `index.html` as a file is unsupported. No build, install, account, network asset, or backend is required. These launch instructions are for the recipient; a server/browser was **not launched** in the restricted build environment.

## Controls

- WASD or arrows: move, north is always up on the map.
- E: collect the nearby depot parcel, or deliver to its matching destination. Move left/right between the three depot parcels to choose.
- Space: light the lantern. Holding the key does not reactivate it. Watch its remaining protection and recharge below the button.
- Escape or Pause: pause/resume. The pause menu offers a full restart.
- Touch: drag the lower-left movement pad; use Collect/Deliver and Light Lantern.
- Sound off/on: synthesized optional audio, initially muted. Audio is created only after a gesture, and failure is nonfatal.

White dot = courier; pale blue dots = moving storms; gold ring = last safe checkpoint. Matching colored symbols mark parcels, destinations, and the manifest. Use the west loop to avoid the center storm; watch the east storm and light your lantern when crossing its path.

Finish all three deliveries for a time/recall result and a repeat-run challenge. Best result (fewest recalls, then lowest time) is stored locally when browser storage is available; Restart resets the entire current run, not this optional personal best.

## Verification

No extra packages required. From `output/`:

```sh
node tests/core.test.mjs
node tests/input.test.mjs
node tests/static.test.mjs
```

All **15 tests passed** using direct Node execution. `node --test` attempted child-process execution and failed generically in the build sandbox; invoking each file directly works. Logs are saved in `tests/*-results.txt`.

The complete collision-aware, input-driven simulation delivered all three supplies in **198.8 seconds, zero recalls**, on a safe-first route with scripted lantern timing. This supports the requested 3–5 minute scale; it is not a measured human playtest. The central segment took 15.9 seconds versus 31.1 via the western arc in a geometry comparison with hazard interaction disabled only for that comparison.

See [REPORT.md](REPORT.md) for evidence boundaries and limitations, [SOURCES.md](SOURCES.md) for dependency/source/license notes, and [RUN-LOG.md](RUN-LOG.md) for append-only checkpoints.
