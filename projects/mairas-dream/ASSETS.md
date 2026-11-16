# Acquired CC0 library

All licenses checked 2026-11-15. Creator pages/license observations, archive notices and file checksums are retained in the acquisition directories. License sources:

- Poly Haven: https://polyhaven.com/license — models, HDRIs and textures are CC0; redistribution is permitted. This project uses model files, not website photography.
- Quaternius Ultimate Modular Men: https://quaternius.com/packs/ultimatemodularcharacters.html
- Quaternius Ultimate Modular Women: https://quaternius.com/packs/ultimatemodularwomen.html
- Kenney Impact Sounds: https://kenney.nl/assets/impact-sounds

## Poly Haven

New bounded batch: `ingestion/polyhaven/batches/mairas-store/selection.json`, metadata, resource checksums and `provenance.json`. Existing repository ingestion packs reused where available.

| Part | Role |
| --- | --- |
| ph-shelf-01 | Repeated housewares/electronics shelves |
| ph-wooden-bookshelf-worn | Books/media shelves |
| ph-mounted-fluorescent-lights | Repeated ceiling fixtures |
| ph-desk-lamp-arm-01 | Adjustable lamps and required purchase |
| ph-ceramic-vase-03 | Individually selectable ceramics |
| ph-pot-enamel-01 | Individually selectable enamel pots |
| ph-vintage-electric-kettle | Individually selectable kettles |
| ph-korean-fire-extinguisher-01 | Relocated equipment |
| ph-painted-wooden-cabinet-02 | Furniture department detail |
| ph-boombox | Individually selectable electronics |
| ph-armchair-01 | Furniture department detail |
| ph-woodentable-01 | Real furniture and lamp display |

Original GLBs embed their 1K PBR resources. Source authors are preserved in each warehouse part’s metadata. Source GLB geometry/materials are preserved. At runtime, furniture wrappers normalize to ground-origin meter scale; shelving fits the specified fixture dimensions. Merchandise placement uses measured shelf-board heights.

## Characters

`qt-thrift-casual`: Casual_2 from Ultimate Modular Men (Feb 2022).
`qt-thrift-cashier`: Casual from Ultimate Modular Women (April 2022).
`qt-thrift-manager`: Suit from Ultimate Modular Men (Feb 2022).

Creator: Quaternius. Official pages state CC0 and link to public Google Drive folders. Files acquired from the inspected `agentkaerf/FreeModels` mirror of those packs. Included License.txt notices are retained. Packed to GLB with original rig/materials and a selected set of idle, walk, run, interact, hit and wave animations. Runtime clone uses Three.js SkeletonUtils. Manager colors and clown accessories are runtime modifications. The cashier asset initially used the pack’s Worker; the revised publication replaces it with Casual.

## Sound

`kenney-thrift-foley`: six unmodified Ogg clips from Impact Sounds, mirrored in `receptron/mulmocast-media` with original Kenney provenance. Three concrete footstep variations, a light glass impact, a light metal impact and a medium soft impact. Delivered in one JSON bank of data URLs. No fighter voiceover files were imported: NPC utterances are generated formant sounds.

## Display optimization

`optimize-assets.mjs` uses meshoptimizer from an isolated temporary installation. `assets/display-lods.json` contains only replacement triangle indices for six repeated source assets, plus input SHA-256 hashes and measured reductions. Positions, normals, UVs and original meshes remain unchanged. Borders are protected; target error is 0.035, target index count is 16%. The original full meshes remain in the inspection view. This derived CC0 index data is independently published as `mairas-store-display-lods`.

Rebuild tool: `npm install --prefix /tmp/maira-optimization meshoptimizer`, then `node projects/mairas-dream/optimize-assets.mjs`.

Source models are loaded once and reused. Merchandise uses instanced meshes, with a stable item ID for each instance. Taking/returning an item hides/restores only that instance and its tag. Architectural geometry batches by material; repeated textured fixtures instance by geometry and material. No rendered shelf backdrop is used.

## Full Shelves revision (v3)

35 additional warehouse assets: 7 Poly Haven model collections, 12 independently reusable 1K PBR maps, 4 extracted porcelain pieces, 3 authored garments, an animated cat, 3 Kenney vehicles, a Base Mesh mug, 2 glazed mug derivatives, and 2 extracted Poly Haven hardcover variants. See `realism-assets.parts.json`, `detail-assets.parts.json` and their verified publication receipts. All are CC0. Original downloaded files and conversion scripts remain in the repository; checksums and source URLs are in `ingestion/mairas-realism/`.

