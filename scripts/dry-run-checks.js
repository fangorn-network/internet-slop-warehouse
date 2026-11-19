#!/usr/bin/env node
// Every check in checks/, as checks/app.config.json wires them, over the live index: what the warehouse would refuse.
// Runs westmarch's own checker (schemas, then rules), with the local check modules standing in for the validator Worker.
//
//   [WESTMARCH=../westmarch] node scripts/dry-run-checks.js [view.json]      default: the live view, https://internet-slop-warehouse-sepolia.fangorn.network/view.json

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// WESTMARCH=<a westmarch checkout> until a westmarch with src/validate.js is published
const { checkerOf } = await import(process.env.WESTMARCH ? pathToFileURL(`${process.env.WESTMARCH}/src/validate.js`).href : "@fangorn-network/westmarch/validate");

const VIEW = "https://internet-slop-warehouse-sepolia.fangorn.network/view.json";
const config = JSON.parse(readFileSync(new URL("../checks/app.config.json", import.meta.url), "utf8"));
const view = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : await (await fetch(VIEW)).json();

// The config as deploy resolves it, but every reference to checks/<id> run from here.
const local = {};
const resolved = JSON.parse(JSON.stringify(config), (k, v) => (typeof v?.check === "string" ? { ...v, src: v.check.split("/").pop() } : v));
for (const id of new Set(JSON.stringify(resolved).match(/"src":"[\w-]+"/g).map((s) => s.slice(7, -1))))
    local[id] = await import(new URL(`../checks/${id}/index.js`, import.meta.url));
const validator = {
    async validate(rules, record, ctx) {
        for (const { name, src, params } of rules) {
            const v = await local[src].validate(record, { ...ctx, params });
            if (v !== true) return `${src}: ${v}`;
        }
        return true;
    },
};
const checker = await checkerOf(resolved, validator);

const files = new Map();
const fileOf = (src) => async () => {
    if (!files.has(src)) files.set(src, fetch(`${view.gateway}/ipfs/${src}`).then(async (r) => (r.ok ? new Uint8Array(await r.arrayBuffer()) : Promise.reject(new Error(`${src}: ${r.status}`)))));
    return files.get(src);
};

const refused = [], errors = [];
let i = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < view.records.length) {
        const r = view.records[i++];
        try {
            const reason = await checker.check({ id: r.id, type: r.type, cid: r.cid, payload: r.payload },
                { publisher: r.publisher, repo: r.repo, file: typeof r.payload?.src === "string" ? fileOf(r.payload.src) : undefined });
            if (reason) refused.push({ ...r, reason });
        } catch (e) { errors.push({ ...r, reason: e.message }); }
    }
}));
const byType = {};
for (const r of view.records) byType[r.type] = (byType[r.type] ?? 0) + 1;
console.log(`${view.records.length} records (${Object.entries(byType).map(([t, n]) => `${n} ${t}`).join(", ")}): ${refused.length} refused, ${errors.length} unchecked (errors)\n`);
for (const r of [...refused, ...errors].sort((a, b) => a.reason.localeCompare(b.reason)))
    console.log(`${r.type.padEnd(6)} ${r.publisher.slice(0, 8)}…/${r.id.padEnd(36)} ${r.reason}`);
