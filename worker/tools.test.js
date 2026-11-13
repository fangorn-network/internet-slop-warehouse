import { test, expect } from "vitest";
import { memoryNetwork } from "@fangorn-network/sdk/lib/test/testbed.js";
import { stitcher } from "@fangorn-network/westmarch";
import { d1Index, SCHEMA } from "@fangorn-network/westmarch/d1";
import { d1Shim, fakeEmbedder } from "@fangorn-network/westmarch/testing";
import { mcpCall } from "@fangorn-network/westmarch/worker/mcp";
import { tools } from "./tools.js";
import { REPO, publishPart } from "../part.js";

test("the warehouse's MCP: list tools, search by meaning, list repos, get a game with its HTML, publish", async () => {
    const net = memoryNetwork();
    const [alice, indexer] = await Promise.all([net.client(), net.client()]);
    const db = await d1Shim();
    await db.exec(SCHEMA);
    const index = d1Index({ db, fangorn: indexer }), embedder = fakeEmbedder();

    await alice.initRepo(REPO);
    const src = await alice.getStorage().putFile(new TextEncoder().encode(JSON.stringify({ html: "<title>Table</title>" })), "t.json");
    await alice.uploadBatch(REPO, [{ id: "t", type: "game", payload: { title: "table flip", src } }]);
    await stitcher(indexer, { repos: [REPO] }, { store: index.store, lens: index.lens }).update();
    await index.embedMissing(embedder.embed);

    const ctx = { index, query: embedder.query, fangorn: indexer, gateway: "https://gw", name: "warehouse", instructions: "games", tools };
    let n = 0;
    const call = async (method, params) => (await mcpCall(ctx, { jsonrpc: "2.0", id: ++n, method, params })).result;
    const tool = async (name, args) => { const r = await call("tools/call", { name, arguments: args }); if (r.isError) throw new Error(r.content[0].text); return JSON.parse(r.content[0].text); };

    expect((await call("initialize", {})).serverInfo.name).toBe("warehouse");
    expect((await call("tools/list")).tools.map((t) => t.name)).toEqual(["search", "repos", "get", "publish"]);
    expect(await mcpCall(ctx, { jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();

    const [hit] = await tool("search", { query: "furniture", k: 1 });
    expect(hit).toMatchObject({ id: "t", payload: { title: "table flip" } });
    expect(await tool("repos", {})).toEqual([{ publisher: alice.getAddress().toLowerCase(), repo: REPO, records: 1 }]);
    expect(await tool("get", { publisher: hit.publisher, repo: hit.repo, id: hit.id })).toMatchObject({ id: "t", file: { html: "<title>Table</title>" } });
    expect((await call("tools/call", { name: "get", arguments: { publisher: hit.publisher, repo: REPO, id: "nope" } })).isError).toBe(true);

    // publishPart (as the indexer here): an asset, a piece of logic, and a game remixing alice's that uses both
    const store = indexer.getAddress().toLowerCase();
    const pub = (a) => publishPart(indexer, a.type === "asset" ? { ...a, bytes: Uint8Array.from(atob(a.content), (c) => c.charCodeAt(0)) } : a);
    const png = btoa(String.fromCharCode(137, 80, 78, 71));
    expect(await pub({ type: "asset", id: "crate", title: "wooden crate", content: png, mime: "image/png", author: "bob" })).toMatchObject({ publisher: store, id: "crate", type: "asset" });
    const hop = { type: "logic", id: "hop", title: "hop on space", kind: "controller",
        content: "export function attach(o, { onLand = () => {} } = {}) { return { update() {}, dispose() {} }; }",
        exports: [{ name: "attach", signature: "attach(o, { onLand }) → { update(dt), dispose() }", does: "hops o when space is pressed" }],
        hooks: [{ name: "onLand", default: "nothing", does: "called when o lands" }] };
    await expect(pub({ ...hop, exports: [{ ...hop.exports[0], name: "hopper" }] })).rejects.toThrow(/doesn't export hopper/);
    await expect(pub({ ...hop, kind: undefined })).rejects.toThrow(/kind/);
    await pub(hop);
    const override = { type: "logic", id: "boom", title: "explode on landing", kind: "effect", content: "export const onLand = (o) => o.removeFromParent();",
        exports: [{ name: "onLand", signature: "onLand(o)", does: "removes o" }] };
    await expect(pub({ ...override, content: "export const onJump = () => {};", exports: [{ name: "onJump", signature: "onJump()", does: "x" }], overrides: { part: { id: "hop" }, hook: "onJump" } })).rejects.toThrow(/no hook onJump/);
    await pub({ ...override, overrides: { part: { id: "hop" }, hook: "onLand" } });
    expect((await tool("get", { publisher: store, repo: REPO, id: "boom" })).payload.overrides).toMatchObject({ part: { id: "hop", type: "logic" }, hook: "onLand" });
    const game = await pub({ type: "game", id: "flip2", title: "crate flip", content: "<title>Crate flip</title>",
        parent: { publisher: alice.getAddress(), id: "t" }, uses: [{ id: "crate" }, { id: "hop" }] });
    const got = await tool("get", { publisher: store, repo: REPO, id: "flip2" });
    expect(got.payload).toMatchObject({ parent: { id: "t", type: "game" }, uses: [{ id: "crate", type: "asset" }, { id: "hop", type: "logic" }] });
    expect(got.file).toEqual({ html: "<title>Crate flip</title>" });
    expect((await tool("get", { publisher: store, repo: REPO, id: "hop" })).file.js).toContain("attach");
    const crate = await tool("get", { publisher: store, repo: REPO, id: "crate" });
    expect(crate.url).toBe(`https://gw/ipfs/${crate.payload.src}`);
    expect([...await indexer.getStorage().getFile(crate.payload.src)]).toEqual([137, 80, 78, 71]);
    expect(game.cid).toBe(got.cid);

    // refuses to overwrite unless asked, and checks what it pins
    await expect(pub({ ...hop, title: "x" })).rejects.toThrow(/taken/);
    await expect(pub({ type: "game", id: "g", title: "x", content: "x", uses: [{ id: "nope" }] })).rejects.toThrow();

    await stitcher(indexer, { repos: [REPO] }, { store: index.store, lens: index.lens }).update();
    await index.embedMissing(embedder.embed);
    expect((await tool("search", { query: "box", type: "asset" })).map((h) => h.id)).toEqual(["crate"]);

    // publish: refused with directions when not connected; handed to ctx.publish (asset content decoded) when connected
    const refused = await call("tools/call", { name: "publish", arguments: { type: "game", id: "x", title: "x", content: "x" } });
    expect(refused.isError).toBe(true); expect(refused.content[0].text).toMatch(/fangorn\.network/);
    const seen = [];
    const connected = { ...ctx, auth: "fgn_x", publish: async (_, part) => (seen.push(part), { id: part.id }) };
    const res = await mcpCall(connected, { jsonrpc: "2.0", id: 99, method: "tools/call", params: { name: "publish", arguments: { type: "asset", id: "a", title: "a", content: btoa("hi") } } });
    expect(JSON.parse(res.result.content[0].text)).toEqual({ id: "a" });
    expect(new TextDecoder().decode(seen[0].bytes)).toBe("hi");
});
