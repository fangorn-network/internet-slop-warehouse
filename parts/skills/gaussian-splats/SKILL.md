---
name: gaussian-splats
description: Put 3D Gaussian splats (captured or AI-generated photoreal scenes, .spz .ply .splat .ksplat .sog) into a three.js web game with Spark, alongside normal meshes, with collisions and performance budgets. Use when a game should feature a real-world scan, a photoreal environment generated from an image or text, or when asked about splats, 3DGS or radiance fields.
---

# Gaussian splats in a three.js game

A splat scene is millions of soft colored blobs: photoreal from any angle, but no triangles, no collisions and no relighting. Treat it as a backdrop and drive gameplay with invisible proxy meshes.

## Renderer: Spark

[Spark](https://github.com/sparkjsdev/spark) (MIT, by World Labs) renders splats inside the normal three.js `render(scene, camera)`, sorted correctly with meshes, on WebGL2, including phones. It reads .ply (also compressed), .spz, .splat, .ksplat and .sog, and streams paged level of detail (.rad) for big scenes. Version 2.4.0 at the time of writing.

```html
<script type="importmap">{"imports":{
  "three": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/",
  "@sparkjsdev/spark": "https://sparkjs.dev/releases/spark/2.4.0/spark.module.js"
}}</script>
<script type="module">
import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 1000);
scene.add(new SparkRenderer({ renderer }));
const world = new SplatMesh({ url: PARTS["my-scan"] });   // a warehouse asset's gateway URL
world.quaternion.set(1, 0, 0, 0);                          // most captures are y-down: flip
scene.add(world);
renderer.setAnimationLoop(() => renderer.render(scene, camera));
</script>
```

This exact page renders inside the warehouse player's sandboxed iframe (scripts only, opaque origin): Spark's workers and WASM need nothing more.

three.js r186+ also has a native splat renderer (with raycasting) but no level of detail or streaming: fine for one small object, not a whole level. Keep the three version in the import map the one Spark's release names.

## Make it a game

1. **Align.** Captures arrive at arbitrary scale and up-axis. Flip, then scale so a known object (door, person, car) is its real size in meters. Put the floor at y = 0.
2. **Collide with proxies.** Build boxes and planes for floor, walls and big props by hand (or from a low-poly mesh exported alongside the capture), with `visible = false`, and give those to the controller's `solids` (e.g. `platformer-controller`, `fps-controls`). Never raycast millions of splats per frame.
3. **Mix in meshes.** Characters, pickups and props are normal GLBs (search the warehouse). Light them from an HDRI with a similar mood to the capture so they don't look pasted on, and add a soft blob or contact shadow under them; splats don't receive shadows.
4. **Hide the edges.** Captures fall apart away from where the camera went. Fence the play area to where it looks good, and fog or a sky sphere beyond.
5. **Budget.** Aim for 1–3 M splats on desktop, under 1 M on phones. Prefer .spz (about 10× smaller than .ply) or paged .rad for large scenes. Cap pixel ratio at 2; splat cost scales with screen pixels covered.

## Where splats come from

- **Capture**: phone apps (Scaniverse, Polycam, Luma), or photos/video through Postshot, Brush, nerfstudio/gsplat or the original INRIA code, then export .ply and convert to .spz.
- **Generate**: image- or text-to-world models (e.g. World Labs Marble) export splats. Check each service's terms on ownership and redistribution before publishing; generated is not automatically CC0.
- **Licence**: the warehouse only takes what you may share. Your own captures you can dedicate CC0. Captures of buildings, artworks or people can carry rights of their own; say what was captured and where in the description.

## Publish

A splat goes in as an `asset` (mime `application/octet-stream`, tags `splat`, `gaussian-splat`, the format, and what it shows), with its scale and up-axis in the description, and ideally a companion `asset` GLB of collision proxies. Keep assets under 5 MB through the MCP `publish` tool; .spz usually fits.
