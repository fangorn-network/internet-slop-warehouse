#!/usr/bin/env node
// Publish the warehouse's seed parts (parts/parts.json) to your "internet-slop-warehouse" repo, in as few commits as their
// dependencies allow: an override needs the part it overrides on chain, a game needs everything it uses.
// A part whose record would come out the same is skipped, so running it again only publishes what changed.
//
//   NETWORK=baseSepolia node seed.js             as you (~/.fangorn/config.json)
//   node seed.js                                  on the sandbox, as alice (AS=bob …)
//   node seed.js --local <dir>                    no chain: write the files and games to <dir>, to play locally
//
// A game's `const PARTS = {/*PARTS*/}` is filled in with each part it uses, id → its pinned file's URL.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { STORED } from "./part.js";

const dir = new URL("./parts/", import.meta.url).pathname;
const parts = JSON.parse(readFileSync(join(dir, "parts.json"), "utf8"));
const fill = (html, urls) => html.replace("{/*PARTS*/}", JSON.stringify(urls));
const deps = (p) => [...(p.uses ?? []), ...(p.overrides ? [p.overrides.part.id] : []), ...(p.parent ? [p.parent.id] : [])];
const input = (p) => {
    const raw = readFileSync(join(dir, p.file));
    const { file: _, ...rest } = p;
    return { ...rest, uses: (p.uses ?? []).map((id) => ({ id })), ...(p.type === "asset" ? { bytes: new Uint8Array(raw) } : { content: raw.toString("utf8") }) };
};

if (process.argv[2] === "--local") {
    const out = process.argv[3];
    if (!out) { console.error("usage: seed.js --local <dir>"); process.exit(2); }
    mkdirSync(join(out, "parts"), { recursive: true });
    for (const p of parts) {
        const raw = readFileSync(join(dir, p.file));
        mkdirSync(dirname(join(out, "parts", p.file)), { recursive: true });
        if (p.type === "asset") writeFileSync(join(out, "parts", p.file), raw);
        if (p.type !== "asset" && p.type !== "game") writeFileSync(join(out, "parts", p.file + ".json"), JSON.stringify({ [STORED[p.type]]: raw.toString("utf8") }));
        if (p.type === "game") {
            const urls = Object.fromEntries(p.uses.map((id) => { const u = parts.find((x) => x.id === id); return [id, `parts/${u.file}${u.type === "asset" ? "" : ".json"}`]; }));
            writeFileSync(join(out, p.file), fill(raw.toString("utf8"), urls));
        }
    }
    console.log(`wrote ${parts.length} parts to ${out}`);
    process.exit(0);
}

const { me } = await import("./me.js");
const { REPO, preparePart, commitParts } = await import("./part.js");
const { fangorn, network } = me();
const address = fangorn.getAddress(), gateway = fangorn.getConfig().ipfsGateway;
const read = (id) => fangorn.engine.readRecord(address, REPO, id).catch(() => null);
const canon = (v) => JSON.stringify(v, (_, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x);

let todo = [...parts];
const done = new Set();
while (todo.length) {
    const ready = todo.filter((p) => deps(p).every((d) => done.has(d)));
    if (!ready.length) { console.error(`✗ can't order: ${todo.map((p) => p.id).join(", ")} need parts that aren't in parts.json`); process.exit(1); }
    const batch = [];
    for (const p of ready) {
        const part = input(p);
        if (p.type === "game") {
            const urls = {};
            for (const id of p.uses) urls[id] = `${gateway}/ipfs/${(await read(id)).payload.src}`;
            part.content = fill(part.content, urls);
        }
        const record = await preparePart(fangorn, part), now = await read(p.id);
        if (now && now.type === record.type && canon(now.payload) === canon(record.payload)) console.log(`  ${p.id}: unchanged`);
        else batch.push(record);
    }
    if (batch.length) {
        const { txHash } = await commitParts(fangorn, batch);
        console.log(`committed ${batch.map((r) => r.id).join(", ")} on ${network}: tx ${txHash}`);
    }
    for (const p of ready) done.add(p.id);
    todo = todo.filter((p) => !done.has(p.id));
}
console.log(`${address}'s warehouse repo holds all ${parts.length} seed parts`);
process.exit(0);
