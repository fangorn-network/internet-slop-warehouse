// Browser smoke check: loads the hotel, walks key viewpoints, saves screenshots, fails on console errors.
// PLAYWRIGHT_MODULE=/tmp/warehouse-validation/node_modules/playwright-core/index.mjs node projects/roadside-inn/check.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, relative } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? new URL('./.validation/node_modules/playwright-core/index.mjs', import.meta.url).href);
const mode = process.argv[2];
const root = resolve(import.meta.dirname, '../..'), out = resolve(root, 'artifacts/roadside-inn');
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png' };
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
if (mode === 'flow' || mode === 'mobile' || mode === 'physics') {
  await page.context().route('**/main.js', async route => {
    let source = await readFile(resolve(root, 'projects/roadside-inn/main.js'), 'utf8');
    source = source.replace('await renderer.compileAsync(scene, camera);', 'globalThis.__renderAudit = () => renderer.render(scene, camera);');
    source = source.replace('renderer.render(scene, camera);\n  requestAnimationFrame', 'renderer.render(scene, camera);\n  requestAnimationFrame');
    // Only replace the loop call; the renderAudit callback retains the real renderer.
    source = source.replace('  renderer.render(scene, camera);', '  /* Real rendering is covered by the visual audit. */');
    await route.fulfill({ contentType: 'text/javascript', body: source });
  });
  await page.context().route('**/sound.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const createSound = () => new Proxy({ start: async () => {}, toggleMute: () => true }, { get: (o, k) => o[k] || (() => {}) });' }));
}
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
if (mode !== 'mobile') {
  await page.goto(`http://localhost:${port}/projects/roadside-inn/index.html${process.env.FULL ? '' : '?quality=low'}`);
  await page.waitForFunction(() => globalThis.__inn, null, { timeout: 180000 });
  if (mode === 'flow' || mode === 'physics') await page.evaluate(() => {
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
const views = mode === 'repairs' ? repairViews : ['flow', 'profile', 'mobile', 'physics'].includes(mode) ? {} : (mode ? JSON.parse(mode) : null) ?? {
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
const press = async (expect = '') => { await page.waitForFunction(e => getComputedStyle(document.getElementById('prompt')).display !== 'none' && document.getElementById('prompt').textContent.includes(e), expect, { timeout: 30000 }); const seen = await page.textContent('#prompt'); await page.keyboard.press('e'); return seen; };
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
  flow.throwPrompt = await press('Throw'); await page.waitForTimeout(2000);
  flow.signTo = await now();
  await page.evaluate(() => { __inn.teleport(-15.4, 0, -2.2, 0, -0.35); }); await page.waitForTimeout(600);
  await page.evaluate(() => __inn.forceRender()); await page.screenshot({ path: `${out}/physics-throw.png` });
  assert.ok(Math.hypot(flow.signTo[0] - flow.signFrom[0], flow.signTo[2] - flow.signFrom[2]) > 1.5, 'a thrown sign should land well away');
} catch (e) { flow.failed = e.message.split('\n')[0]; errors.push('physics: ' + flow.failed); }
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
const result = { flow, errors, shots: Object.keys(views).length, stats: mode === 'mobile' ? null : await page.evaluate(() => ({ colliders: __inn.world.colliders.length, interact: __inn.world.interact.length, drawCalls: __inn.renderer.info.render.calls, textures: __inn.renderer.info.memory.textures, programs: __inn.renderer.info.programs.length, triangles: __inn.renderer.info.render.triangles })) };
await writeFile(`${out}/check-${mode?.startsWith("{") ? "views" : mode || 'all'}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 1));
await browser.close(); server.close();
process.exit(errors.length ? 1 : 0);
