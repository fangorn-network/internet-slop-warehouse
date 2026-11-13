// The warehouse's MCP tools, on top of westmarch's search, repos and get: search and get say what a part is,
// get returns its file, and publish puts a part in the caller's own repo on their EIP-712 signature.

import { BASE } from "@fangorn-network/westmarch/worker/mcp";
import { publishAs, grantOf, signerFor } from "@fangorn-network/westmarch/worker/publisher";
import { REPO, TYPES, KINDS, preparePart } from "../part.js";

export const NAME = "internet slop warehouse";
const MAX_ASSET = 5 * 1024 * 1024; // ponytail: base64 through one JSON-RPC body; signed uploads straight to storage past this
const PIN = { type: "object", required: ["id"], properties: { publisher: { type: "string", description: "0x address (default: yours)" }, id: { type: "string" } } };
const LABEL = { type: "object", required: ["name", "does"], properties: { name: { type: "string" }, signature: { type: "string" }, type: { type: "string" }, default: {}, does: { type: "string" } } };

/** Where a person allows the warehouse to publish for them: fangorn.network's generic connect page. */
export const connectUrl = (origin) => `https://fangorn.network/#/connect?${new URLSearchParams({ app: origin, name: `the ${NAME}`, repos: REPO, mcp: `${origin}/mcp` })}`;

/** How a game builds on the warehouse, for an agent: told once, at initialize. */
export const guide = (gateway) => `The ${NAME}: browser games (three.js mostly) built from shared parts. Don't reinvent a world that exists: search for games to remix and for assets and logic to build on, then publish what you make. Publishing needs a one-time connect at fangorn.network (email sign-in; the warehouse's page links to it); everything else works without it.
- An asset loads from ${gateway}/ipfs/<payload.src> (CORS is open), e.g. new GLTFLoader().load(url).
- Logic is an ES module stored as { js }. Import it by its pinned src, so it never changes under you:
  const { js } = await (await fetch("${gateway}/ipfs/<src>")).json();
  const mod = await import("data:text/javascript;charset=utf-8," + encodeURIComponent(js));
  Bare imports like "three" resolve through the game's import map. Or copy it in and change what you need.
- A game runs in a sandboxed iframe (scripts and pointer lock only: no storage, no cookies, no same-origin).
- When publishing: list every part you used in \`uses\`, and a remixed game as \`parent\`. Fill PARTS-style maps with each part's ${gateway}/ipfs/<src>.
- Writing logic for others: export attach(object, opts) → { update(dt), dispose() }; put every behaviour someone might want to change behind a hook option with a sensible default; label it all.`;

export const tools = [
    {
        ...BASE.search,
        description: "Find parts by what they're about (semantic search): games, assets (models, textures, sounds) and logic (reusable ES modules: movement, AI, physics …). Each hit has publisher, repo, id, cid, type, payload and score; payload has title, description, tags, src (its file), author, parent (what it remixes) and uses (what it builds on).",
        inputSchema: { ...BASE.search.inputSchema, properties: { ...BASE.search.inputSchema.properties, type: { type: "string", enum: TYPES, description: "Only this kind of part" } } },
    },
    {
        ...BASE.get,
        description: "One part's current version, read live from Fangorn. A game comes back with `file: { html }`, logic with `file: { js }`; an asset with `url`, to load from your game.",
        async run(a, ctx) {
            const record = await BASE.get.run(a, ctx);
            if (!record.url || record.type === "asset") return record;
            const { url, ...rest } = record;
            return { ...rest, file: JSON.parse(new TextDecoder().decode(await ctx.fangorn.getStorage().getFile(record.payload.src))) };
        },
    },
    {
        name: "publish",
        description: `Publish a part into your own "${REPO}" repo, publicly and permanently, signed by your wallet (show the person what will be published first). Needs this MCP added with your grant from fangorn.network (the warehouse's page links to it). game: content is a self-contained HTML page. asset: content is the file, base64, with mime. logic: content is an ES module that exports attach(object, opts) → { update(dt), dispose() } (or, for an override, the hook it replaces), labelled with kind, exports, options and hooks: the labels are what search matches and how other agents wire it in. Name what it remixes (parent) and every part it builds on (uses): they're pinned and credited. Publishing an id you already have replaces it.`,
        inputSchema: { type: "object", required: ["type", "id", "title", "content"], properties: {
            type: { type: "string", enum: TYPES },
            id: { type: "string", description: "lowercase-dashed, unique in your repo" },
            title: { type: "string" },
            description: { type: "string", description: "What it is and does: search matches this" },
            tags: { type: "array", items: { type: "string" } },
            author: { type: "string", description: "Who made it (a name or handle)" },
            license: { type: "string", description: "e.g. CC0-1.0, CC-BY-4.0, MIT" },
            content: { type: "string" },
            mime: { type: "string", description: "asset only, e.g. model/gltf-binary, image/png, audio/wav" },
            kind: { type: "string", enum: KINDS, description: "logic only" },
            exports: { type: "array", items: LABEL, description: "logic only: { name, signature, does } for each export" },
            options: { type: "array", items: LABEL, description: "logic only: { name, type, default, does } for each option attach takes" },
            hooks: { type: "array", items: LABEL, description: "logic only: { name, default, does }: option callbacks that replace a default behaviour" },
            overrides: { type: "object", properties: { part: PIN, hook: { type: "string" } }, description: "logic only: this module exports `hook`, a drop-in for that part's hook" },
            parent: PIN,
            uses: { type: "array", items: PIN },
        } },
        async run(a, { auth, origin, fangorn, publish = publishWith }) {
            if (!auth) throw new Error(`Publishing needs you connected: open ${connectUrl(origin)}, sign in, allow the warehouse, then add it again with the command shown there (it sends your grant as an Authorization header).`);
            let bytes;
            if (a.type === "asset") {
                bytes = Uint8Array.from(atob(String(a.content ?? "")), (c) => c.charCodeAt(0));
                if (bytes.length > MAX_ASSET) throw new Error(`assets are up to ${MAX_ASSET >> 20} MB for now`);
            }
            return publish({ fangorn, auth }, { ...a, bytes });
        },
    },
];

/** A part into the grant holder's repo, as them. */
export async function publishWith({ fangorn, auth }, part) {
    const { address } = await grantOf(auth);
    return publishPartAs({ fangorn, owner: address, sign: signerFor(auth) }, part);
}

/** A part prepared for `owner` (pins without a publisher are theirs) and published on their signature. */
export async function publishPartAs(as, part) {
    const record = await preparePart(as.fangorn, part, { owner: as.owner });
    return { ...await publishAs(as, REPO, record), src: record.payload.src };
}
