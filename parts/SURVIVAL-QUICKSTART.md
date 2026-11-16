# Cheap survival games

Start here. You do not need to read the engine source to make another town.

```sh
node scripts/new-survival-game.mjs my-town "My Town"
```

Edit **`parts/survival/my-town.json`**:

- `rows`: `#` walls, `.` floor, `D` doors. Keep rows rectangular.
- Cells are `[column,row]`. Place the start, doors, caches, radio, ward and exit on valid cells.
- `initial`, cache `loot`, door locks and enemy `patrol` routes change the choices players face.
- `daySeconds`, `nightSeconds`, `radioWait` and ward fuel change the pressure.
- `objectives` declare prerequisite IDs and persistent completion facts.
- Change `seed` to change repeatable bonus loot. Keep each scenario ID unique.

Preview:

```sh
node publish-batch.js parts/my-town.parts.json --local /tmp/my-town
python3 -m http.server --directory /tmp/my-town 8088
```

Publish the reviewed game and scenario:

```sh
NETWORK=baseSepolia node publish-batch.js parts/my-town.parts.json
```

The starter already wires movement, collision, pathfinding, enemy hearing/sight, crafting, inventory, doors, loot, objectives, day/night, melee, saves, menus, minimap and rendering. Its engine and models are shared with the original game. No generated dialogue, model calls or new game backend runs during play.

For new mechanics or API details, see [survival-kit.md](survival-kit.md). Do not add another system until a game design needs it.
