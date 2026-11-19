// Two-player check for Escape from Night Audit over real Trystero relays (needs the internet): the host opens a room,
// the guest pastes the invite code, both raid the same seeded hotel, hits and hurts cross the wire, and a body lies
// on the floor. Screenshots land beside the preview.
//   node publish-batch.js projects/escape-from-night-audit/release.parts.json --local /tmp/efna
//   node scripts/test-escape-from-night-audit-p2p.mjs /tmp/efna
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(process.argv[2] ?? '/tmp/efna');
const { chromium } = await import(resolve(process.env.PLAYWRIGHT_MODULE ?? 'projects/roadside-inn/.validation/node_modules/playwright-core/index.mjs'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const server = createServer(async (req, res) => {
    try { const p = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname)); res.setHeader('Content-Type', MIME[extname(p)] ?? 'application/octet-stream'); res.end(await readFile(p)); }
    catch { res.statusCode = 404; res.end(); }
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}/escape-from-night-audit.html`;
const errors = [], browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
async function peer(name, url = base) {
    const page = await (await browser.newContext({ viewport: { width: 640, height: 400 } })).newPage();
    page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${name}: HTTP ${r.status()} ${r.url()}`); });
    await page.goto(url);
    await page.waitForFunction(() => window.efs && !document.querySelector('#menu').classList.contains('hidden'), null, { timeout: 240000 });
    return page;
}
const report = {};
try {
    const host = await peer('host');
    // host opens a room; the guest opens the invite link and joins by itself
    await host.evaluate(() => { document.querySelector('#coopbtn').click(); document.querySelector('#hostbtn').click(); });
    await host.waitForFunction(() => document.querySelector('#invite').value.includes('/'), null, { timeout: 60000 });
    const link = await host.inputValue('#invitelink'), code = await host.inputValue('#invite');
    assert.equal(new URL(link).searchParams.get('room'), code, 'the link carries the code');
    report.link = link.length;
    const guest = await peer('guest', link);
    await host.waitForFunction(() => efs.remotes.size === 1, null, { timeout: 90000 });
    await guest.waitForFunction(() => efs.net && efs.remotes.size === 1, null, { timeout: 90000 });

    // host checks in; the guest follows into the same hotel and sees the host's people
    await host.evaluate(() => efs.startRaid());
    await guest.waitForFunction(() => efs.hostNight > 0, null, { timeout: 30000 });
    await guest.evaluate(() => efs.startRaid());
    const plan = () => efs.hotel.world.cells.join();
    assert.equal(await guest.evaluate(plan), await host.evaluate(plan), 'same hotel on both');
    await guest.waitForFunction(() => efs.actors.filter((a) => a.nid).length >= 14, null, { timeout: 30000 });
    await host.waitForFunction(() => efs.actors.some((a) => a.remote), null, { timeout: 15000 });
    report.people = await guest.evaluate(() => efs.actors.filter((a) => a.nid).length);
    // the same character models on both sides
    const models = () => efs.actors.filter((a) => a.nid).map((a) => a.nid + ':' + a.tpl).sort().join();
    assert.equal(await guest.evaluate(models), await host.evaluate(models), 'same models');

    // the guest's shotgun blast (8 pellets in one frame) kills a host zombie: dead on both, credited to the guest
    const nid = await guest.evaluate(() => { const a = efs.actors.find((x) => x.nid && !x.dead && x.faction === 'zombie'); for (let i = 0; i < 8; i++) efs.damageActor(a, { ammoId: 'ammo-standard', zone: i % 2 ? 'head' : 'thorax', mult: 0.6, shooter: efs.player }); return a.nid; });
    await host.waitForFunction((n) => efs.actors.find((a) => a.nid === n)?.dead, nid, { timeout: 15000 });
    await guest.waitForFunction((n) => efs.actors.find((a) => a.nid === n)?.dead, nid, { timeout: 15000 });

    // the host's AI hits the guest's stand-in: the guest loses health
    const before = await guest.evaluate(() => efs.player.health.value);
    await host.evaluate(() => { const r = [...efs.remotes.values()][0], z = efs.actors.find((a) => a.nid && !a.dead && a.faction === 'zombie'); efs.damageActor(r, { melee: 30, zone: 'thorax', shooter: z }); });
    await guest.waitForFunction((b) => efs.player.health.value < b, before, { timeout: 15000 });
    report.guestHurt = before - await guest.evaluate(() => efs.player.health.value);

    // the dead body: drag it in front of the host's camera, let it fall, and look down at it
    report.body = await host.evaluate((n) => {
        const a = efs.actors.find((x) => x.nid === n), p = efs.player.position; a.convertAt = null;
        a.position.set(p.x + 0.7, 0, p.z - 1.7); a.heading = a.root.rotation.y = Math.PI / 2;
        efs.camera.children.forEach((c) => { c.visible = !!c.isLight; }); document.querySelector('#hud').classList.add('hidden');
        for (let i = 0; i < 30; i++) efs.frame(1 / 30);
        // look straight down from just under the ceiling, the torch on: anything under the carpet would be missing
        efs.controls.setLook(0, -0.6); for (let i = 0; i < 5; i++) efs.frame(1 / 30);
        const w = (o) => { const v = o.getWorldPosition(a.position.clone()); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; };
        let lowest = 9; a.model.traverse((o) => { if (o.isBone) lowest = Math.min(lowest, o.getWorldPosition(a.position.clone()).y); });
        return { y: +a.root.position.y.toFixed(2), tilt: +a.root.rotation.x.toFixed(2), order: a.root.rotation.order, root: w(a.root), head: w(a.rig.head), hips: w(a.rig.spine), lowestBone: +lowest.toFixed(2), cam: w(efs.camera), near: efs.actors.filter((b) => b !== a && b.root && Math.hypot(b.position.x - a.position.x, b.position.z - a.position.z) < 1.5).map((b) => b.faction + (b.dead ? ':dead' : '') + (b.remote ? ':remote' : '')), remotesVisible: [...efs.remotes.values()].map((r) => r.root.visible), scale: +a.model.scale.x.toFixed(3) };
    }, nid);
    await host.screenshot({ path: `${root}/p2p-body.png`, timeout: 120000 });

    // host sees the guest where they stand
    await guest.evaluate(() => { const p = efs.player.position; p.x += 0.01; });
    await host.waitForTimeout(1500);
    report.seen = await host.evaluate(() => { const r = [...efs.remotes.values()][0]; return { visible: r.root.visible, d: +r.position.distanceTo(efs.player.position).toFixed(2) }; });
    assert.ok(report.seen.visible && report.seen.d > 0.5, 'host draws the guest, not on top of themselves');
    assert.deepEqual(errors, []);
    report.ok = true;
} finally {
    report.errors = errors; console.log(JSON.stringify(report, null, 2));
    await browser.close(); server.close();
}
