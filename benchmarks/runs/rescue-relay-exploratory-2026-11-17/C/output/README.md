# Rescue Relay · Return Signal 2.1.0

Open **index.html** directly in a modern browser. Everything needed at runtime is inline: no server, installation, network, account, audio or external assets. Keep this entire folder to retain editable sources, exact dependencies, tests and the frozen original expedition.

Walk with WASD/arrows or hold the touch direction buttons. Approach a diamond cache and press **E / Recover**. Match its number and component to a triangle tower and press **E / Repair**. Choose any repair order. North needs the induction coil, East the prism lens, South the power cell. North repairs drain the flooded central crossing; the outer routes remain open before that repair.

When all three towers work, the surveyor's camp signal resolves northeast. Approach and press **E** to begin the escort. **F / Wait-Follow** sends a radio command from anywhere after meeting them. Lead them to the southwest extraction square and wait there for them to arrive. The surveyor routes around ruins. **P / Pause** stops the mission; leaving the window pauses too. Restart is available during the expedition and after extraction. There is no audio or timer.

Use **Portable expedition save → Export save**, copy the whole RR2 string, open a fresh page, paste and load. A valid load replaces the current expedition. Rejected input leaves it unchanged. Sample upgraded and extracted saves are in `saves/`; supplied RR1 fixtures remain under `frozen-v1/saves/`.

## Reproduce

Node 22.21.1 was used; no npm packages or installation are needed.

```sh
node build.cjs
node test.cjs
node ui-smoke.cjs
node manifest.cjs --verify
```

`build.cjs` produces identical `index.html` bytes from checked-in source. `manifest.cjs` without arguments regenerates the exact SHA-256 source/artifact inventory. `frozen-v1/v1/index.html` is the unchanged original standalone game. Its original builder, saves, core, update instructions and manifest are preserved together; do not substitute the v2 core into that v1 page.

See `SOURCES.md` for licenses and dependency pins, `MIGRATION.md` for state policy, `REPORT.md` and `TEST-RESULTS.txt` for evidence and limitations. Actual desktop/mobile browser play remains unverified: browser/localhost access is blocked in this environment and was not attempted.
