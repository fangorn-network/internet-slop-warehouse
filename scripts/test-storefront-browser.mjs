import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright-core");

const publisher = "0x" + "1".repeat(40);
const other = "0x" + "2".repeat(40);
const repo = "internet-slop-warehouse";
const cid = char => "bafy" + char.repeat(40);
const baseline = { cid: cid("a"), src: cid("b") };
const update = { cid: cid("c"), src: cid("d") };
const contract = "sign-v1";
const shared = { publisher: other, repo, id: "sign", baseline, contract };
const row = (publisher, id, type, payload) => ({
    publisher, repo, id, type, cid: cid("e"), payload: { title: id, tags: [], description: "", ...payload },
});
const game = row(publisher, "Slot test", "game", {
    src: cid("f"),
    modelSlots: [{ name: "fixed", mode: "pin", ...shared }, { name: "moving", mode: "follow", ...shared }],
});
const sign = row(other, "sign", "asset", {
    src: update.src, mime: "model/gltf-binary", publicModel: { channel: "stable", contract },
});
sign.cid = update.cid;
const glb = Buffer.from("676c54460200000018000000040000004a534f4e7b7d2020", "hex");
let mode = "compatible";
const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (path === "/view.json") {
        const head = structuredClone(sign);
        if (mode === "incompatible") head.payload.publicModel.contract = "sign-v2";
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ root: mode, gateway: base, records: [game, head, row(other, "Another game", "game", {})] }));
    }
    if (path === "/api.json") return res.end("{}");
    if (path === "/ipfs/" + game.payload.src) {
        return res.end(JSON.stringify({ html: '<main></main><script>document.querySelector("main").textContent=Object.values(WAREHOUSE_PARTS).map(p=>p.cid).join(" ")</script>' }));
    }
    if (path === "/ipfs/" + baseline.src || (path === "/ipfs/" + update.src && mode !== "missing")) return res.end(glb);
    if (path === "/" || /^\/[a-z-]+\.(js|css)$/.test(path)) {
        try {
            const file = path === "/" ? "index.html" : path.slice(1);
            const mime = { js: "text/javascript", css: "text/css", html: "text/html" };
            const contents = await readFile("site/" + file);
            res.setHeader("Content-Type", mime[file.split(".").at(-1)]);
            return res.end(contents);
        } catch {}
    }
    res.writeHead(404).end();
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + server.address().port;
let browser;
try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("https://cdn.jsdelivr.net/**", route => route.abort());
    await page.route("https://fangorn.network/api/repos?**", route => {
        assert.equal(new URL(route.request().url()).searchParams.get("publisher"), publisher);
        return route.fulfill({
            headers: { "access-control-allow-origin": "*" },
            json: { repos: [{ publisher, repo, head: cid("g"), name: "Test storefront" }] },
        });
    });
    const home = new URL(base);
    home.searchParams.set("api", base);
    await page.goto(home.href);
    const storefront = page.locator(`#publisher-list a[href*="${publisher}"]`);
    await storefront.click();
    await page.getByRole("heading", { name: "Test storefront" }).waitFor();
    assert.equal(await page.locator("#repo-head").textContent(), "Head " + cid("g"));
    assert.equal(await page.locator("#grid .card").count(), 1);
    assert.equal(await page.locator("#explorer-link").getAttribute("href"), `https://fangorn.network/#/data/${publisher}/${repo}`);
    const url = page.url();
    const slotTest = page.getByRole("button", { name: /Slot test/ });
    const lock = page.frameLocator("#frame").locator("main");
    const expectVersions = (moving) => page.waitForFunction(
        expected => document.querySelector("#frame").getAttribute("srcdoc")?.includes(expected), moving);
    await slotTest.click();
    await expectVersions(update.cid);
    assert.equal(await lock.textContent(), baseline.cid + " " + update.cid);
    mode = "incompatible";
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    await expectVersions(update.cid);
    assert.equal(await lock.textContent(), baseline.cid + " " + update.cid);
    for (const state of ["incompatible", "missing"]) {
        mode = state;
        await page.goto(url);
        await slotTest.click();
        await lock.waitFor();
        assert.equal(await lock.textContent(), baseline.cid + " " + baseline.cid);
    }
    assert.deepEqual(errors, []);
    console.log("Publisher routing, scoped inventory, repo head, pinned and following slots, restart and fallback passed.");
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
