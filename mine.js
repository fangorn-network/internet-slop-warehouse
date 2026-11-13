#!/usr/bin/env node
// What you've published, read back from the chain: nothing to keep track of yourself.
//
//   node mine.js [publisher]                    on the sandbox (AS=bob … for bob's)
//   NETWORK=baseSepolia node mine.js [0x…]      yours (~/.fangorn/config.json), or anyone's
//
// Every game in the repo now, when it was first published and last changed (to the hour: a commit's epoch),
// how many versions it has had, what it remixes, and where its source is. Games since deleted are listed too.

import { me } from "./me.js";

const REPO = "internet-slop-warehouse", HOUR = 3600 * 1000;
const { fangorn, resolve } = me();
const publisher = process.argv[2] ? resolve(process.argv[2]) : fangorn.getAddress();
const gateway = fangorn.getConfig().ipfsGateway;
const when = (epoch) => new Date(epoch * HOUR).toISOString().slice(0, 13).replace("T", " ") + "h";

const { tip, contents } = await fangorn.readRepo(publisher, REPO);
if (!tip) { console.log(`${publisher} has no ${REPO} repo on ${fangorn.getConfig().chainName ?? "this network"}.`); process.exit(0); }

// The history, oldest first: which ids each commit added, changed or removed.
const history = {};
const commits = [];
for await (const c of fangorn.log(tip)) commits.unshift(c);
for (const c of commits) {
    const d = await fangorn.show(c.cid);
    const touch = (ns, what) => {
        const id = ns.split("/").pop(), h = (history[id] ??= { first: c.epoch, versions: 0 });
        h.last = c.epoch; h.versions += what !== "removed"; if (what === "removed") h.removed = c.epoch;
        if (what !== "removed") delete h.removed;
    };
    d.added.forEach((ns) => touch(ns, "added")); d.updated.forEach((ns) => touch(ns, "updated")); d.removed.forEach((ns) => touch(ns, "removed"));
}

const games = contents.records.filter((r) => r.type === "game");
console.log(`${publisher}'s warehouse: ${games.length} game${games.length === 1 ? "" : "s"}, ${commits.length} commits, head ${tip}\n`);
for (const r of games) {
    const h = history[r.id] ?? {}, p = r.payload.parent;
    console.log(`${r.id}  "${r.payload.title}"`);
    console.log(`  published ${when(h.first)}${h.versions > 1 ? `, changed ${h.versions - 1}× (last ${when(h.last)})` : ""}`);
    if (p) {
        const now = await fangorn.engine.readRecord(p.publisher, p.repo, p.id);
        const stale = !now ? " (since deleted)" : now.cid !== p.cid ? " (built on an earlier version)" : "";
        console.log(`  remix of ${p.publisher === publisher.toLowerCase() ? "your" : `${p.publisher}'s`} ${p.id}${stale}`);
    }
    console.log(`  source ${gateway}/ipfs/${r.payload.src}`);
}
const gone = Object.entries(history).filter(([, h]) => h.removed);
for (const [id, h] of gone) console.log(`${id}  (deleted ${when(h.removed)})`);
process.exit(0);
