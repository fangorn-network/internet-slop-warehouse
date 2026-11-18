---
name: physics
description: Give a three.js warehouse game real rigid-body physics with the physics-world part (Rapier, WebAssembly). Use when a game needs things to fall, stack, topple, bounce, be thrown, pushed or knocked over, collide with sound or damage, or when asked about physics, collisions, Rapier, ragdolls or destruction.
---

# Physics in a warehouse game

`physics-world` wraps [Rapier](https://rapier.rs) (Apache-2.0): one world stepped at a fixed 60 Hz, and `attach(object)` to give any three.js object a body whose collider is shaped from the object itself. Remix **Tower topple** (`tower-topple`) for a working start: it throws balls at a crate tower with barrels from a GLB. **Heartland Inn** (`heartland-inn`) shows a first-person player built on `character()`: an elevator, stairs, and lobby furniture you can shove, pick up and throw.

## Wire it

Add Rapier to the game's import map, next to `three`, at the exact version:

```html
<script type="importmap">{"imports":{
  "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
  "@dimforge/rapier3d-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.21.0/dist/rapier.mjs"
}}</script>
```

```js
const physics = await logic("physics-world");
const world = await physics.createWorld();                     // gravity -9.81, fixed 60 Hz steps
physics.attach(floorMesh, { world, body: "fixed" });           // floors and walls never move
const crate = physics.attach(crateMesh, { world, density: 0.6, onContact: ({ speed }) => speed > 1.5 && thud(speed) });
const car = physics.attach(carGltf.scene, { world, shape: "hull" });
// every frame, once:
world.update(dt);                                              // steps, then moves every attached object
```

Pin `physics-world` in `uses`. Rapier's file is 4.3 MB (about 1.2 MB over the wire) and starts in roughly a second. Show "loading physics…" until `createWorld()` resolves.

## Choose the body and the shape

| You have | body | shape |
|---|---|---|
| floor, wall, table, level geometry | `fixed` | `box`, or `mesh` for exact triangles (terrain, stairs, a building) |
| crate, brick, book | `dynamic` | `box` (the default: a box around the object) |
| ball, coin, head | `dynamic` | `ball` |
| a GLB prop: barrel, chair, car | `dynamic` | `hull`: the convex hull of its vertices |
| a door or paddle you move yourself | `kinematic` | any: move the object, the body follows and pushes dynamic ones |
| a floor you move that people stand on: an elevator, a moving platform | `platform` | any: move the object; characters walk on it and `ride()` it |

`mesh` is for fixed bodies only. A concave dynamic object (a mug, a U-shape) is a `hull` or several boxes, not a mesh.

## Rules that keep it stable

1. **Metres.** Rapier assumes real sizes: a crate is about 0.4 m, a person 1.7 m, gravity 9.81. A 40-unit crate falls in slow motion. GLB parts list their size in `measured.glb.size` (metres, y up); the page shows it. Scale models to real size **before** `attach`, because the collider is measured once.
2. **Never place a dynamic body inside another, or inside the floor.** Overlaps at the start explode. Sit things on surfaces from their bounding box: `obj.position.y = top - new THREE.Box3().setFromObject(obj).min.y`. Leave a millimetre between stacked boxes.
3. **Move dynamic bodies with impulses or velocity, not by setting `position`.** `crate.impulse([0, 4, 0])`, `ball.velocity([vx, vy, vz])`. Setting the mesh position does nothing: the body moves it back each frame. To teleport, `dispose()` and attach again.
4. **Fast things get `ccd: true`**, or they pass through thin walls between steps.
5. **Mass is relative.** `density` times volume. A thrown ball at density 9 knocks over crates at 0.6. Equal densities feel like throwing a crate at crates.
6. **Call `world.update(dt)` once per frame, before rendering.** It steps at a fixed rate and catches up at most five steps, so a hidden tab doesn't spiral. Cap `dt` at 0.1.
7. **Dispose what falls out of the world:** `if (mesh.position.y < -20) body.dispose()`.

## A walking player

`character(world, { position, radius: 0.3, height: 1.75, step: 0.4 })` is a capsule with its feet at `position`, moved by Rapier's character controller inside the fixed steps. It slides along walls, climbs steps up to `step` and slopes up to `slope` radians, and shoves dynamic bodies it walks into. It doesn't step up onto them.

```js
const me = physics.character(world, { position: [0, 0, 5] });
// every frame, before world.update(dt):
me.walk(vx, vz);                     // horizontal velocity in m/s, from your input
if (jumpPressed) me.jump(4.5);
world.update(dt);
camera.position.set(me.position.x, me.position.y + 1.62, me.position.z);
```

- Moving floors: make the floor a `platform` body and call `me.ride(dy)` with how far it moved this frame while the player stands on it. The character controller barely walks on kinematic bodies, so use `platform`, not `kinematic`.
- Teleporting (respawn, scripted moves): `me.teleport([x, y, z])`. Don't write to the body.
- Picking things up: `prop.grab()` makes a dynamic body follow its object until `prop.release(velocity)` throws it. `me.ignore(prop.collider)` while carrying stops it shoving the player; call `me.unignore()` a moment after the throw.
- Load Rapier with the first world, as this part does. If `createWorld()` rejects (offline, a blocked CDN), keep your old movement as a fallback. Heartland Inn does this.

## Contacts, raycasts, throwing

- `onContact({ other, speed })` fires when a body starts touching another. Scale sound with `speed` and throttle it: a collapsing tower makes hundreds of contacts.
- `world.raycast(origin, direction, far)` returns `{ object, point, normal, distance }` for the first attached object hit: shooting, picking up, line of sight, ground checks.
- To throw: spawn the projectile just in front of the camera, attach it with `ccd: true`, and set its velocity along `raycaster.ray.direction`. Tower topple does exactly this.
- Joints, character controllers and the rest of Rapier are on `world.raw` and `world.rapier`.

## Budgets

Measure on a phone; nobody has benchmarked this kit yet. Resting bodies fall asleep on their own and cost little, so what matters is how many move at once. Boxes and balls are cheapest, hulls cost more, and meshes are for fixed level geometry. Tower topple moves about 25 bodies at once.

## Check before publishing

- Nothing jitters while resting, and nothing jumps at the start (rule 2).
- Thrown or fast things never pass through walls (rule 4).
- It runs on a phone. Load it, play to a win and a loss, and watch the console for errors.
