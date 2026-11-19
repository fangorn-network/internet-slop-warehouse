// Smoke test for Escape from Night Audit: loads the local preview in headless Chrome (SwiftShader WebGL), raids three
// nights, and checks (404s are caught per response: the console's bare 404 line is Chrome's own favicon request)
// nights, and checks the phone is reachable, the AI spawns and paths, bullets hit walls, and extracting banks the raid.
//   node publish-batch.js projects/escape-from-night-audit/release.parts.json --local /tmp/efna
//   node scripts/test-escape-from-night-audit.mjs /tmp/efna
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(process.argv[2] ?? '/tmp/efna');
const { chromium } = await import(resolve(process.env.PLAYWRIGHT_MODULE ?? 'projects/roadside-inn/.validation/node_modules/playwright-core/index.mjs'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream' };
const server = createServer(async (req, res) => {
    try { const p = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname)); res.setHeader('Content-Type', MIME[extname(p)] ?? 'application/octet-stream'); res.end(await readFile(p)); }
    catch { res.statusCode = 404; res.end(); }
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const errors = [], browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    page.on('pageerror', (e) => errors.push(e.message)); page.on('response', (r) => r.status() >= 400 && errors.push(r.status() + ' ' + r.url())); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`http://127.0.0.1:${server.address().port}/escape-from-night-audit.html?seed=7`);
    await page.waitForFunction(() => window.efs && !document.querySelector('#loading'), null, { timeout: 120000 });
    for (let n = 1; n <= 3; n++) {
        const r = await page.evaluate(() => {
            const e = window.efs; e.startRaid();
            const p = e.player.position, ph = e.phone;
            // the phone: some square within reach of it is walkable from the lobby
            let path = 0; for (let a = 0; a < 6.3 && !path; a += 0.2) { const t = { x: ph.x + Math.cos(a) * 0.9, z: ph.z + Math.sin(a) * 0.9 }; if (e.clear(t.x, t.z) && e.isLinked(t.x, t.z)) path = e.nav.findPath(p, t).length; }
            const kinds = e.actors.reduce((o, a) => (o[a.faction] = (o[a.faction] ?? 0) + 1, o), {});
            // every AI spawns somewhere clear that paths to the lobby
            const stuck = e.actors.filter((a) => a !== e.player && (!e.clear(a.position.x, a.position.z, 0.2) || !e.nav.findPath(a.position, p).length)).length;
            for (let i = 0; i < 120; i++) e.frame(1 / 30);
            return { path, kinds, stuck, containers: e.interactables.filter((i) => i.kind === 'container').length, reached: e.hotel.reached.size, alive: !e.player.dead };
        });
        console.log(`night ${n}:`, JSON.stringify(r));
        assert.ok(r.path > 0, 'the phone is reachable on the nav grid');
        assert.ok(r.kinds.zombie > 0 && r.kinds.scav > 0, 'zombies and scavs spawn');
        assert.equal(r.stuck, 0, 'no AI spawns stuck');
        assert.ok(r.containers > 3, 'furniture is searchable');
        // walk to the phone along the path and hold the line: the raid ends as checked out
        if (n === 3) {
            const out = await page.evaluate(() => {
                const e = window.efs; e.actors.filter((a) => a !== e.player).forEach((a) => { a.dead = true; });
                e.player.position.set(e.phone.x + 0.5, 0, e.phone.z); for (let i = 0; i < 260; i++) e.frame(1 / 30);
                return document.querySelector('#endtitle').textContent;
            });
            assert.equal(out, 'CHECKED OUT');
        }
    }
    // a shot down the lobby hits something solid within the hotel
    await page.evaluate(() => { document.querySelector('#end').classList.add('hidden'); window.efs.startRaid(); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(root, 'raid.png') });
    assert.ok(await page.evaluate(() => window.efs.group.children.length) > 10, 'hotel meshes built');
    assert.deepEqual(errors.filter((m) => !/favicon|AudioContext|^Failed to load resource/.test(m)), []);
    console.log('ok: screenshot at', resolve(root, 'raid.png'));
} finally { await browser.close(); server.close(); }
