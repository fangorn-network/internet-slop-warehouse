---
name: procgen
description: Generate game worlds from a seed - wave function collapse maps, noise terrain, lock-and-key dungeons - and prove every seed is playable with a playtest bot and a seed sweep before a player sees it. Use when a game needs levels, maps, dungeons, terrain, towns or planets that are different each run, when asked about procedural generation, WFC, roguelikes or replayability, or when a generator sometimes makes broken or unwinnable worlds.
---

# Procedural worlds in a warehouse game

Two parts, both pure data (no three.js, no DOM), so they run in tests and on every peer:

- **`worldgen`**: `rng(seed)`, `hash(seed, x, y…)`, `noise2`, `fbm`, socketed `collapse()` (wave function collapse) with `withRotations()`, `playRows()` (a playtest bot for character maps) and `sweep()` (run a generator over many seeds and collect the failures).
- **`lock-key-dungeon`**: `generate()` a room graph with a long critical path, locked rooms along it, keys you can reach first and loops that never skip a lock; `toRows()` turns it into a character map.

- **`hotel-wfc`**: a multi-storey hotel from 3D WFC (corridors, rooms with doors, stairwells), flood-checked from a pinned lobby.
- **`socket-mesher`** (three.js): draws any WFC grid from its sockets, one InstancedMesh per piece.

Working starts: **Keyring** (`keyring`), a 2D dungeon crawler that keeps only floors the bot can clear and uses the bot's steps as par; **Night Audit** (`night-audit`), a first-person walk through a hotel rebuilt by 3D WFC every night, following a ringing phone.

## The contract: the world is a function of the seed

