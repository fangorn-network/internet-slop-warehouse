# the internet slop warehouse

Browser games (three.js mostly) built from shared parts: games, assets and logic. Each part is published to Fangorn by its author, in their own `internet-slop-warehouse` repo. An indexer ([westmarch](https://github.com/fangorn-network/westmarch)) follows that repo across every publisher, including publishers it has never heard of. It runs as a stock westmarch Worker at **https://internet-slop-warehouse.fangorn.network** (deployed from the `ops` repo), and the page ([site/](site/)) is plain files that read its API, served at **https://internet-slop-warehouse.quickbeam.workers.dev** by a static-assets Worker ([wrangler.json](wrangler.json), `npm run deploy`). It runs no code and can be hosted anywhere.

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

On the sandbox (`npm run sandbox` in westmarch), leave out `NETWORK` (`AS=bob` publishes as bob), and use `app.json`. Point the page at another Worker (a local `wrangler dev`, say) with `?api=<url>`.

- **A part** ([part.js](part.js)) is a `game` (its HTML, stored as `{ html }`), an `asset` (the file itself, with `mime`) or `logic` (an ES module, stored as `{ js }`, labelled with its exports, options and hooks so search finds it by behaviour). Its record pins the exact version of everything it remixes (`parent`) or builds on (`uses`). An asset's record carries `measured`, facts read from its bytes at publish ([site/measure.js](site/measure.js): a GLB's triangles, size in metres, textures, rig; an image's pixels), and any part may say how it was `made` (`method`, and `ai`: none, code or content). The page measures any GLB it shows the same way, from the stored file. On the page, a game card shows its specimen: the parts it carries and the dark matter (its own code) it brought itself ([site/specimen.js](site/specimen.js)); the Reused tab ranks parts by how many games carry them.
- **Know-how is a part too.** A `skill` is an Agent Skills `SKILL.md` (frontmatter `name`, `description`), stored as `{ md }`, that Claude Code or Codex installs from a skills folder; a recipe is a skill tagged `recipe` whose `uses` pins its parts. A `source` part is a code file mirrored from elsewhere (stored as `{ code }`) and must carry `origin: { repo, commit, path }` and its upstream license. Seed skills: [parts/skills/](parts/skills/), batch `parts/skills.parts.json`.
- **Unpublishing** (`NETWORK=baseSepolia node unpublish.js <id>… [--yes]`) deletes parts from your repo in one commit and reads them back, so the indexer drops them. Earlier commits and the files stay readable by CID.
- **Publishing is a push.** The file goes to storage, the record goes to your repo, and the script reads it back from the chain, so a silently reverted transaction can't go unnoticed.
- **`mine.js`** lists a publisher's games from the chain: when each was published and changed (to the hour), what it remixes, and whether it was built on an earlier version.
- **The page** ([site/index.html](site/index.html)) reads the Worker's `/view.json` every 10 s, ranks parts with its `/search`, and plays them from storage in a sandboxed iframe. It shows what a game remixes and what remixed it. Its Worker is the `<meta name="westmarch-api">`.

## The API: [site/api.js](site/api.js)

The warehouse has no Worker code of its own. The deployment is westmarch's generic Worker, configured in the `ops` repo's `apps.json` and deployed by its `Deploy apps` workflow; the API it serves is documented in westmarch's `worker/API.md` (`openapi.yaml`). [site/api.js](site/api.js) is a small client for it, with nothing warehouse-specific in it: `westmarch(base)` gives you `manifest()` (`/api.json`: name, gateway, types, `mcp`, `connect`), `view()`, `search(q, { k, type })` and `publish(token, { record, file, pin })`.

- **Agents**: `claude mcp add --transport http internet-slop-warehouse https://internet-slop-warehouse.fangorn.network/mcp` (`search`, `repos`, `get`, `publish`).
- **Publishing from a browser or agent** goes through `/publish` on a fangorn.network grant, which a person gets from the manifest's `connect` link. The scripts here (`publish.js`, `publish-batch.js`, `seed.js`) still publish straight to the chain with your CLI key.

## Tests

`npm test`: the parts' logic.

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

## Geographic game systems

The OSM/Bayfield systems are published parts: `osm-district`, `osm-vector-district` (OpenFreeMap tiles, fetched from the browser), `street-navigation`, `water-tower`, `osm-town-view`, `town-life`, `dead-air-case`, `p2p-case-session`, `relay-skirmish`, `relay-homestead`, the settlement modules, the pulse carbine and the map snapshots. See the [game-system inventory](parts/GAME-SYSTEMS.md) and the [Relay Commons composition guide](parts/relay-commons/QUICKSTART.md). Original code/art is CC0; OpenStreetMap data stays ODbL. Rules: `npx vitest run parts/dead-air.test.js`.

The games built on them, Dead Air Atlas and Relay Commons, and their source kit were unpublished on 2026-11-17 (`node unpublish.js`), because they depended on the old warehouse Worker's `/world/osm` and `/world/places`.

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
