# Dead Air Atlas · remix and architecture guide

A complete **solo / 2–4 player** supernatural investigation in real OSM streets.
Version 0.3 begins on Bayfield waterfront, Wisconsin. This is an original story:
the town lost an hour, its water towers keep broadcasting it, and the players
recover three impossible recordings to restore the relay network.

Original code, generated tower and original procedural art are **CC0-1.0**.
OpenStreetMap data is **ODbL-1.0**, with visible contributor attribution. Three.js
and Trystero are MIT dependencies. Do not relabel map data as CC0.

## Run the playable game

```sh
node publish-batch.js parts/dead-air.parts.json --local /tmp/dead-air-preview
python3 -m http.server 8080 --directory /tmp/dead-air-preview
```

Open `http://localhost:8080/dead-air-atlas.html`. The local build uses local
catalog files and pinned Three.js 0.170.0 from jsDelivr. The bundled Bayfield
map works without Overpass; the demo still needs its JS/model/texture files.
The portable source kit includes all those files, with Three.js loaded from CDN.

Choose **Enter the district**. Open **Atlas**, then tap a recording or use the
Notebook's **Follow streets here** buttons. Automatic walking follows an A*
route on mapped streets; movement keys or the thumbstick take over immediately.
Near a trace, tune the indicated radio channel, leave the light on, and scan.
After three recordings, follow the atlas to a water tower and inspect it.
That closes the first case and opens travel to the other mapped towers.

WASD / arrows walk, Shift runs, E inspects/restores, Q scans, 1/2/3 tune, F toggles
light, R replaces a cell, M opens the atlas, Tab opens the notebook, Escape opens
the field desk. Wheel zooms. Phones use a larger pointer-driven thumbstick: the inner region walks and
the outer ring runs. Tap **Run** to lock running, and tap the next-signal chip
to automatically run along streets (tap again to stop). Actions have 44px
touch targets, with portrait and landscape layouts. The enclosing warehouse's Fullscreen button gives the
iframe the entire available viewport, including its iOS-style full-window fallback.

## What is already composed

- `health`: per-player clarity, recovery, damage and recall on zero HP.
- `resource-inventory`: a shared atomic cell/evidence bag.
- `objective-journal`: evidence → relay prerequisite progression.
- `score-ledger`: 50 points per unique trace, 100 per unique restored relay;
  idempotent event IDs prevent duplicate awards across retries and peers.
- `ability-clock`: scanner cost, cooldown and serialized remaining timer. Reuse
  it for an attack by providing an onActivate damage hook and a resource cost.
- `save-codec`: bounded, validated save codes. No browser storage permissions.
- `osm-district`: original OSM conversion and geographic coordinates.
- `street-navigation`: intersection-aware graph and A* routes, with street-edge
  projection for arbitrary endpoints and snapping for generalized tile junctions.
- `osm-vector-district`: bundled OpenFreeMap fallback; original adapter CC0 and
  maintained decoders BSD-3-Clause/ISC, with full notices.
- `osm-town-view`: environment, semantic materials, avatars, street furniture,
  inferred roofs/windows, player light cones and foreground occlusion fade.
- `water-tower`: reusable meter-scale tower generator and stand-alone GLB.
- `p2p-case-session`: host-authoritative intentions and exact world transfer.
- Existing Northwoods geometry/textures, scanned CC0 brick/snow, Poly Haven
  boombox and synthesized wind supply the environment and clue props.

The case rules have **no DOM, renderer, network or storage dependency**. The
browser UI chooses inputs, calls commands and renders snapshots. An agent can
replace the UI or renderer while retaining the tested game and network contracts.

## Minimal simulation

```js
const district = osm.parse(overpassJSON);
const game = caseModule.attach(district, {
  modules: {
    'osm-district': osm, health,
    'resource-inventory': inventory,
    'objective-journal': objectives,
    'score-ledger': score,
    'ability-clock': abilities
  },
  onEvent: ({type,text}) => console.log(type,text)
});

game.update(dt, {solo:{x:0,z:-1,run:false}});
game.command('solo', {type:'tune',channel:1});
game.command('solo', {type:'pulse'});
game.command('solo', {type:'interact'});
const save = game.snapshot();
if (game.validateSnapshot(save)) game.load(save);
```

