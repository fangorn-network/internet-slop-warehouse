# CC0 seed sources

Research date: 2026-11-13. Source-page verification is complete for the entries below; downloaded archives still need file-level license and format verification before ingestion.

## First sources

Priority update: the user prefers Poly Haven's visual quality and does not favor Kenney's 3D style. Use Poly Haven as the primary 3D source; Kenney remains optional for audio/UI. Evaluate Grab3D and OS3A as supplementary sources.

### Grab3D

https://grab3d.com/developers/ documents a keyless static catalog at `/api/v1/models.json`, individual `/api/v1/models/{slug}.json`, and `/api/v1/kits.json`. The site currently lists 2,506 models and 74 kits. Records provide GLB download links, sizes, triangle counts, dimensions, textures, license and origin. Cache catalog responses as requested by the developer guide.

The library is advertised as CC0; preserve each package's `LICENSE.txt` and `manifest.json`. The games section has separate licenses and is outside this asset ingestion scope. Preserve `origin.method`, `aiContent`, and `aiAssistedCode`: detailed models may originate from AI image-to-3D, while procedural kits use AI-assisted Blender scripts. See https://grab3d.com/how-we-make-models/ . Do not equate a high-detail label with browser suitability; inspect geometry and texture budgets. Download GLBs are documented as uncompressed; previews use Draco.

Sample verified metadata: https://grab3d.com/api/v1/models/treasure-chest.json declares CC0-1.0, procedural origin, 17,968 triangles, 2048px textures and a 1,064,016-byte GLB. Its description mentions an opening lid, but `movingParts` is empty and `rigged` null: inspect actual nodes before promising interactive mechanics.

### Open Source 3D Assets (OS3A)

https://www.opensource3dassets.com/en advertises 991+ GLBs across 17 collections, mostly CC0, and a downloadable GitHub JSON database. https://www.opensource3dassets.com/en/resources/about/license explicitly distinguishes CC0 and CC-BY and requires collection-specific checking. Import only explicitly CC0 records with upstream evidence; preserve creator and collection identity. This is a discovery catalog, not a blanket CC0 license.

During this research, the web reader could not access `/api/assets`, and developer/collection documentation links returned 404. Verify the linked GitHub database and actual license fields before implementing an adapter. No binary quality validation has yet been performed for either new source.

| Source | Seed value | Discovery and license evidence |
| --- | --- | --- |
| Kenney | Coherent low-poly environments, characters, UI and sound | https://kenney.nl/support confirms asset-page game assets are CC0. Start with https://kenney.nl/assets/nature-kit (330 listed files), https://kenney.nl/assets/platformer-kit (150 listed files, animation), and https://kenney.nl/assets/interface-sounds (100 listed files). Counts are upstream listings, not verified unique models. Discover archive links on pack pages; inspect archive contents for GLB/glTF support. |
| Poly Haven | Scanned props, PBR textures, HDRI lighting | https://polyhaven.com/license confirms CC0. https://github.com/Poly-Haven/Public-API documents the discovery API. API use requires an identifying user-agent or Referer; content surfaced through the live API requires visible source credit. See https://github.com/Poly-Haven/Public-API/blob/master/ToS.md . Prefer available glTF downloads; bundle external buffers and textures into GLB. |
| ambientCG | Ground, stone, wood and other reusable materials | https://docs.ambientcg.com/license/ confirms downloadable assets and material previews are CC0. https://docs.ambientcg.com/api/v3/assets/ documents metadata and download discovery, including `include=downloads`. Start with modest texture resolutions for browser games. |

## Pack-specific candidates

- KayKit Dungeon Pack: https://kaylousberg.itch.io/kaykit-dungeon-pack explicitly advertises CC0 and glTF. Free and paid tiers coexist: verify the exact archive and included license. Current changelog notes split glTF/bin files, so preserve or embed dependencies.
- Quaternius Ultimate Nature: https://quaternius.com/packs/ultimatenature.html still explicitly links CC0, but lists FBX, OBJ and Blend rather than glTF. The current general license at https://quaternius.com/license.html is QAL, updated 2026-08-28, and prohibits standalone asset redistribution. Do not crawl the catalog under a blanket CC0 assumption; require explicit CC0 evidence for each acquired archive. Hold inconsistent cases for review.
- Mixed-license catalogs such as Poly Pizza, OpenGameArt and Freesound are later discovery candidates, not blanket CC0 sources. Verify each item separately and consult access terms before automation.

