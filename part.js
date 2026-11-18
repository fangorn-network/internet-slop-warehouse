// One part of the slop warehouse, in a publisher's "internet-slop-warehouse" repo: a game, an asset or a piece of logic.
// Its file goes to storage and a record pointing at it goes to the repo, pinning the exact version of
// everything it remixes (parent) or builds on (uses), so credit (and, later, revenue share) can follow the graph.
//
//   game   content: the page's HTML. Stored as { html }: hosted storage won't take a live page, and only a
//          player's sandboxed iframe should ever run it.
//   logic  content: an ES module's source (it may `import * as THREE from "three"`). Stored as { js }.
//   asset  bytes: the file itself (a .glb, .png, .wav …), stored as is; `mime` says what it is.
//   skill  content: an Agent Skills SKILL.md (frontmatter `name` and `description`, then instructions), the format
//          Claude Code and Codex load from a skills folder. Stored as { md }. A recipe is a skill tagged
//          "recipe" whose `uses` pins the parts it builds with.
//   source content: a code file mirrored from elsewhere, any language, no attach() contract (a framework, a
//          shader, an example). Needs `origin: { repo, commit, path }` and its upstream `license`. Stored as { code }.
//
// Logic is labelled, so search finds it by behaviour and an agent can wire it without reading it. Every label is
// payload, and the indexer embeds every payload leaf as `path: value` (src/embed.js), so the labels ARE the
// embedded text, like a corpus slice's embed_text.
//
//   kind       controller | ai | rule | camera | effect
//   exports    [{ name, signature, does }]: what the module exports (checked against its source)
//   options    [{ name, type, default, does }]: what attach() takes
//   hooks      [{ name, default, does }]: callbacks in the options that replace a default behaviour
//   overrides  { part: { publisher?, id }, hook }: this module exports `hook`, a drop-in for that part's hook
//
// An asset is measured at publish (measure.js): `measured` holds facts read from its bytes (a GLB's triangles,
// size in metres, textures, rig; an image's pixels), never the publisher's word. Any part may say how it was
// made, the disclosure stores and platforms ask for:
//
//   made       { method: hand | procedural | generated | scanned | mixed,
//                ai: none (no AI) | code (AI wrote the code or scripts that made it) | content (a model made it),
//                tool?: what made it ("Blender 4.0 script", "TRELLIS.2 4B, weights rev …, seed 42"), detail? }
//              A reference image or concept you published goes in `uses`, like any part you built from.
//
// The contract: a behaviour exports `attach(object, opts) → { update(dt), dispose() }`, so every one is wired
// the same way; an override exports the hook it names instead. That's "make X do Y where it would do Z":
// attach(enemy, { onSee: fleeOnSee }) in place of patrol's default chase.

import { measure } from "./site/measure.js";

export const REPO = "internet-slop-warehouse";
export const TYPES = ["game", "asset", "logic", "skill", "source"];
export const STORED = { game: "html", logic: "js", skill: "md", source: "code" };
export const KINDS = ["controller", "ai", "rule", "camera", "effect"];
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** The names an ES module exports (declarations and `export { a, b as c }`). */
export function exportsOf(js) {
    const names = [...js.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)/g)].map((m) => m[1]);
    for (const [, list] of js.matchAll(/export\s*\{([^}]*)\}/g))
        names.push(...list.split(",").map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean));
    return names;
}

/** A logic part's labels, checked against its source → the payload fields they become. */
function labels(js, { kind, exports = [], options = [], hooks = [], overrides }) {
    if (!KINDS.includes(kind)) throw new Error(`logic needs a kind: one of ${KINDS.join(", ")}`);
    if (!exports.length) throw new Error("logic needs its exports labelled: [{ name, signature, does }]");
    const has = new Set(exportsOf(js));
    for (const e of exports) {
        if (!e?.name || !e.signature || !e.does) throw new Error("each export needs name, signature and does");
        if (!has.has(e.name)) throw new Error(`the source doesn't export ${e.name}`);
    }
    const needs = overrides ? overrides.hook : "attach";
    if (!exports.some((e) => e.name === needs)) throw new Error(overrides ? `an override of ${overrides.hook} exports ${overrides.hook}` : "a behaviour exports attach(object, opts) → { update(dt), dispose() }");
    for (const o of [...options, ...hooks]) if (!o?.name || !o.does) throw new Error("each option and hook needs name and does");
    return { kind, exports, ...(options.length && { options }), ...(hooks.length && { hooks }) };
}

