// p2p-room in two real browsers over real WebRTC (public relays): a guest joins by share link, poses go both ways,
// the host's world state reaches the guest.
//   PLAYWRIGHT_MODULE=…/playwright-core/index.mjs node scripts/test-p2p-room.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright-core");
const root = resolve(import.meta.dirname, "..");
const server = createServer(async (req, res) => {
    try { const p = resolve(root, "." + decodeURIComponent(new URL(req.url, "http://x").pathname)); if (!p.startsWith(root)) throw 0; res.setHeader("Content-Type", extname(p) === ".js" ? "text/javascript" : "text/html"); res.end(await readFile(p)); }
    catch { res.statusCode = 404; res.end(); }
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/scripts/p2p-room-check.html`;
const browser = await chromium.launch({ channel: "chrome" });
const page = async (url) => { const p = await (await browser.newContext()).newPage(); p.on("pageerror", (e) => console.log("pageerror", e.message)); await p.goto(url); await p.waitForFunction(() => window.room, null, { timeout: 60000 }); return p; };
try {
    const host = await page(base + "?host");
    const code = await host.evaluate(() => room.code);
    const guest = await page(`${base}?room=${encodeURIComponent(code)}`);
    await guest.waitForFunction(() => log.some((l) => l[0] === "world") && log.some((l) => l[0] === "pose"), null, { timeout: 90000 });
    await host.waitForFunction(() => log.some((l) => l[0] === "pose"), null, { timeout: 30000 });
    const [h, g] = await Promise.all([host, guest].map((p) => p.evaluate(() => log)));
    assert.deepEqual(g.find((l) => l[0] === "world"), ["world", { tick: 1 }]);
    assert.deepEqual(g.find((l) => l[0] === "pose"), ["pose", [1, 0], "host"]);
    assert.deepEqual(h.find((l) => l[0] === "pose"), ["pose", [2, 0], "guest"]);
    console.log("ok: joined by link, poses both ways, world from host");
} finally { await browser.close(); server.close(); }
