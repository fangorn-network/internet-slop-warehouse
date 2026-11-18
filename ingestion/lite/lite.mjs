// Make light versions of heavy GLBs: meshoptimizer simplification to a triangle target and textures capped at a
// size, written to parts/lite/<id>-lite.glb. Same look from a few metres, a fraction of the cost (lean-scenes skill).
//
//   node ingestion/lite/lite.mjs ingestion/lite/hotel.json [id…]
//
// The list: [{ id, triangles, texture, dropNormals }]: target triangles, longest texture side in px. dropNormals is for
// flat-shaded models, whose every triangle has its own vertices so nothing welds and nothing simplifies: three.js
// shades a GLB without normals flat, as it looked. `smooth` recomputes smooth normals afterwards, for curved models
// whose seams blocked simplification. lockBorder keeps open edges: decals, labels and thin cut-outs (snowflakes on a
// freezer sign) that otherwise melt into blobs. The source is found under
// parts/grab3d, parts/haven or projects/roadside-inn/assets. Simplification raises its error bound step by step until
// it meets the target or hits `maxError` (default 0.08 of the model's size), so a shape is never wrecked to hit a number.
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, simplify, prune, textureCompress, normals } from "@gltf-transform/functions";
import { MeshoptSimplifier, MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { measure } from "../../site/measure.js";

const [list, ...only] = process.argv.slice(2);
if (!list) { console.error("usage: lite.mjs <list.json> [id…]"); process.exit(2); }
const DIRS = ["parts/grab3d", "parts/haven", "projects/roadside-inn/assets"];
await MeshoptSimplifier.ready; await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const tris = (bytes) => measure(new Uint8Array(bytes)).glb;

const out = [];
for (const { id, triangles, texture = 1024, maxError = 0.08, dropNormals = false, smooth = false, lockBorder = false } of JSON.parse(readFileSync(list, "utf8"))) {
    if (only.length && !only.includes(id)) continue;
    const src = DIRS.map((d) => `${d}/${id}.glb`).find(existsSync);
    if (!src) { console.log(`skip ${id}: no source`); continue; }
    const before = tris(readFileSync(src));
    let bytes, error = 0.002;
    for (;;) {
        const doc = await io.read(src);
        if (dropNormals) for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) p.setAttribute("NORMAL", null);
        await doc.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, triangles / before.triangles), error, lockBorder }),
            textureCompress({ encoder: sharp, resize: [texture, texture] }), ...(smooth ? [normals({ overwrite: true })] : []), prune());
        bytes = await io.writeBinary(doc);
        if (tris(bytes).triangles <= triangles * 1.15 || error >= maxError) break;
        error = Math.min(maxError, error * 2);
    }
    const after = tris(bytes), dest = `parts/lite/${id}-lite.glb`;
    writeFileSync(dest, bytes);
    out.push({ id, dest, before: before.triangles, after: after.triangles, error, texturePx: after.texturePx, size: after.size, mb: +(bytes.length / 1e6).toFixed(2), srcMb: +(readFileSync(src).length / 1e6).toFixed(2) });
    console.log(`${id.padEnd(32)} ${String(before.triangles).padStart(7)} → ${String(after.triangles).padStart(6)} tris  error ${error}  ${before.texturePx}→${after.texturePx}px  ${out.at(-1).srcMb}→${out.at(-1).mb} MB`);
}
const report = list.replace(/\.json$/, ".report.json"), was = existsSync(report) ? JSON.parse(readFileSync(report, "utf8")) : [];
writeFileSync(report, JSON.stringify([...was.filter((r) => !out.some((o) => o.id === r.id)), ...out], null, 2) + "\n");
