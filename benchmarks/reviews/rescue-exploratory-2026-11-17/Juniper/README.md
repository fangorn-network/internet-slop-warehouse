# Rescue Relay · The last signal (2.1.0)

Open **index.html** directly in a modern browser. Everything is embedded: no server, installation, account, network, audio, or assets to fetch. The page is the portable static artifact. Keep `v1-frozen/` to reproduce the original expedition; its `v1/index.html` remains the original 1.0.0 artifact.

Recover three marked components, install each in its matching tower, contact surveyor Vale after restoring all three signals, and escort them to southwest extraction. Repair towers in any order. The north relay opens the flood shutter; the southern detour is always available. Distinct component names and numbered markers connect each crate to its tower.

WASD/arrows or hold direction buttons to walk. E / Interact recovers, repairs or contacts Vale. F / Wait–follow calls Vale remotely. P / Pause stops the player and escort. Restart works during the mission and after victory. Touch buttons support pointer capture and simultaneous movement directions. Losing window focus or hiding the page pauses. There is no audio, so no mute is needed.

Use **Portable expedition save → Export save**, copy the entire RR2 string, and load it in a fresh copy of the page. There is no automatic browser persistence. Load validates before committing; rejection preserves the current expedition. See `MIGRATION.md` for old RR1 saves and extension policy.

## Reproduce and verify

Run from this directory with Node.js **22.21.1** (no packages):

```sh
node build.cjs
node test.cjs
node v1-frozen/test.cjs
node package.cjs
```

`build.cjs` embeds the checked-in sources into `index.html` deterministically. `package.cjs` generates the exact SHA-256 source/dependency/artifact manifest and verifies the frozen v1 hashes. `MANIFEST.json` pins every packaged source and runtime byte. No mutable URL or unpinned CDN exists. The v1 package retains its own README, build, source manifest, saves, license, and tests.

Node simulations and source/package checks passed. **Actual desktop/mobile browser play is unverified.** The run prohibits browser and localhost launches. `REPORT.md` records evidence and the remaining manual checks. License: CC0-1.0, including the supplied starter and reused navigation code; see `LICENSE` and `SOURCES.md`.
