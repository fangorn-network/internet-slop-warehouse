# Build a game cheaply with the homestead kit

Start by copying `mosslight-commons.html`, `homestead/mosslight.json`, and
`homestead/recipes.json`. Change the title, island rows, resource nodes, blueprint
costs, and recipes. Reuse the modules rather than generating another engine.

The example is a complete 3D gathering → tool upgrades → bridge building →
smelting → beacon loop. No enemies, runtime AI calls, paid API or game server.
Original game code/data are CC0. The optional pinned Trystero transport is MIT;
retain `vendor/TRYSTERO-LICENSES.txt` when redistributing it.

## Wiring

`homestead-kit.attach(scenario, {modules, recipes, onEvent})` expects
`modules['resource-inventory']` and `modules['recipe-book']`. It exposes:

- `update(dt, {actorId:{x,z}})` — host simulation, dt capped at 50ms.
- `command(actorId, {type:'gather'|'build'|'craft'|'reclaim'|'beacon', id?})`.
- `addPlayer(id)`, `removePlayer(id)`, `nearest(id)`, `target(id)`, `recipes(id)`.
- `snapshot()`, `validateSnapshot(data)`, `load(data)`, `reset()`, `dispose()`.

`homestead-view.attach(scene, {session, model, actor:()=>id, selected:()=>blueprint})`
provides `player` (camera follow target), `update(dt)`, `drawMap(canvas)`, `dispose()`.
Three.js is imported through the game's import map. Supply an existing model or
use the built-in fallback. Rendering owns no gameplay rules.

`p2p-homestead.attach(session, {transport, isHost, code, onStatus})` exposes
`ready` (resolves to `{code}`), `id`, `connected`, `isHost`, `command(intent)`,
`update(dt,input)`, `dispose()`. Pass the `trystero-027` module as transport.
Only the host advances the world. Guests submit bounded movement intentions and
commands; signed host snapshots synchronize every 200ms. Inventory and build
costs are validated by the same rules as solo play. A host is trusted authority,
not an anti-cheat server. Invite codes contain a password: share privately.

Co-op requires the host tab to stay connected and unpaused. Public Nostr signaling
and WebRTC/STUN need network access; restrictive NATs may need a TURN relay.
The adapter accepts `relayConfig` for an alternate signaling deployment. No TURN,
host migration or persistent server is supplied. Leave a room to keep its latest
camp solo, then export a save code. Networking begins only on Host/Join.

## Content constraints

This first kit uses a 33 × 25 grid; `.` is land and `~` water. World rendering uses
two meters per cell. Nodes have unique `id`, integer `x,z`, `kind`, `amount`.
Blueprints have unique `id`, `title`, `cost`, `water`. Built-in visual styles are
bridge, floor, workbench, kiln, wall, lantern, campfire. Recipes use the warehouse
recipe-book format `{id,title,cost,gain,station?}`. The first milestone is a beacon
with a three-crystal, three-copper, eight-wood cost; change that rule to change the
end goal. Keep resource costs and routes solvable. Maps and rule changes need a
new scenario id so old save codes are not mistaken for compatible worlds.

## Preview and check

```
node publish-batch.js parts/mosslight.parts.json --local /tmp/mosslight-preview
npx vitest run parts/homestead-kit.test.js
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node scripts/test-mosslight-browser.mjs /tmp/mosslight-preview
```

The manifest lists each dependency. Published games pin exact dependency versions.
For a new game use new ids for its HTML and data, retain the existing engine ids,
and publish only the new records. Most future prompts can be one paragraph:
“Remix Mosslight Commons. Keep the homestead modules. Change the JSON world,
recipes and goal to [idea]. Preserve save validation and optional co-op.”
