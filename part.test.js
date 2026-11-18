// skill and source parts: checked, stored under their key, and every seed skill parses.
import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { preparePart, skillOf } from "./part.js";
import { measure } from "./site/measure.js";

const stored = new Map();
const fangorn = { getAddress: () => "0xabc", engine: { readRecord: async () => null },
    getStorage: () => ({ putFile: async (bytes, name) => (stored.set(name, name.endsWith(".json") ? JSON.parse(new TextDecoder().decode(bytes)) : bytes), name) }) };
const md = "---\nname: tiny\ndescription: \"Does a tiny thing.\"\n---\n# Tiny\n";

test("a skill is a SKILL.md with a name and description", async () => {
    const r = await preparePart(fangorn, { type: "skill", id: "tiny-skill", title: "Tiny", content: md });
    expect(r.payload.skill).toBe("tiny");
    expect(stored.get("tiny-skill.json")).toEqual({ md });
    await expect(preparePart(fangorn, { type: "skill", id: "x", title: "X", content: "# no frontmatter" })).rejects.toThrow(/frontmatter/);
    expect(() => skillOf("---\nname: Bad Name\ndescription: d\n---")).toThrow(/lowercase/);
    expect(() => skillOf("---\nname: ok\n---")).toThrow(/description/);
});

test("source needs its origin and license", async () => {
    const part = { type: "source", id: "lerp", title: "Lerp", content: "export const lerp = (a, b, t) => a + (b - a) * t;" };
    await expect(preparePart(fangorn, { ...part, license: "MIT" })).rejects.toThrow(/origin/);
    const origin = { repo: "https://github.com/mrdoob/three.js", commit: "abc123", path: "src/math/MathUtils.js" };
    await expect(preparePart(fangorn, { ...part, origin })).rejects.toThrow(/license/);
    const r = await preparePart(fangorn, { ...part, origin, license: "MIT" });
    expect(r.payload.origin).toEqual(origin);
    expect(stored.get("lerp.json")).toEqual({ code: part.content });
});

test("every seed skill parses", () => {
    const parts = JSON.parse(readFileSync(new URL("./parts/parts.json", import.meta.url), "utf8")).filter((p) => p.type === "skill");
    expect(parts.length).toBeGreaterThan(0);
    for (const p of parts) skillOf(readFileSync(new URL(`./parts/${p.file}`, import.meta.url), "utf8"));
});

test("a missing part is 'no part', any other read failure comes through as itself", async () => {
    const reading = (err) => ({ ...fangorn, engine: { resolveHeadCommit: async () => { throw new Error(err); } } });
    const part = { type: "skill", id: "uses-it", title: "U", content: md, uses: [{ publisher: "0xdef", id: "health" }] };
    await expect(preparePart(reading("publisher 0xdef has no on-chain commits in repo r"), part)).rejects.toThrow(/no part 0xdef\/health/);
    await expect(preparePart(reading("Too many subrequests."), part)).rejects.toThrow(/Too many subrequests/);
});

test("many credits to one publisher read its head once", async () => {
    const heads = [], ids = Array.from({ length: 46 }, (_, i) => `p${i}`);
    const engine = {
        resolveHeadCommit: async (p) => (heads.push(p), "head"),
        stateAt: async () => ({ state: new Map(ids.map((id) => [id, `cid-${id}`])) }),
        decodeRecord: async (id, cid) => ({ id, cid, type: "logic" }),
    };
    const r = await preparePart({ ...fangorn, engine }, { type: "skill", id: "uses-all", title: "U", content: md, uses: ids.map((id) => ({ publisher: "0xDEF", id })) });
    expect(heads).toEqual(["0xDEF"]);
    expect(r.payload.uses.map((u) => u.cid)).toEqual(ids.map((id) => `cid-${id}`));
});

// A GLB with one triangle under a rotated, scaled parent and an embedded 512×256 PNG.
function png() {
    const png = new Uint8Array(33); png.set([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(png.buffer).setUint32(16, 512); new DataView(png.buffer).setUint32(20, 256);
    return png;
}
function glb() {
    const bin = new Uint8Array(36 + 36 + 3); bin.set(png(), 36);           // 36 bytes of positions, then the image
    const s = Math.SQRT1_2, json = new TextEncoder().encode(JSON.stringify({
        asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }],
        nodes: [{ rotation: [0, 0, s, s], scale: [2, 2, 2], children: [1] }, { translation: [1, 0, 0], mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 3, 0] }],
        bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 33 }],
        images: [{ bufferView: 1, mimeType: "image/png" }], materials: [{}], skins: [{ joints: [1] }],
        extensionsUsed: ["EXT_meshopt_compression"], buffers: [{ byteLength: bin.length }],
    }).padEnd(4 * 60, " "));
    const pad = (n) => (n + 3) & ~3, J = pad(json.length), B = pad(bin.length), out = new Uint8Array(28 + J + B), v = new DataView(out.buffer);
    v.setUint32(0, 0x46546c67, true); v.setUint32(4, 2, true); v.setUint32(8, out.length, true);
    v.setUint32(12, J, true); v.setUint32(16, 0x4e4f534a, true); out.fill(0x20, 20, 20 + J); out.set(json, 20);
    v.setUint32(20 + J, B, true); v.setUint32(24 + J, 0x004e4942, true); out.set(bin, 28 + J);
    return out;
}

test("an asset is measured from its bytes, before anything is stored", async () => {
    const r = await preparePart(fangorn, { type: "asset", id: "tri", title: "Tri", bytes: glb(), mime: "model/gltf-binary" });
    // child at x+1, scaled ×2, turned 90° about z: a 1×3 triangle becomes 6 wide, 2 tall
    expect(r.payload.measured.glb).toEqual({ triangles: 1, vertices: 3, size: [6, 2, 0], materials: 1, textures: 1, texturePx: 512,
        animations: 0, rigged: true, compressed: ["meshopt"] });
    const bad = glb(); bad[8] ^= 1;
    await expect(preparePart(fangorn, { type: "asset", id: "bad", title: "Bad", bytes: bad })).rejects.toThrow(/damaged/);
    expect(stored.has("bad")).toBe(false);
    expect(measure(png())).toEqual({ bytes: 33, image: { width: 512, height: 256 } });
    expect(measure(new Uint8Array([1, 2, 3]))).toEqual({ bytes: 3 });
});

test("made is checked: method, ai disclosure, generated means AI content", async () => {
    const part = { type: "skill", id: "made-it", title: "M", content: md };
    const r = await preparePart(fangorn, { ...part, made: { method: "procedural", ai: "code", tool: "Blender 4.0 script" } });
    expect(r.payload.made).toEqual({ method: "procedural", ai: "code", tool: "Blender 4.0 script" });
    await expect(preparePart(fangorn, { ...part, made: { method: "vibes", ai: "none" } })).rejects.toThrow(/method/);
    await expect(preparePart(fangorn, { ...part, made: { method: "hand" } })).rejects.toThrow(/made.ai/);
    await expect(preparePart(fangorn, { ...part, made: { method: "generated", ai: "code" } })).rejects.toThrow(/content/);
});
