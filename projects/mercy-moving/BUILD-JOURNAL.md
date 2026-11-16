# Mercy, Moving — build journal

## Brief, 2026-11-14
An inhabited American town apparently unchanged since the 1940s/50s, carried by an immense walking platform. Silver diner, neon, motel pool abandoned since 1977, stone church, forlorn post office, peeling houses, wet asphalt, collapsed chainlink, rusted cars. Modern PS2 direction: restrained geometry, believable scale and human motion, contemporary atmospheric rendering. Eventual night visitors look human, walk slowly, cannot be killed, and cannot enter a sealed enclosure protected by a cave necklace.

Milestone 001: safe, explorable atmosphere and multiplayer foundation. No attacks, cave, necklace, building economy, or offline progression in this milestone.

## Warehouse discovery
Searched live ISW for realistic animated humans; abandoned American town assets; shared settlement building; P2P transport; and weathered textures. Relevant search hits: Mosslight Commons, p2p-homestead, trystero-027, seeded-random, clip-animator, fps-controls, survival-kit, settlement-rules, and Poly Haven texture assets. Existing OSM worlds are useful references, but their real mapped footprint pipeline is a poor fit for an authored fictional walking town.

Reused source modules locally with attribution and preserved license notices:
- seeded-random: deterministic construction detail (CC0)
- clip-animator: crossfaded Idle / Walk state (CC0)
- fps-controls: keyboard, drag, pointer lock and touch look (CC0)
- p2p-homestead: host-authoritative simulation transport (CC0), adapted room/channel namespace for Mercy
- Trystero 0.27.0: bundled WebRTC/public relay transport (MIT; see vendor/TRYSTERO-LICENSES.txt)

Live catalog publisher: 0x7b16387c5a8c514880e48bcacd52782fcf9da936, repo internet-slop-warehouse.
Pinned source records and CIDs: see warehouse-parts.json for the complete live discovery results. Local copies preserve the existing repository implementation and may differ from published versions; do not claim byte identity without hashing.

## Architecture choices
- Authored town, one accessible diner interior; other buildings are exterior studies.
- Deck-local x/z simulation; animated legs and low-frequency camera displacement suggest platform motion. No moving rigid-body simulation or scrolling landscape yet.
- Separate renderer-free session for collision, doors, bounded inputs and snapshots; the same session runs under solo and host simulation.
- Guests send input intentions, host resolves movement/door requests and sends signed state at 5 Hz. Existing adapter requires the host to stay connected; no TURN guarantee or host migration.
- First-person default; optional third-person reveals an animated human reference model.
- Procedural seeded canvas materials rather than remote texture dependencies. Sparse instanced tapered weeds, rain line segments, exponential fog, bloom, cinematic grain/vignette, synthesized rain and mechanical bass.
- Soldier.glb from pinned Three.js r170 examples is a reference actor, not final civilian art. Keep source and notices; civilian replacement is a priority.

## Observed issues and corrections
- Sandbox denied network DNS, listener sockets, and Chrome launch; reran necessary operations with native escalation.
- Initial road texture stretched across whole deck. Applied explicit road/grass texture repetition after screenshot review.
- Initial rectangular weed planes looked like posts. Changed to tapered triangles.
- Keep graphics testing separate from transport testing: lightweight two-peer harness avoids software WebGL costs obscuring networking results.

## Validation
See artifacts/mercy-moving/browser-qa.json, p2p-qa.json when produced, plus screenshots. Session tests cover collision, diagonal input normalization, invalid input, door proximity and blocking, snapshot bounds, maximum players and restoration. Browser checks cover desktop movement, camera toggle, pause and touch movement. Rendered snapshots are inspected manually.

## Candidate future skill structure
Do not turn every one-off design decision into a rule. Extract proven steps: discover parts → preserve provenance/licenses → isolate simulation → build an atmospheric slice → verify animation and collision → test real peer transport independently → inspect screenshots → package pinned dependencies → present before public warehouse publication. Preserve failed attempts and reasons in references rather than the main instructions. Author a skill only once this sequence has been exercised through publication and a second iteration.

## Milestone 001 results
Desktop and mobile browser checks passed without page errors. Real WebRTC over public signaling passed guest movement, shared door command, and host departure. Session tests passed. Screenshots prompted road tiling and tapered weed corrections. Packaged a self-contained application/model HTML with external pinned Three.js imports. The portable build is not a permanent catalog publication. Civilian character art, rain shelter occlusion, final creature rules, meaningful platform travel and frame-time profiling on real hardware remain next-iteration work.

### Skinned bounds and packaging corrections
Animation names loading did not prove a visible character. Initial Box3 bounds were computed before bone matrices were updated, producing a nearly flat 0.004 m height and an enormous normalization multiplier. Fixed by updating world matrices and skeletons, then using precise skinned bounds before scaling. Verified a 1.832 m reference height and visible third-person character; flipped the native model heading to align with movement. Preserve a screenshot check for this class of bug.

HTML packaging initially used String.replace with the bundle as a replacement string. Dollar replacement tokens inside the bundled transport corrupted the script. Switched to a replacement callback so the bundle is inserted literally. Always load the packaged artifact separately from the source project.

Final isolated portable test passed: standalone HTML loaded, model height 1.832 m before normalization, first/third-person scene rendered, no page errors. A single fresh graphics page avoids accumulated software-rendering context pressure in this test environment. Public-relay P2P verification is separate and passed.

