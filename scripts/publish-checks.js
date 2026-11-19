#!/usr/bin/env node
// Publish the checks in checks/ to your own "internet-slop-warehouse" repo: each one's module to storage as { js }, and
// a `check` record ({ ...check.json, src }) pointing at it, all in one commit. The app's config references them as
// { "check": "<you>/internet-slop-warehouse/<id>", "with": { … } } (checks/app.config.json); a deploy pins them.
//
//   NETWORK=baseSepolia node scripts/publish-checks.js [id …]      every check, or the ones named
//
// A check whose module and payload haven't changed is skipped. An id held by a part that isn't a check is refused.

import { readdirSync, readFileSync } from "node:fs";
import { me } from "../me.js";
import { REPO, commitParts, readOrNull } from "../part.js";

const dir = new URL("../checks/", import.meta.url);
const named = process.argv.slice(2);
const ids = named.length ? named : readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const { fangorn, name, network } = me(), address = fangorn.getAddress();

// A record comes back with its keys sorted (DAG-CBOR), so compare key-sorted.
const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v);
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

const records = [];
for (const id of ids) {
    const js = readFileSync(new URL(`${id}/index.js`, dir), "utf8"), meta = JSON.parse(readFileSync(new URL(`${id}/check.json`, dir), "utf8"));
    if (!/export\s+(async\s+)?function\s+validate\b|export\s+(const|let)\s+validate\b/.test(js)) throw new Error(`checks/${id}/index.js doesn't export validate`);
    if (/^\s*import\s/m.test(js)) throw new Error(`checks/${id}/index.js imports: a check is one module (bundle it first)`);
    const was = await readOrNull(fangorn, address, id);
    if (was && was.type !== "check") throw new Error(`${id} is your ${was.type}, not a check: rename the check`);
    const src = await fangorn.getStorage().putFile(new TextEncoder().encode(JSON.stringify({ js })), `${id}.json`);
    const payload = { ...meta, src, author: meta.author ?? name };
    if (was && same(was.payload, payload)) { console.log(`  ${id}: unchanged`); continue; }
    records.push({ id, type: "check", payload });
}
if (!records.length) { console.log("nothing to publish"); process.exit(0); }
try {
    const { recordCids, txHash } = await commitParts(fangorn, records);
    console.log(`${name} (${address}) published ${records.length} check(s) on ${network}, tx ${txHash}:`);
    for (const r of records) console.log(`  ${address}/${REPO}/${r.id}  record ${recordCids[r.id]}  src ${r.payload.src}`);
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
process.exit(0);
