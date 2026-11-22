// Browser smoke check: loads the hotel, walks key viewpoints, saves screenshots, fails on console errors.
// PLAYWRIGHT_MODULE=/tmp/warehouse-validation/node_modules/playwright-core/index.mjs node projects/roadside-inn/check.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? new URL('./.validation/node_modules/playwright-core/index.mjs', import.meta.url).href);
const mode = process.argv[2];
const root = resolve(import.meta.dirname, '../..'), out = resolve(root, process.env.INN_OUT ?? 'artifacts/roadside-inn');   // INN_OUT: a separate folder when several runs share the machine
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const file = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (relative(root, file).startsWith('..')) return res.writeHead(403).end();
  try { const b = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(b); } catch { res.writeHead(404).end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const port = server.address().port;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
// Keep logic/control regressions independent of the headless GPU and audio device.
// The repairs audit above exercises normal rendering; mobile captures one real frame at the end.
if (mode === 'flow' || mode === 'mobile' || mode === 'physics' || mode === 'people' || mode === 'lint') {
  await page.context().route('**/main.js', async route => {
    let source = await readFile(resolve(root, 'projects/roadside-inn/main.js'), 'utf8');
    source = source.replace('await renderer.compileAsync(scene, camera);', 'globalThis.__renderAudit = () => renderer.render(scene, camera);');
    source = source.replace('renderer.render(scene, camera);\n  requestAnimationFrame', 'renderer.render(scene, camera);\n  requestAnimationFrame');
    // Only replace the loop call; the renderAudit callback retains the real renderer.
    source = source.replace('  renderer.render(scene, camera);', '  /* Real rendering is covered by the visual audit. */');
    await route.fulfill({ contentType: 'text/javascript', body: source });
  });
  await page.context().route('**/sound.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const createSound = () => new Proxy({ start: async () => {}, toggleMute: () => true }, { get: (o, k) => o[k] || ((...a) => (globalThis.__sounds ??= []).push([k, ...a])) });' }));   // silent, but what was played is kept
}
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
// "Failed to load resource" console errors carry no URL: name what failed (and why) beside them.
page.on('requestfailed', r => errors.push(`request failed: ${r.url()} (${r.failure()?.errorText})`));
if (mode !== 'mobile') {
  await page.goto(`http://localhost:${port}/projects/roadside-inn/index.html${process.env.FULL ? '' : '?quality=low'}`);
  await page.waitForFunction(() => globalThis.__inn, null, { timeout: 180000 });
  if (mode === 'flow' || mode === 'physics' || mode === 'people' || mode === 'lint') await page.evaluate(() => {
    // Movement/interaction checks should not be limited by the software rasterizer.
    // Render explicitly before each capture; the visual audit uses the normal renderer.
    const render = __inn.renderer.render.bind(__inn.renderer);
    __inn.renderer.render = () => {};
    // Put the real render back while capturing: three renders nested passes (transmission) through it.
    __inn.forceRender = () => { const off = __inn.renderer.render; __inn.renderer.render = render; try { render(__inn.scene, __inn.camera); } finally { __inn.renderer.render = off; } };
  });
  if (mode === 'flow' && process.env.INN_FLOW_NO_CAPTURES) { await page.evaluate(() => { __inn.forceRender = () => {}; }); page.screenshot = async () => {}; }
  await page.evaluate(() => __inn.begin());
}
const repairViews = {
  'repairs-clerk': [-7.65, 0, -2.3, 0, 0],
  'repairs-tv': [14.2, 3.2, 5.8, 1.57, 0.08],
  'repairs-lamp': [13.5, 3.2, 7.2, 2.5, -0.16],
  'repairs-shower': [14.5, 3.2, 2.6, -2.2, -0.1],
  'repairs-gym': [14.5, 0, -3.5, 0, -0.1],
  'repairs-sign': [-8, 0, -2.4, 1.57, 0.2],
};
const views = mode === 'repairs' ? repairViews : ['flow', 'profile', 'mobile', 'physics', 'people', 'lint'].includes(mode) ? {} : (mode ? JSON.parse(mode) : null) ?? {
  arrival: [3.4, 0, 19.4, 0.48, 0.05],
  lobby: [-2, 0, 7, 0.3, -0.05],
  desk: [-6.5, 0, 0.5, 0.5, -0.05],
  lounge: [-0.5, 0, 5, -1.57, -0.05],
  pantry: [0.5, 0, -3, -0.8, -0.05],
  pool: [-13, 0, -7.5, 2.4, -0.15],
  gym: [14.5, 0, 0.4, 0, -0.05],
  corridor2: [-8, 3.2, 0, -1.57, 0],
  elevator: [7.75, 0, 0.6, 0, 0],
  stairs: [10.1, 0, -0.5, 0, 0.1],
  room: [12.9, 3.2, 1.6, -2.6, -0.15],
  roomWindow: [13.2, 3.2, 5.5, -2.9, -0.05],
  bathroom: [14.4, 3.2, 3.2, -0.5, -0.1],
  facade: [-2, 0, 34, 0, 0.12],
  highway: [10, 0, 43, 0.6, 0.02],
};
for (const [name, [x, y, z, yaw, pitch]] of Object.entries(views)) {
  await page.evaluate(([x, y, z, yaw, pitch]) => __inn.teleport(x, y, z, yaw, pitch), [x, y, z, yaw, pitch]);
  await page.waitForTimeout(700);
  await page.evaluate(() => globalThis.__inn?.forceRender?.()); await page.screenshot({ path: `${out}/${name}.png`, timeout: 180000 });
}
if (mode === 'repairs') {
  const report = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { scene, world, game, player } = __inn;
    scene.updateMatrixWorld(true);
    const residents = scene.children.filter(o => o.userData.hotelResident);
    const skins = []; for (const p of residents) p.traverse(o => { if (o.isSkinnedMesh) skins.push(o); });
    const props = scene.children.filter(o => o.userData.hotelProp && o.position.y > 3 && o.position.x > 12 && o.position.x < 16.5);
    const clearanceViolations = props.filter(o => { const limit = o.userData.clearanceBounds; if (!limit) return false; const b = new T.Box3().setFromObject(o); return b.min.x < limit.x0 - 0.001 || b.max.x > limit.x1 + 0.001 || b.min.z < limit.z0 - 0.001 || b.max.z > limit.z1 + 0.001; }).map(o => o.name);
    const overlaps = [];
    const furniture = props.filter(o => !['hotel-room-door', 'hotel-ice-bucket'].includes(o.name));
    for (let i = 0; i < furniture.length; i++) for (let j = i + 1; j < furniture.length; j++) {
      const a = new T.Box3().setFromObject(furniture[i]), b = new T.Box3().setFromObject(furniture[j]);
      const dx = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x), dy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y), dz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
      if (dx > 0.015 && dy > 0.015 && dz > 0.015) overlaps.push([furniture[i].name, furniture[j].name]);
    }
    const poseProblems = [];
    for (const p of __inn.people) for (const clip of ['Idle', 'Walk', 'Wave']) {
      p.play(clip);
      for (let sample = 0; sample < 12; sample++) {
        p.update(0.2); p.root.updateMatrixWorld(true);
        const b = new T.Box3().setFromObject(p.root, true), size = b.getSize(new T.Vector3());
        if (size.x > 1.8 || size.y > 2.3 || b.min.y < p.root.position.y - 0.2) poseProblems.push({ clip, size: size.toArray(), foot: b.min.y - p.root.position.y });
      }
      p.play('Idle');
    }
    const boxes = props.map(o => ({ name: o.name, min: new T.Box3().setFromObject(o).min.toArray(), max: new T.Box3().setFromObject(o).max.toArray() }));
    const lamp = world.interact.find(i => /Desk lamp/.test(i.label()));
    const before = world.lightAnchors.map(a => a.intensity); lamp.use();
    const toggled = world.lightAnchors.some((a, i) => a.intensity !== before[i]);
    lamp.use();
    const restored = world.lightAnchors.every((a, i) => a.intensity === before[i]);
    // The shaft must not contain a second stationary floor when the car leaves.
    __inn.teleport(7.75, 0, -2.6, 0, 0); player.pos.set(7.75, 1, -2.6);
    world.interact.find(i => /^Press 2/.test(i.label())).use();
    for (let step = 0; step < 180; step++) for (const u of world.updaters) u(0.05, step * 0.05, player);
    scene.updateMatrixWorld(true);
    const ray = new T.Raycaster(new T.Vector3(7.75, 1, -2.75), new T.Vector3(0, -1, 0), 0, 1.02);
    const groundHits = ray.intersectObjects(scene.children, true).filter(h => h.object.isMesh && h.object.material.side !== T.BackSide);
    const floor2 = world.elevator.floor;
    return { residents: residents.length, skinMeshes: skins.length, textured: skins.every(m => !!m.material.map), noProceduralPeople: residents.every(p => { let valid = true; p.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) valid = false; }); return valid; }), lampToggled: toggled, lampRestored: restored, elevatorReachedTwo: floor2 === 1, clearanceViolations, overlaps, poseProblems, shaftGroundHits: groundHits.map(h => ({ y: h.point.y, name: h.object.name })), boxes };
  });
  console.log(JSON.stringify({ repairs: report }, null, 1));
  assert.ok(report.residents >= 5 && report.textured && report.noProceduralPeople, 'Authored textured residents');
  assert.ok(report.lampToggled && report.lampRestored, 'Desk lamp switch');
  assert.ok(report.elevatorReachedTwo, 'Elevator travels to floor 2');
  assert.deepEqual(report.overlaps, [], 'Room fixtures do not interpenetrate');
  assert.deepEqual(report.poseProblems, [], 'Authored walk and greeting poses remain within human bounds');
  assert.deepEqual(report.clearanceViolations, [], 'Room furniture clears structural walls');
  assert.equal(report.shaftGroundHits.length, 0, 'No stationary slab through the elevator shaft');
}
// Scripted flow: check in, ride the elevator, open 212 with the key, lie down.
const flow = {};
const face = async (x, y, z, tx, tz) => { await page.evaluate(([x, y, z, tx, tz]) => __inn.teleport(x, y, z, Math.atan2(-(tx - x), -(tz - z)), 0), [x, y, z, tx, tz]); await page.waitForTimeout(1200); };
const press = async (expect = '') => { await page.waitForFunction(e => getComputedStyle(document.getElementById('prompt')).display !== 'none' && document.getElementById('prompt').textContent.includes(e), expect, { timeout: 30000 }).catch(async e => { throw new Error(`no "${expect}" prompt; showing "${await page.textContent('#prompt')}" at ${await page.evaluate(() => [__inn.player.x, __inn.player.z].map(v => v.toFixed(2)))}`); }); const seen = await page.textContent('#prompt'); await page.keyboard.press('e'); return seen; };
const walk = async (yaw, until, timeout = mode === 'flow' ? 30000 : 180000) => {
  await page.evaluate(y => __inn.controls.setLook(y, 0), yaw); await page.keyboard.down('w');
  try { await page.waitForFunction(until, null, { timeout, polling: 200 }); } finally { await page.keyboard.up('w'); }
  return page.evaluate(() => ({ x: +__inn.player.x.toFixed(2), y: +__inn.player.y.toFixed(2), z: +__inn.player.z.toFixed(2) }));
};
if (!mode || mode === 'flow') try {
  await face(-8.4, 0, -1.6, -8.4, -3.5); flow.deskPrompt = await press('Check in');
  await page.waitForFunction(() => __inn.game.has('key card'), null, { timeout: 40000 }); flow.key = true;
  await face(8.2, 0, 0.2, 8.75, -0.9); flow.callPrompt = await press('Call elevator');
  await page.waitForTimeout(2500);
  await face(7.9, 0, -2.6, 8.85, -1.45); await page.waitForTimeout(300);
  // the car's buttons are precise targets: look straight at "Press 2" on the real panel
  await page.evaluate(() => { const T = __inn.T ?? globalThis.THREE, it = __inn.world.interact.find(i => i.precise && /^Press 2/.test(i.label())), c = __inn.camera ?? __inn.game.camera();
    const p = it.pos.clone(); if (it.dynamicY) p.y = it.dynamicY(); const d = p.sub(c.position);
    __inn.controls.setLook(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z))); });
  await page.waitForTimeout(300);
  flow.panelPrompt = await press('Press 2');
  await page.waitForFunction(() => __inn.world.elevator.floor === 1 && __inn.world.elevator.doors > 0.95, null, { timeout: 240000 });
  flow.rodeTo = await page.evaluate(() => +__inn.player.y.toFixed(2));
  await page.evaluate(() => globalThis.__inn?.forceRender?.()); await page.screenshot({ path: `${out}/flow-elevator-up.png` });
  // walk out of the car to room 212 by holding keys
  flow.outOfCar = await walk(Math.PI, () => __inn.player.z > -0.3);
  await face(12.9, 3.2, 0.2, 12.9, 1); flow.doorPrompt = await press('key card');
  await page.waitForTimeout(1200);
  // Clear the wardrobe beside the entry before continuing into the bedroom.
  await walk(Math.PI, () => __inn.player.z > 1.6);
  await walk(-Math.PI / 2, () => __inn.player.x > 13.25);
  await walk(Math.PI, () => __inn.player.z > 3.5);
  flow.inRoom = await page.evaluate(() => ({ z: +__inn.player.z.toFixed(2), where: document.getElementById('where').textContent }));
  await page.evaluate(() => globalThis.__inn?.forceRender?.()); await page.screenshot({ path: `${out}/flow-in-room.png` });
  await face(13.5, 3.2, 6.6, 15.4, 6.6); flow.bedPrompt = await press('Lie down'); await page.waitForTimeout(500);
  flow.sleep = await page.evaluate(() => !document.getElementById('panel').hidden);
  await page.evaluate(() => globalThis.__inn?.forceRender?.()); await page.screenshot({ path: `${out}/flow-sleep.png` });
  await page.click('#morning'); await page.waitForTimeout(800);
  await face(-2.1, 0, -6.6, -2.1, -8.5); await page.evaluate(() => __inn.controls.setLook(0, -0.35));
  flow.wafflePrompt = await press('Make a waffle');
  await page.waitForFunction(() => __inn.game.has('waffle'), null, { timeout: 120000 }); flow.waffle = true;
  await page.evaluate(() => __inn.teleport(-2.2, 0, -4.5, 0, -0.12)); await page.waitForTimeout(1500);
  await page.evaluate(() => globalThis.__inn?.forceRender?.()); await page.screenshot({ path: `${out}/flow-breakfast.png` });
  // the stairs: walk up flight A and B
  await page.evaluate(() => __inn.teleport(10.1, 0, -1.5, 0, 0));
  flow.landing = await walk(0, () => __inn.player.z < -7.6);
  await page.evaluate(() => __inn.teleport(11.4, __inn.player.y, -7.6, Math.PI, 0));
  flow.stairsTop = await walk(Math.PI, () => __inn.player.z > 0);
} catch (e) { flow.failed = e.message.split('\n')[0]; flow.state = await page.evaluate(() => ({ ...__inn.world.elevator, p: [__inn.player.x, __inn.player.y, __inn.player.z] })); errors.push("flow: " + flow.failed); console.log(JSON.stringify(flow)); await writeFile(`${out}/check-${mode || 'all'}-failure.json`, JSON.stringify({ flow, errors }, null, 2)); await page.evaluate(() => globalThis.__inn?.forceRender?.()); await page.screenshot({ path: `${out}/flow-failure.png`, timeout: 120000 }).catch(() => errors.push("page unresponsive")); }
// Physics (physics.js): walking into a lobby armchair shoves it; the pool's wet-floor sign can be picked up and thrown.
if (mode === 'physics') try {
  const prop = (name, x, z) => page.evaluate(([name, x, z]) => { const l = __inn.physics.loose.find(l => l.o.name === name && Math.hypot(l.o.position.x - x, l.o.position.z - z) < 0.6); globalThis.__prop = l; return l ? l.o.position.toArray().map(v => +v.toFixed(2)) : null; }, [name, x, z]);
  const now = () => page.evaluate(() => __prop.o.position.toArray().map(v => +v.toFixed(2)));
  flow.physics = await page.evaluate(() => ({ loose: __inn.physics.loose.length, pinned: __inn.physics.pinned.length }));
  // Headless, the first frames (reflection captures) take ~15 s: wait until physics steps (its ray queries see the floor).
  await page.waitForFunction(() => { const V = __inn.camera.position.constructor; return !!__inn.physics.world.raycast(new V(4.05, 1, 6.92), new V(0, -1, 0), 2); }, null, { timeout: 180000 });
  // The reading lamp rests on its side table: slide the table and the lamp rides along, still on top.
  await page.evaluate(() => __inn.teleport(-8.6, 0, 2.2, 0, 0));
  await page.waitForFunction(() => __inn.physics.loose.some(x => x.o.name === 'ph-side-table-01' && Math.hypot(x.o.position.x + 10.25, x.o.position.z - 0.45) < 0.5), null, { timeout: 60000 });
  await page.waitForTimeout(1500);   // settle
  const lampRide = () => page.evaluate(() => { const near = n => __inn.physics.loose.filter(x => x.o.name === n).sort((a, b) => Math.hypot(a.o.position.x + 10.25, a.o.position.z - 0.45) - Math.hypot(b.o.position.x + 10.25, b.o.position.z - 0.45))[0].o, t = near('ph-side-table-01'), l = near('hotel-table-lamp').position; return { table: t.position.toArray().map(v => +v.toFixed(3)), lamp: l.toArray().map(v => +v.toFixed(3)) }; });
  flow.lampBefore = await lampRide();
  // A hand shoves it: a kinematic block against its side, ramping up to 0.2 m/s over its first 4 cm (physics
  // time: headless frames are slow), until the table has moved. Setting the table's own velocity every tick jerked it, not
  // like any push a person gives.
  await page.evaluate(async () => { const T = await import('/node_modules/three/build/three.module.js'); globalThis.__shove = (t, axis, far) => new Promise(done => {
    const { raw, rapier: R } = __inn.physics.world, b = new T.Box3().setFromObject(t.o);
    const at = { x: (b.min.x + b.max.x) / 2, y: Math.min(0.3, b.max.y - 0.08), z: (b.min.z + b.max.z) / 2 }; at[axis] = b.min[axis] - 0.065;
    const hand = raw.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setTranslation(at.x, at.y, at.z)); raw.createCollider(R.ColliderDesc.cuboid(0.06, 0.04, 0.06), hand);
    const from = t.o.position[axis], start = at[axis], end = performance.now() + 60000;
    const tick = setInterval(() => { const v = { x: 0, y: 0, z: 0 };
      if (t.o.position[axis] - from < far && performance.now() < end) { v[axis] = 0.2 * Math.min(1, 0.15 + (hand.translation()[axis] - start) / 0.04); return hand.setLinvel(v, true); }
      clearInterval(tick); raw.removeRigidBody(hand); done(); }, 16); }); });
  await page.evaluate(() => __shove(__inn.physics.loose.find(x => x.o.name === 'ph-side-table-01' && Math.hypot(x.o.position.x + 10.25, x.o.position.z - 0.45) < 0.5), 'z', 0.06));
  await page.waitForTimeout(1500);
  flow.lampAfter = await lampRide();
  await page.waitForTimeout(4000); flow.lampLater = await lampRide();   // woken, it settles and stays: before, its hull (mostly shade) rocked it off on its own
  const { lampBefore: a, lampAfter: b } = flow, moved = (p, q) => Math.hypot(q[0] - p[0], q[2] - p[2]);
  const offset = r => [r.lamp[0] - r.table[0], 0, r.lamp[2] - r.table[2]];
  assert.ok(moved(a.table, b.table) > 0.03, 'the side table should slide');
  assert.ok(Math.abs(b.table[1]) < 0.03 && b.lamp[1] > 0.45 && moved(offset(a), offset(b)) < 0.03, 'a nudged table stays upright and the lamp rides along on it, not floating where it was');
  assert.ok(Math.hypot(flow.lampLater.lamp[0] - b.lamp[0], flow.lampLater.lamp[2] - b.lamp[2]) < 0.01 && flow.lampLater.lamp[1] > 0.45, 'once woken, the lamp stays put on the table instead of rocking off');
  assert.ok(a.lamp[1] > 0.45 && Math.hypot(a.lamp[0] - a.table[0], a.lamp[2] - a.table[2]) < 0.15, 'the lamp should start on the table, near its middle');
  // Pick the table up and the lamp comes off it (it only rests there); then take the lamp and walk off: the plug pulls out.
  await face(-9.4, 0, 0.45, -10.25, 0.45); await page.evaluate(() => __inn.controls.setLook(__inn.controls.input.yaw, -1.05));   // at the table, below the lamp
  flow.tablePrompt = await press('side table'); await page.waitForTimeout(2500);
  flow.lampFell = await page.evaluate(() => { const l = __inn.physics.loose.find(x => x.o.name === 'hotel-table-lamp' && x.o.position.x < -8).o, t = __inn.physics.held.o; return { lampY: +l.position.y.toFixed(2), fromTable: +l.position.distanceTo(t.position).toFixed(2) }; });
  await page.keyboard.press('e'); await page.waitForTimeout(1500);   // put the table down
  assert.ok(flow.lampFell.fromTable > 0.5 && flow.lampFell.lampY < 0.2, 'picking up the side table should leave its lamp behind, not carry it');
  flow.throwSpeeds = await page.evaluate(async () => { const { throwSpeed } = await import('/projects/roadside-inn/physics.js'); return [0.15, 1.1, 6, 16].map(kg => +throwSpeed(kg).toFixed(2)); });
  assert.ok(flow.throwSpeeds[0] === flow.throwSpeeds[1] && flow.throwSpeeds[2] < flow.throwSpeeds[1] * 0.65 && flow.throwSpeeds[3] < flow.throwSpeeds[2], 'heavy things are thrown slower than a remote or a sign');
  flow.lampPrompt = await page.evaluate(() => { const l = __inn.physics.loose.find(x => x.o.name === 'hotel-table-lamp' && x.o.position.x < -8); __inn.teleport(l.o.position.x + 0.8, 0, l.o.position.z, Math.PI / 2, -0.9); return l.o.userData.loose.tether.at ? 'plugged' : 'unplugged'; });
  await page.waitForTimeout(800); await press('table lamp'); await page.waitForTimeout(300);
  await page.evaluate(() => __inn.teleport(-6.0, 0, 0.45, Math.PI / 2, 0)); await page.waitForTimeout(800);
  flow.yanked = await page.evaluate(() => __inn.physics.held?.o.userData.loose.tether.at === null);
  await page.keyboard.press('e'); await page.waitForTimeout(500);
  assert.ok(flow.lampPrompt === 'plugged' && flow.yanked, 'carrying the plugged-in lamp past its cord pulls the plug');
  // The lounge lamp, thrown hard while plugged in, is stopped by its cord.
  await face(2.25, 0, 7.6, 2.25, 8.4); await page.evaluate(() => __inn.controls.setLook(__inn.controls.input.yaw, -0.6));
  await press('table lamp'); await page.waitForTimeout(300);
  await page.evaluate(() => __inn.controls.setLook(Math.PI / 2, 0.3)); await page.waitForTimeout(300); await page.keyboard.press('q'); await page.waitForTimeout(3000);
  flow.thrownLamp = await page.evaluate(() => { const l = __inn.physics.loose.find(x => x.o.name === 'hotel-table-lamp' && x.o.position.x > -5).o, t = l.userData.loose.tether; return { plugged: !!t.at, reach: t.at ? +l.position.distanceTo(t.at).toFixed(2) : null }; });
  assert.ok(flow.thrownLamp.plugged && flow.thrownLamp.reach < 2.6, 'a thrown lamp stays on its cord');
  flow.chairFrom = await prop('hotel-lounge-chair-navy', 4.6, 4.15);
  // Walk until the chair has been pushed, not for a fixed time: headless frame rates vary a lot (the flow walks the same way).
  await face(4.6, 0, 2.6, 4.6, 4.15);
  flow.chairWalk = await walk(Math.PI, () => Math.hypot(__prop.o.position.x - 4.6, __prop.o.position.z - 4.15) > 0.25);
  flow.chairTo = await now();
  flow.walker = await page.evaluate(() => { const c = __inn.physics.me.controller, hits = []; for (let i = 0; i < c.numComputedCollisions(); i++) { const h = c.computedCollision(i), t = h?.collider.translation(); if (h) hits.push({ n: [h.normal1.x, h.normal1.y, h.normal1.z].map(v => +v.toFixed(2)), at: [t.x, t.y, t.z].map(v => +v.toFixed(2)), type: h.collider.parent()?.bodyType() }); } return { p: [__inn.player.x, __inn.player.y, __inn.player.z].map(v => +v.toFixed(2)), hits: hits.slice(0, 4) }; });
  await page.evaluate(() => __inn.forceRender()); await page.screenshot({ path: `${out}/physics-chair.png` });
  assert.ok(Math.hypot(flow.chairTo[0] - flow.chairFrom[0], flow.chairTo[2] - flow.chairFrom[2]) > 0.15, 'walking into the armchair should shove it');
  flow.signFrom = await prop('ph-wetfloorsign-01', -15.4, -4);
  await face(-15.4, 0, -3.0, -15.4, -4); await page.evaluate(() => __inn.controls.setLook(__inn.controls.input.yaw, -0.7));
  flow.pickPrompt = await press('Pick up'); await page.waitForTimeout(600);
  flow.held = await page.evaluate(() => __inn.physics.held?.o.name ?? null);
  assert.equal(flow.held, 'ph-wetfloorsign-01');
  await page.evaluate(() => __inn.controls.setLook(__inn.controls.input.yaw, 0.2)); await page.waitForTimeout(500);   // let the view turn
  flow.throwPrompt = await page.evaluate(() => document.getElementById('prompt').textContent); await page.keyboard.press('q'); await page.waitForTimeout(2000);   // E puts things down; Q throws
  flow.signTo = await now();
  await page.evaluate(() => { __inn.teleport(-15.4, 0, -2.2, 0, -0.35); }); await page.waitForTimeout(600);
  await page.evaluate(() => __inn.forceRender()); await page.screenshot({ path: `${out}/physics-throw.png` });
  assert.ok(Math.hypot(flow.signTo[0] - flow.signFrom[0], flow.signTo[2] - flow.signFrom[2]) > 1.5, 'a thrown sign should land well away');
  // It lands with a sound scaled by the hit; things too light or slow to hear make none.
  flow.signHits = await page.evaluate(() => (globalThis.__sounds ?? []).filter(([k, m, kg]) => k === 'impact' && Math.abs(kg - 1.1) < 0.01).map(([, m, kg, v]) => [m, +v.toFixed(2)]));
  flow.levels = await page.evaluate(async () => { const { impactLevel } = await import('/projects/roadside-inn/sound.js?real'); return { sign: impactLevel(1.1, 4), card: impactLevel(0.005, 0.5), pen: impactLevel(0.01, 0.4), cup: impactLevel(0.3, 3), chair: impactLevel(16, 1.5), far: impactLevel(1.1, 4, 10) }; });
  assert.ok(flow.signHits.some(([m, v]) => m === 'plastic' && v > 2), 'a thrown sign makes an impact sound as it lands, at the speed it hit');
  const L = flow.levels;
  assert.ok(L.card === 0 && L.pen === 0 && L.sign > L.cup && L.chair > L.sign && L.far < L.sign / 3, 'impacts scale with weight and speed and fade with distance; a card or pen settling is silent');
  // The lounge TV answers only to its remote: take it off the coffee table, then E at the set changes the channel.
  const tvChannel = () => page.evaluate(() => { const t = __inn.game.tvs.find(t => t.where === 'lounge').st; return t.on ? t.channel : -1; });
  await page.evaluate(() => __inn.teleport(3.45, 0, 6.92, -Math.PI / 2, -1.1)); await page.waitForTimeout(1200);
  flow.remotePrompt = await press('remote'); await page.waitForTimeout(400);
  flow.remoteHeld = await page.evaluate(() => __inn.physics.holding);
  await page.evaluate(() => __inn.teleport(5.3, 0, 6.7, -Math.PI / 2, 0.15)); await page.waitForTimeout(600);   // walked up to the set: its old anchor was behind you here
  flow.channelBefore = await tvChannel();
  flow.tvPrompt = await press('channel'); await page.waitForTimeout(400);
  flow.channelAfter = await tvChannel();
  assert.ok(/remote/.test(flow.remoteHeld ?? ''), 'the remote can be picked up');
  assert.equal(flow.channelAfter, flow.channelBefore + 1, 'with the remote in hand, E at the TV changes the channel');
  await page.keyboard.press('e'); await page.waitForTimeout(800);   // put the remote down
  // Shove the lounge coffee table: what rests on it (the remote, a newspaper, a cup) rides along, not floating or falling.
  await page.evaluate(() => __inn.teleport(3.0, 0, 5.6, 0, 0));
  flow.coffee = await page.evaluate(async () => { const f = n => __inn.physics.loose.find(l => l.o.name === n && l.o.position.x > 3 && l.o.position.z > 6 && l.o.position.y < 1), t = f('ph-coffee-table-round-01');
    const snap = () => ['hotel-newspaper', 'hotel-coffee-cup'].map(n => { const l = f(n); return l ? l.o.position.toArray().map(v => +v.toFixed(3)) : null; }), out = { before: snap(), table0: t.o.position.toArray() };
    await __shove(t, 'x', 0.08); await new Promise(r => setTimeout(r, 2500));
    return { ...out, after: snap(), table1: t.o.position.toArray() }; });
  assert.ok(flow.coffee.after.every((p, i) => p && p[1] > 0.4 && p[0] - flow.coffee.before[i][0] > 0.05), 'things on a shoved coffee table ride along on it');
  // People checks moved to their own mode: node check.mjs people (Cast).
} catch (e) { flow.failed = e.message.split('\n')[0]; errors.push('physics: ' + flow.failed); }
// Physics II (God, wave 1): throws through walls, stools that never sleep, the paper pile and reading, the elevator
// panel, plugs anywhere, and the save. Its own try, so a failure above doesn't hide these (and the other way round).
if (mode === 'physics') try {
  const g = flow.god = {};
  const take = (label, near) => page.evaluate(([label, near]) => { const P = __inn.physics, l = P.loose.filter(l => l.o.name === label && (!near || Math.hypot(l.o.position.x - near[0], l.o.position.z - near[1]) < near[2])).sort((a, b) => b.o.position.y - a.o.position.y)[0]; if (!l) return null; globalThis.__it = l; P.grab(l); return P.holding; }, [label, near]);
  const at = () => page.evaluate(() => __it.o.position.toArray().map(v => +v.toFixed(2)));
  const rested = (timeout = 60000) => page.waitForFunction(() => __it.b && (__it.b.body.isSleeping() || Math.hypot(...Object.values(__it.b.body.linvel())) < 0.02), null, { timeout, polling: 250 });
  // B5: held against the lobby's west wall (face x -11.905) and thrown at it, the remote used to be let go of inside the
  // wall and flew on into the pool hall. Now it's held short of the wall, bounces off and lands in the lobby, on the floor.
  g.remoteHeld = await take('hotel-tv-remote', [4.4, 6.5, 2]);
  await page.evaluate(() => __inn.teleport(-11.905 + 0.32, 0, 5.3, Math.PI / 2, 0.05)); await page.waitForTimeout(1200);
  g.remoteInHand = await at();
  await page.keyboard.press('q'); await page.waitForTimeout(500); await rested(); g.remoteLanded = await at();
  assert.ok(g.remoteHeld === 'tv remote' && g.remoteInHand[0] > -11.905 && g.remoteLanded[0] > -11.905 && g.remoteLanded[1] < 0.1, 'a remote thrown point-blank at a wall bounces back into the room and lands on the floor, not through the wall');
  // B6: a bar stool thrown so it lands on its side (seat and base rims) used to rock and roll for ever: it comes to rest.
  await page.evaluate(() => __inn.teleport(-2.2, 0, -4.2, 0, -0.5)); await page.waitForTimeout(800);
  g.stoolHeld = await take('hotel-bar-stool', [-2.2, -4.6, 1.5]);
  await page.evaluate(() => { __inn.teleport(-2.2, 0, 3.0, 0, 0.9); }); await page.waitForTimeout(800);
  await page.keyboard.press('q'); await page.waitForTimeout(1500);
  await page.waitForFunction(() => __it.b?.body.isSleeping(), null, { timeout: 30000, polling: 250 }).catch(() => {});
  g.stool = await page.evaluate(async () => { const T = await import('/node_modules/three/build/three.module.js'); const w = __it.b.body.angvel(); const v = __it.b.body.linvel(), touch = []; __inn.physics.world.raw.contactPairsWith(__it.b.collider, c => touch.push([c.parent()?.bodyType(), __inn.physics.world.byCollider.get(c.handle)?.object.name ?? c.handle])); return { v: +Math.hypot(v.x, v.y, v.z).toFixed(3), quiet: __it.b.quiet, slow: __it.b.slow, touch, asleep: __it.b.body.isSleeping(), spin: +Math.hypot(w.x, w.y, w.z).toFixed(3), up: +new T.Vector3(0, 1, 0).applyQuaternion(__it.o.quaternion).y.toFixed(2), at: __it.o.position.toArray().map(v => +v.toFixed(2)) }; });
  await page.waitForTimeout(3000); g.stoolLater = await at();
  assert.ok(g.stoolHeld === 'bar stool' && g.stool.spin < 0.05 && Math.hypot(g.stoolLater[0] - g.stool.at[0], g.stoolLater[2] - g.stool.at[2]) < 0.01, 'a thrown bar stool settles and stays still instead of rocking for ever');
  // The morning papers are separate copies: only the top one can be taken, the ones under it stay squared up, and a paper
  // in hand opens to its pages (masthead, local news, weather, classifieds), and can be put down from there.
  await page.evaluate(() => __inn.teleport(2.35, 0, -4.75, 0, -0.75)); await page.waitForTimeout(1500);
  g.pile = await page.evaluate(() => { const P = __inn.physics, pile = P.loose.filter(l => l.o.name === 'hotel-newspaper' && Math.hypot(l.o.position.x - 2.35, l.o.position.z + 5.4) < 0.1); return { n: pile.length, offered: __inn.world.interact.filter(i => i.label?.() === 'Pick up the newspaper' && i.when() && i.pos.distanceTo(pile[0].o.position) < 0.3).length, ys: pile.map(l => +l.o.position.y.toFixed(3)).sort() }; });
  g.paperHeld = await take('hotel-newspaper', [2.35, -5.4, 0.1]);
  g.edition = await page.evaluate(() => __it.o.userData.edition);
  await page.keyboard.press('e'); await page.waitForTimeout(400);
  g.front = await page.evaluate(() => document.getElementById('panelCard').textContent);
  await page.click('#nextPage'); await page.click('#nextPage'); g.classifieds = await page.evaluate(() => document.getElementById('panelCard').textContent);
  await page.click('#putDown'); await page.waitForTimeout(800);
  g.afterRead = await page.evaluate(() => ({ held: __inn.physics.holding, panel: !document.getElementById('panel').hidden, below: __inn.physics.loose.filter(l => l.o.name === 'hotel-newspaper' && Math.hypot(l.o.position.x - 2.35, l.o.position.z + 5.4) < 0.1).map(l => +l.o.position.y.toFixed(3)).sort() }));
  assert.ok(g.pile.n >= 6 && g.pile.offered === 1 && g.paperHeld === 'newspaper', 'the newspaper pile is separate papers, and only the top one is offered');
  assert.ok(/Courier-Ledger/.test(g.front) && /Section A: Local/.test(g.front) && /Classifieds/.test(g.classifieds) && /FOR SALE/.test(g.classifieds), 'a newspaper in hand opens to readable pages: local news, then on to the classifieds');
  assert.ok(g.afterRead.held === null && !g.afterRead.panel && g.afterRead.below.length === g.pile.n - 1 && g.afterRead.below.every((y, i) => Math.abs(y - g.pile.ys[i]) < 0.002), 'put down from the reader, and the papers under it never moved');
  // B7: the car's buttons light when pressed (a floor until the car gets there), door open and close work.
  await page.evaluate(() => __inn.teleport(7.75, 0, -2.9, 0, 0)); await page.waitForTimeout(800);
  const button = l => page.evaluate(l => { const e = __inn.world.elevator, i = __inn.world.interact.find(i => i.label?.() === l && (!/Call/.test(l) || i.pos.y < 2)); i.use(); return { open: e.open, lights: e.lights() }; }, l);
  g.opened = await button('Open doors'); await page.waitForTimeout(300);
  g.closed = await button('Close doors'); await page.waitForFunction(() => __inn.world.elevator.doors < 0.05, null, { timeout: 60000 });
  g.pressed = await button('Press 2');
  await page.waitForFunction(() => __inn.world.elevator.floor === 1 && !__inn.world.elevator.moving, null, { timeout: 240000 });
  g.arrived = await page.evaluate(() => __inn.world.elevator.lights());
  await page.waitForTimeout(6000); g.heldOpen = await page.evaluate(() => ({ doors: +__inn.world.elevator.doors.toFixed(2), y: +__inn.player.y.toFixed(2) }));   // still in the car: they wait for you
  g.hallCall = await button('Call elevator');
  assert.ok(g.opened.open && g.opened.lights.car.open, 'door open opens the doors and lights');
  assert.ok(!g.closed.open && g.closed.lights.car.close, 'door close shuts them now and lights');
  assert.ok(g.pressed.lights.car[2] && !g.arrived.car[2] && g.hallCall.lights.call[0], 'a floor button stays lit until the car arrives; a hall call button lights');
  assert.ok(g.heldOpen.y > 3 && g.heldOpen.doors > 0.9, 'arrived with you in the car, the doors stay open until you leave (no fixed 4 s dwell)');
  // Floor lamps have plugs too: unplug one in the lobby, carry it up to room 212 and plug it in by the bed: it lights.
  await page.evaluate(() => __inn.teleport(-11.3, 0, 3.35, Math.PI / 2, -0.85)); await page.waitForTimeout(1200);
  g.unplug = await press('Unplug the floor lamp'); await page.waitForTimeout(300);
  g.floorLamp = await page.evaluate(() => { const l = __inn.physics.loose.find(l => l.o.name === 'hotel-floor-lamp' && l.o.position.z < 5); globalThis.__it = l; return { plugged: !!l.o.userData.loose.tether.at }; });
  await face(-9.4, 0, 3.75, -10.35, 3.75); await page.evaluate(() => __inn.controls.setLook(__inn.controls.input.yaw, -0.6));
  g.lampPrompt = await press('Pick up the floor lamp');   // E at the lamp itself, as a player would
  await page.evaluate(() => __inn.teleport(15.8, 3.2, 4.5, -Math.PI / 2, -0.95)); await page.waitForTimeout(1500);
  g.plugIn = await press('Plug in the floor lamp'); await page.waitForTimeout(300);
  await page.keyboard.press('e'); await page.waitForTimeout(1500);   // set it down
  g.upstairs = await page.evaluate(() => ({ plugged: !!__it.o.userData.loose.tether.at, at: __it.o.position.toArray().map(v => +v.toFixed(2)), lit: __inn.world.lightAnchors.some(a => a.intensity > 0 && a.pos.y > 4 && a.pos.distanceTo(__it.o.position) < 1.6) }));
  assert.ok(!g.floorLamp.plugged && g.upstairs.plugged && g.upstairs.lit && g.upstairs.at[1] > 3, 'a floor lamp unplugs, carries upstairs and plugs into a free outlet in room 212, and lights there');
  // The save: what was moved and plugged, and where you are; storage failing must not break anything.
  g.save = await page.evaluate(() => { __inn.game.give('key card'); const ok = __inn.save(), s = __inn.store.get(); return { ok, bag: s.bag, moved: Object.keys(s.props.moved).length, lamp: s.props.moved[__it.o.userData.saveId]?.slice(0, 3), plugs: s.plugs, y: s.player[1] }; });
  g.noStorage = await page.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); }; try { return __inn.save(); } finally { Storage.prototype.setItem = set; } });
  assert.ok(g.save.ok && g.save.bag.includes('key card') && g.save.lamp && g.save.lamp[1] > 3 && g.save.plugs.some(i => i >= 0) && g.save.y > 3 && g.noStorage === false, 'the save holds the key card, the moved lamp upstairs, the plugs and the player; a full storage is ignored');
  // Continue: reload, and the start screen offers it; the lamp is upstairs where it was left, still plugged in, key in pocket.
  await page.reload(); await page.waitForFunction(() => globalThis.__inn, null, { timeout: 180000 });
  g.offered = await page.evaluate(() => !document.getElementById('continue').hidden);
  await page.click('#continue'); await page.waitForTimeout(1500);
  g.resumed = await page.evaluate(() => { const l = __inn.physics.loose.find(l => l.o.name === 'hotel-floor-lamp' && l.o.position.y > 3) ?? null; return { key: __inn.game.has('key card'), y: +__inn.player.y.toFixed(2), lamp: l && l.o.position.toArray().map(v => +v.toFixed(2)), plugged: !!l?.o.userData.loose.tether.at }; });
  assert.ok(g.offered && g.resumed.key && g.resumed.y > 3 && g.resumed.lamp && g.resumed.plugged, 'Continue after a reload: key card, where you stood, the lamp upstairs and plugged in');
} catch (e) { flow.godFailed = e.message.split('\n')[0]; errors.push('physics II: ' + flow.godFailed); }
// ---------- people (Cast: people.js, world/staff.js, intent.js): node projects/roadside-inn/check.mjs people ----------
// Bodies told apart and out of step, walk cycles in place and matched to speed, sitters on their seats (bones measured
// against the furniture), walkers that ease in, turn, step round you and each other without overlapping, residents
// choosing what to do, the trucker's coffee run, Dana in view.
if (mode === 'people') try {
  const frames = n => page.evaluate(n => new Promise(r => { const f = () => (n-- > 0 ? requestAnimationFrame(f) : r()); f(); }), n);
  await page.waitForFunction(() => __inn.world.walkers?.length >= 5, null, { timeout: 120000 });
  await page.evaluate(async () => { globalThis.__T = await import('/node_modules/three/build/three.module.js'); globalThis.__stops = list => list.map(s => ({ ...s, p: new __T.Vector3(...s.p) })); });
  flow.people = await page.evaluate(() => {
    const W = __inn.world.walkers, outfit = p => { let c = null; p.root.traverse(n => { if (n.isMesh && /Outfit/.test(n.name)) c = n.material.color.getHexString(); }); return c; };
    const andre = [W[1], W[2]].map(w => w.p), emmas = [W[0], W[4]].map(w => outfit(w.p));
    for (const p of andre) { p.play('Walk'); p.play('Idle'); }
    let apart = 0; for (let k = 0; k < 300; k++) { for (const p of andre) p.update(0.1); apart += Math.abs(andre[0].breath - andre[1].breath) / 300; }   // they don't breathe in step
    const phases = [0, apart];
    const p = W[3].p; p.play('Walk'); p.pace(0.6); const slow = p.clip.rate; p.pace(1.2); const fast = p.clip.rate;
    const hipZ = () => p.root.worldToLocal(p.bones.hips.getWorldPosition(new __T.Vector3())).z * p.root.scale.z;
    const zs = []; for (let k = 0; k <= 12; k++) { p.update(0.1); zs.push(hipZ()); }   // through the cross-fade and a cycle
    p.play('Idle'); for (let k = 0; k < 5; k++) p.update(0.1); zs.push(hipZ());
    return { emmas, phases, gait: W.map(w => +w.p.gait.toFixed(2)), slow, fast, hipTravel: +(Math.max(...zs) - Math.min(...zs)).toFixed(3), pinned: __inn.physics.pinned };
  });
  const P = flow.people;
  assert.ok(P.emmas[0] && P.emmas[1] && P.emmas[0] !== P.emmas[1], 'two guests on one model wear different colours (the tint reaches Outfit_original)');
  assert.ok(Math.abs(P.phases[0] - P.phases[1]) > 0.05, 'two people on one model idle out of step');
  assert.ok(P.gait.every(g => g > 0.7 && g < 1.8) && Math.abs(P.slow / P.fast - Math.SQRT1_2) < 0.02, 'the walk cycle\'s cadence follows the walk ratio (half the speed: 0.71x the cadence and a shorter step, not slow motion)');
  assert.ok(P.hipTravel < 0.25, 'the walk cycle walks on the spot: the hips stay over the body through a cycle and the Idle/Walk cross-fades (no walk-teleport)');
  // Sitters, measured from the bones against the furniture's own mesh (from the lobby, so its zone is shown).
  await page.evaluate(() => __inn.teleport(1, 0, -1, 0, 0)); await frames(5);
  flow.sitting = await page.evaluate(() => {
    const T = __T, V = () => new T.Vector3();
    return __inn.people.filter(p => p.posed === 'sit').map(p => {
      const B = p.bones, mine = o => { for (let q = o; q; q = q.parent) if (q === p.root) return true; return false; };
      const hip = B.thighs[0].getWorldPosition(V()).add(B.thighs[1].getWorldPosition(V())).multiplyScalar(0.5), meshes = [];
      __inn.scene.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !mine(o) && new T.Box3().setFromObject(o).distanceToPoint(hip) < 1.2) meshes.push(o); });
      const below = pt => new T.Raycaster(pt.clone().setY(pt.y + 0.02), new T.Vector3(0, -1, 0), 0, 3).intersectObjects(meshes, false)[0]?.point.y ?? 0;
      const seat = below(hip), feet = B.feet.map(f => f.getWorldPosition(V())), knees = B.knees.map(k => k.getWorldPosition(V())), hands = B.hands.map(h => h.getWorldPosition(V()));
      const toe = new T.Vector3(0, 0, 1).applyQuaternion(p.root.quaternion);
      const thighMid = [0, 1].map(i => B.thighs[i].getWorldPosition(V()).lerp(knees[i], 0.3));   // the part over the seat (a bar stool is 36 cm across)
      return {
        at: hip.toArray().map(v => +v.toFixed(2)), hipOverSeat: +(hip.y - seat).toFixed(3),
        feetOverSupport: feet.map(f => +(f.y - Math.max(below(f), below(f.clone().addScaledVector(toe, 0.07)))).toFixed(3)),   // under the ankle or the ball of the foot (a stool's ring is thin)
        thighOverSeat: Math.min(...thighMid.map(m => +(m.y - below(m)).toFixed(3))),
        handReach: Math.max(...hands.map(h => +Math.hypot(h.x - hip.x, h.z - hip.z).toFixed(3))),
        handToSurface: hands.map(h => +(h.y - below(h)).toFixed(3)),
        handToTarget: hands.map(h => (p.sitting.hands ?? []).length ? +Math.min(...p.sitting.hands.map(t => t.distanceTo(h))).toFixed(3) : null),
      };
    });
  });
  // From the player's eye: the three sitters.
  for (const [name, at] of Object.entries({ 'people-sofa': [4.6, 0, 6.6, Math.PI / 2, -0.2], 'people-sofa-side': [2.9, 0, 3.6, Math.PI, -0.15], 'people-stool': [-0.3, 0, -3.6, 1.05, -0.2], 'people-desk': [4.3, 0, -4.7, -2.3, -0.2], 'people-desk-2': [4.6, 0, -2.2, -0.6, -0.25], 'people-sofa-3': [3.6, 0, 8.4, 2.4, -0.25] })) {
    await page.evaluate(v => __inn.teleport(...v), at); await page.waitForTimeout(1500);
    await page.evaluate(() => __inn.forceRender()); await page.screenshot({ path: `${out}/${name}.png`, timeout: 180000 });
  }
  const S = flow.sitting;
  assert.ok(S.length === 3 && S.every(s => s.hipOverSeat > 0.03 && s.hipOverSeat < 0.11), 'seated guests\' hip joints sit just over the seat, not floating above it or sunk through it');
  assert.ok(S.every(s => s.feetOverSupport.every(y => y > 0.03 && y < 0.14)), 'seated guests\' feet rest on the floor or the stool\'s ring');
  assert.ok(S.every(s => s.thighOverSeat > 0.02), 'thighs lie along the seat, not through it');
  assert.ok(S.every(s => s.handToSurface.every((y, i) => (y > 0 && y < 0.15) || s.handToTarget[i] < 0.08)), 'hands rest on the lap, a keyboard, the table or the sofa back, not held out in the air');
  assert.ok(P.pinned.includes('hotel-bar-stool') && P.pinned.includes('hotel-task-chair'), 'the stool and chair under seated guests stay put');
  // ---- Cast 2026-11-21: stillness punctuated by discrete, motivated events (GAIT-AND-POSE.md, body.js) ----
  // Alone (you far away), seated people and Dana hold still: the head moves (> 5 deg/s) only in short gaze shifts, the
  // hips don't rock. Before this round the heads moved 38-69 % of the time (a standing idle under a seated pose).
  await page.evaluate(() => __inn.teleport(-3, 0, 12, 0, 0)); await frames(20);
  flow.still = await page.evaluate(() => {
    const T = __T, ppl = __inn.people.filter(p => p.posed === 'sit').concat([__inn.people[0]]), dt = 1 / 30;
    return ppl.map(p => {
      const fw = () => new T.Vector3(0, 0, 1).applyQuaternion(p.bones.head.getWorldQuaternion(new T.Quaternion())), hip = () => p.bones.hips.getWorldPosition(new T.Vector3());
      let prev = fw(), moving = 0, h0 = hip(), hmax = 0; const seen = {};
      for (let i = 0; i < 900; i++) { p.update(dt); const f = fw(); if (prev.angleTo(f) / dt > 5 * Math.PI / 180) moving++; prev = f; hmax = Math.max(hmax, hip().distanceTo(h0)); seen[p.focus.id] = (seen[p.focus.id] ?? 0) + 1 / 900; }
      return { who: p.root.userData.who ?? 'Dana', moving: +(moving / 900).toFixed(3), hips: +hmax.toFixed(3), task: +(seen.task ?? 0).toFixed(2) };
    });
  });
  assert.ok(flow.still.every(s => s.moving < 0.25), 'people at rest hold still: the head moves only in brief gaze shifts (< 25 % of the time)');
  assert.ok(flow.still.slice(0, 3).every(s => s.hips < 0.012), 'seated people don\'t rock: hips still within a centimetre (no standing idle under a seated pose)');
  assert.ok(flow.still.every(s => s.task > 0.55), 'people look at what they\'re doing most of the time (the TV, the phone, the screen, the monitor), not at nothing');
  // Gene (the sofa) notices you: come and stand by the sofa and he looks at you; a thrown thing landing behind him turns
  // his head to it (head first, within a few tenths of a second), his eyes ahead of his head.
  await page.evaluate(() => __inn.teleport(3.2, 0, 5.2, -0.6, 0)); await frames(5);
  flow.gene = await page.evaluate(() => { const g = __inn.people.filter(p => p.posed === 'sit')[0]; let looked = 0; for (let i = 0; i < 240; i++) { g.update(1 / 30); looked += g.focus.id === 'social' ? 1 / 240 : 0; } return { looked: +looked.toFixed(2) }; });
  await page.evaluate(() => __inn.teleport(-3, 0, 12, 0, 0)); await frames(5);
  flow.gene.noise = await page.evaluate(() => {
    const T = __T, g = __inn.people.filter(p => p.posed === 'sit')[0], at = new T.Vector3(3.0, 0.05, 4.4); __inn.game.hear(at, 20);   // a thing landing off to his left, behind the coffee table
    let t = 0; while (g.focus.id !== 'noise' && t < 1) { g.update(1 / 60); t += 1 / 60; }
    const eye0 = g.gazeState.eye, head0 = Math.abs(g.gazeState.head[0]); for (let i = 0; i < 40; i++) g.update(1 / 60);
    return { after: +t.toFixed(2), lead: g.focus.lead, eye0: +eye0.toFixed(2), eye1: +g.gazeState.eye.toFixed(2), head0: +head0.toFixed(2), head1: +Math.abs(g.gazeState.head[0]).toFixed(2) };
  });
  assert.ok(flow.gene.looked > 0.35, 'the sofa guest looks at you when you come and stand by him');
  assert.ok(flow.gene.noise.after < 0.4 && flow.gene.noise.lead === 'head' && flow.gene.noise.head1 > flow.gene.noise.head0 + 0.2 && flow.gene.noise.eye1 < flow.gene.noise.eye0, 'a noise turns the sofa guest\'s head to it within 0.4 s; the eyes get there first and re-centre as the head arrives');
  // He changes posture when he changes what he's doing (TV → phone): smoothly over ~2 s, and his hands end on the phone.
  flow.gene.posture = await page.evaluate(async () => {
    const T = __T, g = __inn.people.filter(p => p.posed === 'sit')[0], o = (await import('/projects/roadside-inn/world/staff.js')).castData().SITTERS[0].postures.phone;
    const hands = o.hands.map(h => new T.Vector3(...h)), gap = () => Math.max(...g.bones.hands.map(h => Math.min(...hands.map(t => t.distanceTo(h.getWorldPosition(new T.Vector3())))))), start = gap();
    g.pose('sit', { ...o, hands }); for (let i = 0; i < 15; i++) g.update(1 / 30); const mid = gap();
    for (let i = 0; i < 90; i++) g.update(1 / 30); return { start: +start.toFixed(3), mid: +mid.toFixed(3), end: +gap().toFixed(3) };
  });
  assert.ok(flow.gene.posture.mid > 0.1 * flow.gene.posture.start && flow.gene.posture.mid < flow.gene.posture.start && flow.gene.posture.end < 0.08, 'a posture change blends over a couple of seconds (no snap) and lands the hands on the phone');
  // Standing: two held stances from the authored idle, the hips over one foot then the other; weight shifts are rare.
  flow.stance = await page.evaluate(() => { const d = __inn.people[0]; return { stances: d.stances.map(t => +t.toFixed(2)), hold: +d.stanceState.left.toFixed(1) }; });
  assert.ok(flow.stance.stances.length === 2 && flow.stance.stances[0] !== flow.stance.stances[1], 'standing people hold one of two contrapposto stances, not a looping idle');
  // A slow walker (0.6 m/s) steps at the cadence of a slow walk and doesn't skate: the planted foot stays put.
  flow.slowWalk = await page.evaluate(() => {
    const T = __T, w = __inn.world.walkers[1], p = w.p, pos = p.root.position.clone(), dt = 1 / 60, v = 0.6;
    p.play('Walk'); p.pace(v); for (let i = 0; i < 30; i++) p.update(dt);
    let worst = 0, n = 0, slide = 0; const was = p.bones.feet.map(f => f.getWorldPosition(new T.Vector3()));
    for (let i = 0; i < 120; i++) {
      p.root.position.z += v * dt * Math.cos(p.root.rotation.y); p.root.position.x += v * dt * Math.sin(p.root.rotation.y); p.update(dt);
      const now = p.bones.feet.map(f => f.getWorldPosition(new T.Vector3())), low = now[0].y < now[1].y ? 0 : 1;
      if (Math.abs(now[0].y - now[1].y) > 0.03) { const sp = Math.hypot(now[low].x - was[low].x, now[low].z - was[low].z) / dt; slide += sp; n++; worst = Math.max(worst, sp); }
      was.forEach((x, k) => x.copy(now[k]));
    }
    p.root.position.copy(pos);
    return { rate: +p.clip.rate.toFixed(3), cadence: +(120 / 1.2 * p.clip.rate).toFixed(0), plantedSpeed: +(slide / Math.max(1, n)).toFixed(3) };
  });
  assert.ok(flow.slowWalk.plantedSpeed < 0.2, 'a slow walker\'s planted foot doesn\'t skate (shorter steps, not just slower ones)');
  // No bone drifts: procedural turns are applied on top of each frame's pose, never accumulated (REALISM, residents going
  // wild). 20 s of everyone going about their business; every bone quaternion stays unit length and every scale 1.
  flow.drift = await page.evaluate(() => { let q = 0, k = 0; for (let i = 0; i < 600; i++) for (const p of __inn.people) { p.update(1 / 30); if (i % 30 === 29) p.root.traverse(b => { if (b.isBone) { q = Math.max(q, Math.abs(b.quaternion.length() - 1)); k = Math.max(k, Math.abs(b.scale.x - 1), Math.abs(b.scale.y - 1)); } }); } return { q: +q.toExponential(2), scale: +k.toExponential(2) }; });
  assert.ok(flow.drift.q < 1e-3 && flow.drift.scale < 1e-3, 'no bone drifts over 20 s: quaternions stay unit length, scales stay 1');
  // Turning: a walker facing away from where it's going turns at most 3 rad/s, on the spot, not in one frame.
  await page.evaluate(() => { const w = __inn.world.walkers[0], at = w.p.root.position; w.hidden = false; w.wait = 0; w.v = 0; w.stops = __stops([{ p: [at.x + 3, at.y, at.z], wait: 2 }]); w.i = 0; w.yaw = -Math.PI / 2; globalThis.__turn = { w, y0: w.yaw, at: at.clone() }; });
  await frames(2);
  flow.turn = await page.evaluate(() => { const { w, y0, at } = __turn, d = Math.abs(Math.atan2(Math.sin(w.yaw - y0), Math.cos(w.yaw - y0))); return { turned: +d.toFixed(3), moved: +w.p.root.position.distanceTo(at).toFixed(3) }; });
  assert.ok(flow.turn.turned > 0 && flow.turn.turned < 0.35 && flow.turn.moved < 0.02, 'a walker turns round smoothly, on the spot, instead of snapping 180 degrees');
  // Starting off: a walker gathers pace over a step or two instead of jumping to full speed.
  await page.evaluate(() => { const w = __inn.world.walkers[3]; w.hidden = false; w.wait = 0; w.v = 0; w.p.root.position.set(3.8, 0, -4.4); w.stops = __stops([{ p: [3.8, 0, -0.9], wait: 3 }]); w.i = 0; w.yaw = 0; });
  await frames(2); flow.start = await page.evaluate(() => +__inn.world.walkers[3].v.toFixed(3));
  assert.ok(flow.start > 0 && flow.start < 0.9, 'a walker eases into its stride');
  // Stepping round: stand in the deck guest's way, a little to one side: it bends away from you instead of freezing.
  await page.evaluate(() => { const w = __inn.world.walkers[1]; w.hidden = false; w.wait = 0; w.v = 0.6; w.stops = __stops([{ p: [-22, 0, 3.5], wait: 3 }]); w.i = 0; w.p.root.position.set(-22, 0, -3); w.yaw = 0; __inn.teleport(-21.75, 0, -1.7, 0, 0); globalThis.__avoid = w; });
  await frames(12);
  flow.avoid = await page.evaluate(() => { const w = __avoid; return { z: +w.p.root.position.z.toFixed(3), yaw: +w.yaw.toFixed(3) }; });
  assert.ok(flow.avoid.z > -3 + 0.03 && flow.avoid.yaw < -0.03, 'a walker steps round a player in its way (bears away from them) instead of stopping dead');
  // Maria (with her cart) and Beth meet head on in the second-floor corridor: both keep right, nobody passes through
  // anybody or the cart, they stay inside the walls, and both get by.
  await page.evaluate(() => {
    const F = __inn.FLOOR2, [m, b] = [__inn.world.walkers[0], __inn.world.walkers[4]];
    for (const [w, x0, x1, yaw] of [[m, -6, 6, Math.PI / 2], [b, 4, -8, -Math.PI / 2]]) { w.hidden = false; w.wait = 0; w.v = w.speed; w.p.root.position.set(x0, F, 0); w.yaw = yaw; w.stops = __stops([{ p: [x1, F, 0], wait: 20 }]); w.i = 0; }
    m.cartAt.set(-4.8, F, 0); __inn.teleport(-10, 0, 20, 0, 0);
    globalThis.__meet = { m, b, gap: 9, cart: 9, zMax: 0 };
  });
  await page.evaluate(() => new Promise(r => { let n = 0; const f = () => { const { m, b } = __meet, mp = m.p.root.position, bp = b.p.root.position; __meet.gap = Math.min(__meet.gap, Math.hypot(mp.x - bp.x, mp.z - bp.z)); __meet.cart = Math.min(__meet.cart, Math.hypot(m.cartAt.x - bp.x, m.cartAt.z - bp.z)); __meet.zMax = Math.max(__meet.zMax, Math.abs(bp.z), Math.abs(mp.z), Math.abs(m.cartAt.z)); if (++n < 1500 && !(mp.x > 3 && bp.x < -5)) requestAnimationFrame(f); else r(); }; f(); }));
  flow.meet = await page.evaluate(() => { const { m, b, gap, cart, zMax } = __meet; return { gap: +gap.toFixed(2), cart: +cart.toFixed(2), zMax: +zMax.toFixed(2), maria: +m.p.root.position.x.toFixed(1), beth: +b.p.root.position.x.toFixed(1) }; });
  assert.ok(flow.meet.gap >= 0.55 && flow.meet.cart >= 0.75 && flow.meet.maria > 3 && flow.meet.beth < -5 && flow.meet.zMax < 0.65, 'two people meeting in the corridor keep right and pass without touching each other or the cart, inside the walls');
  // No walk-teleport: over a few seconds of everyone going about their business, no visible walker moves further in a
  // frame than walking pace allows.
  flow.steps = await page.evaluate(() => new Promise(r => { const W = __inn.world.walkers, last = W.map(w => w.p.root.position.clone()), shown = W.map(w => w.p.root.visible); let n = 0, worst = 0, t = performance.now(), dtMax = 0; const f = () => { const now = performance.now(); dtMax = Math.max(dtMax, (now - t) / 1000); t = now; W.forEach((w, i) => { const p = w.p.root.position; if (shown[i] && w.p.root.visible) worst = Math.max(worst, p.distanceTo(last[i])); last[i].copy(p); shown[i] = w.p.root.visible; }); if (++n < 240) requestAnimationFrame(f); else r({ worst: +worst.toFixed(3), dtMax: +dtMax.toFixed(3) }); }; f(); }));
  assert.ok(flow.steps.worst < 0.2, 'nobody jumps: no visible walker moves further in one frame than a walking step');
  // Residents choose: Ray picks between his coffee run, the vending machine and checking his rig, not one loop.
  flow.minds = await page.evaluate(() => { const w = __inn.world.walkers[3], seen = new Set(); for (let k = 0; k < 12; k++) { w.mind.next([2.6, 0, -7.5], 'dusk'); seen.add(w.mind.state.doing); w.mind.tick(120); } return { ray: [...seen], all: __inn.world.walkers.map(w => [w.r.id, w.mind.state.doing]) }; });
  assert.ok(flow.minds.ray.length >= 2 && flow.minds.all.every(([, d]) => d), 'residents have a reason for what they do next (an activity from their intent data), and it varies');
  // The trucker's coffee run: pours (cup in hand), walks off with it, waits at his door while you watch, goes in once
  // you've gone (nobody vanishes in front of you).
  await page.evaluate(() => { const w = __inn.world.walkers[3]; w.stops = __stops(w.mind.start('coffee-run', [2.6, 0, -7.55])); w.hidden = false; globalThis.__ray = w; });
  const ray = find => page.evaluate(find => { const w = __ray, i = w.stops.findIndex(s => find === 'cup' ? s.cup === true : s.hide); w.i = i; w.wait = 0; w.v = 0; w.hidden = false; w.p.root.position.copy(w.stops[i].p); return i; }, find);
  const rayState = () => page.evaluate(() => { const w = __ray; return { cup: w.cup.visible, shown: w.p.root.visible, clip: w.p.clip.name, pose: w.p.posed }; });
  await page.evaluate(() => __inn.teleport(-8, 0, 2, 0, 0));
  await ray('cup'); await frames(2); flow.pour = await rayState();
  await page.evaluate(() => { __ray.wait = 0.01; }); await frames(40); flow.carry = await rayState();
  await page.evaluate(() => __inn.teleport(21.4, 0, -0.5, 0, 0)); await ray('hide'); await frames(4); flow.watched = await rayState();
  await page.evaluate(() => __inn.teleport(8, 0, 0, 0, 0)); await frames(4); flow.away = await rayState();
  assert.ok(flow.pour.cup && flow.pour.pose === 'cup' && flow.carry.cup && flow.carry.clip === 'Walk', 'the trucker pours a coffee and walks off holding it');
  assert.ok(flow.watched.shown && !flow.away.shown, 'the trucker waits at his door while you watch and goes in once you\'ve gone');
  // Dana looks up at a guest at the desk, and from where they stand her face isn't behind the monitor.
  await page.evaluate(() => __inn.teleport(-8.4, 0, -1.6, 0, 0)); await frames(30);
  const danaLooks = await page.evaluate(() => new Promise(r => { let n = 0, sum = 0; const f = () => { sum += __inn.people[0].looking; if (++n < 90) requestAnimationFrame(f); else r(sum / n); }; f(); }));   // she looks at you most of the time, glancing at her screen
  flow.dana = await page.evaluate(() => {
    const T = __T, d = __inn.people[0], head = d.bones.head.getWorldPosition(new T.Vector3()), eye = new T.Vector3(-8.4, 1.62, -1.6);
    const near = []; __inn.scene.traverse(o => { if (o.isMesh && o.visible && !o.isInstancedMesh) { const b = new T.Box3().setFromObject(o); if (b.distanceToPoint(new T.Vector3(-8, 1.2, -3)) < 1.5) near.push(o); } });
    const hit = new T.Raycaster(eye, head.clone().sub(eye).normalize(), 0.1, eye.distanceTo(head) + 0.2).intersectObjects(near, false)[0];
    let mine = false; for (let o = hit?.object; o; o = o.parent) if (o === d.root) mine = true;
    return { seen: !hit || mine, first: hit?.object.name ?? null };
  });
  flow.dana.looking = +danaLooks.toFixed(2);
  assert.ok(flow.dana.looking > 0.5 && flow.dana.seen, 'Dana looks at a guest at the desk and her face is in view, not behind the monitor');
  // The walk graph and places run clear of solid furniture and walls (people walk the hotel, not through it).
  flow.graph = await page.evaluate(async () => {
    const { HOTEL } = (await import('/projects/roadside-inn/world/staff.js')).castData(), C = __inn.world.colliders.filter(c => !c.loose), bad = [];
    const hit = (x, y, z) => C.find(c => x > c.x0 - 0.25 && x < c.x1 + 0.25 && z > c.z0 - 0.25 && z < c.z1 + 0.25 && y + 1.5 > c.y0 && y + 0.2 < c.y1);
    const box = c => [c.x0, c.x1, c.z0, c.z1].map(v => +v.toFixed(2));
    for (const [a, b] of HOTEL.edges) { const A = HOTEL.nodes[a], B = HOTEL.nodes[b]; for (let k = 0; k <= 20; k++) { const f = k / 20, h = hit(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f); if (h) { bad.push([a + '-' + b, box(h)]); break; } } }
    for (const [id, pl] of Object.entries(HOTEL.places)) { const h = hit(...pl.p); if (!HOTEL.nodes[pl.node] || h) bad.push([id, h && box(h)]); }
    return bad;
  });
  assert.deepEqual(flow.graph, [], 'the walk graph and places are clear of solid furniture and walls');
} catch (e) { flow.failed = e.message.split('\n')[0]; errors.push('people: ' + flow.failed); }
if (mode === 'mobile' || !mode) {
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  phone.on('pageerror', e => errors.push('mobile: ' + e));
  await phone.goto(`http://localhost:${port}/projects/roadside-inn/index.html`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await phone.waitForFunction(() => globalThis.__inn, null, { timeout: 180000 });
  await phone.evaluate(() => __inn.begin());
  const profile = await phone.evaluate(() => ({ ...__inn.quality, shadows: __inn.renderer.shadowMap.enabled, ratio: __inn.renderer.getPixelRatio() }));
  flow.mobileProfile = profile;
  if (!profile.economy || profile.fps !== 30 || profile.shadows || profile.ratio > 1) errors.push('mobile: battery profile not selected automatically');
  const before = await phone.evaluate(() => __inn.player.z);
  const box = await phone.locator('#stick').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const cdp = await phone.context().newCDPSession(phone);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - 50 }] });
  await phone.waitForFunction(z => __inn.player.z < z - 1, before, { timeout: 120000 }).catch(() => errors.push('mobile: joystick did not move the player'));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  flow.mobileMoved = +(before - await phone.evaluate(() => __inn.player.z)).toFixed(2);
  await phone.evaluate(() => { const render = __inn.renderer.render.bind(__inn.renderer); __inn.renderer.render = () => {}; globalThis.__renderAudit ? globalThis.__renderAudit() : render(__inn.scene, __inn.camera); });
  await phone.screenshot({ path: `${out}/mobile.png`, timeout: 180000 });
  await phone.close();
}
// Lint: what a set dresser would catch walking the building. Every placed model (assets.js marks them hotelProp) against
// every other, the doors' swings and the floor; and every model whose kind (kinds.js) needs something it hasn't got
// (a lamp placed without put(): no cord). A list to review, ranked: some overlaps are meant (a chair tucked under a table).
let lint = null;
if (mode === 'lint') {
  await page.waitForTimeout(1500);   // a few frames: lamps plug in, things settle
  lint = await page.evaluate(async () => {
    const { KIND_OF, KINDS } = await import('/projects/roadside-inn/kinds.js');
    const out = { overlaps: [], doors: [], sunk: [], kinds: [] };
    const props = [];
    const box = o => { const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }; o.updateMatrixWorld(true);
      o.traverse(n => { if (!n.isMesh || !n.visible) return; n.geometry.computeBoundingBox(); const g = n.geometry.boundingBox;
        for (const x of [g.min.x, g.max.x]) for (const y of [g.min.y, g.max.y]) for (const z of [g.min.z, g.max.z]) { const v = { x, y, z }; const e = n.matrixWorld.elements, w = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; for (let k = 0; k < 3; k++) { b.min[k] = Math.min(b.min[k], w[k]); b.max[k] = Math.max(b.max[k], w[k]); } } });
      return b.min[0] === Infinity ? null : b; };
    __inn.scene.traverse(o => { if (!o.userData.hotelProp) return; for (let p = o.parent; p; p = p.parent) if (p.userData.hotelProp) return; if (/rug|carpet|mat$/i.test(o.name)) return; const b = box(o); if (b) props.push({ o, name: o.name, b, at: o.position.toArray().map(v => +v.toFixed(2)) }); });
    const pen = (a, b) => [0, 1, 2].map(k => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]));
    for (let i = 0; i < props.length; i++) for (let j = i + 1; j < props.length; j++) {
      const a = props[i], b = props[j], d = pen(a.b, b.b);
      if (d.some(v => v < 0.04)) continue;
      if (Math.abs(a.b.min[1] - b.b.max[1]) < 0.05 || Math.abs(b.b.min[1] - a.b.max[1]) < 0.05) continue;   // one stands on the other
      out.overlaps.push({ a: a.name, at: a.at, b: b.name, bAt: b.at, cm: d.map(v => Math.round(v * 100)), vol: +(d[0] * d[1] * d[2] * 1000).toFixed(1) });
    }
    out.overlaps.sort((x, y) => y.vol - x.vol);
    // doors: a collider that comes and goes (on()) is a door leaf; its swing reaches its width either side of it
    for (const c of __inn.world.colliders) {
      if (!c.on) continue;
      const w = Math.max(c.x1 - c.x0, c.z1 - c.z0), thinX = c.x1 - c.x0 < c.z1 - c.z0;
      const s = { min: [c.x0 - (thinX ? w : 0.05), c.y0, c.z0 - (thinX ? 0.05 : w)], max: [c.x1 + (thinX ? w : 0.05), c.y1, c.z1 + (thinX ? 0.05 : w)] };
      for (const p of props) { const d = pen(s, p.b); if (d.every(v => v > 0.02) && p.b.min[1] > c.y0 + 0.1 && p.b.max[1] - p.b.min[1] < 2.5) out.doors.push({ door: [+((c.x0 + c.x1) / 2).toFixed(2), +c.y0.toFixed(2), +((c.z0 + c.z1) / 2).toFixed(2)], prop: p.name, at: p.at }); }
    }
    for (const p of props) { const floor = p.b.min[1] > 2.6 ? __inn.FLOOR2 : 0; if (p.b.min[1] < floor - 0.03 && p.b.max[1] > floor) out.sunk.push({ prop: p.name, at: p.at, cm: Math.round((floor - p.b.min[1]) * 100) }); }
    // kinds: a model of a kind placed without put() is missing what its kind gives (a lamp without a cord)
    __inn.scene.traverse(o => { const k = KIND_OF[o.name]; if (k && o.userData.hotelProp && !o.userData.thing) out.kinds.push({ prop: o.name, kind: k, at: o.position.toArray().map(v => +v.toFixed(2)), missing: Object.keys(KINDS[k]).filter(t => t !== 'noun') }); });
    // what's where, for the space diff (pipeline/diff.mjs): every placed model and every zone
    out.props = props.map(p => ({ name: p.name, at: p.at, kind: KIND_OF[p.name] ?? null }));
    out.zones = __inn.world.zones.map(z => ({ name: z.id ?? z.name, box: [z.x0, z.x1, z.y0, z.y1, z.z0, z.z1] }));
    return out;
  });
  console.log(JSON.stringify({ overlaps: lint.overlaps.length, doors: lint.doors.length, sunk: lint.sunk.length, kinds: lint.kinds.length }));
}
if (process.env.TV) {   // turn the room TV on and photograph it (checks the screen's UVs)
  await page.evaluate(() => { __inn.teleport(13.9, 3.2, 6.4, 1.57, 0.05); const tv = __inn.world.interact.find(i => /TV on/.test(i.label()) && i.pos.y > 3 && i.pos.x < 14); tv.use(); tv.use(); });
  await page.waitForTimeout(3000); await page.evaluate(() => globalThis.__inn?.forceRender?.()); await page.screenshot({ path: `${out}/tv-room.png`, timeout: 180000 });
}
if (mode === 'profile') {
  console.log(JSON.stringify(await page.evaluate(() => {
    const by = {};
    __inn.scene.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry, tris = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      let top = o; while (top.parent && top.parent !== __inn.scene) top = top.parent;
      const key = (o.material.name || top.name || o.geometry.type).replace(/_.*/, '').slice(0, 30);
      by[key] = by[key] || [0, 0]; by[key][0] += tris; by[key][1]++;
    });
    return Object.entries(by).sort((a, b) => b[1][0] - a[1][0]).slice(0, 25).map(([k, [t, n]]) => `${k}: ${Math.round(t / 1000)}k tris, ${n} meshes`);
  }), null, 1));
}
const result = { flow, lint, errors, shots: Object.keys(views).length, stats: mode === 'mobile' ? null : await page.evaluate(() => ({ colliders: __inn.world.colliders.length, interact: __inn.world.interact.length, drawCalls: __inn.renderer.info.render.calls, textures: __inn.renderer.info.memory.textures, programs: __inn.renderer.info.programs.length, triangles: __inn.renderer.info.render.triangles })) };
await writeFile(`${out}/check-${mode?.startsWith("{") ? "views" : mode || 'all'}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 1));
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
