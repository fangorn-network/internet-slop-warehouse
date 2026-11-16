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
