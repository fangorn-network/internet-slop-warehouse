#!/usr/bin/env node
// Take parts out of your repo: NETWORK=baseSepolia node unpublish.js <id> [<id> …] [--yes]
// One commit deletes them all; then each is read back from the chain, so a silently reverted tx can't go unnoticed.
// Unpublishing moves your repo's head: indexers drop the parts and they leave the warehouse. It isn't erasure:
// earlier commits, and the files in storage, stay readable at their CIDs, so anything that pinned a version keeps it.
import { REPO } from "./part.js";
import { me } from "./me.js";

const args = process.argv.slice(2), yes = args.includes("--yes"), ids = args.filter((a) => a !== "--yes");
if (!ids.length) throw Error("Usage: NETWORK=baseSepolia node unpublish.js <id> [<id> …] [--yes]");
const { fangorn, network } = me();
const address = fangorn.getAddress();
for (const id of ids) {
    const r = await fangorn.engine.readRecord(address, REPO, id);
    if (!r) throw Error(`${address}/${REPO}/${id} isn't published on ${network}`);
    console.log(`${id}: ${r.type} "${r.payload.title}"`);
}
if (!yes) { console.log(`Would unpublish ${ids.length} from ${address}/${REPO} on ${network}. Run again with --yes.`); process.exit(0); }
const { txHash, commitCid } = await fangorn.uploadBatch(REPO, [], ids);
for (const id of ids) if (await fangorn.engine.readRecord(address, REPO, id)) throw Error(`${id} is still there after ${txHash}`);
console.log(`Unpublished ${ids.join(", ")}: commit ${commitCid}, tx ${txHash}`);
