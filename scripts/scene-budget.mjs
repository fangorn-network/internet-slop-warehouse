// Measure a browser game against a phone budget, at the WebGL level, so it works for any engine or page:
// draw calls, triangles and JS time per frame, and texture memory uploaded. Exits 1 if it's over budget.
//
//   PLAYWRIGHT_MODULE=…/playwright-core/index.mjs node scripts/scene-budget.mjs <url or .html> [--phone] [--wait 8] [--click]
//
// --phone reports `pointer: coarse` so games pick their mobile profile. --click clicks the page centre after the
// wait (most games start on a click). Numbers are the median of ~2 s of frames; headless Chrome renders in
// software, so frame *rate* means nothing here: JS ms per frame and the counts do.
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const BUDGET = { calls: 300, ktris: 500, textureMB: 128, jsMs: 8 }; // mid phone, 30 fps with headroom
const args = process.argv.slice(2), flag = (f) => args.includes(f), opt = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const target = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--wait");
if (!target) { console.error("usage: scene-budget.mjs <url or .html> [--phone] [--wait seconds] [--click]"); process.exit(2); }
const url = existsSync(target) ? pathToFileURL(target).href : target;
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright-core");

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
await ctx.addInitScript((phone) => {
    if (phone) { const mm = matchMedia.bind(window); window.matchMedia = (q) => (q.includes("coarse") ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q)); }
    const f = (globalThis.__budget = { calls: 0, tris: 0, texBytes: 0, frames: [] });
    const TRI = { 4: (n) => n / 3, 5: (n) => n - 2, 6: (n) => n - 2 }; // TRIANGLES, STRIP, FAN; lines and points count 0
    for (const C of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext].filter(Boolean)) {
        const p = C.prototype, wrap = (name, count) => { const o = p[name]; if (o) p[name] = function (...a) { f.calls++; f.tris += count(a); return o.apply(this, a); }; };
        wrap("drawArrays", ([m, , n]) => TRI[m]?.(n) ?? 0);
        wrap("drawElements", ([m, n]) => TRI[m]?.(n) ?? 0);
        wrap("drawArraysInstanced", ([m, , n, k]) => (TRI[m]?.(n) ?? 0) * k);
        wrap("drawElementsInstanced", ([m, n, , , k]) => (TRI[m]?.(n) ?? 0) * k);
        for (const name of ["texImage2D", "texStorage2D", "compressedTexImage2D"]) {
            const o = p[name]; if (!o) continue;
            p[name] = function (...a) {
                const img = a.find((x) => x && typeof x === "object" && "width" in x);
                const [w, h] = name === "texStorage2D" ? [a[3], a[4]] : img ? [img.width, img.height] : [a[3], a[4]];
                if (a[1] === 0 || name === "texStorage2D") f.texBytes += (w || 0) * (h || 0) * 4 * 1.33; // RGBA + mips
                return o.apply(this, a);
            };
        }
    }
    const raf = globalThis.requestAnimationFrame.bind(globalThis);
    globalThis.requestAnimationFrame = (cb) => raf((t) => { // a frame is a callback that drew something
        f.calls = 0; f.tris = 0;
        const s = performance.now(); cb(t);
        if (f.calls) f.frames.push([f.calls, f.tris, performance.now() - s]);
    });
}, flag("--phone"));
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url);
await page.waitForTimeout(Number(opt("--wait", 8)) * 1000);
if (flag("--click")) await page.mouse.click(206, 457);
await page.waitForTimeout(1500);
const r = await page.evaluate(() => new Promise((res) => {
    const f = __budget; f.frames.length = 0;
    setTimeout(() => {
        const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0; };
        res({ calls: med(f.frames.map((x) => x[0])), ktris: Math.round(med(f.frames.map((x) => x[1])) / 1000), textureMB: Math.round(f.texBytes / 2 ** 20), jsMs: +med(f.frames.map((x) => x[2])).toFixed(1), frames: f.frames.length });
    }, 2000);
}));
await browser.close();

let over = 0;
for (const [k, max] of Object.entries(BUDGET)) {
    const bad = r[k] > max; over += bad;
    console.log(`${bad ? "OVER" : "ok  "}  ${k.padEnd(10)} ${String(r[k]).padStart(7)}  (budget ${max})`);
}
if (!r.frames) console.log("no frames drew: did the game start? try --click or a longer --wait");
for (const e of errors) console.log("page error:", e);
process.exit(over || !r.frames ? 1 : 0);
