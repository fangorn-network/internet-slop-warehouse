// Browser check for Catherine: plays the dream and saves screenshots to artifacts/catherine/. Fails on any console error.
//   node projects/catherine/check.mjs      (uses projects/roadside-inn/.validation's playwright-core)
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? new URL('../roadside-inn/.validation/node_modules/playwright-core/index.mjs', import.meta.url).href);
// ROOT/PAGE: check a packaged preview instead (publish-batch.js … --local DIR; ROOT=DIR PAGE=/catherine.html).
const repo = resolve(import.meta.dirname, '../..'), root = resolve(process.env.ROOT ?? repo), out = resolve(repo, 'artifacts/catherine');
await mkdir(out, { recursive: true });
const types = { '.mjs': 'text/javascript', '.hdr': 'application/octet-stream', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (relative(root, file).startsWith('..')) return res.writeHead(403).end();
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 });
const result = {};
try {
  await page.goto(`http://127.0.0.1:${server.address().port}${process.env.PAGE ?? '/projects/catherine/index.html'}?scenes=checkin,catherine&quality=${process.env.QUALITY ?? 'low'}`);
  await page.waitForFunction(() => globalThis.__catherine, null, { timeout: 600000, polling: 500 });
  await page.evaluate(() => __catherine.begin());
  await page.waitForFunction(() => __catherine.director.name === 'arrival', null, { timeout: 60000 });
  await page.evaluate(() => __catherine.fx.snap({ fade: 0 }));
  await sleep(2500);
  await shot('arrival');
  // Check in (the clerk's interaction), then straight to the night.
  const checked = await page.evaluate(() => { const c = __catherine.world.clerk; if (!c) return false; __catherine.ctx.game.checkIn(c); return true; });
  if (!checked) throw Error('no clerk');
  await page.waitForFunction(() => __catherine.ctx.game.has('key card'), null, { timeout: 60000 });
  await page.evaluate(() => __catherine.director.go('wake', { fadeOut: 0.05 }));
  await page.waitForFunction(() => __catherine.director.name === 'wake', null, { timeout: 60000 });
  // Eyes shut on waking: nothing to interact with, even standing at the door.
  await page.evaluate(() => { __catherine.fx.snap({ lids: 1, fade: 0 }); Object.assign(__catherine.player, { x: 12.9, z: 1.6 }); __catherine.ctx.controls.setLook(0, 0); });
  await sleep(2500);
  if (await page.evaluate(() => document.getElementById('prompt').style.display) !== 'none') throw Error('a prompt shows with eyes shut');
  // Software rendering runs ~1 fps: skip the wake-up and the walk instead of waiting minutes for them.
  await page.evaluate(() => { const d = __catherine.ctx.dream; d.t = 3; d.steps = { i: 99, count: 0 }; d.state = 'coming'; __catherine.fx.snap({ fade: 0, lids: 0 }); });
  await page.waitForFunction(() => __catherine.ctx.dream.state === 'waiting', null, { timeout: 60000 });
  await sleep(2500);
  await shot('room-dark');

  const peep = await page.evaluate(() => { const it = __catherine.world.interact.find(i => i.label() === 'Look through the peephole'); const p = __catherine.player; Object.assign(p, { x: 12.9, z: 1.6 }); return !!it && (it.use(), true); });
  if (!peep) throw Error('no peephole');
  await page.evaluate(() => __catherine.fx.snap({ peep: 1 }));
  await sleep(3000);
  await shot('peephole');
  // The same moment without the lens, from the corridor side, to judge her pose.
  await page.evaluate(() => { const c = __catherine.ctx; c.view = { pos: new __catherine.THREE.Vector3(11.2, __catherine.FLOOR2 + 1.5, -0.6), yaw: -2.2, pitch: -0.1, fov: 60 }; __catherine.fx.snap({ peep: 0 }); });
  await sleep(2500);
  await shot('pose-side');
  // Open the door: the house.
  await page.evaluate(() => { const c = __catherine.ctx; c.view = null; Object.assign(__catherine.player, { x: 12.9, z: 1.8 }); c.controls.setLook(0, 0); __catherine.world.room.open = true; __catherine.world.room.timer = 30; });
  await page.waitForFunction(() => __catherine.ctx.dream.inHouse, null, { timeout: 60000 });
  await page.evaluate(() => { const c = __catherine.ctx; Object.assign(__catherine.player, { x: 12.9, z: 0.1 }); c.controls.setLook(-Math.PI / 2, -0.02); });
  await sleep(3000);
  await shot('house-hall');
  // Skip her walk away: the last step, the dip, and she is there.
  await page.evaluate(() => { const d = __catherine.ctx.dream; d.steps.i = d.steps.count; });
  await page.waitForFunction(() => __catherine.ctx.dream.state === 'there', null, { timeout: 60000 });
  await page.evaluate(() => Object.assign(__catherine.player, { x: 25.5, z: 0.1 }));
  await sleep(3000);
  await shot('house-her');
  await page.evaluate(() => Object.assign(__catherine.player, { x: 28.2, z: 0.3 }));
  await sleep(2500);
  await shot('house-close');
  const reach = await page.evaluate(() => { const it = __catherine.world.interact.find(i => i.label() === 'Reach out' && i.when()); if (it) it.use(); return !!it; });
  if (!reach) throw Error('no Reach out');
  await page.evaluate(() => { const d = __catherine.ctx.dream; d.lean.len = 0.05; });
  await sleep(4500);
  await page.evaluate(() => { __catherine.ctx.dream.reachT = 0.9; });
  await sleep(2500);
  await shot('reach');
  await page.waitForFunction(() => __catherine.director.name === 'morning', null, { timeout: 120000 });
  await page.evaluate(() => { __catherine.fx.snap({ fade: 0, flash: 0, lids: 0 }); Object.assign(__catherine.player, { x: 12.9, z: 1.7 }); __catherine.world.room.open = true; __catherine.world.room.timer = 30; __catherine.ctx.controls.setLook(0, -0.7); });
  await sleep(4000);
  await shot('morning-board');
} catch (e) { errors.push('check: ' + e.message.split('\n')[0]); }
result.errors = [...new Set(errors)];
await writeFile(`${out}/check.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
