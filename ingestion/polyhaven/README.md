# Poly Haven pilot

Powered by Poly Haven. Source assets: https://polyhaven.com, CC0-1.0.

Six reusable props with 1K PBR maps, packed into individual self-contained GLBs. `catalog.json` is the discovery snapshot; per-model `*.files.json` files preserve download metadata. `provenance.json` records creators, source URLs, acquisition times, source checksums, output hashes and transformations. `license-evidence.html` preserves the source license page.

Run `node ingestion/polyhaven/ingest.js` to rebuild the fixed pilot selection. Downloads are sequential, cached, timeout-limited, retried, and checked against upstream byte lengths and MD5 where supplied. SHA-256 fingerprints every source resource and output. No geometry simplification is performed.

`parts.json` is the publication batch. Review it before running `NETWORK=baseSepolia node ingestion/polyhaven/publish.js`. The publisher verifies output hashes, refuses conflicting IDs, publishes only this batch, checks chain read-back and saves `receipts.json`.

`validation.json` contains Khronos glTF Validator reports. All six models have zero validation errors. Upstream meshes omit tangent attributes, so loaders must generate tangent space for normal maps; the validator reports this warning. Three older models also omit optional buffer-view targets. No visual or gameplay validation is implied by structural validation. Scale and pivots are preserved, so position using runtime bounding boxes.

API identification: `internet-slop-warehouse-seed/0.1`. Catalog and file metadata are cached; reruns do not repeatedly crawl the API. To refresh metadata, explicitly acquire a new snapshot rather than silently changing this batch.
