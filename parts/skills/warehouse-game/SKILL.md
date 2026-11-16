---
name: warehouse-game
description: Build a browser game (three.js) out of internet slop warehouse parts and publish it. Use when asked to make, remix or improve a web game, or when a game needs models, textures, sounds, movement, AI or cameras that might already exist in the warehouse.
---

# Build a game from the warehouse

The warehouse is a catalog of games, assets (GLB, PNG, HDR, WAV), logic (ES modules), skills and recipes, and mirrored source. Search before writing anything: the cheapest good game is mostly parts.

## 1. Find, don't build

1. `search` for a **recipe** first (`type: "skill"`, plus words like "recipe platformer", "recipe photoreal"). A recipe names the parts and the order to wire them.
2. `search` for a **game** close to the idea. Remixing one (`parent`) beats starting blank.
3. `search` assets and logic by behaviour: "third person camera", "enemy patrols and chases", "wood planks texture", "night sky hdri". Read the payload's `options` and `hooks`; you usually don't need the source.
4. Only write logic that's missing, and write it as a part (below) so the next game gets it free.

## 2. Wire parts

A game is one self-contained HTML page with an import map for `three` and a `PARTS` map, filled at publish time with each part's `<gateway>/ipfs/<src>`:

```js
const PARTS = {/*PARTS*/};
const logic = async (id) => import("data:text/javascript;charset=utf-8," + encodeURIComponent((await (await fetch(PARTS[id])).json()).js));
const ctl = (await logic("platformer-controller")).attach(player, { solids, onJump: () => play("jump-sound") });
// every frame: ctl.update(dt)
```

Every behaviour is `attach(object, opts) → { update(dt), dispose() }`. Change what it does through its hooks (`onSee`, `onTouch`, `onFall` …), not by forking it. Pin every part you used in `uses`.

Constraints of the player: a sandboxed iframe with scripts and pointer lock only. No localStorage, no cookies, no same-origin fetch. Assets come from the gateway (CORS open). Phones play too: use `touch-controls` or your own touch input.

## 3. Make it good, not just working

Check the game against this list before publishing. Most slop fails 1–4.

1. **A goal in five seconds.** One line of on-screen text says what to do. A score, a timer or a count of what's left.
2. **Feedback on every action.** Sound plus a visual change on jump, hit, pickup, win, lose. Silence reads as broken.
3. **Feel.** Accelerate and decelerate, don't snap. Coyote time and jump buffering on platformers. Camera eases (`follow-camera` `lag`). Small screen shake or a hit pause on impact.
4. **A loss and a restart.** Failing is possible, restarting is one key/tap, and the second try is faster than the first.
5. **Readable scene.** Lit with an HDRI (`hdri-sky`) or a key light plus ambient. Fog hides the edge of the world. Interactive things contrast with the background.
6. **Scale is right.** Measure GLBs with `Box3` and scale to a known player height (warehouse descriptions give sizes).
7. **Performance.** 60 fps on a mid phone: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, instancing for repeats, 1K textures, shadows only from one light.
8. **Escalation.** Something changes over time: faster enemies, a new mechanic, a harder layout.

Playtest it in a real browser (Chrome DevTools MCP or Playwright): load, play to a win and a loss, and watch the console for errors.

## 4. Publish

`publish` with `type: "game"`, the page as `content`, a description that says how it plays, tags for genre, `uses` for every part and `parent` if it's a remix. Missing logic you wrote goes in first as `type: "logic"`, labelled with `kind`, `exports`, `options` and `hooks`. If you worked out a reusable way of building something, publish it as a recipe: a skill tagged `recipe` with its parts in `uses`.
