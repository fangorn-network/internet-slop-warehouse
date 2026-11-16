# Field-station pack

Powered by Poly Haven. This bounded batch adds five static models and three
lighting/material resources to the warehouse. Source assets are CC0:
https://polyhaven.com/license.

| Source | Use |
| --- | --- |
| https://polyhaven.com/a/fern_02 | Instanced forest understory |
| https://polyhaven.com/a/tree_stump_01 | Trail-side detail |
| https://polyhaven.com/a/dead_tree_trunk | Woodland landmarks |
| https://polyhaven.com/a/portable_generator | Interactive machinery |
| https://polyhaven.com/a/vintage_radio_transceiver | Interactive station radio |
| https://polyhaven.com/a/misty_pines | HDR image-based lighting |
| https://polyhaven.com/a/forrest_ground_01 | OpenGL normal and roughness maps |

`provenance.json` retains model authors, source metadata and checksums.
`lighting.provenance.json` does the same for HDR/material resources. Downloads
verify upstream size and MD5 and retain output SHA-256. GLBs embed all 1K textures
without geometry simplification. `validation.json` records zero Khronos validator
errors for all five models; source models omit tangent attributes (Three.js
generates tangent space during rendering). Fern buffer targets are optional
upstream omissions; the radio has an empty source node.

The complementary green pine branch card is original CC0 procedural art,
not a Poly Haven asset. Rebuild with `node scripts/make-field-pine.mjs`.

Publish using `parts/field-station-foundation.parts.json`; publish the playground
only after that pack's receipts exist. No Sketchfab assets are included.
