# Lobby engineering: audit, techniques, build plan (2026-11-21)

Realism architect/engineer, Heartland Inn lobby. Read with the consultant's brief
(`lobby-reality-2026-11-21.md`, ranked 30 at the end). Screenshots are in `artifacts/roadside-inn/realism/`:
`a-*` are the audit at `?quality=low` (pixel ratio 0.5, so the jaggies there come from the harness), `b-*` the same
views at full quality, both taken **before** any change. `c-*` to `i-*` are after each step.

## 1. Audit: what reads as rigid, blocky or too clean

Player-eye close-ups: entrance (`a-entrance`, `a-entrance-floor`), desk (`a-desk`), market (`a-market`), coffee bar
(`a-coffee`, `b-coffee-full`), great room (`a-great-room`, `a-sofa`), communal table (`a-communal`), business center
(`a-business`), elevator (`a-elevator`), floor (`a-carpet`).

**Everywhere**
- Nothing touches the floor. No contact shade at column bases, pods, bins, plants or walls. Point lights cast no
  shadows, and phones turn shadow maps off completely (`renderer.shadowMap.enabled = !LOW`), so on mobile every object
  floats. This is the biggest single "CG" tell. *Fixed for statics (step 1).*
- Walls meet the LVT bare: no cove base, no dust line. *Fixed (step 1).*
- The ceiling is a blank textured plane plus cans. No diffusers, returns, sprinklers, cameras or access panel. *Fixed
  except the access panel (step 4).*
- The "lived-in" layer that already exists (`lived-in.js` floor wear at 0.2 × 0.08 opacity) can't be seen at player
  distance. Real wear is faint, but this is under the threshold.
- Every surface has one uniform sheen. No hand grease on pod edges, no paint touch-ups, no dull traffic lanes. Glass and
  stainless are spotless.
- Grid-perfect placement: 8 communal stools in exact pairs, pantry stools on a 120° spoke, and the task chairs at
  formula angles.
- One run showed a blue bar stool lying on its side in the great room (`a-great-room`, `a-sofa`). The second run didn't
  reproduce it (every stool `up.y = 1`). A walker or the arrival may knock one over. Watch for it: a tipped stool with
  nobody near reads as a bug.

**Entrance.** The mat was dead square and spotless. The floor past it was clean, with no tracked-in grit. *Grit and the
mat fixed (step 5).* There are no door decals (AUTOMATIC CAUTION DOOR, hours, cards).

**Desk.** The pods are flawless white: no scuffed edges, no grease band where hands rest. The slat wall is perfectly
regular. The clerk's clutter is sparse next to a real night desk (consultant §6, #13).

**Market.** Every facing is full and squared to the shelf edge, with no gaps or wrong-slot items. The shelf sides are
plain boxes. There's no fog or prints on the cooler glass.

**Coffee bar.** Pristine before this pass. The two old rings were grey, not coffee-coloured, and there were no grains,
lids, napkins or tray residue. *Fixed (step 3).*

