// What an asset's bytes say about it: facts, not the publisher's claims. No dependencies and no Node APIs.
// part.js measures at publish; the page measures any part it shows, whoever published it and whenever, by
// reading only the head of the file from storage (measureUrl), so old and foreign parts need no republish.
//
//   measure(bytes) → { bytes, glb? , image? }       measureUrl(url) → the same, from range reads
//   glb    { triangles, vertices, size: [x, y, z] metres, y up (scene bounds, node transforms applied), materials,
//            textures, texturePx (largest side), animations, rigged, compressed: [draco|meshopt|ktx2|webp] }
//   image  { width, height }  (PNG, JPEG, WebP, KTX2)
//
// ponytail: JSON-level facts only. Watertightness, overlap and z-fighting need the index buffers (and a Draco
// decoder); add them here when a gate needs them. EXT_mesh_gpu_instancing copies aren't counted.

const u32 = (b, o, le = true) => new DataView(b.buffer, b.byteOffset + o, 4).getUint32(0, le);
const u16 = (b, o, le = false) => new DataView(b.buffer, b.byteOffset + o, 2).getUint16(0, le);
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));

/** Pixel size of a PNG, JPEG, WebP or KTX2 image → { width, height }, or null. */
export function imageSize(b) {
    if (b.length < 30) return null;
    if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG") return { width: u32(b, 16, false), height: u32(b, 20, false) };
    if (ascii(b, 1, 6) === "KTX 20") return { width: u32(b, 20), height: u32(b, 24) };
    if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") {
        const chunk = ascii(b, 12, 4);
        if (chunk === "VP8 ") return { width: u16(b, 26, true) & 0x3fff, height: u16(b, 28, true) & 0x3fff };
        if (chunk === "VP8L") { const v = u32(b, 21); return { width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 }; }
        if (chunk === "VP8X") return { width: 1 + (b[24] | b[25] << 8 | b[26] << 16), height: 1 + (b[27] | b[28] << 8 | b[29] << 16) };
        return null;
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
        for (let o = 2; o + 9 < b.length; o += 2 + u16(b, o + 2)) {
            if (b[o] !== 0xff) return null;
            const m = b[o + 1];
            if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: u16(b, o + 7), height: u16(b, o + 5) };
        }
    }
    return null;
}

// Column-major 4×4, as glTF stores them.
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mul = (a, b) => Array.from({ length: 16 }, (_, k) => { const i = k % 4, j = (k - i) / 4; return a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3]; });
function local({ matrix, translation: [tx, ty, tz] = [0, 0, 0], rotation: [x, y, z, w] = [0, 0, 0, 1], scale: [sx, sy, sz] = [1, 1, 1] }) {
    if (matrix) return matrix;
    return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + w * z) * sx, 2 * (x * z - w * y) * sx, 0,
        2 * (x * y - w * z) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + w * x) * sy, 0,
        2 * (x * z + w * y) * sz, 2 * (y * z - w * x) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}

const EXT = { KHR_draco_mesh_compression: "draco", EXT_meshopt_compression: "meshopt", KHR_meshopt_compression: "meshopt", KHR_texture_basisu: "ktx2", EXT_texture_webp: "webp" };