/** A SKILL.md's frontmatter, checked → { name, description }. */
export function skillOf(md) {
    const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md)?.[1];
    if (!head) throw new Error("a skill is a SKILL.md: it starts with --- frontmatter ---");
    const field = (k) => new RegExp(`^${k}:\\s*(.+)$`, "m").exec(head)?.[1].trim().replace(/^["']|["']$/g, "");
    const name = field("name"), description = field("description");
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name ?? "")) throw new Error("a skill's frontmatter needs name: lowercase-dashed");
    if (!description) throw new Error("a skill's frontmatter needs a description: it's how an agent knows when to use it");
    return { name, description };
}

export const METHODS = ["hand", "procedural", "generated", "scanned", "mixed"];
export const AI = ["none", "code", "content"];
/** How a part was made, checked → the payload's `made`. */
function madeOf({ method, ai, tool, detail }) {
    if (!METHODS.includes(method)) throw new Error(`made.method is one of ${METHODS.join(", ")}`);
    if (!AI.includes(ai)) throw new Error(`made.ai is one of ${AI.join(", ")}: none, AI-written code, or AI-made content`);
    if (method === "generated" && ai !== "content") throw new Error("a generated part's made.ai is content");
    return { method, ai, ...(tool && { tool: String(tool).slice(0, 200) }), ...(detail && { detail: String(detail).slice(0, 500) }) };
}

/** A source part's origin, checked. */
function originOf({ origin, license }) {
    const { repo, commit, path } = origin ?? {};
    if (!repo || !commit || !path) throw new Error("source needs origin: { repo, commit, path }, where it was mirrored from");
    if (!license) throw new Error("source needs its upstream license");
    return { origin: { repo: String(repo), commit: String(commit), path: String(path) } };
}

/**
 * Check a part, put its file in storage and pin what it builds on → the record to commit, { id, type, payload }.
 * Nothing goes on chain: commit it (with others) with uploadBatch, or use publishPart. `owner`: whose repo it's
 * for, when that isn't `fangorn`'s own (the warehouse preparing a publisher's part): a pin without a publisher is theirs.
 */
