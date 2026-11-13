# the internet slop warehouse

Browser games (three.js mostly) built from shared parts: games, assets and logic. Each part is published to Fangorn by its author, in their own `internet-slop-warehouse` repo. An indexer ([westmarch](https://github.com/fangorn-network/westmarch)) follows that repo across every publisher, including publishers it has never heard of, and publishes its view back to Fangorn. The page finds that view on chain, so it can be hosted anywhere as plain files.

Needs Node 22.13+ and `npm install`. Until westmarch 0.2.0 is on npm, it's linked from `../westmarch`.

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
