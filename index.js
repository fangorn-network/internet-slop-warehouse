#!/usr/bin/env node
// The warehouse's indexer: westmarch's runner, with its view published as you (NETWORK=baseSepolia: ~/.fangorn/config.json)
// or as a sandbox key (AS=indexer, the default network).
//
//   AS=indexer node index.js app.json
//   NETWORK=baseSepolia node index.js app.baseSepolia.json

import { readConfig, run } from "@fangorn-network/westmarch/run";
import { me } from "./me.js";

const file = process.argv[2];
if (!file) { console.error("usage: index.js app.json"); process.exit(2); }
const config = readConfig(file);
const { fangorn, network } = me();
if ((config.network ?? "baseSepolia") !== network) { console.error(`${file} is for ${config.network}, but NETWORK is ${network}`); process.exit(2); }
console.log(`indexing ${config.repos.join(", ")} on ${network}, publishing the view as ${fangorn.getAddress()}`);
const runner = await run({ config, fangorn });
process.on("SIGINT", () => runner.stop().then(() => process.exit(0)));
