#!/usr/bin/env node
// Publish a game to your own "internet-slop-warehouse" repo: its HTML to storage, and a `game` record pointing at it (part.js).
//
//   node publish.js game.html [--parent [<publisher>/]<id>]     on the sandbox, as alice (AS=bob …)
//   NETWORK=baseSepolia node publish.js game.html               as you (~/.fangorn/config.json)
//
// The title, description and tags come from the page's <title>, <meta name="description"> and
// <meta name="keywords">. The record's id is the file's name. --parent names the game this remixes (just
// the id for one of your own); the record pins the exact version it was built on.
// (Assets and logic go through the warehouse's MCP, `publish`.)

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { me } from "./me.js";
import { publishPart } from "./part.js";

const [file, flag, parent] = process.argv.slice(2);
if (!file || (flag && flag !== "--parent") || (flag && !parent)) { console.error("usage: publish.js game.html [--parent [<publisher>/]<id>]"); process.exit(2); }
const { fangorn, name, network, resolve } = me();

const html = readFileSync(file, "utf8");
const meta = (n) => html.match(new RegExp(`<meta\\s+name="${n}"\\s+content="([^"]*)"`, "i"))?.[1];
const id = basename(file).replace(/\.html?$/i, "");
const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? id;
const [who, pid] = parent?.includes("/") ? parent.split("/") : [undefined, parent];
try {
    const r = await publishPart(fangorn, {
        type: "game", id, title, content: html,
        description: meta("description") ?? "",
        tags: (meta("keywords") ?? "").split(",").map((t) => t.trim()),
        ...(parent && { parent: { publisher: who && resolve(who), id: pid } }),
    }, { overwrite: true });
    console.log(`${name} (${r.publisher}) published ${id} on ${network}: "${title}"${parent ? `, a remix of ${parent}` : ""}`);
    console.log(`  record ${r.cid}  src ${r.src}  tx ${r.txHash}`);
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
process.exit(0);
