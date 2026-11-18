---
name: lean-scenes
description: Make a three.js browser game run on phones - measure it against a budget (draw calls, triangles, texture memory, JS per frame), then cut the costs that actually dominate - asset weight, rooms drawn behind walls, instancing that can't cull, textures. Use when a game lags, stutters or heats a phone, when building an indoor, multi-room or multi-level scene, or before publishing anything big.
---

# Lean scenes

A game that lags on a phone is almost never slow because of its game logic. It's slow because it asks the GPU to draw far more than anyone can see. Measure first, then cut the biggest thing. Repeat.

## 1. Measure against a budget

A mid-range phone at 30 fps, with headroom:

| per frame | budget | why |
|---|---|---|
| draw calls | ≤ 300 | each costs CPU time in the driver and in three.js's scene walk |
| triangles | ≤ 500k | vertex work and overdraw |
| texture memory | ≤ 128 MB | phones evict, stutter, then kill the tab |
| JS per frame | ≤ 8 ms | desktop numbers; a phone CPU is 4–6× slower |

`scripts/scene-budget.mjs <url> --phone --click` in the warehouse repo measures these at the WebGL level for any page (it wraps `drawElements` and friends, so it doesn't care about the engine). In your own game, `renderer.info.render.calls` and `.triangles` give the same numbers live: put them on a debug overlay behind `?debug`.

To find *what* costs, walk the scene and total triangles per top-level object, counting only what's visible and in the frustum. The first time, the answer is usually one or two absurd things.

**Worked example: Heartland Inn (the warehouse hotel), phone profile, standing in the lobby.** 1,297 draw calls, 2.5 M triangles, 210 MB of textures and 18 ms of JS per frame on a *desktop* CPU, so 70–100 ms on a phone: about 10 fps. The breakdown:

- 48 parked cars at ~20k triangles each, instanced, about 1 M triangles. They were visible through every window and were never culled, because an InstancedMesh's bounding sphere covers every instance.
- Two potted plants at 176k triangles **each**.
- The travel stop across the interstate (464k triangles of shelves and freezers) was drawn from inside the lobby, because nothing hid it.
- 730 materials and 63 shader programs.

None of that is visible as "lag" in the code. All of it shows up in the budget.

## 2. Asset weight comes first

Triangles per prop, by how big it is on screen:

- hero props you inspect up close: ≤ 20k
- furniture and room props: 2–5k
- background (cars in a lot, trees, distant buildings): ≤ 1–2k, or an impostor
- textures: 1K for props, 2K only for hero surfaces; KTX2/Basis where you can

A 176k-triangle plant isn't a performance bug to engineer around. It's the wrong asset. Swap it for a light one, or simplify it once, offline, and publish the light version as its own asset. Warehouse asset records carry `measured.triangles` and texture sizes, so check them before you wire anything in. Many heavy warehouse models already have a `<id>-lite` version: search `lite`.

`ingestion/lite/lite.mjs` makes light versions from a list of `{ id, triangles }` targets (gltf-transform with meshoptimizer, textures capped at 1K), then you check each one beside its original (`scripts/lite-compare.html`). What the hotel's 23 taught:

- Background vehicles and furniture go 5–7× lighter with no visible change: cars 20k → 3.3k, the semi 50k → 6.6k, the plant 176k → 8.6k, the king bed 64k → 17k.
- **Flat-shaded models don't simplify at all**, because every triangle has its own vertices and nothing welds. Drop their normals first (`dropNormals`); three.js shades a GLB without normals flat, as it looked. Add `smooth` to recompute smooth normals for curved models. The snack machine went 43k → 6k.
- **Props covered in small decals (labels, signs, snowflakes) melt** at a loose error bound. Cap the error (`maxError: 0.01`) and keep open edges (`lockBorder`); expect only 1.5–3× savings there.
- Always look at the result. A number can be hit by wrecking the shape.

## 3. Don't draw rooms behind walls

three.js frustum-culls but never occlusion-culls. Indoors, every room behind the wall in front of you is still drawn. For indoor, multi-room and multi-level games, the fix is zones:

1. Describe the level as zone boxes: lobby, corridor, each room, each floor, the shop across the road. Overlap is fine; the smallest wins.
2. Write down what each zone can see through doors, glass and windows. This is a *design* list, a few lines long:
   ```js
   const sees = { lobby: ['outside', 'corridor', 'pool'], room: ['upstairs', 'outside'], 'travel stop': ['outside'], outside: ['lobby', 'pool', 'travel stop'] };
   ```
3. `zone-culling` (warehouse logic part) buckets every top-level object into the zone that wholly contains it and hides the zones you can't see. Walls and floors cross zone borders, so they stay drawn. A group that crosses a border is split. Things that move (skinned characters, `userData.loose`, `userData.moves`) and lights stay drawn. For an InstancedMesh, say where it stands with `userData.zone = 'outside'`.
   ```js
   const { attach: zoneCulling } = await logic('zone-culling'); // the warehouse-game PARTS loader
   const zones = zoneCulling(scene, { zones: level.zones, sees });
   // each frame, before render:
   zones.update(camera.position);
   ```

In the hotel, zones took the lobby from 1,180 to 829 draw calls, and room 212 and the upstairs corridor stopped drawing the ground floor. The triangles barely moved: the cars were still visible through the windows, and the plants were still in the lobby. The lite models then took the lobby from 1.9 M to 783k triangles. **Zones fix draw calls; asset weight fixes triangles.** You need both.

What's left in the hotel is draw calls (about 800 in the lobby): 173 materials, multi-material models, and procedural fixtures built from many small meshes. Next would be merging static meshes that share a material within a zone (`BufferGeometryUtils.mergeGeometries`), but keep anything you interact with (doors, switches, pickups) as its own mesh.

The same zones are your level structure. A multi-level game is zones plus `sees`, plus loading a zone's assets only when a zone that sees it is entered (and `dispose()` of geometry, materials and textures when no zone near you needs them).

## 4. Instancing, materials, lights

- **Instance repeats** (cars, poles, chairs, trees) and give them low-poly meshes. Instancing cuts draw calls, not triangles. 48 instances of a 20k-triangle car is still a million triangles.
- **An InstancedMesh culls as one object.** Split big fields into tiles, an InstancedMesh per 30–50 m cell, so the ones behind you are culled.
- **Share materials.** `material.clone()` per prop to tint it makes a new program variant and a new draw state. Use instance colour (`setColorAt`) or vertex colour.
- **Lights.** On phones, use a fixed pool of 4 point lights moved to the nearest anchors, no shadow maps (bake contact shadows into textures), and an HDRI for ambient light. Never toggle `light.visible`: it changes the light count and recompiles every shader.
- **Pixel ratio.** `renderer.setPixelRatio(Math.min(devicePixelRatio, 1))` on phones. A DPR-3 phone renders 9× the pixels otherwise.
- **Frame cap.** 30 fps on phones, 10 fps behind menus, nothing when `document.hidden`.

## 5. Check before publishing

1. `scene-budget.mjs --phone` at the worst spot (usually outdoors, looking at the most stuff) passes, or you know which line is over and why.
2. No asset over its weight class in step 2.
3. Indoor scenes have zones and a `sees` list.
4. A real phone plays for 5 minutes without stutter or heat. Headless numbers are counts, not feel.
