// Browser check for Night Audit: plays a whole night (seed 1234) in headless Chrome, saves screenshots and measured sound
// levels to artifacts/night-audit/. Fails on any console error or a broken step.
//   node projects/night-audit/check.mjs      (uses projects/roadside-inn/.validation's playwright-core)
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? new URL('../roadside-inn/.validation/node_modules/playwright-core/index.mjs', import.meta.url).href);
const repo = resolve(import.meta.dirname, '../..'), root = resolve(process.env.ROOT ?? repo), out = resolve(repo, 'artifacts/night-audit');
await mkdir(out, { recursive: true });
const types = { '.mjs': 'text/javascript', '.hdr': 'application/octet-stream', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };
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
page.on('console', m => { if (m.type() === 'error' || /night audit/.test(m.text())) errors.push(m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = name => page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 });
const A = fn => page.evaluate(fn);
const waitFor = (fn, ms = 60000) => page.waitForFunction(fn, null, { timeout: ms, polling: 250 });
// put the player somewhere and look a way (yaw 0 looks toward -z)
const at = (x, y, z, yaw = 0, pitch = 0) => page.evaluate(([x, y, z, yaw, pitch]) => __audit.ctx.teleport(x, y, z, yaw, pitch), [x, y, z, yaw, pitch]);
const use = label => page.evaluate(label => { const it = __audit.world.interact.find(i => (!i.when || i.when(__audit.player)) && i.label() === label); if (!it) return false; it.use(); return true; }, label);
try {
  await page.goto(`http://127.0.0.1:${server.address().port}${process.env.PAGE ?? '/projects/night-audit/index.html'}?seed=1234&quality=${process.env.QUALITY ?? 'low'}`);
  await waitFor(() => globalThis.__audit, 600000);
  await A(() => __audit.begin());
  await waitFor(() => __audit.director.name === 'night' && __audit.ctx.audit.buffers);
  result.buffers = await A(() => ({ music: __audit.ctx.audit.buffers.music?.duration, tv: __audit.ctx.audit.buffers.tv.map(b => b?.duration) }));
  if (!result.buffers.music || result.buffers.tv.some(d => !d)) throw Error('audio did not load: ' + JSON.stringify(result.buffers));
  // Software rendering runs ~1 fps: skip the waking.
  await A(() => { const a = __audit.ctx.audit; a.t = 6.4; __audit.fx.snap({ fade: 0, lids: 0 }); });
  await waitFor(() => __audit.ctx.audit.state === 'knocked');
  await at(12.9, 3.2, 1.6);
  for (const n of [1, 2]) {
    if (!(await use('Look through the peephole'))) throw Error('no peephole ' + n);
    await A(() => __audit.fx.snap({ peep: 1 }));
    await sleep(3000); await shot(`peephole-${n}`);
    await A(() => __audit.ctx.view.onUse());
  }
  // Open the door and step out: it shuts behind you, and the card is dead.
  await A(() => { __audit.world.room.open = true; __audit.world.room.timer = 30; });
  await sleep(1500);
  await at(12.9, 3.2, 0.3, Math.PI, 0);
  await waitFor(() => __audit.ctx.audit.state === 'out');
  await sleep(2500);
  result.locked = await A(() => ({ keyDead: __audit.ctx.audit.keyDead, open: __audit.world.room.open }));
  await shot('locked-out');
  if (!(await use('Tap key card'))) throw Error('no key card prompt at 212');
  // Stair A, halfway down flight B: the lights die; at the landing, down you go.
  await at(11.4, 2.5, -4, 0, -0.3);
  await waitFor(() => __audit.ctx.audit.dark);
  await sleep(2000); await shot('stair-dark');
  await at(10.75, 1.62, -7.5, Math.PI, 0);
  await waitFor(() => __audit.director.name === 'below' && __audit.ctx.audit.floor === 0, 120000);
  result.floors = [];
  for (let k = 0; k < 3; k++) {
    await page.waitForFunction(k => __audit.ctx.audit.floor === k && __audit.director.name === 'below', k, { timeout: 60000, polling: 250 });
    await A(() => __audit.fx.snap({ fade: 0 }));
    await sleep(3000); await shot(`floor${k + 1}-start`);
    if (k === 0) {
      // A guest room: open it from the hall, step in, shut and lock it.
      const rm = await A(() => { const f = __audit.ctx.audit.floors[0], r = f.rooms[0], c = f.centre(r.cell); return [c.x, f.origin[1], c.z, Math.atan2(-(r.doorway.x - c.x), -(r.doorway.z - c.z)), r.centre.x, r.centre.z, Math.atan2(-(c.x - r.centre.x), -(c.z - r.centre.z))]; });
      await at(rm[0], rm[1], rm[2], rm[3]);
      await sleep(1500); await shot('room-door');
      if (!(await use('Open the door'))) throw Error('no room door to open');
      await page.waitForFunction(() => __audit.ctx.audit.floors[0].rooms[0].door.angle > 1.2, null, { timeout: 60000 });
      await at(rm[4], rm[1], rm[5], rm[6] + Math.PI);
      await sleep(3000); await shot('room-inside');
      await at(rm[4], rm[1], rm[5], rm[6]);
      if (!(await use('Close the door'))) throw Error('no close from inside');
      await page.waitForFunction(() => __audit.ctx.audit.floors[0].rooms[0].door.angle < 0.05, null, { timeout: 60000 });
      if (!(await use('Lock the deadbolt'))) throw Error('no lock');
      // It arrives, hears you (loudly), and comes to the door: locked, so it knocks, tries the handle and goes.
      await A(() => { __audit.ctx.audit.creature.timer = 0; });
      await page.waitForFunction(() => __audit.ctx.audit.creature.state !== 'away', null, { timeout: 60000 });
      await A(() => { const c = __audit.ctx.audit.creature, f = c.f, r = f.rooms[0]; const n = f.m; c.pos.copy(f.centre(r.cell)); c.cell = r.cell; c.hear(99); });
      await page.waitForFunction(() => __audit.ctx.audit.creature.state === 'door', null, { timeout: 120000, polling: 250 });
      await A(() => { __audit.ctx.audit.creature.timer = 0.2; });
      await page.waitForFunction(() => __audit.ctx.audit.creature.state !== 'door', null, { timeout: 120000, polling: 250 });
      result.lockedDoor = await A(() => ({ state: __audit.ctx.audit.creature.state, open: __audit.ctx.audit.floors[0].rooms[0].door.open }));
      if (result.lockedDoor.open) throw Error('it opened a locked door');
      // and you can always get out: from inside, the handle opens a locked door
      result.canLeave = await A(() => { const it = __audit.world.interact.find(i => i.when?.(__audit.player) && i.label() === 'Open the door'); return !!it; });
      if (!result.canLeave) throw Error('no way to open the door from inside');
      // Now unlocked and open, with it right outside: it comes in.
      await use('Open the door');   // the handle draws the bolt back
      await A(() => { const c = __audit.ctx.audit.creature, f = c.f, r = f.rooms[0]; c.pos.copy(f.centre(r.cell)); c.cell = r.cell; c.state = 'search'; c.hear(99); });
      await at(rm[4], rm[1], rm[5], rm[6]);
      await page.waitForFunction(() => { const c = __audit.ctx.audit.creature; return c.state === 'caught' || c.pos.distanceTo(__audit.camera.position) < 2.2; }, null, { timeout: 180000, polling: 100 });
      await shot('creature');
      await page.waitForFunction(() => __audit.ctx.audit.creature.catches === 1 && !__audit.ctx.busy, null, { timeout: 180000 });
      await A(() => __audit.fx.snap({ fade: 0 }));
      result.caught = await A(() => ({ catches: __audit.ctx.audit.creature.catches, state: __audit.ctx.audit.creature.state, atStart: __audit.ctx.audit.floors[0].cellAt(__audit.camera.position) === __audit.ctx.audit.floors[0].m.start }));
      if (!result.caught.atStart) throw Error('caught, but not sent back to the stair door');
    }
    // The music: louder and brighter by the stairs down than where you came in.
    const startMusic = await A(() => ({ gain: __audit.ctx.audit.music.gain, cutoff: __audit.ctx.audit.music.cutoff }));
    const exit = await A(() => { const f = __audit.ctx.audit.floors[__audit.ctx.audit.floor], e = f.stairs.exit; return [e.pos.x, f.origin[1], e.pos.z, e.facing]; });
    // the first TV: stand in front of it, then switch it off
    const tv = await A(() => { const f = __audit.ctx.audit.floors[__audit.ctx.audit.floor], t = f.tvs[0], c = f.centre(t.cell); return t && [c.x, f.origin[1], c.z, Math.atan2(-(t.pos.x - c.x), -(t.pos.z - c.z))]; });
    let tvRow = null;
    if (tv) {
      await at(...tv); await sleep(3000); await shot(`floor${k + 1}-tv`);
      const on = await A(() => __audit.ctx.audit.tvVoices[0].gain);
      if (!(await use('Turn off the TV'))) throw Error('no TV switch');
      await sleep(1500);
      tvRow = { on, off: await A(() => __audit.ctx.audit.tvVoices[0].gain) };
    }
    await at(...exit); await sleep(3000); await shot(`floor${k + 1}-exit`);
    const exitMusic = await A(() => ({ gain: __audit.ctx.audit.music.gain, cutoff: __audit.ctx.audit.music.cutoff }));
    result.floors.push({ startMusic, exitMusic, tv: tvRow });
    if (!(exitMusic.gain > startMusic.gain * 1.5)) throw Error(`floor ${k + 1}: music no louder at the stairs (${startMusic.gain} → ${exitMusic.gain})`);
    if (tvRow && !(tvRow.on > 0.2 && tvRow.off < 0.05)) throw Error(`floor ${k + 1}: TV levels ${JSON.stringify(tvRow)}`);
    if (!(await use('Take the stairs down'))) throw Error('no stairs down on floor ' + (k + 1));
  }
  await waitFor(() => __audit.director.name === 'lobby', 120000);
  await A(() => __audit.fx.snap({ fade: 0 }));
  await at(1.5, 0, -1, Math.PI / 2, 0);
  await sleep(3000); await shot('lobby');
  result.lobbyMusic = await A(() => __audit.ctx.audit.music.gain);
  await at(-6.4, 0, -2.4, Math.PI / 2, 0);
  await sleep(1500); await shot('dana');
  await A(() => __audit.ctx.game.checkIn(__audit.world.clerk));
  await waitFor(() => !document.getElementById('end').hidden, 90000);
  result.tally = await A(() => document.getElementById('tally').textContent);
  await shot('end');
} catch (e) { errors.push('check: ' + e.message.split('\n')[0]); }
result.errors = [...new Set(errors)];
await writeFile(`${out}/check.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 1));
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
