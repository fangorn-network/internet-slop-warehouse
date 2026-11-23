// Browser check for Onyx Caverns by itself: an autopilot drives the wagon from its bay at the Heartland to the caverns'
// lot the way a player would (steering at the next turn, backing up when it's stuck), no teleports. Screenshots along
// the way go to artifacts/caves/. Fails if it can't get there, or on any console error.
//   node projects/caves/check.mjs      (ROOT/PAGE to check a packaged preview)
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? new URL('../roadside-inn/.validation/node_modules/playwright-core/index.mjs', import.meta.url).href);
const repo = resolve(import.meta.dirname, '../..'), root = resolve(process.env.ROOT ?? repo), out = resolve(repo, 'artifacts/caves');
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = createServer(async (req, res) => {
  const file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (relative(root, file).startsWith('..')) return res.writeHead(403).end();
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], result = {};
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 });
const C = (fn, arg) => page.evaluate(fn, arg);
try {
  await page.goto(`http://127.0.0.1:${server.address().port}${process.env.PAGE ?? '/projects/caves/index.html'}?seed=4242&quality=low`);
  await page.waitForFunction(() => globalThis.__caves, null, { timeout: 600000, polling: 500 });
  await C(() => __caves.begin());
  await page.waitForFunction(() => __caves.director.name === 'morning', null, { timeout: 60000 });
  await C(() => __caves.fx.snap({ fade: 0 }));
  if (!(await C(() => { const it = __caves.world.interact.find(i => (!i.when || i.when(__caves.player)) && i.label() === 'Get in your car'); it?.use(); return !!it; }))) throw Error('no car');
  // Drive: 0.05 s steps, a leg at a time, in chunks so the page can draw in between.
  for (let chunk = 0; chunk < 40; chunk++) {
    const st = await C(() => {
      const car = __caves.ctx.caves.car, p = car.object.position, ap = (globalThis.__ap ??= { leg: 0, t: 0, stuck: 0, back: 0, stucks: 0, path: [] });
      const WAY = [[1.6, 49.5, q => q.z > 44], [266, 49.5, q => q.x > 256], [266, -132, q => q.z < -130], [266, -147, () => false]];
      for (let n = 0; n < 100; n++) {
        while (ap.leg < 3 && WAY[ap.leg][2](p)) ap.leg++;
        const [tx, tz] = WAY[ap.leg];
        let rel = Math.atan2(tx - p.x, tz - p.z) - car.heading; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        let X = Math.max(-1, Math.min(1, -rel * 2.5)), Z = Math.abs(rel) > 1.3 ? (car.speed < 3 ? 1 : 0) : (car.speed < 13 ? 1 : 0);
        if (ap.back > 0) { ap.back -= 0.05; Z = -1; X = -X; }
        else if (Math.abs(car.speed) < 0.3 && ap.t > 1) { if ((ap.stuck += 0.05) > 0.8) { ap.back = 1.4; ap.stuck = 0; ap.stucks++; } } else ap.stuck = 0;
        car.update(0.05, { x: X, z: -Z, yaw: 0, pitch: 0 }); ap.t += 0.05;
        if (n % 20 === 0) ap.path.push([+p.x.toFixed(1), +p.z.toFixed(1)]);
        if (ap.leg === 3 && p.x > 242 && p.x < 290 && p.z > -162 && p.z < -132 && Math.abs(car.speed) < 13) return { done: true, t: ap.t, stucks: ap.stucks, at: [p.x, p.z] };
      }
      return { done: false, t: ap.t, leg: ap.leg, stucks: ap.stucks, at: [p.x, p.z], goal: document.getElementById('goal').textContent };
    });
    if (chunk === 1 || chunk === 6) { await C(() => { __caves.ctx.caves.car.camInit = false; }); await sleep(2500); await shot(`drive-${chunk}`); }   // the chase camera eases per drawn frame; these steps drew none
    if (st.goal && chunk === 2) result.heading = st.goal;
    if (st.done) { result.drive = st; break; }
    if (st.t > 160) { result.drive = st; break; }
  }
  result.path = await C(() => globalThis.__ap.path);
  if (!result.drive?.done) throw Error('the autopilot never reached the lot: ' + JSON.stringify(result.drive));
  // brake to a stop, and get out
  await C(() => { const car = __caves.ctx.caves.car; for (let n = 0; n < 200 && Math.abs(car.speed) > 0.05; n++) car.update(0.05, { x: 0, z: car.speed > 0.3 ? 1 : 0, yaw: 0, pitch: 0 }); });   // brake, then let it roll to a stop
  await sleep(1500); await shot('arrived');
  result.beforeOut = await C(() => { const c = __caves.ctx.caves; return { speed: c.car.speed, at: c.wagon.position.toArray(), view: !!__caves.ctx.view, driving: c.driving }; });
  await C(() => __caves.ctx.view.onUse());
  result.out = await C(() => !__caves.ctx.view);
  result.said = await C(() => document.getElementById('say').textContent);
  if (!result.out) throw Error('could not get out in the lot');
} catch (e) { errors.push('check: ' + e.message.split('\n')[0]); }
result.errors = [...new Set(errors)];
await writeFile(`${out}/check.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, path: result.path?.length }, null, 1));
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
