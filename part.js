// One part of the slop warehouse, in a publisher's "internet-slop-warehouse" repo: a game, an asset or a piece of logic.
// Its file goes to storage and a record pointing at it goes to the repo, pinning the exact version of
// everything it remixes (parent) or builds on (uses), so credit (and, later, revenue share) can follow the graph.
//
//   game   content: the page's HTML. Stored as { html }: hosted storage won't take a live page, and only a
//          player's sandboxed iframe should ever run it.
//   logic  content: an ES module's source (it may `import * as THREE from "three"`). Stored as { js }.
//   asset  bytes: the file itself (a .glb, .png, .wav …), stored as is; `mime` says what it is.
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
// The contract: a behaviour exports `attach(object, opts) → { update(dt), dispose() }`, so every one is wired
// the same way; an override exports the hook it names instead. That's "make X do Y where it would do Z":
// attach(enemy, { onSee: fleeOnSee }) in place of patrol's default chase.

export const REPO = "internet-slop-warehouse";
export const TYPES = ["game", "asset", "logic"];
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

/**
 * Check a part, put its file in storage and pin what it builds on → the record to commit, { id, type, payload }.
 * Nothing goes on chain: commit it (with others) with uploadBatch, or use publishPart. `owner`: whose repo it's
 * for, when that isn't `fangorn`'s own (the warehouse preparing a publisher's part): a pin without a publisher is theirs.
 */
export async function preparePart(fangorn, part, { owner } = {}) {
    const { type, id, title, description = "", tags = [], author, license, content, bytes, mime, parent, uses = [] } = part;
    if (!TYPES.includes(type)) throw new Error(`type is one of ${TYPES.join(", ")}`);
    if (!ID.test(id ?? "")) throw new Error("id: lowercase letters, digits and dashes, up to 64");
    if (!title) throw new Error("title is required");
    if (type === "asset" ? !bytes?.length : typeof content !== "string" || !content) throw new Error(type === "asset" ? "an asset needs its file's bytes" : `a ${type} needs its source as content`);
    const address = owner ?? fangorn.getAddress();

    // Pin what it builds on: each must exist now, and the record keeps the version it saw.
    const read = (publisher, pid) => fangorn.engine.readRecord(publisher, REPO, pid).catch(() => null);
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
    const file = type === "asset" ? bytes : new TextEncoder().encode(JSON.stringify(type === "game" ? { html: content } : { js: content }));
    return { id, type, payload: {
        title, description, tags: tags.map(String).filter(Boolean),
        src: await fangorn.getStorage().putFile(file, type === "asset" ? id : `${id}.json`),
        ...(author && { author: String(author).slice(0, 64) }),
        ...(license && { license: String(license).slice(0, 64) }),
        ...(type === "asset" && mime && { mime }),
        ...logic,
        ...(parent && { parent: await pin(parent) }),
        ...(uses.length && { uses: await Promise.all(uses.map(pin)) }),
    } };
}

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
    if (!overwrite && await fangorn.engine.readRecord(address, REPO, part.id ?? "").catch(() => null)) throw new Error(`${part.id} is taken: pick another id (a new version of a part is a new id with it as parent)`);
    const record = await preparePart(fangorn, part);
    const { recordCids, txHash } = await commitParts(fangorn, [record]);
    return { publisher: address.toLowerCase(), repo: REPO, id: record.id, type: record.type, cid: recordCids[record.id], src: record.payload.src, txHash };
}