Actions are intentions, never client-supplied rewards. The rules check location,
player existence, resource costs, cooldown, channel and light before awarding
anything. Unknown actions fail. `light`, `cell`, `travel` and `cross` are the other
commands. `travel` must begin at a tower after the first repair. `cross` is only
accepted near a district boundary. Both produce a `state.travel` request; the
host browser fetches a new district, calls `applyDistrict()` and replicates it.

For a new mystery, change the three `story` records at the top of
`dead-air-case.js`, edit the corresponding UI frequencies and the case identifier,
then change which OSM classifications `osm-district.js` selects as clue sites.
Use a fresh game/logic ID and P2P appId for an incompatible remix. For a shooter,
keep the map, inventory, HP and networking, replace the trace commands with
projectile or melee hit rules, and use `ability-clock` for attack rate/ammo.

## Town search, district streaming and real water towers

The desk accepts a town or location name, then presents matching named places
to choose from. Search only runs on explicit submit, through the cached Photon
adapter at `/world/places?q=...`; it does not query on every keystroke. Results
retain OSM attribution and are cached for 24 hours. The selected place supplies
coordinates internally, then the game queries the warehouse's
`/world/osm?lat=...&lon=...` adapter. The service snaps to 0.01° cells and queries
an approximately 1.8km-square district, plus water towers within 8km. It validates
coordinates, bounds query size, coalesces concurrent requests for the same cell,
and caches successful maps for 12 hours. It uses the documented Private.coffee
instance first, with one bounded attempt against the main Overpass instance on
failure; it does not fan out repeated queries. If both query providers fail, the service decodes a bounded OpenFreeMap vector
district using maintained @mapbox/vector-tile and pbf decoders. The browser can
also use the same published decoder directly if the proxy fails. At most nine
z14 tiles and four parallel requests are used; OpenFreeMap/OpenMapTiles credits
are shown for that source. Confirmed mapped towers from earlier districts are retained/reprojected when a
new source omits them, so travel still arrives at the same geographic relay.
Vector maps contain tile-clipped footprints and
generalized roads/POIs and may omit water towers. The frozen vector fixture is
published separately so this fallback is reproducible. It does not poll Overpass every frame,
request map tiles, scrape imagery or acquire a user's GPS position.

The map is **a real footprint/tag layout with inferred rendering**, not a
photographic reconstruction. OSM building heights/levels are used when present;
otherwise defaults are inferred. Shops, hospitals, civic buildings, schools,
homes and industrial footprints have visual categories. Node POIs inside a
footprint can refine that building's category. Multipolygon outer rings and
courtyard holes are supported. Footprint coverage and semantic detail vary.

The browser loads one district at a time. At its edge, the atlas's **Continue into
next district** action asks the host to load the next geographic cell. Once a
relay is restored, **Travel** at a water tower loads the destination tower's
district. The **whole party travels together**. This is streamed, bounded co-op
exploration, not independent continent-wide multiplayer streaming or a persistent
MMO. New cases use `startAtRelay:true` to spawn safely beside a mapped local tower
when one is known. A sparse map without a local tower gets an explicitly **fictional portable
survey relay**; we never pass it off as a mapped water tower. Sparse clue fallbacks
are also labeled fictional. Water and building footprints block walking;
mapped bridges and elevated buildings have traversal exceptions.

Public Overpass can be busy or unavailable. A failed custom-coordinate request
keeps the current case and gives a recoverable error; the Rhinelander button
loads the packaged district. The default snapshot is an attributed, inspectable
JSON asset. No Google imagery or imagery license is involved. For large-scale
traffic, use a provisioned OSM data pipeline rather than relying on the public
Overpass service. Endpoint source: `worker/osm.js`.

## P2P contract and testing

The host shares a room code containing an ephemeral room identity and secret.
Invite holders join through Trystero/Nostr discovery and WebRTC. Only host roles
may write the atlas metadata and case snapshot. Guests send movement and action
requests; the host validates and simulates them. Shared discoveries and rewards
are idempotent. Stale input expires. State snapshots run at about 5Hz; avatars
interpolate for presentation.

