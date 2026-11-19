# Build report

Delivered a standalone browser game with a third-person following camera, procedural coastal settlement, readable sheltered route, exposed shortcut, two moving storm wisps, three parcel/destination pairs, safe checkpoints, and a timed protective lantern. HUD, minimap, in-world labels, completion markers and visual feedback support sound-off play. Desktop keyboard and touch controls share the same movement and ability state.

The run includes an in-game introduction, pause/resume, mute, complete restart, finish time and recall totals, plus an optional locally saved personal-best time. No paid service, external runtime asset, sign-in, backend, or public deployment is involved.

Validation: **7 model tests and 2 packaging tests pass**, plus JavaScript syntax checks. A deterministic safe-route simulation completes in **166.2 game seconds with zero recalls**. Model tests exercise complete delivery progression, mismatched destination rejection, exclusive carrying, checkpoint recall and retention, repeated-hit grace, lantern gating and expiry, pause, bounds, diagonal normalization, finish and replay. Package checks cover local references and input lifecycle wiring.

**Browser QA was unavailable.** Rendering, actual novice completion time, touch usability, audio and visual composition remain unverified in a real browser. No browser launch, localhost server, install retry or unsupported play-verification claim was made.

Launch: serve this folder with `python3 -m http.server 8080` and open `http://localhost:8080`. Full instructions and limitations: `README.md`. Dependency licenses and exact source versions: `SOURCES.md`. Append-only checkpoints: `RUN-LOG.md`.
