// skill and source parts: checked, stored under their key, and every seed skill parses.
import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { preparePart, skillOf } from "./part.js";

const stored = new Map();
const fangorn = { getAddress: () => "0xabc", engine: { readRecord: async () => null },
    getStorage: () => ({ putFile: async (bytes, name) => (stored.set(name, JSON.parse(new TextDecoder().decode(bytes))), name) }) };
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
    const reading = (err) => ({ ...fangorn, engine: { readRecord: async () => { throw new Error(err); } } });
    const part = { type: "skill", id: "uses-it", title: "U", content: md, uses: [{ publisher: "0xdef", id: "health" }] };
    await expect(preparePart(reading("publisher 0xdef has no on-chain commits in repo r"), part)).rejects.toThrow(/no part 0xdef\/health/);
    await expect(preparePart(reading("Too many subrequests."), part)).rejects.toThrow(/Too many subrequests/);
});
