# the internet slop warehouse

Browser games (three.js mostly) built from shared parts: games, assets and logic. Each part is published to Fangorn by its author, in their own `internet-slop-warehouse` repo. An indexer ([westmarch](https://github.com/fangorn-network/westmarch)) follows that repo across every publisher, including publishers it has never heard of, and publishes its view back to Fangorn. The page finds that view on chain, so it can be hosted anywhere as plain files.

Needs Node 22.13+ and `npm install` (westmarch comes from npm, `^0.3.1`).

On Base Sepolia, as your fangorn CLI identity (`~/.fangorn/config.json`):

```sh
NETWORK=baseSepolia node publish.js games/cube.html
NETWORK=baseSepolia node publish.js games/cubes.html --parent cube   # a remix, pinned to the version it forked
NETWORK=baseSepolia node seed.js                                     # the warehouse's seed parts (parts/parts.json)
NETWORK=baseSepolia node mine.js                                     # what you've published, from the chain
NETWORK=baseSepolia node index.js app.baseSepolia.json               # follow, index, publish the view
python3 -m http.server -d site 8080                                  # or host site/ anywhere
```

On the sandbox (`npm run sandbox` in westmarch), leave out `NETWORK` (`AS=bob` publishes as bob), and use `app.json`. The page reads `./view.json` whenever the site serves one, as the local indexer's `view` file and the Worker below both do. Only otherwise does it go to the chain, which the browser bundle can only reach on the public networks.

- **A part** ([part.js](part.js)) is a `game` (its HTML, stored as `{ html }`), an `asset` (the file itself, with `mime`) or `logic` (an ES module, stored as `{ js }`, labelled with its exports, options and hooks so search finds it by behaviour). Its record pins the exact version of everything it remixes (`parent`) or builds on (`uses`).
- **Know-how is a part too.** A `skill` is an Agent Skills `SKILL.md` (frontmatter `name`, `description`), stored as `{ md }`, that Claude Code or Codex installs from a skills folder; a recipe is a skill tagged `recipe` whose `uses` pins its parts. A `source` part is a code file mirrored from elsewhere (stored as `{ code }`) and must carry `origin: { repo, commit, path }` and its upstream license. Seed skills: [parts/skills/](parts/skills/), batch `parts/skills.parts.json`.
- **Publishing is a push.** The file goes to storage, the record goes to your repo, and the script reads it back from the chain, so a silently reverted transaction can't go unnoticed.
- **`mine.js`** lists a publisher's games from the chain: when each was published and changed (to the hour), what it remixes, and whether it was built on an earlier version.
- **The view is published.** With `"publishView": "<repo>"` in an app.json, every new root puts the view (every record, the stitch, the gateway) in storage, and points the indexer's `view` record at it.
- **The page** reads `./view.json`, or else the view named by its `<meta name="fangorn-view" content="network:publisher/repo">`. It checks every 10 s, ranks games in the tab, and plays them from storage in a sandboxed iframe. It shows what a game remixes and what remixed it. [site/fangorn.js](site/fangorn.js) is the SDK, bundled for reading (`npm run build`).

## On Cloudflare: [worker/](worker/)

westmarch's indexer Worker, with the warehouse's MCP tools ([worker/tools.js](worker/tools.js)) and the site as its assets:

- **Cron, every minute**: follows every `internet-slop-warehouse` repo into D1 and embeds new parts with Workers AI. Each new root's view goes to the `internet-slop-warehouse-view` repo.
- **`GET /view.json`**, **`GET /search?q=`**, and everything else is [site/](site/).
- **`POST /mcp`**: `claude mcp add --transport http internet-slop-warehouse https://<worker>/mcp`. `search` and `get` know what a part is (`get` returns a game's HTML or a module's source), and `publish` puts a part in the caller's own repo, on their signature, through the grant they gave the warehouse at fangorn.network.
- **`INDEXER_KEY`** (a secret) signs the stitch blocks and view commits, uploads publishers' files, and pays the gas to relay their signed commits.

```sh
npm run deploy
(cd worker && wrangler secret put INDEXER_KEY)                                                  # a funded Base Sepolia key
# REQUIRED for a fresh D1 (or a changed repo list): the first catch-up folds the whole chain log, more
# subrequests than a free-plan run allows. Do it locally once (stop it after the first "root" line), then seed:
NETWORK=baseSepolia node index.js app.baseSepolia.json
node node_modules/@fangorn-network/westmarch/worker/seed.js baseSepolia.db > worker/seed.sql
(cd worker && wrangler d1 execute internet-slop-warehouse --remote --file seed.sql)
```

## Tests

`npm test`: the parts' logic, the MCP tools against an in-memory chain, and publishing as a person.

## Game player

Games open in a responsive player with Restart, Expand (fill the browser window), and native Fullscreen controls. Phones use the full viewport automatically. Parts and credits are collapsed below the game. Fullscreen falls back to Expand when unavailable. Closing or restarting replaces the sandboxed browsing context to stop the previous game and its audio.

Browser regression checks use installed Chrome and `playwright-core`:

```sh
PLAYWRIGHT_MODULE=/tmp/warehouse-validation/node_modules/playwright-core/index.mjs node scripts/test-player-browser.mjs
```

The check serves its own fixtures and covers native fullscreen and fallback, expansion, restart, credits/navigation, late-loading games, and mobile layout. Screenshots and results are saved in `artifacts/player/`.

## Building and exploration starter

[Mosslight Commons](parts/mosslight-commons.html) demonstrates reusable harvesting,
crafting, bridge construction and optional four-player Trystero co-op. Start with
[the short remix guide](parts/HOMESTEAD-QUICKSTART.md): edit the world/recipe JSON
and reuse the engine to keep future implementation and token costs small. Original
code/data are CC0; the pinned networking transport is MIT. Host must stay online
and unpaused; public relay/WebRTC connectivity varies by network.

Preview with `node publish-batch.js parts/mosslight.parts.json --local /tmp/mosslight-preview`.
Rules and a complete earned-resource playthrough: `npx vitest run parts/homestead-kit.test.js`.
Real sandbox/WebRTC checks: `scripts/test-homestead-p2p.mjs` (uses the same
`PLAYWRIGHT_MODULE` setup above). Published receipts live beside the batch manifest.

## Northwoods winter walk

[Where the Pines Keep Winter](parts/northwoods.html) is a procedural first-person
snowy forest walk. [Remix guide](parts/NORTHWOODS-QUICKSTART.md) covers the CC0 WFC
ecology solver, branching pine/maple generator, instanced terrain renderer,
walking controller, synthesized sound, stand-alone GLBs and deterministic world
contract for future P2P remixes. The demonstration itself is solo.

```sh
node publish-batch.js parts/northwoods.parts.json --local /tmp/northwoods-preview
npx vitest run parts/northwoods.test.js
```

## Geographic co-op mystery and game systems

[Dead Air Atlas](parts/dead-air-atlas.html) is an original playable investigation
in real OSM streets, with town-name search, shared evidence,
radio/light mechanics, water-tower starts/travel and integrated mobile running. Start with the
[remix guide](parts/DEAD-AIR-QUICKSTART.md) and
[game-system inventory](parts/GAME-SYSTEMS.md). Original code/art is CC0;
OpenStreetMap map data remains attributed ODbL. The demo uses real WebRTC co-op.

```sh
node publish-batch.js parts/dead-air.parts.json --local /tmp/dead-air-preview
npx vitest run parts/dead-air.test.js worker/osm.test.js
```

The mobile player now has an immersive iframe mode: fullscreen and its
full-window fallback overlay controls over the game, follow the visible viewport
and retain an exit control in portrait and landscape. The OSM service in
`worker/osm.js` bounds, snaps, coalesces and caches map requests; it does not poll
public Overpass during rendering. Browser/P2P receipts are in `artifacts/dead-air/`.

### Bayfield exploration / Relay Skirmish release

`parts/dead-air.parts.json` publishes Dead Air Atlas v0.3, the separate Relay
Skirmish FPS/crafting prototype, Bayfield waterfront map snapshot and editable
source kit. Both games support town or full-address search. Original rules,
map gestures, town-life renderer, FPS controls and pulse-carbine geometry are
CC0; map data retains ODbL and decoder/transport licenses are preserved.
See [the composition guide](parts/DEAD-AIR-QUICKSTART.md).

```sh
node publish-batch.js parts/dead-air.parts.json --local /tmp/dead-air-preview
python3 -m http.server 8080 --directory /tmp/dead-air-preview
```

Open `/dead-air-atlas.html` or `/relay-skirmish.html`. Reusable model:
`parts/dead-air/pulse-carbine.glb`. Core validation: `npm test`; sandbox/mobile
and real WebRTC scripts live in `scripts/test-dead-air-*` and
`scripts/test-relay-skirmish-*`. Release validation is recorded under
`artifacts/dead-air/`.

### Relay Commons: calm exploration and shared base building

The Relay Skirmish game entry now hosts **Relay Commons**, a peaceful-by-default
first-person RPG prototype on the Bayfield atlas. Discover places, collect
fictional supply drops, build a shared camp, rest/return at a hearth and craft
field gear at a workbench. Ranged sparring is optional for a new expedition.

All new reusable modules and the eleven-model original CC0 GLB library were
published before game integration. `parts/relay-commons.parts.json` catalogs
those parts; `parts/relay-commons-release.parts.json` adds the game. The existing
`relay-skirmish` combat engine remains independently reusable. The source kit
includes both exploration games and all dependencies, with map data kept ODbL.

See [Relay Commons composition guide](parts/relay-commons/QUICKSTART.md).
Mobile/sandbox, exploration-to-camp and real three-peer checks are in
`scripts/test-relay-commons-{browser,playthrough,p2p}.mjs`; results are under
`artifacts/dead-air/commons-*.json`.

If a large publication batch leaves the Worker index behind its on-chain head
and logs show “Too many subrequests,” prepare a bounded catch-up with
`node scripts/refresh-warehouse-index.mjs`. Review its changed-record summary,
then apply the emitted SQL with the configured remote D1 command. This preserves
unrelated rows and vectors; it advances the saved stitch/checkpoint from verified
Fangorn diffs so the regular cron can resume embedding and publishing the view.

## Sharing warehouse parts

Open any game, asset or logic part and choose **Copy link**. Links use a `?part=publisher/id` query parameter and open that part directly, including after a reload. They follow the latest indexed version of the part. Browser Back/Forward follows player navigation; Close or Escape returns to browsing. If clipboard access is unavailable, the player shows a selectable link.

## Stillwater Field Station: an exploration playground

A small woodland scene with scanned Poly Haven props, PBR terrain, instanced
vegetation and forest HDR lighting. There is no required quest: switch the
spatially humming generator on/off, experiment with the radio dial, toss stones
at three differently pitched bells and wander the optional cache trails.

Nine new visual assets and five reusable systems were published before the
playground. Start with [the composition guide](parts/field-station/QUICKSTART.md).
Acquisition metadata, author credits and source checksums live in
`ingestion/polyhaven/batches/field-station/`. All acquired source assets are
CC0 from Poly Haven; no Sketchfab files were imported in this batch.

```
node publish-batch.js parts/field-station-game.parts.json --local /tmp/stillwater-preview
npx vitest run parts/field-station.test.js ingestion/polyhaven/packing.test.js
PLAYWRIGHT_MODULE=/tmp/warehouse-validation/node_modules/playwright-core/index.mjs node scripts/test-stillwater-browser.mjs
```

Publication receipts: `parts/field-station-{foundation,game}.parts.receipts.json`.
Browser checks and screenshots: `artifacts/field-station/`.

## Catalog categories

The inventory has category filters with counts alongside Games / Assets / Logic and search. Games are grouped by genre tags, assets by MIME format (with model and pack tag fallbacks), and logic by its published `kind`. A part may appear in multiple categories; uncategorized records remain in Other. Counts show the whole selected inventory type, independent of search. Switching inventory types resets the category; Clear filters resets both category and search.

Category definitions live in `site/catalog.js`; no record migration is needed. Rankings and a leaderboard are follow-up work.

Run the category browser checks with:

```sh
PLAYWRIGHT_MODULE=/tmp/warehouse-validation/node_modules/playwright-core/index.mjs node scripts/test-catalog-browser.mjs
```
