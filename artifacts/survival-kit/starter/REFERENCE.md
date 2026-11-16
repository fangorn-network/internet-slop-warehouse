# Survival kit / build cost first

This kit reduces repeated implementation and agent context. A new game starts by copying a working host and changing an authored scenario. It does not ask an agent to write another renderer, inventory, pathfinder, enemy controller or save system. Read `SURVIVAL-QUICKSTART.md` and the scenario first; inspect individual module source only when changing that module.

## What makes it interesting

Noise connects movement, combat, prying, crafting and decoys to enemy decisions. Resources connect exploration to tools, healing, a protective ward and the radio. Doors connect visibility and navigation; they can be opened, closed, braced or broken. Loot and objectives remain changed when revisited. These interactions create consequences from a small map and a few props.

The demonstration, **No Road Home**, has four buildings, a shelter, four visitors and a repair-to-extraction objective chain. A quiet lockpick costs materials that could make a decoy; forcing the same door saves supplies but attracts attention. The radio calls rescue and draws visitors. Returning to the ward is useful, but its fuel expires. Combat is possible and noisy. These are authored rules, not per-player AI inference.

## Architecture

| Part | Responsibility |
| --- | --- |
| `survival-kit` | Headless scenario simulation and explicit player commands. |
| `grid-navigation` | Bounded A*, dynamic doors, collision lookup and supercover sight. |
| `perception-brain` | Patrol, investigate, chase, search, memory and attack cooldown. |
| `seeded-random` | Repeatable weighted loot and portable RNG state. |
| `recipe-book` | Data-defined crafting with atomic inventory transactions. |
| `objective-journal` | Validated prerequisite graph and fact-based completion. |
| `save-codec` | Bounded versioned save codes with validation and migrations. |
| `survival-town-view` | Instanced Three.js town, actors, doors, lighting and minimap. |

Existing `health`, `resource-inventory`, `expedition-shell`, `ambient-motes`, `touch-controls` and three already-published models are reused. The new data assets are a scenario, recipe pack and JSON Schema. All new source and data are CC0-1.0; external Three.js retains its own license.

## Simulation contract

`survivalKit.attach(scenario, { modules, recipes, onEvent })` returns a session. Inject the supporting modules by published ID; the generated host already does this.

- `update(dt, {x,z,run,crouch})` advances local simulation in bounded steps. Seconds and world units.
- `interact(id?)`, `craft(id)`, `attack()`, `heal()`, `decoy()`, `brace()` and `withdraw(key,count)` perform validated actions.
- `state` returns a copy for rendering. `nearest()` supplies an eligible interaction prompt.
- `snapshot()` returns portable state; `validateSnapshot`, `load`, `reset` and `dispose` manage its lifecycle.
- `onEvent({type,text,...})` connects rules to sound, feedback or telemetry.

The recipe and objective modules can be used independently in other genres. Navigation and enemy perception accept injected visibility, route and movement rules. The 3D view is replaceable with a 2D view without changing simulation commands.

## Saves and sandbox behavior

The warehouse's opaque-origin iframe has no local storage permission. The pack menu exports a copyable save code and restores a pasted one. No permission expansion or hosted account is needed. State includes searched containers, remaining loot, inventory/stash, doors and damage, health/stamina, phase time, enemies and their memory, active decoys, objectives and RNG state. Transient sound-ring visuals are omitted.

Codes contain bounded UTF-8 JSON plus a checksum for accidental corruption, not encryption or anti-cheat protection. Scenario identity and a content fingerprint reject incompatible saves. Snapshot validation happens before replacing a run; a rejected load leaves it intact. Changing scenario rules or recipes invalidates earlier saves by design. The codec offers version migration hooks for games that need longer compatibility.

## Authoring and tests

`survival/scenario.schema.json` describes the JSON format. Runtime checks additionally validate rectangular maps, entity IDs, configured door tiles, valid patrol cells and objective dependencies. `scripts/new-survival-game.mjs` refuses overwrites and produces a game, a scenario and a bounded publication manifest. It does not publish anything automatically.

```sh
npm test
node publish-batch.js parts/survival-kit.parts.json --local /tmp/survival-kit
PLAYWRIGHT_MODULE=/tmp/warehouse-validation/node_modules/playwright-core/index.mjs node scripts/test-survival-kit-browser.mjs /tmp/survival-kit
NETWORK=baseSepolia node publish-batch.js parts/survival-kit.parts.json
```

## Practical limits

This is a small-town survival starter, not an editor or a replacement for a mature game engine. The view uses flat floors and grid walls; combat is melee, and crafting is immediate. Saves are manual. No multiplayer, server authority or cross-device cloud saves are included. Add those when a tested game needs them. More maps, loot combinations, patrol routes and resource tradeoffs are inexpensive data changes; genuinely new mechanics still require design and code.

The preset's objective facts are `foundFuse`, `radioPowered`, `rescueReady` and `escaped`. New quest facts require a rule hook or a simulation change; the standalone objective journal accepts arbitrary facts from other games. The kit saves repeated infrastructure work, while level layout and resource choices still need playtesting.
