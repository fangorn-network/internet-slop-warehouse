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
const largeCatalog = [
    ...Array.from({ length: 100000 }, (_, i) => row(publisher, `Asset ${i}`, "asset", { author: "Internet Slop Warehouse" })),
    ...Array.from({ length: 1000 }, (_, i) =>
        row(i < 40 ? ("0x" + (i + 100).toString(16).padStart(40, "0")) : publisher, `Game ${i}`, "game", { author: "Internet Slop Warehouse" })),
];
let mode = "compatible";
const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (path === "/view.json") {
        const head = structuredClone(sign);
        if (mode === "incompatible") head.payload.publicModel.contract = "sign-v2";
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ root: mode, gateway: base, records: mode === "large" ? largeCatalog : [
            game, head, row(other, "Slot test", "game", { title: "Another game", src: game.payload.src, author: "Internet Slop Warehouse" }),
            row(publisher.replace(/x/, "X"), "alternate-case", "asset", { author: "Internet Slop Warehouse" }),
        ] }));
    }
    if (path === "/api.json") return res.end("{}");
    if (path === "/ipfs/" + game.payload.src) {
        return res.end(JSON.stringify({ html: `<main></main><output></output><button>Save</button><script>
            document.querySelector("main").textContent = Object.values(window.WAREHOUSE_PARTS ?? {}).map(p => p.cid).join(" ");
            const show = () => document.querySelector("output").textContent = localStorage.getItem("name") ?? "empty";
            document.querySelector("button").onclick = () => {
                localStorage.setItem("name", "</" + "script><arbitrary text>");
                localStorage.extra = "key enumeration";
                if (!Object.keys(localStorage).includes("extra") || localStorage.length !== 2) throw new Error("Storage keys");
                delete localStorage.extra;
                show();
            };
            show();
        </script>` }));
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
    await page.locator("#browse-publishers").click();
    await page.getByRole("heading", { name: "Publishers", exact: true }).waitFor();
    assert.equal(await page.locator("#publisher-list tr").count(), 2);
    assert.equal(await page.locator("#publisher-list a").allTextContents().then(addresses => new Set(addresses).size), 2);
    const storefront = page.locator(`#publisher-list a[href*="${publisher}"]`);
    await storefront.click();
    await page.getByRole("heading", { name: "Publisher inventory" }).waitFor();
    await page.getByText("Head " + cid("g"), { exact: true }).waitFor();
    assert.equal(await page.locator("#storefront-address").textContent(), publisher);
    assert.equal(await page.locator("#grid .card").count(), 1);
    assert.equal(await page.locator("#explorer-link").getAttribute("href"), `https://fangorn.network/#/data/${publisher}/${repo}`);
    const url = page.url();
    const slotTest = page.locator("#grid").getByRole("button", { name: /Slot test/ });
    const lock = page.frameLocator("#frame").locator("main");
    const expectVersions = (moving) => page.waitForFunction(
        expected => document.querySelector("#frame").getAttribute("srcdoc")?.includes(expected), moving);
    await slotTest.click();
    await expectVersions(update.cid);
    assert.equal(await lock.textContent(), baseline.cid + " " + update.cid);
    const frame = page.frameLocator("#frame");
    const stored = "</script><arbitrary text>";
    await frame.getByRole("button", { name: "Save" }).click();
    await page.waitForFunction(value => Object.values(localStorage).some(entry => entry.includes(value)), stored);
    mode = "incompatible";
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    await expectVersions(update.cid);
    assert.equal(await lock.textContent(), baseline.cid + " " + update.cid);
    assert.equal(await frame.locator("output").textContent(), stored);
    for (const state of ["incompatible", "missing"]) {
        mode = state;
        await page.goto(url);
        await slotTest.click();
        await lock.waitFor();
        assert.equal(await lock.textContent(), baseline.cid + " " + baseline.cid);
        assert.equal(await frame.locator("output").textContent(), stored);
    }
    await page.goto(home.href);
    await page.locator("#play-next-list").getByRole("button", { name: /Another game/ }).waitFor();
    assert.equal(await page.locator("#play-next-list").getByRole("button", { name: /Slot test/ }).count(), 0);
    await page.locator("#play-next-list").getByRole("button", { name: /Another game/ }).click();
    assert.equal(await frame.locator("output").textContent(), "empty");
    await page.locator("#down").click();
    assert.equal(await page.locator("#down").getAttribute("aria-pressed"), "true");
    await page.goto(home.href);
    await page.locator("#grid").getByRole("button", { name: /Another game/ }).click();
    assert.equal(await page.locator("#down").getAttribute("aria-pressed"), "true");
    mode = "large";
    await page.goto(home.href + "#publishers");
    await page.getByText("1–24 of 41 publishers", { exact: true }).waitFor();
    assert.equal(await page.locator("#publisher-list tr").count(), 24);
    assert.equal(await page.locator("#publisher-list tr").first().locator("td").nth(2).textContent(), "100,000");
    await page.locator("#publisher-next").click();
    assert.equal(await page.locator("#publisher-list tr").count(), 17);
    await page.locator("#publisher-search").fill(publisher.toUpperCase());
    assert.equal(await page.locator("#publisher-list tr").count(), 1);
    await storefront.click();
    await page.getByText("1–24 of 960 results", { exact: true }).waitFor();
    await page.getByRole("button", { name: /Assets.*100000/ }).click();
    await page.getByText("1–24 of 100,000 results", { exact: true }).waitFor();
    await page.locator("#inventory-next").click();
    assert.equal(await page.locator("#inventory-range").textContent(), "25–48 of 100,000 results");
    assert.equal(await page.locator("#grid .card").count(), 24);
    assert.deepEqual(errors, []);
    console.log("Publisher routing, large catalog paging, dependency fallback, and isolated game saves passed.");
} finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
}