1. `generate(seed, opts) → data`. Same seed, same world, on every machine. Only `rng(seed)` or `hash(seed, …)`, never `Math.random()`, and never iterate over object keys or Sets whose order depends on insertion from random events.
2. The renderer reads the data; it never decides layout. That keeps the generator testable and lets a P2P host send one integer instead of a map (see the `p2p-multiplayer` skill).
3. Big or endless worlds: derive each chunk from `hash(seed, cx, cy)` so any chunk can be built alone, in any order, and dropped when far away. Build it once when the player arrives (Voidstruck bakes a planet's surface on landing), not every frame.

## Character maps are the lingua franca

`'#'` wall, `'.'` floor, `'S'` start, `'G'` goal, `a–f` keys, `A–F` doors. `toRows()` makes them, `playRows()` plays them, the `grid-navigation` part paths over them (`rows`, `blocked: ['#']`), and an agent can read one in a test failure. Any generator you write should be able to emit one, even if the game renders it as 3D rooms (one cell = one tile/prefab).

## Wave function collapse

Tiles have sockets clockwise `[n, e, s, w]`; neighbours fit when the touching sockets match (a multi-character socket must match its partner reversed, so `'ab'` fits `'ba'`; plain characters just match). Mark `rotate: true` and `withRotations()` adds the distinct quarter turns as `id@1..3`, with `base` and `rotation` for the renderer.

```js
const tiles = withRotations([
  { id: 'solid', weight: 4, sockets: ['#', '#', '#', '#'] },
  { id: 'hall', weight: 3, sockets: ['.', '#', '.', '#'], rotate: true },
  { id: 'corner', weight: 2, sockets: ['.', '.', '#', '#'], rotate: true },
]);
const map = collapse({ width: 24, height: 16, seed, tiles, edge: '#', fixed: [{ x: 2, y: 2, id: 'hall' }] });
```

- `edge` makes every border cell face that socket outwards (a sealed map). `fixed` pins cells (an entrance, a landmark, a door to the previous chunk).
- It throws when the rules contradict; it never hands back a broken grid. If it throws often, the tile set has a socket nothing else accepts: add a tile, not more restarts.
- Weights shape the look more than anything else. Tune them with `sweep` stats, not by eye on one seed.
- WFC is local: it guarantees neighbours fit, **not** that the map is connected or winnable. That's what the bot is for.
- Cost grows with cells²; it caps at 16384 cells (all layers). For bigger worlds, collapse chunks and pin their shared edges with `fixed`.

## Rich 3D from WFC

WFC is good at local detail and bad at overall structure. Layer it:

1. **Structure from pins or a graph.** Pin what must exist with `fixed` (Night Audit pins a lobby and the stair beside it), or lay out rooms with `lock-key-dungeon` and let WFC fill each one with its doors pinned. Then `flood()` from the entrance and re-roll on a sub-seed (`hash(seed, k)`) until coverage and must-reach cells pass; draw only `flood().reached`.
2. **Tiles are sockets, not models.** Name socket vocabularies after what stands on the face (`w` wall, `d` door, `c` corridor, `r` room). `socket-mesher` turns sockets into pieces: `face(ctx)` puts a wall on every `w` face, a frame on every `d`; `inside(ctx)` puts floor, ceiling, stairs, furniture. Model each piece once, for the north face or rotation 0. New tiles then cost one line and no art.
3. **Go 3D with six sockets** `[n, e, s, w, up, down]` and `depth`. Plain slabs share an up/down socket (`f`); a stair is two tiles whose vertical socket is `'s%'`, so `withRotations()` makes `s0…s3` and the halves only stack facing the same way. Seal the outside with `edge: ['w','w','w','w','f','f']`.
4. **Richness is dressing, not more rules.** Use `ctx.random()` (seeded per cell) for pictures, sconces, light panels, door angles; put furniture in one corner tile per room (the rotation-0 corner), clear of door faces. Check every door has a clear approach, or the bot (and players) get stuck behind a bed.
5. **Budget.** Draw calls = piece kinds (Night Audit: ~20 calls, 11–16k triangles for a two-storey hotel). Fog and a torch hide the far end; no real-time lights per lamp, just emissive panels.
6. **Walk on the sockets.** Collision can be read straight off the faces: block a move across a face unless both sides are passable, narrow doors to their width, treat a stair cell as a ramp from its entrance to its exit edge. Night Audit's `blocked()`/`stair()` are a template.
7. **Playtest in a browser** by walking the `flood` path cell to cell through the real movement code (the cells must also share a passable face, not just consecutive distances), with furniture on and off.

## Rules from a drawing

`fromExample(rows)` learns tiles from a character map you draw: each character's neighbours per direction, its frequency as weight, and which characters may touch the border. `collapse({ width, height, seed, ...fromExample(sample) })` then makes more of the same. It's the fastest way to describe a style (a coastline, a town block, a cave) without writing sockets; check the output with `flood` or `playRows` like any other generator.

## Prove it: the bot and the sweep

```js
import { sweep, playRows } from './worldgen.js';
const report = sweep({ seeds: 500, generate: (seed) => myLevel(seed), check: (level) => playRows(level.rows) });
// { passed, failures: [{ seed, reason }], stats: { steps: {min, median, max}, coverage: {...} } }
```

Put that in a vitest file and require `failures` to be empty. Then read the stats: `steps` is pacing (too low = trivial floors), `coverage` is how much of the map can be reached at all (low = wasted space or sealed rooms). Add your own numbers to the check's return value (enemies per room, distance to first key) and they get min/median/max too. When a seed fails, it is printed: paste it into the game with `?seed=` and look.

At runtime, do what Keyring does: generate, run the bot, and on failure move to a sub-seed (`hash(seed, level, k)`). It's cheap, and a player never meets an unwinnable world. It does not replace the sweep: a generator that fails half its seeds is a bug.

## Lock-and-key dungeons

`generate({ seed, width, height, rooms, keys, loops })` (keys 0–6). The start and goal sit at the two ends of the room tree's longest path; locks are spread along it; key *n* goes in the deepest dead end you can reach with keys before *n*; loops (0–1) only join rooms behind the same set of locks. Each room has `zone` (locks passed), `depth`, `onPath` and `kind`, which is what to theme by: treasure in deep dead ends, a boss in the goal, a lore note at each lock. Use `rooms[i].x/y` to place prefabs or WFC-filled interiors, and `doors` for doorways.

## Theming a generator from text

To turn a description (a dream report, a quest blurb) into a world, map it to generator inputs, not to geometry: which tiles exist and their weights, `rooms`, `keys`, `loops`, a `fixed` landmark, a palette. Keep the mapping a small, testable function, and sweep the result like any other generator.
