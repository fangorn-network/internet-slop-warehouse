# Hotel pack, batch 1

Powered by Poly Haven. 30 CC0 parts for the Heartland Inn (`projects/roadside-inn`): https://polyhaven.com/license.

- **Models (18).** `selection.json`, packed by `node ingestion/polyhaven/ingest.js --batch hotel` into self-contained GLBs with 1K textures. Geometry is unchanged. `validation.json` reports 0 Khronos validator errors. Warnings are upstream omissions: tangents and buffer-view targets.
- **Surfaces (12).** Built by `node surfaces.mjs`:
  - herringbone parquet, wool herringbone carpet and white sandstone bricks: color, normal and roughness maps for each
  - sparse grass: color and normal maps
  - farm-field pure-sky HDRI (2K).
- **Verification.** Downloads are checked against upstream size and MD5. `provenance.json` and `surfaces.provenance.json` keep creators, sources and SHA-256 hashes.

The publication manifest is `projects/roadside-inn/assets-1.parts.json`.