## Ingestion design

1. Use source adapters and a bounded queue. Prefer documented APIs; check source access rules before crawling, cache metadata, limit concurrency and back off on errors.
2. Preserve original creator, canonical item URL, download URL, acquisition time, license URL/text and evidence snapshot, archive path, SHA-256, and transformation history in a provenance manifest. Keep upstream authorship when publishing.
3. Validate actual file types and glTF dependencies. Prefer self-contained GLB for individual models; reject missing resources. Record dimensions, animation clips, triangles, materials, texture sizes and required decoder extensions so consumers can choose usable assets.
4. Deduplicate by original and normalized content hashes. Publish individual usable assets with descriptive tags; retain pack membership and provenance. Avoid collapsing unrelated models into an opaque ZIP.
5. Generate a reviewable publication manifest, then publish dependency-first through the existing part pipeline. Record resulting CIDs and transaction receipts for resume and audit. Do not run the entire evolving seed manifest blindly.

## Reusable mechanics

The current local manifest already includes platformer movement, patrol/chase, flee override, collection, follow camera, animation clips, procedural trees, wobble, boids, HDRI lighting, spawning and touch controls. Some are pending local work; local presence is not proof of publication.

Review and publish this base before adding overlapping modules. Next useful sets: health/damage/respawn; projectiles and hit detection; interaction and inventory; checkpoints and objectives; wave progression; steering and navigation. Keep the warehouse contract `attach(object, opts) -> { update(dt), dispose() }`, label exports/options/hooks, inject gameplay decisions through callbacks, and pin dependencies. Publish original code under an explicitly selected license; do not relabel third-party code as CC0.

## Northwoods procedural winter kit

All original Northwoods source, generated tree GLBs, procedural pine-spray and
bark textures are dedicated to CC0-1.0. They were created for this warehouse;
no external tree meshes, photographs or recordings were used to generate them.

- `parts/northwoods-layout.js`: deterministic WFC ecology, terrain and trail.
- `parts/northwoods-trees.js`: branching pine and leafless maple geometry.
- `parts/northwoods-world.js`: snowy instanced environment and local footprints.
- `parts/snow-walker.js`, `parts/winter-audio.js`: walking and sample-free audio.
- `scripts/make-northwoods-textures.mjs`: deterministic original PNG synthesis.
- `scripts/make-northwoods-assets.mjs`: self-contained GLB generation/embedding.
- `parts/northwoods/`: generated PNGs, GLBs and portable CC0 source ZIP.

The walk and source ZIP reuse the existing **Poly Haven snow_02** diffuse
(`parts/haven/snow.jpg`, `snow-texture`), CC0-1.0, source
https://polyhaven.com/a/snow_02. Three.js 0.170.0 is an MIT runtime dependency;
its code is not relicensed as CC0. The demo has no networking transport.

## Dead Air Atlas / geographic game systems

Original `score-ledger`, `ability-clock`, `osm-district`, `street-navigation`,
`water-tower`, `osm-town-view`, `dead-air-case` and `p2p-case-session` code and
generated municipal water-tower GLB: CC0-1.0. The game is an original fictional
mystery composed from these and the previously published health, inventory,
objectives, saves, Northwoods geometry/textures, Poly Haven brick/snow/boombox
and synthesized wind parts. All dependencies are pinned in the batch manifest.

The original vector conversion adapter in `parts/osm-vector-district.js` is CC0. Its
published browser-ready bundle includes @mapbox/vector-tile 3.0.0 (BSD-3-Clause),
@mapbox/point-geometry 1.1.0 (ISC) and pbf 5.1.2 (ISC). Full notices are embedded
and published separately as `map-vector-licenses`.

**Map data is not CC0.** The Rhinelander Overpass snapshot and the separately
published vector-derived fixture retain ODbL-1.0 and © OpenStreetMap contributors
attribution. OpenFreeMap input additionally credits OpenFreeMap and
© OpenMapTiles. The ZIP is mixed-license, with separate notices and source data.
See https://www.openstreetmap.org/copyright and
https://openfreemap.org/quick_start/ . No Google imagery was imported.
