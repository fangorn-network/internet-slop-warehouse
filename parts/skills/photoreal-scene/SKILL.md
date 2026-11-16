---
name: photoreal-scene
description: Recipe for a photoreal three.js scene from CC0 scanned props, PBR textures and HDRI lighting in the internet slop warehouse. Use when a web game or scene should look real rather than low-poly, or when PBR models look flat, plastic or too dark.
---

# Photoreal three.js scene

Realism in a browser is mostly lighting, color management and scale, not polygon count. The warehouse's `ph-*` assets are Poly Haven scans (CC0) with 1K PBR maps, packed as GLB; `*-sky` and `*-hdri` assets are equirectangular HDRIs.

## Parts

- Lighting: `hdri-sky` (logic) with an HDRI such as `day-sky`, `ph-hotel-farm-sky`, `ph-hotel-dusk-sky`, or `ph-hotel-room-hdri` for interiors.
- Props: search `type: "asset"` with words like "realistic pbr crate", "scanned rock", "furniture". Prefer `ph-*` and `acg-*`.
- Surfaces: `*-color`, `*-normal`, `*-roughness` texture triples (e.g. `ph-store-floor-*`, `acg-hotel-terrazzo-*`).

## Renderer

```js
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;      // or ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0;               // tune per HDRI, 0.6–1.4
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

## Light

1. Image-based light from the HDRI does most of the work: `(await logic("hdri-sky")).attach(scene, { url: PARTS["day-sky"], blur: 0 })` sets `scene.environment` and the background.
2. Add **one** `DirectionalLight` aligned with the sun in the HDRI, for shadows only. Tight shadow camera bounds around the play area, `shadow.mapSize` 2048, `shadow.bias` about -0.0005, `shadow.normalBias` 0.02.
3. Interiors: use the room HDRI for environment, a few low-intensity `PointLight`/`SpotLight` for practicals, and keep shadows on one of them.

## Materials

- Color maps get `texture.colorSpace = THREE.SRGBColorSpace`; normal and roughness maps stay linear.
- Tiled surfaces: `RepeatWrapping`, a `repeat` that matches real size (about one repeat per meter for floors), `anisotropy = renderer.capabilities.getMaxAnisotropy()`.
- Poly Haven GLBs have no tangents: `MeshStandardMaterial` derives them in the shader, which is fine. If seams show, `BufferGeometryUtils.computeMikkTSpaceTangents`.
- Nothing is pure black, pure white or roughness 0. Metals are `metalness: 1` with colored base, everything else `metalness: 0`.

## Scale and composition

- Scans are real size in meters. Keep them that way, and size the camera to match: `PerspectiveCamera(50–60, aspect, 0.05, 500)`, eye at 1.6 m.
- Ground contact sells realism: every prop casts and receives shadows, and sits on the floor (`Box3` its min y to 0).
- Variety: rotate and lightly scale repeats, use instancing for many copies, and break up big flat surfaces with a second texture or decals.

## Post (optional, measure the cost)

`EffectComposer` with `RenderPass`, `GTAOPass` (or `SAOPass`) for contact shadows, a subtle `UnrealBloomPass` (threshold about 0.9) for bright lights, then `OutputPass` last so tone mapping and color space apply once. Drop the composer on phones if it costs more than a few ms.

## Check

Screenshot it next to the Poly Haven preview of the same asset. If it looks flat: exposure is off or the environment is missing. If it looks plastic: roughness map not applied or wrong color space. If it floats: no contact shadow.
