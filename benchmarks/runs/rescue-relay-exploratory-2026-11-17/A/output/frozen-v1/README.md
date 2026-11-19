# Neutral Rescue Relay fixture

Original benchmark starter, not copied from any prior condition output or warehouse part. All arms must receive these identical bytes, including the update and saves. This fixture is prepared for calibration; **actual browser baseline verification is pending**, so it is not yet ready for scored challenge 2 runs.

Open `v1/index.html` directly in a modern browser, or serve this folder with an ordinary static HTTP server. The file contains its CSS, core and app source inline, with no imports, build requirement, network runtime, assets, account or audio. Use WASD/arrows or directional buttons. Approach each signal and press E/Activate; then reach southwest extraction. Pause, restart, export and load controls are included. The initial objective intentionally has no component inventory or escort: those are the challenge additions.

## Source and build

- `v1/core.cjs`: authoritative movement/state/objective/save implementation. Its CommonJS wrapper also exposes `globalThis.RescueRelay` in a browser.
- `v1/app.js`, `style.css`, `template.html`: original presentation and controls.
- `build.cjs`: inlines those exact files, constructs the documented v2 core update, generates three saves through normal simulated movement, and hashes the package.
- `v2-update/core.cjs`, `MIGRATION.md`: breaking movement API update and migration contract. The original v1 page is intentionally not silently updated.
- `saves/start.txt`, `partial.txt`, `completed.txt`, `expectations.json`: portable RR1 fixtures, with expected state.
- `test.cjs`: deterministic baseline behavior, migration, packaging and integrity checks.

From this directory:

```sh
node build.cjs
node test.cjs
```

The index is generated from the same core used by Node tests; no separate divergent game-logic implementation exists. The manifest excludes itself and the optional captured test output. Rebuilding from unchanged source produces the same package content and saves.

## Save contract and trust

RR1 envelopes contain base64url JSON plus an FNV-1a checksum. The checksum detects accidental corruption; it is **not** authentication, authorization, encryption, anti-cheat, or a publisher signature. Validation rejects invalid schema, wall/out-of-bounds player positions, duplicate/unknown signal IDs and inconsistent completion. The UI commits loaded state only after full validation, leaving the current expedition unchanged on rejection. Export normalizes signal order; order has no mission meaning.

## Verification limits and operator checklist

Node simulation and packaging checks cover all six activation orders, walking routes, collision/bounds, signal deduplication, extraction gating, clean reset by fresh state, three save fixtures, rejection, v2 compatibility and lag behavior. These do not establish graphics, real keyboard/touch, pointer capture, focus behavior, responsive layout, or browser save controls.

Before scored runs, an operator must play a complete v1 route on desktop and phone-sized viewports, test pause/restart, all three save loads and rejected corruption, and confirm baseline controls. Record browser/device evidence and freeze a new manifest if any fix is made. Browser/localhost restrictions prevented that check in the preparation environment. No browser installs or launch retries were attempted.

V2 is supplied now for identical availability from task start in the initial challenge calibration; if testing a timed update arrival later, preregister the same task-relative release point for all arms.