Poly Haven supplies Tea Set 01 (James Ray Cock, Rico Cilliers, Jurita Burger), Covered Car, Cross Pein Hammer, Cash Register 01, Rubber Boots, Sofa 02, Worn Metal Rack, Decorative Book Set 01, Floor Tiles 06, Asphalt 01, Fabric Pattern 05 and Denim Fabric 06. https://polyhaven.com/license explicitly permits redistribution. Books were converted from upstream FBX with MD5-verified 1K JPG maps. Covers remain the original CC0 artwork, including the supplier's page edges/spines. The Chinese porcelain cup is used as a tea cup; the novelty coffee mug has an actual handle and original lettering.

The Base Mesh handled mug: https://www.thebasemesh.com/ (CC0 library). Downloaded from https://raw.githubusercontent.com/Papyszoo/CC0-Public-Domain-Models/main/packs/the-base-mesh/models/mug/mug.glb . Original preserved as `basemesh-mug`; derived glazed mug and neighbor decal are separate parts. Decal vertices are offset along their surface normals so export does not depend on renderer-specific polygon-offset settings.

Cat: creator Quaternius's CC0 Animal Pack Vol.2, https://opengameart.org/content/animated-animales-low-poly . Converted FBX with original skeleton, idle and walking clips. Runtime dark colors and match are original additions. License evidence is retained locally. Vehicles: https://kenney.nl/assets/car-kit ; creator's CC0 pack mirrored by Papyszoo. Clothing is actual garment mesh extracted from the previously published Quaternius actors, with Poly Haven fabric maps applied at runtime. People/cars remain stylized authored assets; this pass does not claim photorealistic humans or vehicles.

Current display LODs cover 26 model IDs. Most protect borders; duplicated FBX book seams use meshoptimizer's Permissive mode to reduce display triangles while retaining source vertex attributes. The original full models remain available in inspection. Architecture, rack rails, wire hangers, tags, labels, match and visual effects remain original geometry. No rendered shelf backdrop is used.

## Little Treasures revision (v4)

Eight additional existing warehouse models are now used: `ph-fern-02`, `ph-vintage-oil-lamp`, `marble-bust`, `cat-statue`, `ph-plastic-monobloc-chair-01`, `ph-metal-tool-chest`, `apple`, and `barrel`. All are CC0 Poly Haven acquisitions; original source metadata remains on the warehouse parts. `decor-existing.parts.receipts.json` pins their verified live records. This revision reuses these publications rather than uploading duplicate models. Busts, cat statues, oil lamps and saucers are individually collectable stock; display-table pieces have stable `window-*` IDs. Vegetation, chairs, lunch fruit, tool chest and exterior barrels furnish the environment. Additional printed community notices are original graphics. Index-only LODs now cover 29 source IDs, including the new repeated sculpture/lamps.

## Sorted Donations revision (v5)

Four new reusable CC0 derivatives of `ph-tea-set-01`: `ph-thrift-teapot`, `ph-thrift-sugar-bowl`, `ph-thrift-tea-mug`, `ph-thrift-square-plate`. The first two combine each original vessel with its corresponding lid. Source authors: James Ray Cock, Rico Cilliers and Jurita Burger; https://polyhaven.com/a/tea_set_01 . Geometry and embedded PBR resources are preserved, with ground-centered normalization. Conversion: `build-assortment.mjs` and `asset-workshop.html`; SHA256 evidence: `artifacts/mairas-dream/v5/assortment-provenance.json`.

Existing warehouse models added to assortments: `ph-vintage-radio-transceiver`, `ph-watering-can-metal-01`, `horse-statue`, `lantern`. Their verified live records are pinned in `assortment-existing.parts.receipts.json`. No duplicate uploads are needed. Index-only display data covers 37 source IDs. Runtime glaze/cover tint variants reuse the authored meshes/maps and keep the novelty mug's original lettering intact. No floorplan/reference imagery is embedded or republished.

The existing horse figurine carries a GLB morph pose with weight 1. Static prototypes bake that pose into cloned vertex buffers before instancing, recompute normals/bounds and remove the display clone's morph attributes. This preserves the intended statue shape for rendering and ray selection without requiring per-instance morph textures. The original source GLB and loaded model remain unchanged; the full posed geometry is used in inspection.
