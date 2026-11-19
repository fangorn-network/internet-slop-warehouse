// A GLB (glTF 2.0 binary) that parses and loads nothing from elsewhere. Other mimes pass: not this check's business.
// https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification
const JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;

export function validate(record, { file }) {
    if (record.payload?.mime !== "model/gltf-binary") return true;
    if (!file || file.length < 20) return "not a GLB: too short";
    const view = new DataView(file.buffer, file.byteOffset, file.byteLength), u32 = (at) => view.getUint32(at, true);
    if (u32(0) !== 0x46546c67) return "not a GLB: bad magic";
    if (u32(4) !== 2) return `GLB version ${u32(4)}, not 2`;
    if (u32(8) !== file.length) return `GLB header says ${u32(8)} bytes, the file is ${file.length}`;
    const jsonLength = u32(12);
    if (u32(16) !== JSON_CHUNK || 20 + jsonLength > file.length) return "GLB's first chunk isn't a JSON chunk that fits";
    let gltf;
    try { gltf = JSON.parse(new TextDecoder().decode(file.subarray(20, 20 + jsonLength))); } catch { return "GLB's JSON chunk doesn't parse"; }
    if (!String(gltf?.asset?.version ?? "").startsWith("2.")) return "not glTF 2.x (asset.version)";
    const binAt = 20 + jsonLength, hasBin = binAt + 8 <= file.length && u32(binAt + 4) === BIN_CHUNK;
    if (hasBin && binAt + 8 + u32(binAt) > file.length) return "GLB's BIN chunk runs past the file";
    for (const [i, b] of (gltf.buffers ?? []).entries()) {
        if (b.uri != null) return `buffer ${i} loads from ${String(b.uri).slice(0, 60)}: a GLB must be self-contained`;
        if (!hasBin) return `buffer ${i} needs a BIN chunk, and there isn't one`;
    }
    for (const [i, img] of (gltf.images ?? []).entries())
        if (img.uri != null && !String(img.uri).startsWith("data:")) return `image ${i} loads from ${String(img.uri).slice(0, 60)}: a GLB must be self-contained`;
    return true;
}