The full normalized map is larger than Trystero's signed-state limit. The
`atlas` state therefore contains only fingerprint/length/chunk metadata. Guests
request validated **24,000-character chunks** from the host over the peer channel,
then import the exact map before applying its corresponding snapshot. This
handles arrival order, late joining and map changes without guests making
independent OSM queries. The case state has a separate bounded budget. Limits
include four players and a 48-recording case archive.

The host must remain online and its tab active. No host migration, persistent
world server, cross-room matchmaking, global map presence, NAT traversal
guarantee, terrain elevation/DEM, building interiors, surveyed façade geometry
or shared-world edit conflicts are implemented. A host can edit its own game;
authority protects the group from guest-written state, not from an untrusted host.

```sh
npx vitest run parts/dead-air.test.js worker/osm.test.js
node scripts/test-dead-air-browser.mjs
node scripts/test-dead-air-p2p.mjs
```

The browser scripts use Chrome and `playwright-core`; set PLAYWRIGHT_MODULE to
its installed entry path. Browser QA follows the real UI routes, tunes/scans
three traces and repairs the relay. A separate **real three-peer WebRTC test**
checks movement, evidence, scores, late join, host-only writes, map transfer and
host departure inside opaque-origin iframes. Artifacts are in `artifacts/dead-air/`.

## Publication and source assets

`parts/dead-air.parts.json` is the reviewable batch. It pins all reused parts;
original code/art records are CC0, while `rhinelander-osm` is distinctly ODbL.
The source-kit ZIP includes the original and vector-derived ODbL snapshots, this guide, the runnable game, editable modules,
model rebuild script, maps, assets and third-party notices. Copy and modify it
with an agent; no game backend or model API is needed to play the bundled case.

Town search uses the Photon demo service with explicit searches, caching and
a configurable GEOCODER_URL. Respect reasonable service load for larger deployments:
https://github.com/komoot/photon#demo-server .

## Version 0.2

Town/location search replaces manual latitude/longitude fields. The default
case begins safely beside a mapped Rhinelander water tower. Mobile navigation
adds outer-stick sprint, a Run lock, a one-tap next-signal route/stop control,
responsive landscape placement and pointer cleanup on focus loss.

## Version 0.3: exploration and Relay Skirmish

The bundled default is now Bayfield waterfront, Wisconsin. Street names and mapped
address labels appear in the 3D scene; shops, commercial buildings, homes,
warehouses and hospitals have distinct inferred details. Cosmetic walkers and
cars follow streets. This is generated scenery, not live real-world activity.
No imagery or terrain elevation is supplied.

Search a full street address with town/state (or any town/place name). Address
results retain house number, street and postcode when supplied by OSM/Photon.
Selecting an address starts on nearby unobstructed streets, rather than moving
the player to a water tower. Coverage varies; unmatched addresses can be searched
by nearby street or town. Geocoding queries go to the cached public map service.
`osm-district.startNear(district,lat,lon)` is the reusable address-spawn logic.

Mobile has a compact HUD, context action, Tools tray and Menu notebook/settings.
Pinch the world to zoom the camera. Atlas supports anchored pinch, drag to pan,
zoom buttons, Locate me and Fit district; dragging never selects a marker.

## Relay Commons: the calm successor

Open `relay-skirmish.html` for Relay Commons. It evolves the earlier arena into
a peaceful first-person RPG prototype: discover mapped places, gather fictional
supply drops and construct a shared camp. Weapons are holstered; optional ranged
sparring is chosen only for a new expedition. No attacking bot, timer or score race.

Read `relay-commons/QUICKSTART.md` in the source parts for model conventions,
construction, exploration progression and source contracts. The game uses the
published semantic facade kit, settlement model library and settlement rules.
Saved expeditions include the exact mapped world; export before closing.

The underlying `relay-skirmish` rules remain available as a separate reusable
combat engine. Its health, ranged rays, armor, ammo, cover and PvP protocol are
composed by `relay-homestead`, alongside calm camp and exploration rules.
