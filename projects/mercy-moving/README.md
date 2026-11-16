# Mercy, Moving
A first exploration study of a forgotten American town on an immense walking platform.

From the repository root:

```sh
node projects/mercy-moving/serve.mjs
```

Open http://localhost:4177. Uses the repository's installed Three.js 0.170.0; no new installation is needed. Three.js is served locally. The optional Google Fonts request can fail without preventing play; system fallbacks apply.

WASD to walk, drag to look, double-click for pointer lock, E to observe or open/close the nearest door, Q to claim/release the building you are inside, V for third-person, Escape for notes/pause. Touch has movement, use, and contextual claim/release buttons, plus drag-look. Walk north past the motel to the ROAD ENDS sign to look down at the platform legs.

Use Field Notes → Bring someone → Host. Copy the entire invitation to another browser's Join input. Four peers maximum; public relay/ICE connectivity varies. Host must remain open. The host simulation continues while the host is in the notes menu so guests can explore. Leave restores solo exploration and keeps your home claim; other visitors’ claims are released. Each visitor may claim one place at a time, and must release it from inside before choosing another. Departing visitors release their claims. Claims mark a home without preventing visits or protecting it. There is no persistence after reloading yet.

Implemented: authored town; 13 enterable ground-floor spaces (diner, six motel rooms, chapel, post office, four houses); simple furnished interiors; shared doors and home claims; sheltered rain filtering and roof occlusion; original articulated civilian figures; fog/rain/neon; synthesized rain and platform sound; deck edges and animated legs; collision; first/third-person; optional host-authoritative P2P.

Not implemented: lethal visitors, cave, necklace, protected shelter rules, economy/building, save/load, actual world travel or host migration. Motel upper-storey access and detailed interior layouts remain unimplemented. The original low-poly civilian figures are provisional and need a dedicated character-art pass. Gait uses a fixed walking speed; Shift is not a sprint in this build.

Portable build: `node projects/mercy-moving/package.mjs` produces `artifacts/mercy-moving/mercy-moving.html`, with the generated material atlas and application embedded and Three.js pinned to a CDN.

Verification:
```sh
node --test projects/mercy-moving/session.test.mjs
node projects/mercy-moving/check-browser.mjs
node projects/mercy-moving/check-buildings.mjs
node projects/mercy-moving/check-p2p.mjs
node projects/mercy-moving/check-browser.mjs --portable
```
Browser scripts use the existing /tmp/warehouse-validation Playwright install and system Chrome. Run the server first. Evidence is in artifacts/mercy-moving.

Provenance and process: BUILD-JOURNAL.md, warehouse-parts.json, LICENSES.md. Published to ISW as mercy-moving on baseSepolia; see parts/mercy-moving.parts.receipts.json for the pinned release receipt.

Building definitions and doorway dimensions live in building-layout.js; building-shells.js constructs matching visible walls and collision. Co-op protocol v2 includes door arrays and claims and requires peers to use the same build. Exploration study 003 is published under the existing mercy-moving catalog entry; warehouse-release.json and parts/mercy-moving.parts.receipts.json contain the new receipt.
