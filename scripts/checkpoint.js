#!/usr/bin/env node
// Commit a checkpoint (a CAR holding the repo's whole state) on top of your head, so cold reads stop
// walking back through every older CAR. Records don't change.
//
//   NETWORK=baseSepolia node scripts/checkpoint.js [repo]      (default internet-slop-warehouse)
//
// ponytail: the SDK only checkpoints every CHECKPOINT_EVERY positions; repos that passed one before the
// SDK did that need this once.

import { me } from "../me.js";

const repo = process.argv[2] ?? "internet-slop-warehouse";
const { fangorn, network } = me();
const publisher = fangorn.getAddress();
const head = await fangorn.engine.resolveHeadCommit(publisher, repo);
if (!head) { console.error(`✗ ${publisher} has no ${repo}`); process.exit(1); }
const { commitCid } = await fangorn.engine.createCommit({ repo, base: head, records: [], checkpoint: true });
const tx = await fangorn.engine.pushCommit(publisher, repo, commitCid);
console.log(`checkpointed ${publisher}/${repo} on ${network}: commit ${commitCid} tx ${tx?.txHash ?? tx}`);
process.exit(0);
