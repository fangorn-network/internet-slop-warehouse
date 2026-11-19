// payload.mime must be one of params.allowed, and the file's first bytes must match it where we know its signature.
const starts = (b, sig, at = 0) => sig.every((x, i) => b[at + i] === x);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const SIGNATURES = {
    "image/png": (b) => starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    "image/jpeg": (b) => starts(b, [0xff, 0xd8, 0xff]),
    "audio/wav": (b) => starts(b, ascii("RIFF")) && starts(b, ascii("WAVE"), 8),
    "model/gltf-binary": (b) => starts(b, ascii("glTF")),
    "application/zip": (b) => starts(b, [0x50, 0x4b, 0x03, 0x04]) || starts(b, [0x50, 0x4b, 0x05, 0x06]),
    "image/vnd.radiance": (b) => starts(b, ascii("#?")),
    "application/json": (b) => { try { JSON.parse(new TextDecoder().decode(b)); return true; } catch { return false; } },
};

export function validate(record, { file, params }) {
    const mime = record.payload?.mime;
    if (mime == null) return true; // not a file with a mime (a game, a logic module …): not this check's business
    if (!(params.allowed ?? []).includes(mime)) return `mime ${mime} isn't allowed here (one of ${params.allowed.join(", ")})`;
    if (file && SIGNATURES[mime] && !SIGNATURES[mime](file)) return `its bytes aren't ${mime}`;
    return true;
}