/** A GLB's facts (see the top of this file) from its JSON chunk; `sizeOf(bufferView)` reads an embedded image's size. */
function facts(json, sizeOf) {
    const { accessors = [], meshes = [], nodes = [], images = [], bufferViews = [] } = json;
    let triangles = 0, vertices = 0;
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    const visit = (n, parent, seen) => {
        if (seen.has(n)) throw new Error("a .glb's node hierarchy has a cycle");
        const node = nodes[n] ?? {}, world = mul(parent, local(node));
        for (const p of meshes[node.mesh]?.primitives ?? []) {
            const pos = accessors[p.attributes?.POSITION], count = accessors[p.indices]?.count ?? pos?.count ?? 0, mode = p.mode ?? 4;
            triangles += mode === 4 ? Math.floor(count / 3) : mode === 5 || mode === 6 ? Math.max(0, count - 2) : 0;
            vertices += pos?.count ?? 0;
            if (!pos?.min || !pos?.max) continue;
            for (let c = 0; c < 8; c++) {
                const [x, y, z] = [0, 1, 2].map((i) => (c >> i & 1 ? pos.max : pos.min)[i]);
                for (let i = 0; i < 3; i++) {
                    const v = world[i] * x + world[4 + i] * y + world[8 + i] * z + world[12 + i];
                    lo[i] = Math.min(lo[i], v); hi[i] = Math.max(hi[i], v);
                }
            }
        }
        for (const c of node.children ?? []) visit(c, world, new Set(seen).add(n));
    };
    const children = new Set(nodes.flatMap((n) => n.children ?? []));
    for (const n of json.scenes?.[json.scene ?? 0]?.nodes ?? nodes.map((_, i) => i).filter((i) => !children.has(i))) visit(n, I, new Set());
    const mm = (v) => Math.round(v * 1000) / 1000;
    return {
        triangles, vertices,
        size: lo[0] <= hi[0] ? hi.map((h, i) => mm(h - lo[i])) : [0, 0, 0],
        materials: json.materials?.length ?? 0, textures: images.length,
        texturePx: Math.max(0, ...images.map((img) => bufferViews[img.bufferView]).filter(Boolean).map(sizeOf).filter(Boolean).flatMap((s) => [s.width, s.height])),
        animations: json.animations?.length ?? 0, rigged: (json.skins?.length ?? 0) > 0,
        compressed: [...new Set((json.extensionsUsed ?? []).map((e) => EXT[e]).filter(Boolean))],
    };
}

/** A GLB's header → { total, jsonLen }. Throws when it isn't one. */
function header(b) {
    if (u32(b, 0) !== 0x46546c67 || u32(b, 4) !== 2) throw new Error("not a glTF 2.0 binary (.glb)");
    if (u32(b, 16) !== 0x4e4f534a) throw new Error("a .glb's length or JSON chunk is damaged");
    return { total: u32(b, 8), jsonLen: u32(b, 12) };
}

/** A whole GLB's facts. Throws when the bytes start like a GLB but aren't one. */
export function measureGlb(b) {
    const { total, jsonLen } = header(b);
    if (total !== b.length) throw new Error("a .glb's length or JSON chunk is damaged");
    const json = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + jsonLen)));
    const binAt = 20 + jsonLen + 8, bin = b.length > binAt && u32(b, binAt - 4) === 0x004e4942 ? b.subarray(binAt, binAt + u32(b, binAt - 8)) : null;
    return facts(json, (v) => bin && imageSize(bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)));
}

/** An asset file's measured facts → { bytes, glb?, image? }. */
export function measure(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (b.length >= 20 && u32(b, 0) === 0x46546c67) return { bytes: b.length, glb: measureGlb(b) };
    const image = imageSize(b);
    return { bytes: b.length, ...(image && { image }) };
}

/** A stored asset's facts from range reads: a GLB's JSON chunk plus each embedded image's first 4 KB, or an image's
 *  head. Storage must answer Range requests (the Fangorn gateway does). bytes is omitted for non-GLBs: the total
 *  is in Content-Range, which the gateway doesn't expose to pages. */
export async function measureUrl(url, fetchFn = fetch) {
    const range = async (from, to) => {
        const res = await fetchFn(url, { headers: { Range: `bytes=${from}-${to}` } });
        if (!res.ok) throw new Error(`storage answered ${res.status}`);
        const b = new Uint8Array(await res.arrayBuffer());
        return res.status === 206 ? b : b.subarray(from, to + 1);   // a server that ignores Range sends it all
    };
    let head = await range(0, 65535);
    if (!(head.length >= 20 && u32(head, 0) === 0x46546c67)) { const image = imageSize(head); return image ? { image } : {}; }
    const { total, jsonLen } = header(head);
    if (head.length < 20 + jsonLen) head = await range(0, 20 + jsonLen - 1);
    const json = JSON.parse(new TextDecoder().decode(head.subarray(20, 20 + jsonLen)));
    const binAt = 20 + jsonLen + 8, views = (json.images ?? []).map((img) => json.bufferViews?.[img.bufferView]).filter(Boolean);
    const sizes = new Map(await Promise.all(views.map(async (v) => [v, imageSize(await range(binAt + (v.byteOffset ?? 0), binAt + (v.byteOffset ?? 0) + Math.min(v.byteLength, 4096) - 1))])));
    return { bytes: total, glb: facts(json, (v) => sizes.get(v)) };
}