## Art study 002 — feedback and publication, 2026-11-14
User reported the first build felt like an internet Flash game rather than coherent modern PS2 atmosphere. Inspected their Pinterest board images (street fog / hotel) directly; Instagram URL was inaccessible. Key corrections: natural low-saturation gray fog rather than teal darkness, photographic weathering at believable metre-scale UVs, modest signs and bloom, articulated architectural trim, ground wear, period sedan silhouettes and stronger background masses. Generated an original 3x2 albedo atlas via imagegen, cropped to 256px tiles at runtime. Atlas is an original generated project asset, not a borrowed reference image. Added original articulated civilian figures in place of the Soldier reference; these remain provisional character art. Added 800px internal render width and restrained saturation/grain treatment. Source desktop/mobile checks and final portable load check passed without page errors.

User explicitly requested "publish it as is" before going to bed. Froze the current bundle and published without adding the newly generated pine cutout; pine-next-pass.png is parked for the next iteration. Existing cone-tree geometry remains in this release. Reference downloads under references/ are research-only, not included in the game or licensed as original art. The civilian and environment art still need user review; do not claim the aesthetic is finished.

Publication confirmed by signed repository read-back: bafyreicy7onjjkpwhtmelzlymgld363rhu7bo5xafyjs2wkzt7zzywzhia; transaction 0x6db468fd6e0cf1b3a168169989bc3dbb727eb5be082e6f09108a90401e3b3316. Final portable bundle passed load and camera checks without page errors.

## Exploration brief — November 15, 2026
Read `mercy-ideas/ideas.md` (requested index absent) and inspected current geometry/simulation. Recorded asset requirements, live warehouse candidates, licensing boundaries and implementation sequence in ASSET-PLAN.md. Repaired mirrored post-office sign and diner lower facade/trim across the doorway; matched static wall colliders to the two-metre door and added door rails/lower panel. NPC cadence now follows analytical route velocity, turning is eased, and player cadence follows session speed. This is the first repair slice; additional interiors, claims, soundscape and expanded map remain pending. Syntax checks and existing session tests pass.
Desktop/mobile browser checks passed with no JavaScript page errors: walking, camera toggle, pause and touch movement. Evidence refreshed under artifacts/mercy-moving. Browser console reported two missing resources; these checks do not validate all facade details or doorway traversal.


## Enterable town and shared homes — November 15, 2026
Replaced solid house, chapel, post-office and ground-floor motor-court masses with hollow shells generated from building-layout.js. The layout is renderer-free and shared by simulation. building-shells.js owns matching visible walls, colliders, glazed doors, window openings and simple furniture. Preserved existing roofs/steeple and exterior silhouette, moved signs clear of openings, removed the upstairs motor-court collider that previously blocked ground-floor traversal, and made diner/porch floors flush with the simulation walking plane.

Added 13 independent host-authoritative doors and 12 claimable spaces; diner stays communal. E operates the nearest doorway; Q or the contextual touch control claims/releases a home. One home per visitor; claims do not lock doors or confer protection. Reject remote claims, unknown actions, out-of-range doors and door closure through any visitor. Snapshot validation covers door cardinality, claim ownership and unique owners. Peer departure releases claims. Hosting remaps the solo owner; continuing solo keeps the departing local visitor's claim only. Protocol identity advanced to mercy-moving.v2, requiring matching builds.

Painted interior liners and solid floors replace exterior siding indoors. Vegetation excludes building footprints; rain resets above building roofs and the existing rain low-pass filter muffles it indoors. Motel upper story remains a non-enterable facade mass; no stairs or fabricated access in this pass. Fuller sound layers and civilian art are separate pending work. All new geometry/code original CC0; no external assets imported.

Validation: seven simulation tests pass, covering movement, all door records, occupied-door refusal, claim contention/limits, ownership remapping, snapshot validation and failed-connection recovery. check-buildings.mjs uses the actual rendered world colliders to walk into and out of all 13 spaces, validate closed-door blocking and claim/release each eligible interior; it reports no missing required resources or page errors. Desktop/touch movement, camera and pause checks pass. Real public-signaling WebRTC test passes through the actual mobile game UI: guest touch movement, shared door, keyboard claim, touch release/reclaim, contention, host departure and continuation solo with only the local home claim preserved. Portable HTML load check passes. Screenshots and JSON reports refreshed in artifacts/mercy-moving. Final package rebuilt after recovery handling; permanent publication unchanged and manifest marked unpublished-update.


## Exploration study 003 publication — November 15, 2026
User explicitly requested publication after reviewing the enterable-town update. Published the existing mercy-moving entry on baseSepolia using the reviewed portable HTML, with the previous release pinned as parent and existing warehouse dependencies credited. Record CID: bafyreidtr3eh6rfq2t5wrfj4ug32fuv62g7tj6ijvpjonclg2mhl4d57gy. Transaction: 0x0af524c4b0d3f2a775ad4313069b8b184762f93f30f5e15d479df80f24007075. Previous receipt preserved in warehouse-release.json.
Post-publication verification passed: new record appears in the warehouse index; hosted JSON is accessible; its HTML exactly matches the reviewed local artifact, includes study 003 and the claim control, and embeds the atlas. Evidence: artifacts/mercy-moving/published-qa.json.
