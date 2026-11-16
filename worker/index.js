// The internet slop warehouse on Cloudflare: westmarch's indexer Worker (follow, view, search, MCP) with the
// warehouse's own MCP tools, serving the site from ASSETS. Configured in wrangler.json.

import { indexer } from "@fangorn-network/westmarch/worker";
import { tools, guide } from "./tools.js";

import { servePlaceSearch } from "./place-search.js";
import { serveDistrict } from "./osm.js";
const app = indexer({ name: "internet-slop-warehouse", instructions: guide, tools });
export default {...app, fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/world/places') return servePlaceSearch(request, {endpoint: env.GEOCODER_URL ?? 'https://photon.komoot.io/api/', waitUntil: p => ctx.waitUntil(p)});
    if (new URL(request.url).pathname === '/world/osm') return serveDistrict(request, {waitUntil: p => ctx.waitUntil(p)});
    return app.fetch(request, env, ctx);
}};
