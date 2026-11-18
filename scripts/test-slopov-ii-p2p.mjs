// Escape from Slopov II in two real browsers over real WebRTC: the hotel is walkable, a share link joins, the host's
// town reaches the guest, a guest's hit kills on the host, and the host's AI hurts the guest.
//   node projects/slopov-ii/package.mjs && node publish-batch.js projects/slopov-ii/release.parts.json --local /tmp/slopov-ii
//   PLAYWRIGHT_MODULE=projects/roadside-inn/.validation/node_modules/playwright-core/index.mjs node scripts/test-slopov-ii-p2p.mjs [/tmp/slopov-ii]
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const { chromium } = await import(resolve(process.env.PLAYWRIGHT_MODULE ?? 'projects/roadside-inn/.validation/node_modules/playwright-core/index.mjs'));
const root = resolve(process.argv[2] ?? '/tmp/slopov-ii'), out = resolve('artifacts/slopov-ii');
const MIME = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.hdr': 'application/octet-stream' };
const server = createServer(async (req, res) => {
    try { const p = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname)); res.setHeader('Content-Type', MIME[extname(p)] ?? 'application/octet-stream'); res.end(await readFile(p)); }
    catch { res.statusCode = 404; res.end(); }
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}/escape-from-slopov-ii.html`;
await mkdir(out, { recursive: true });

const errors = [], browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
async function peer(url, name) {
    const page = await (await browser.newContext({ viewport: { width: 640, height: 400 } })).newPage();
    page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|GPU stall|Relay|relay|wss:|WebSocket|Failed to load resource/i.test(m.text())) errors.push(`${name}: ${m.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${name}: HTTP ${r.status()} ${r.url()}`); });
    await page.goto(url);
    await page.waitForFunction(() => window.efs && !document.querySelector('#menu').classList.contains('hidden'), null, { timeout: 240000 });
    return page;
}
const report = {};
try {
    const host = await peer(base, 'host');
    // the hotel: built, its lobby walkable, its walls not, and the entrance doors open for a player walking up
    report.hotel = await host.evaluate(() => {
        const e = efs, at = (x, z) => ({ x: 0 - x, z: 58.5 - z });   // hotel plan → world (HOTEL at 0,58.5, half turn)
        const lobby = at(-2.5, 0), wall = at(-12, 6), desk = at(-8.4, -3.4);
        return { colliders: e.hotel.colliders.length, solids: e.hotelSolids.length, lobby: e.clear(lobby.x, lobby.z), wall: e.clear(wall.x, wall.z), desk: e.clear(desk.x, desk.z) };
    });
    assert(report.hotel.colliders > 50 && report.hotel.lobby && !report.hotel.wall && !report.hotel.desk, JSON.stringify(report.hotel));

    // host opens a room: a share link with ?room= and a QR code
    await host.evaluate(() => { document.querySelector('#coopbtn').click(); document.querySelector('#hostbtn').click(); }); // software GL frames are too slow for click()'s stability wait
    await host.waitForFunction(() => document.querySelector('#sharelink').value.includes('room='), null, { timeout: 60000 });
    const link = await host.inputValue('#sharelink');
    report.qr = await host.evaluate(() => document.querySelector('#qr').width);
    assert(report.qr > 100, 'QR code drawn');
    await host.screenshot({ path: `${out}/coop-share.png` });

    // a guest opens the link and joins on its own
    const guest = await peer(link, 'guest');
    await host.waitForFunction(() => efs.remotes.size === 1, null, { timeout: 90000 });
    await guest.waitForFunction(() => efs.net && efs.remotes.size === 1, null, { timeout: 90000 });

    // host deploys; the guest can then deploy into the host's town
    await host.evaluate(() => { efs.startRaid(); });
    await guest.waitForFunction(() => efs.hostRaid > 0, null, { timeout: 30000 });
    await guest.evaluate(() => { efs.startRaid(); });
    await guest.waitForFunction(() => efs.actors.filter((a) => a.nid).length > 15, null, { timeout: 30000 });
    await host.waitForFunction(() => efs.actors.some((a) => a.remote), null, { timeout: 15000 });
    report.town = await guest.evaluate(() => ({ actors: efs.actors.filter((a) => a.nid).length }));

    // guest's shot kills one of the host's actors; the host reports it back as the guest's kill
    const nid = await guest.evaluate(() => { const a = efs.actors.find((x) => x.nid && !x.dead && x.faction === 'zombie'); efs.damageActor(a, { ammoId: 'ammo-ap', zone: 'head', mult: 20, shooter: efs.player }); return a.nid; });
    await host.waitForFunction((n) => efs.actors.find((a) => a.nid === n)?.dead, nid, { timeout: 15000 });
    await guest.waitForFunction((n) => efs.actors.find((a) => a.nid === n)?.dead, nid, { timeout: 15000 });
    report.guestKill = nid;

    // the host's AI lands a blow on the guest's stand-in: the guest loses health
    const before = await guest.evaluate(() => efs.player.health.value);
    await host.evaluate(() => { const r = [...efs.remotes.values()][0], z = efs.actors.find((a) => a.nid && !a.dead && a.faction === 'zombie'); efs.damageActor(r, { melee: 30, zone: 'thorax', shooter: z }); });
    await guest.waitForFunction((b) => efs.player.health.value < b, before, { timeout: 15000 });
    report.guestHurt = before - await guest.evaluate(() => efs.player.health.value);

    // both in the hotel lobby, facing each other: screenshots from each side
    await host.evaluate(() => { efs.player.position.set(2.5, 0, 60.5); efs.controls.setLook(0, 0); });
    await guest.evaluate(() => { efs.player.position.set(2.5, 0, 55.5); efs.controls.setLook(Math.PI, 0); });
    await host.waitForTimeout(1500);
    await host.screenshot({ path: `${out}/hotel-host.png` }); await guest.screenshot({ path: `${out}/hotel-guest.png` });
    report.seen = await host.evaluate(() => [...efs.remotes.values()].map((r) => ({ visible: r.root.visible, x: +r.position.x.toFixed(1), z: +r.position.z.toFixed(1) })));
    assert(report.seen[0].visible && Math.abs(report.seen[0].z - 55.5) < 1.5, 'host sees the guest where they stand');
    assert.deepEqual(errors, []);
    report.ok = true;
} finally {
    report.errors = errors;
    await writeFile(`${out}/check-p2p.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    await browser.close(); server.close();
}
