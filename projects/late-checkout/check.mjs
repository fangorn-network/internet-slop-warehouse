// Browser check for Late Checkout: plays the new sequence and saves screenshots to artifacts/late-checkout/.
//   node projects/late-checkout/check.mjs            (uses projects/roadside-inn/.validation's playwright-core)
//   PHONE=1 node projects/late-checkout/check.mjs    (phone viewport, economy profile)
// Fails on any console error.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? new URL('../roadside-inn/.validation/node_modules/playwright-core/index.mjs', import.meta.url).href);
const root = resolve(import.meta.dirname, '../..'), out = resolve(root, 'artifacts/late-checkout');
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png' };
let bytes = 0;
const server = createServer(async (req, res) => {
  const file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (relative(root, file).startsWith('..')) return res.writeHead(403).end();
  try { const b = await readFile(file); bytes += b.length; res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(b); } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const phone = !!process.env.PHONE;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--enable-precise-memory-info'] });
const page = await browser.newPage(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = name => page.screenshot({ path: `${out}/${phone ? 'phone-' : ''}${name}.png`, timeout: 120000 });
const spotLabel = spot => page.evaluate(s => __late.SPOTS[s].search, spot);
const use = async label => page.evaluate(l => { const it = __late.world.interact.find(i => i.label() === l && (!i.when || i.when(__late.player))); if (!it) throw Error('no interaction: ' + l); it.use(); }, await label);
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${server.address().port}${process.env.PAGE ?? '/projects/late-checkout/index.html'}?${phone ? '' : 'quality=low'}${process.env.SEED ? `&seed=${process.env.SEED}` : ''}`);
await page.waitForFunction(() => globalThis.__late, null, { timeout: 600000, polling: 500 }).catch(async e => { console.log(JSON.stringify({ loadFailed: e.message.split('\n')[0], errors })); await browser.close(); server.close(); process.exit(1); });
const result = { loadMs: Date.now() - t0, downloadMBAtStart: +(bytes / 1e6).toFixed(1) };
try {
  await page.evaluate(() => __late.begin());
  await page.waitForFunction(() => __late.director.name === 'arrival', null, { timeout: 60000 });
  await page.evaluate(() => __late.fx.snap({ fade: 0 }));
  await sleep(1500);
  await shot('arrival');
  result.night = await page.evaluate(() => ({ seed: __late.plan.seed, culprit: __late.plan.culprit.name, kinds: __late.plan.pieces.map(p => p.kind), strange: __late.plan.strange.map(s => s.id) }));

  // The mystery light: lamps, bath and desk off, curtains shut, at dusk. Should be dark.
  await page.evaluate(() => { const r = __late.world.room; __late.game.give('key card'); __late.teleport(14.6, __late.FLOOR2, 4.2, 0.9, -0.15); r.setLamps(false); r.setBath(false); r.setDesk(false); r.drapes = 0; });
  await sleep(2500);
  await shot('room-all-off');

  // You read the fire plan before you sleep (the game insists), then lie down and close your eyes.
  await page.evaluate(() => __late.game.event('sleep'));
  assert.equal(await page.evaluate(() => document.getElementById('panel').hidden), true, 'no sleeping before the fire plan');
  await use('Read the fire evacuation plan');
  await sleep(400);
  await shot('fire-plan');
  await page.evaluate(() => __late.ctx.closePanel());
  await page.evaluate(() => __late.game.event('sleep'));
  await page.click('#sleepNow');
  await page.evaluate(() => __late.fx.snap({ fade: 1 }));   // finish the 3 s fade now (software rendering: ~1 fps)
  await page.waitForFunction(() => __late.director.name === 'night' && __late.run.phase === 'night', null, { timeout: 120000 });
  // Software rendering runs ~1 fps at ≤0.05 s per frame: skip the wake-up animation instead of waiting minutes for it.
  await page.evaluate(() => { __late.ctx.night.wake = 3; __late.fx.snap({ fade: 0, lids: 0 }); });
  assert.equal(await page.evaluate(() => __late.game.has('car keys')), false, 'keys gone at the turn');
  assert.ok(await page.evaluate(() => __late.run.clock.now >= 373), 'woke no earlier than 12:13');
  await sleep(1000);
  await shot('night-wake');

  await page.evaluate(() => __late.teleport(12.9, __late.FLOOR2, 1.6, 0, 0));
  await sleep(500);
  await use('Look through the peephole');
  await sleep(1200);
  await shot('night-peephole');
  await page.evaluate(() => __late.ctx.view.onUse());
  await use('Read the notice on the door');
  await sleep(500);
  await shot('night-notice');
  await page.evaluate(() => __late.ctx.closePanel());
  await use('Open door');
  await page.waitForFunction(() => __late.ctx.night.state === 'empty', null, { timeout: 20000 });
  // Lights off, door open, from inside: the hall should glare.
  await page.evaluate(() => { const r = __late.world.room; r.timer = 120; __late.teleport(13.7, __late.FLOOR2, 4.6, 0.18, 0.02); });
  await sleep(3500);
  await shot('night-door-open');
  await page.evaluate(() => __late.teleport(12.9, __late.FLOOR2, -0.45, Math.PI, -0.75));
  await sleep(800);
  await use('Pick up the note');
  await sleep(500);
  await shot('night-note-card');
  await page.evaluate(() => __late.ctx.closePanel());
  assert.equal(await page.evaluate(() => __late.game.has('key card (dead)')), true, 'the key dies when the door shuts behind you');
  await page.evaluate(() => __late.teleport(-7.5, 0, -1.6, Math.PI, 0));
  await page.evaluate(() => __late.game.checkIn(__late.world.clerk));
  await sleep(400);
  await shot('rekey');
  await page.evaluate(() => __late.ctx.closePanel());
  assert.equal(await page.evaluate(() => __late.game.has('key card')), true, 'Dana re-keys the card');

  // Room 113, at the east end of the ground floor.
  await page.evaluate(() => __late.teleport(29.0, 0, 0.2, 0, 0));
  await sleep(1200);
  await shot('room-113');
  await use('Knock on 113');
  await page.waitForFunction(() => __late.run.found.has(1), null, { timeout: 30000 });
  await sleep(500);
  await shot('piece-1');
  await page.evaluate(() => __late.ctx.closePanel());

  // Solve the generated pieces the way their clues say.
  const pieces = await page.evaluate(() => __late.plan.pieces.slice(1));
  for (const p of pieces) {
    if (p.kind === 'hidden') await use(spotLabel(p.spot));
    if (p.kind === 'window') { await page.evaluate(m => { const c = __late.run.clock; c.now = Math.floor(c.now / 60) * 60 + 60 + m + 1; }, p.minute); await use(spotLabel(p.spot)); }
    if (p.kind === 'code') { await use(spotLabel(p.spot)); for (const d of p.code) await page.click(`[data-k="${d}"]`); }
    if (p.kind === 'vend') { await page.evaluate(() => __late.game.vend('snacks')); await page.click(`[data-i]:text("${p.snack}")`); }
    if (p.kind === 'knock') { for (let k = 0; k < p.knocks; k++) await use(`Knock on ${p.door}`); }
    await page.waitForFunction(n => __late.run.found.has(n), p.n, { timeout: 60000 });
    await page.evaluate(() => __late.ctx.closePanel());
    await sleep(300);
  }
  assert.ok(await page.evaluate(() => __late.run.complete));
  await page.evaluate(() => __late.run.journal());
  await sleep(400);
  await shot('journal');
  await page.evaluate(() => __late.ctx.closePanel());

  // The road costs an hour.
  const before = await page.evaluate(() => __late.run.clock.now);
  await page.evaluate(() => { const c = __late.game.traffic[0]; __late.teleport(c.car.position.x + c.dir * 6, 0, c.z, 0, 0); });
  await page.waitForFunction(b => __late.run.clock.now >= b + 60, before, { timeout: 30000 });

  // Headlights on the interstate, and the travel stop with its real fixtures.
  await page.evaluate(() => __late.teleport(6, 0, 44.5, Math.PI * 1.1, 0.02));
  await sleep(2500);
  await shot('night-highway');
  await page.evaluate(() => __late.teleport(-66, 0, 101, Math.PI * 0.92, 0.05));
  await sleep(2500);
  await shot('station-front');
  await page.evaluate(() => __late.teleport(-68.5, 0, 115.2, Math.PI * 1.15, -0.05));
  await sleep(2500);
  await shot('station-inside');
  await page.evaluate(() => __late.teleport(-62.9, 0, 111.4, Math.PI, 0.05));
  await sleep(2500);
  await shot('station-payphone');

  // The keys, then the car.
  await use(await page.evaluate(() => __late.SPOTS[__late.plan.keysSpot].search));
  assert.ok(await page.evaluate(() => __late.run.hasKeys), 'found the keys');
  await page.evaluate(() => __late.ctx.closePanel());
  await use('Drive away');
  await page.waitForFunction(() => __late.run.phase === 'ended', null, { timeout: 30000 });
  await page.evaluate(() => __late.fx.snap({ fade: 1 }));
  await page.waitForSelector('#again', { timeout: 120000 });
  await shot('ending-drove');

  result.flow = 'ok';
} catch (e) { result.flow = 'failed: ' + e.message.split('\n')[0]; await shot('failure').catch(() => {}); }
await sleep(4000);
result.stats = await page.evaluate(() => {
  const g = __late, seen = new Set(); let px = 0;
  g.scene.traverse(o => { for (const m of (o.material ? [].concat(o.material) : [])) for (const k in m) { const t = m[k]; if (t?.isTexture && !seen.has(t.source)) { seen.add(t.source); const im = t.source.data; if (im?.width) px += im.width * im.height * (t.isDataTexture ? 2 : 1); } } });
  return { texMB: Math.round(px * 4 * 1.33 / 1e6), heapMB: Math.round(performance.memory.usedJSHeapSize / 1e6), calls: g.renderer.info.render.calls, programs: g.renderer.info.programs.length, streamPending: g.lib.stream.pending };
});
result.downloadMBTotal = +(bytes / 1e6).toFixed(1);
result.errors = errors;
console.log(JSON.stringify(result, null, 2));
await writeFile(`${out}/check${phone ? '-phone' : ''}.json`, JSON.stringify(result, null, 2));
await browser.close(); server.close();
if (errors.length || result.flow !== 'ok') process.exit(1);
