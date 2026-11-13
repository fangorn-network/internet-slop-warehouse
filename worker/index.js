// The internet slop warehouse on Cloudflare: westmarch's indexer Worker (follow, view, search, MCP) with the
// warehouse's own MCP tools, serving the site from ASSETS. Configured in wrangler.json.

import { indexer } from "@fangorn-network/westmarch/worker";
import { tools, guide } from "./tools.js";

export default indexer({ name: "internet-slop-warehouse", instructions: guide, tools });