export async function preparePart(fangorn, part, { owner } = {}) {
    const { type, id, title, description = "", tags = [], author, license, content, bytes, mime, made, parent, uses = [] } = part;
    if (!TYPES.includes(type)) throw new Error(`type is one of ${TYPES.join(", ")}`);
    if (!ID.test(id ?? "")) throw new Error("id: lowercase letters, digits and dashes, up to 64");
    if (!title) throw new Error("title is required");
    if (type === "asset" ? !bytes?.length : typeof content !== "string" || !content) throw new Error(type === "asset" ? "an asset needs its file's bytes" : `a ${type} needs its source as content`);
    // Checked before anything is stored: a bad GLB or disclosure fails the publish without uploading.
    const checked = { ...(type === "asset" && { measured: measure(bytes) }), ...(made && { made: madeOf(made) }) };
    const address = owner ?? fangorn.getAddress();

    // Pin what it builds on: each must exist now, and the record keeps the version it saw.
    // One getHead and one MST read per publisher, however many parts it credits (46 credits once ran a Worker out of subrequests).
    const repos = new Map();
    const repoOf = (publisher) => {
        const key = publisher.toLowerCase();
        if (!repos.has(key)) repos.set(key, (async () => {
            const head = await fangorn.engine.resolveHeadCommit(publisher, REPO).catch(noRepo);
            return head && { head, state: (await fangorn.engine.stateAt(head)).state };
        })());
        return repos.get(key);
    };
    const read = async (publisher, pid) => {
        const repo = await repoOf(publisher), cid = repo?.state.get(pid);
        return cid ? fangorn.engine.decodeRecord(pid, cid, repo.head) : null;
    };
    const pin = async ({ publisher = address, id: pid }) => {
        const rec = await read(publisher, pid);
        if (!rec) throw new Error(`no part ${publisher}/${pid}`);
        return { publisher: publisher.toLowerCase(), repo: REPO, id: pid, cid: rec.cid, type: rec.type };
    };
    let logic = {};
    if (type === "logic") {
        logic = labels(content, part);
        if (part.overrides) {
            const target = await read(part.overrides.part?.publisher ?? address, part.overrides.part?.id);
            if (!target?.payload?.hooks?.some((h) => h.name === part.overrides.hook)) throw new Error(`${part.overrides.part?.id} has no hook ${part.overrides.hook} to override`);
            logic.overrides = { part: await pin(part.overrides.part), hook: part.overrides.hook };
        }
    }
    if (type === "skill") logic = { skill: skillOf(content).name };
    if (type === "source") logic = originOf(part);
    const file = type === "asset" ? bytes : new TextEncoder().encode(JSON.stringify({ [STORED[type]]: content }));
    return { id, type, payload: {
        title, description, tags: tags.map(String).filter(Boolean),
        src: await fangorn.getStorage().putFile(file, type === "asset" ? id : `${id}.json`),
        ...(author && { author: String(author).slice(0, 64) }),
        ...(license && { license: String(license).slice(0, 64) }),
        ...(type === "asset" && mime && { mime }),
        ...checked,
        ...logic,
        ...(parent && { parent: await pin(parent) }),
        ...(uses.length && { uses: await pinAll(uses, pin) }),
    } };
}

/** A record, or null when it (or the publisher's repo) doesn't exist. Any other failure (storage, the platform's
 *  subrequest limit on old records in long repos: see the SDK's NEW_ISSUE.md) throws, instead of reading as "no part". */
export const readOrNull = (fangorn, publisher, id) => fangorn.engine.readRecord(publisher, REPO, id).catch(noRepo);
const noRepo = (e) => {
    if (/has no on-chain commits/.test(e?.message)) return null;
    throw e;
};
// One at a time: concurrent reads that miss the cache each walk (and fetch) the same old CARs.
const pinAll = async (pins, pin) => { const out = []; for (const p of pins) out.push(await pin(p)); return out; };

/** Commit prepared records to the repo and read them back → { recordCids, txHash }. */
export async function commitParts(fangorn, records) {
    await fangorn.initRepo(REPO);
    // ponytail: two commits at once from one key race for the head; the read-back below catches the loser
    const { recordCids, txHash } = await fangorn.uploadBatch(REPO, records);
    // Read it back from the chain: a reverted push can still come back as success (see the SDK's ISSUE.md).
    for (const { id } of records)
        if ((await fangorn.engine.readRecord(fangorn.getAddress(), REPO, id))?.cid !== recordCids[id]) throw new Error(`${id}: tx ${txHash} didn't land; the head doesn't hold it. Publish again.`);
    return { recordCids, txHash };
}

/** One part, prepared and committed → { publisher, repo, id, type, cid, src, txHash }. `overwrite`: false refuses an id that's taken. */
export async function publishPart(fangorn, part, { overwrite = false } = {}) {
    const address = fangorn.getAddress();
    if (!overwrite && await readOrNull(fangorn, address, part.id ?? "")) throw new Error(`${part.id} is taken: pick another id (a new version of a part is a new id with it as parent)`);
    const record = await preparePart(fangorn, part);
    const { recordCids, txHash } = await commitParts(fangorn, [record]);
    return { publisher: address.toLowerCase(), repo: REPO, id: record.id, type: record.type, cid: recordCids[record.id], src: record.payload.src, txHash };
}
