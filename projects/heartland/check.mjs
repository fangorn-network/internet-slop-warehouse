// Browser check for the Heartland run: arrival → night → the drive to the caves → the cave → back → evening → night two
// → out of nerve. Screenshots and the run's numbers go to artifacts/heartland/. Fails on any console error.
//   node projects/heartland/check.mjs      (ROOT/PAGE to check a packaged preview)
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? new URL('../roadside-inn/.validation/node_modules/playwright-core/index.mjs', import.meta.url).href);
const repo = resolve(import.meta.dirname, '../..'), root = resolve(process.env.ROOT ?? repo), out = resolve(repo, 'artifacts/heartland');
await mkdir(out, { recursive: true });
const types = { '.mjs': 'text/javascript', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };
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
const H = (fn, arg) => page.evaluate(fn, arg);
const waitFor = (fn, arg, ms = 120000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 250 });
const at = (x, y, z, yaw = 0, pitch = 0) => H(([x, y, z, yaw, pitch]) => __heartland.ctx.teleport(x, y, z, yaw, pitch), [x, y, z, yaw, pitch]);
const use = label => H(label => { const it = __heartland.world.interact.find(i => (!i.when || i.when(__heartland.player)) && i.label() === label); if (!it) return false; it.use(); return true; }, label);
const run = () => H(() => { const r = __heartland.ctx.run; return { day: r.day, money: r.money, nerve: r.nerve, items: [...r.items], act: __heartland.director.name }; });
const settle = async name => { await H(() => __heartland.fx.snap({ fade: 0, lids: 0 })); await sleep(3000); await shot(name); };
try {
  await page.goto(`http://127.0.0.1:${server.address().port}${process.env.PAGE ?? '/projects/heartland/index.html'}?seed=4242&quality=low`);
  await waitFor(() => globalThis.__heartland, null, 600000);
  await H(() => __heartland.begin());
  await waitFor(() => __heartland.director.name === 'arrival');
  await settle('1-arrival');
  // Sleep: the room is paid for, and the night starts.
  await H(() => __heartland.ctx.game.event('sleep'));
  await waitFor(() => __heartland.director.name === 'night');
  result.night1 = await run();
  if (result.night1.money !== 91) throw Error('the room was not charged: ' + JSON.stringify(result.night1));
  // (Night Audit has its own check.) Dana: on to the morning.
  await H(() => __heartland.ctx.next({ fadeOut: 0.1 }));
  await waitFor(() => __heartland.director.name === 'morning');
  result.morning = await run();
  await settle('2-morning');
  // Into the wagon and out of the spot: reverse two seconds.
  if (!(await use('Get in your car'))) throw Error('no car to get into');
  const drive = (secs, x, z) => H(([secs, x, z]) => { const c = __heartland.ctx.caves.car, i = { x, z, yaw: 0, pitch: 0 }; for (let t = 0; t < secs; t += 0.05) c.update(0.05, i); return [c.object.position.x, c.object.position.z, c.speed]; }, [secs, x, z]);
  const start = await H(() => __heartland.ctx.caves.wagon.position.toArray());
  const backed = await drive(2, 0, 1);   // input.z +1 at yaw 0 is S: reverse
  result.reversed = Math.hypot(backed[0] - start[0], backed[1] - start[2]);
  if (!(result.reversed > 1)) throw Error('the car did not reverse: ' + result.reversed);
  // On the frontage road heading east, foot down: it goes, and stays on the road.
  await H(() => { const c = __heartland.ctx.caves.car; c.object.position.set(120, 0, 47.8); c.heading = Math.PI / 2; c.speed = 0; c.camInit = false; });
  const east = await drive(4, 0, -1);
  result.east = east;
  if (!(east[0] > 140 && east[1] > 46 && east[1] < 49.6)) throw Error('the car did not drive east on the road: ' + east);
  await sleep(2500); await shot('3-frontage-road');
  // Steer into the trees: it stops at the edge of the road.
  const off = await drive(3, 1, -1);
  result.offRoad = off;
  if (off[1] > 49.7 || off[1] < 45.9) throw Error('the car left the road: ' + off);
  // Route V, then the lot.
  await H(() => { const c = __heartland.ctx.caves.car; c.object.position.set(266, 0, -40); c.heading = Math.PI; c.speed = 0; c.camInit = false; });
  await drive(1, 0, -1);
  await sleep(2500); await shot('4-route-v');
  await H(() => { const c = __heartland.ctx.caves.car; c.object.position.set(262, 0, -145); c.heading = Math.PI; c.speed = 0; c.camInit = false; });
  await sleep(2000); await shot('5-lot-arrive');
  await H(() => __heartland.ctx.view.onUse());   // park and get out
  if (await H(() => !!__heartland.ctx.view)) throw Error('could not get out in the lot');
  // the hut, the box, the mouth
  const hut = await H(() => __heartland.cavesBuilt.hut.toArray());
  await at(hut[0] + 0.9, 0, hut[2] + 2.6, 0); await settle('6-hut');
  if (!(await use('Leave $14 in the box'))) throw Error('no honour box');
  const mouth = await H(() => __heartland.cavesBuilt.mouth.toArray());
  await at(mouth[0], 0, mouth[2] + 6, 0); await settle('7-mouth');
  await at(mouth[0], 0, mouth[2] + 1.6, 0);
  if (!(await use('Go into the cave'))) throw Error('no way into the cave');
  await waitFor(() => __heartland.director.name === 'cave');
  await settle('8-cave');
  // the Onyx Room
  const room = await H(() => { const c = __heartland.cavesBuilt.cave, p = c.centre.clone().addScaledVector(c.toEntry, 2.2); return [p.x, c.centre.y, p.z, Math.atan2(c.toEntry.x, c.toEntry.z)]; });
  await at(...room); await settle('9-onyx-room');
  if (!(await use('Break off a piece of onyx'))) throw Error('no onyx to take');
  await waitFor(() => __heartland.ctx.caves.dark, null, 180000);
  await H(() => { const c = __heartland.cavesBuilt.cave; __heartland.ctx.teleport(c.path[3] ? c.entry.x : c.entry.x, c.entry.y, c.entry.z, c.facing, 0); });
  await settle('10-cave-dark');
  result.cave = await H(() => ({ lit: __heartland.cavesBuilt.cave.bulbs.filter(b => b.intensity > 0).length, flashlight: __heartland.ctx.caves.light.intensity }));
  if (result.cave.lit) throw Error('bulbs still lit after the onyx');
  if (!(await use('Back out into daylight'))) throw Error('no way out of the cave');
  await waitFor(() => __heartland.director.name === 'morning');
  await settle('11-daylight');
  const car = await H(() => __heartland.ctx.caves.wagon.position.toArray());
  await at(car[0] + 2, 0, car[2], Math.PI / 2);
  if (!(await use('Drive back to the Heartland'))) throw Error('no drive back');
  await waitFor(() => __heartland.director.name === 'evening');
  result.evening = await run();
  if (result.evening.day !== 2 || !result.evening.items.includes('onyx') || result.evening.money !== 77) throw Error('the day did not count: ' + JSON.stringify(result.evening));
  await settle('12-evening');
  await H(() => __heartland.ctx.game.event('sleep'));
  await waitFor(() => __heartland.director.name === 'night', null, 120000);
  result.night2 = await run();
  if (result.night2.money !== 18) throw Error('night two was not charged: ' + JSON.stringify(result.night2));
  // Out of nerve: the run ends, and the memories are kept.
  await H(() => __heartland.ctx.run.hurt(500));
  await waitFor(() => !document.getElementById('end').hidden);
  result.end = await H(() => ({ title: document.getElementById('endTitle').textContent, tally: document.getElementById('tally').textContent, memories: JSON.parse(localStorage.getItem('heartland.memories') ?? '[]') }));
  await shot('13-end');
  if (!result.end.memories.includes('kept')) throw Error('memories not kept');
} catch (e) { errors.push('check: ' + e.message.split('\n')[0]); }
result.errors = [...new Set(errors)];
await writeFile(`${out}/check.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 1));
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
