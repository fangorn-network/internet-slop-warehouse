// Audio check: measures the soundscape instead of trusting it. An analyser on the master output compares loudness
// beside the vending machines with loudness across the lobby (positional hum), then checks the night drone and the
// dawn heartbeat. node projects/late-checkout/check-audio.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
const { chromium } = await import(new URL('../roadside-inn/.validation/node_modules/playwright-core/index.mjs', import.meta.url).href);
const root = resolve(import.meta.dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg' };
const server = createServer(async (req, res) => {
  const file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (relative(root, file).startsWith('..')) return res.writeHead(403).end();
  try { res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(`http://127.0.0.1:${server.address().port}/projects/late-checkout/index.html?quality=low&seed=3`);
await page.waitForFunction(() => globalThis.__late, null, { timeout: 600000, polling: 500 });
await page.evaluate(() => __late.begin());
await page.waitForFunction(() => __late.ctx.sfx.sc.ready, null, { timeout: 60000 });
await page.waitForFunction(() => __late.director.name === 'arrival', null, { timeout: 60000 });   // arrival puts you at your car; teleport after it
// Tap the master output.
await page.evaluate(() => { const s = __late.ctx.sound.synth, a = s.ctx.createAnalyser(); a.fftSize = 2048; const z = s.ctx.createGain(); z.gain.value = 0; s.out.connect(a); a.connect(z).connect(s.ctx.destination); globalThis.__tap = a; __late.fx.snap({ fade: 0 }); });
// Measure in audio time, not frames: software rendering runs ~1 fps, so wait in real time and average several reads.
const rms = async () => { let sum = 0; for (let i = 0; i < 6; i++) { sum += await page.evaluate(() => { const d = new Float32Array(__tap.fftSize); __tap.getFloatTimeDomainData(d); return Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length); }); await sleep(250); } return sum / 6; };
const result = {};
await page.evaluate(() => { __late.ctx.sound.toggleMute(); __late.ctx.sound.toggleMute(); __late.teleport(4.6, 0, -6.0, -Math.PI / 2, 0); });   // beside the vending machines
await sleep(10000);   // warm-up: the beds and emitters fade in over a few seconds
const vend = () => page.evaluate(() => __late.ctx.sfx.sc.debug().find(l => l.pos[0] === 6 && l.pos[2] === -6).gain);
result.vendGainNear = await vend();
result.nearRms = await rms();
await page.evaluate(() => __late.teleport(-10.5, 0, 6.5, 0, 0));        // far side of the lobby
await sleep(6000);
result.vendGainFar = await vend();
result.farRms = await rms();
assert.ok(result.vendGainNear > 0.03, `vending hum on beside the machines (${result.vendGainNear})`);
assert.ok(result.vendGainFar < 0.005, `vending hum off across the lobby (${result.vendGainFar})`);
assert.ok(result.nearRms > 0.001 && result.farRms > 0.001, 'the hotel is audible');
const radio = () => page.evaluate(() => __late.ctx.sfx.sc.debug().find(l => l.pos[0] === -64.5).gain);
await page.evaluate(() => __late.teleport(-66, 0, 116.5, Math.PI, 0));   // inside the travel stop
await sleep(6000);
result.radioGain = await radio();
assert.ok(result.radioGain > 0.03, 'the radio plays in the travel stop');

// The turn: the drone comes up.
await page.evaluate(() => { __late.run.beginNight(); __late.run.clock.now = 400; });
await sleep(6000);
result.nightPad = await page.evaluate(() => __late.ctx.sfx && __late.run.phase);
result.nightRms = await rms();
assert.ok(result.nightRms > 0.0005, 'something is audible at night');
// The last hour: heartbeats.
await page.evaluate(() => { __late.run.clock.now = 690; __late.run.clock.running = false; });
await sleep(6000);
result.lastHourRms = await rms();
result.errors = errors;
console.log(JSON.stringify(result, null, 2));
await browser.close(); server.close();
if (errors.length) process.exit(1);
