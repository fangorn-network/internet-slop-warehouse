# Warehouse Survival Starter

Create another survival game without rewriting the engine:

```sh
node new-game.mjs my-town "My Town"
python3 -m http.server --directory my-town 8088
```

Before generating, edit scenario.json and recipes.json. Change map rows (# wall, . floor, D configured door), resource quantities, locks, patrol routes, objectives and timing. Cells are [column,row]. Change seed for repeatable loot. The generated HTML embeds your scenario and recipes; all shared code and models use pinned warehouse URLs.

The output includes index.html and record.json. To publish, pass index.html as the warehouse publish tool's content and record.json as metadata. No new server or model calls are needed during play. Agents can copy files and run this generator without reading game-template.html or engine source into context. Read REFERENCE.md only when changing mechanics.

lock.json records exact dependencies. Check that published dependency records still match its CIDs before publishing a later remix; updating the lock should be deliberate.

Saves are copyable codes in the pack menu, not browser-local storage. This is a single-player flat-grid survival starter, not multiplayer or a general engine. Original source/data CC0-1.0. Referenced Three.js retains its own license.