**Great room.** The sectional's cushions are uniform, with no slump or soiling. The map mural's lakes render as hard
black pixel blocks (Victor's `art.py`: they read as missing texture). The cloud coffer and TV wall are clean.

**Communal table / business center.** The table top is spotless apart from one cup. There are no crumbs, cable
spaghetti or power strip. The business-center bin is empty.

**Elevator.** The stainless is flat and featureless, with no fingerprints at the seam, no sill grit and no tactile
plates.

**Performance (measured, lobby views, `renderer.info`).** Full quality: 500-2070 draw calls and 0.7-2.2 M triangles
(the count includes shadow passes). Economy (`?quality=low`, the phone tier): **1850 calls and 1.7 M triangles from the
entrance, 1565 calls and 2.0 M triangles at the sofa**, 358 textures. That is already well past a comfortable phone budget
(about 300-500 calls). Anything new must be instanced or merged, and the existing scene needs a merge pass (see §3).

## 2. Techniques: what runs on mobile and paints reality over blockiness

| Technique | Mobile cost | Verdict |
|---|---|---|
| **Painted contact shade / AO as a multiply overlay** (one canvas covering the floor, from mesh boxes and wall colliders) | 1 draw call; 516×432 px on phones (~0.9 MB RGBA), 1032×864 on desktop | **Built.** Biggest win per byte, and phones need it most because they have no shadow maps |
| **Projected decals** (merged quads + canvas textures, polygonOffset) for stains, scuffs, rings, drips, smudge halos | 1 call per kind; 128-256 px canvases | **Built / extend.** Already the house pattern (`lived-in.js`). three's `DecalGeometry` only pays off on curved meshes; our surfaces are flat, so quads are enough |
| **Liquid spills as impact events** (puddle decal growing with ease-out, sheen from the interior env map, soak on carpet, splash) | 1 call per puddle, capped at 12 | **Built** (step 2) |
| **Instanced micro-props** (sugar grains, sprinklers, diffusers) | 1 call per kind | **Built** |
| **AO / grime baked into textures in Blender** (Cycles AO or curvature → dirt in crevices, edge wear) | free at runtime; costs texture memory only | **Recommended for the rebuilt assets.** Bake into the existing base-colour map so no extra map is needed, which also suits phones because `budget()` strips detail maps from small props there |
| **Shared world-space grunge roughness** (one 512 px map, triplanar or world UV, multiplied into roughness via `onBeforeCompile`) | 1 texture (~0.35 MB) and one shader chunk; no extra calls | **Next.** Covers consultant #5, #6 and #27 (sheen variation, fingerprints, dust on tops) with one mechanism |
| **Runtime SSAO / N8AO** | a full-screen pass or two; ~3-6 ms on a mid phone at 1× | **No for phones**; maybe on the high tier only |
| **Lightmaps for the architecture** | 1-2 MB of maps plus a uv2 on the slabs and walls | Later, if the painted shade isn't enough on walls and ceiling |
| **Gaussian splats** (Spark / `@mkkellogg/gaussian-splats-3d`, both MIT) | see below | **Not for the lobby** |

**Gaussian splats, assessed.**
- *Cost.* A single prop-scale capture is 100-300 k splats: about 6-20 MB as `.ply`, or 1-3 MB as `.spz`. Each splat is a
  sorted, alpha-blended quad, so the cost is fill-rate and overdraw plus a per-frame depth sort (worker or GPU). A
  mid-range phone holds roughly 0.5-1 M splats at 30 fps with *nothing else* in the scene. We already spend the frame on
  1.8 k draw calls.
- *Lighting.* Splats carry baked radiance: the light of wherever they were captured. They don't respond to our
  point-light pool, the dusk/day switch, the TV glow or the time of day, so a daylight-captured chair would glow in our
  night lobby. That mismatch is the "looks like a bug" failure.
- *Physics.* Splats have no mesh. Every prop would still need a collider proxy, and they can't be picked up or knocked
  over in a believable way.
- *Licensing.* CC0 or CC-BY captures of US hotel objects are close to nonexistent. Polycam and Luma captures belong to
  their authors (usually not CC). We would have to capture our own.
- *Pipeline.* A splat file could be a warehouse part as an opaque binary, but that needs a new mime and a loader. That
  is a global change we aren't making.

Use splats at most for one distant exterior backdrop on desktop.

## 3. Build plan

**Done in this pass** (each in its own commit, all in `projects/roadside-inn`):
1. `4913e41`: contact shade and grime on the floor (`buildFloorShade`), and a rubber cove base on every lobby wall
   run (`buildCoveBase`).
2. `18b76fc`: spills. Cups, the clerk's mug and creamer leave a puddle where they land hard: a thick middle and thin
   edge, a meniscus hairline, env-map sheen on hard floors, matte wicking on carpet, with a splash sound. Never placed on
   loose props, and never hanging past a counter edge.
3. `34443c1`: coffee bar in use. A torn packet with spilt grains (instanced), lids on the counter and floor, a crumpled
   napkin, coffee standing in the drip grates and drips under the taps; the rings are warmer.
4. `41acc30`: ceiling services. Diffusers with smudge halos, egg-crate returns, sprinklers, dome cameras.
5. `b13e028`: tracked-in grit fading from the mat along both walks; the mat sits off square.

**Next, in order of value per effort**
1. **Merge pass for phones (performance, prerequisite).** Merge static lobby meshes by material (`statics`, the
   coffer, columns, fixtures' sub-meshes) and instance repeated GLBs (stools, chairs, plants). Target under 600 calls in
   the lobby on economy.
2. **Shared grunge roughness chunk** (consultant #5, #6, #27). One 512 px world-space map: hand-grease bands on pod
   edges and table rims, fingerprints on glass and stainless by height, dust on tops above 1.8 m (world-normal-up mask).
   One `onBeforeCompile` hook applied by material name.
3. **Blob shadows for loose furniture on phones.** One InstancedMesh of soft quads following chairs and stools, since
   the static shade can't move with them.
4. **Rebuild with baked dirt (Victor, Blender).** Pods with edge wear and a darker toe kick; the sectional with seat
   slump, soiled arm tops and a pillow out of line; the market shelf with gaps and uneven depths; bins with liners and
   contents. Bake Cycles AO and curvature-masked grime into the base colour, so phones get it for free.
5. **Notices and decals** (#8): AUTOMATIC CAUTION DOOR, hours and cards on the slider glass, the elevator fire sign,
   "Please pay at front desk". `F.sign` planes, SVG atlas.
6. **US extinguisher cabinets** (#9): a new Blender asset, replacing the Korean model building-wide.
7. **Night light scene** (#10, #11): a dimmer cans table, cold cooler and vending spill, one mismatched-CCT can.
8. **Animated:** coffee steam over a fresh puddle and over the servers (soft sprites, a few seconds); the cooler LED's
   rare wobble; a slop-on-sprint chance while carrying a cup; sugar crunch footsteps within 15 cm of grains (the
   decal zones are known).
9. **Breakfast area:** stays visible at night, closed (a closed-state variant, not `visible = false`).

**Not doing:** fluid simulation, runtime SSAO on phones, splats for props.

## 4. Phone performance pass (phase 3)

Measured at the phone tier (`?quality=low`: economy, no shadows), `renderer.info` for one frame. The views are
check.mjs's lobby positions. Screenshots: `artifacts/roadside-inn/perf/before/` and `perf/after/`, same viewpoints, and
they look the same (the TV picture changes on its own). The target was ≤ 400 draw calls and ≤ 500 k triangles in view.

| View | Draw calls before → after | Triangles before → after |
|---|---|---|
| Entrance (looking in) | 1853 → **490** | 1.66 M → **515 k** |
| Desk | 897 → **278** | 1.09 M → **308 k** |
| Coffee bar | 527 → **147** | 705 k → **177 k** |
| Great room | 1506 → **378** | 1.59 M → **463 k** |
| Business center | 1271 → **317** | 1.40 M → **372 k** |

Textures loaded: 358 → 323. Shader programs: 97 → 94.

The entrance is the worst case and still over target, by 90 draw calls and 15 k triangles. From there you see the whole
lobby plus the north lot through the breakfast windows. What's left is a long tail of 1-3 calls per object, six
residents, and the cars through the glass.

What did it, in order of effect:
1. **Transmission off** (the clock glass and the pole insulators): three re-rendered every opaque object into a
   transmission target. That alone halved the frame.
2. **Instancing per 32 m cell**: the lot's InstancedMeshes had one bounding sphere that held the camera, so frustum
   culling never dropped them.
3. **Loose props and the housekeeping cart culled by zone and size** on phones. Small statics that touch a wall are
   pinned to their centre's zone, because zone culling drew them from everywhere. Residents in unseen zones are hidden
   by render layer.
4. **Merging**: each prop by material (loose ones too), the building's small meshes per 8 m cell, props across each
   other per cell on phones, and phone-only flat-colour materials collapsed into shared vertex-colour ones. Parked cars
   flatten even their textured parts, coloured by the texture's mean texel. Brochures are 2 calls, not 6. The elevator
   car is hidden behind shut doors.
5. **`-mobile` LOD GLBs** for the seven densest props (`blender/mobile_lod.py`, `assets-21.parts.json`).

Publish note: `assets-21.parts.json` (the seven `-mobile` GLBs) has to be published with the release, because
`PART_IDS` now includes them.
