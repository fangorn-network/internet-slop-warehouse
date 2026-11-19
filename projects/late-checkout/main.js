// SPDX-License-Identifier: CC0-1.0
// Late Checkout: a remix of Heartland Inn Express (projects/roadside-inn). The hotel, its assets and fixtures are
// loaded unchanged from the heartland-hotel part when packaged; this file runs the player, the HUD and the acts. Forked from roadside-inn/main.js.
import * as T from 'three';
import { attach as attachInput } from '../roadside-inn/input.js';
import { loadLibrary } from '../roadside-inn/assets.js';
import { buildWorld, FLOOR2 } from '../roadside-inn/world.js';
import { createSound } from '../roadside-inn/sound.js';
import { quality } from '../roadside-inn/quality.js';
import { createPlayer, RADIUS, EYE } from '../roadside-inn/player.js';
import { attach as zoneCulling } from '../../parts/zone-culling.js';
import { createDream } from '../roadside-inn/stage/dream.js';
import { createDirector } from '../roadside-inn/stage/director.js';
import { arrival } from './acts/arrival.js';
import { night, prepareNight } from './acts/night.js';
import { generateNight } from './run/case.js';
import { createRun } from './run/run.js';
import { seedFromUrl } from './run/rng.js';
import { at } from './run/clock.js';
import { register } from './run/register.js';
import { SPOTS } from './run/spots.js';
import { createSfx } from './sfx.js';
import { createTasks } from './stage/tasks.js';

const $ = id => document.getElementById(id);
const canvas = $('world');
const renderer = new T.WebGLRenderer({ canvas, antialias: !quality.economy, powerPreference: 'low-power' });
const LOW = quality.economy;
renderer.setPixelRatio(quality.pixelRatio);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = !LOW;
renderer.shadowMap.type = T.PCFSoftShadowMap;

const scene = new T.Scene();
scene.fog = new T.Fog('#c8cfd2', 180, 760);
const camera = new T.PerspectiveCamera(70, 1, 0.1, 900);
camera.rotation.order = 'YXZ';
const hemi = new T.HemisphereLight('#dfe8ef', '#5d5a4c', 0.35);
scene.add(hemi);
const sun = new T.DirectionalLight('#ffd7a8', 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const lamps = Array.from({ length: quality.lights }, () => { const l = new T.PointLight('#fff', 0, 8, 2); scene.add(l); return l; });
const fx = createDream(renderer, { economy: LOW });

function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); fx.resize(); }
addEventListener('resize', resize); resize();

// ---------- game state shared with the world ----------
let bag = ['car keys'];
let wallet = 725, sayTimer = 0, busy = false, started = false, panelOpen = false;
const game = {
  tvs: [], traffic: [],
  has: item => bag.includes(item),
  give(item) { bag.push(item); renderPocket(); },
  take(item) { const i = bag.indexOf(item); if (i >= 0) bag.splice(i, 1); renderPocket(); },
  say(text, seconds = Math.max(3, text.length / 14)) { $('say').textContent = text; $('say').classList.add('on'); sayTimer = seconds; },
  sound: null,
  event(name) {
    if (name === 'room-open' && !game.has('room-found')) { bag.push('room-found'); tasks.done('room'); tasks.add('plan', 'Read the fire evacuation plan on the door'); tasks.add('sleep', 'Get some sleep'); }
    if (name === 'sleep') sleep();
    if (name === 'fire-plan') { run.readPlan = true; tasks.done('plan');
      openPanel(`<h2>Fire evacuation plan</h2><img alt="Floor 2 evacuation plan: exit by stair A" style="width:100%;border-radius:4px" src="${world.room.plan.image.toDataURL()}"><button id="closePanel">Close</button>`); }
  },
  checkIn, vend,
};
const tasks = createTasks($('tasks'));
const setGoal = () => {};   // superseded by the task list (ctx.tasks)
function renderPocket() {
  $('wallet').textContent = '$' + (wallet / 100).toFixed(2);
  $('bag').innerHTML = bag.filter(i => i !== 'room-found').map(i => `<li>${i}</li>`).join('');
}

// ---------- loading ----------
// stream: decorative props arrive after the first frame, nearest first (see roadside-inn/assets.js).
const lib = await loadLibrary(p => ($('progress').style.width = Math.round(p * 100) + '%'), { stream: true });   // the hotel's library includes the travel stop
const sunOffset = new T.Vector3();
const LOOKS = {
  dusk: { sky: 'dusk', sun: '#ffb27a', sunI: 1.5, minEl: 0.1, bg: 1.0, env: 0.32, envIndoor: 0.5, hemi: 0.12, fog: '#7e869a', exposure: 1.05, lot: true },
  day: { sky: 'day', sun: '#fff1dc', sunI: 2.6, minEl: 0.55, bg: 0.85, env: 0.55, envIndoor: 0.8, hemi: 0.35, fog: '#c8cfd2', exposure: 0.95, lot: false },
  // Night: the dusk sky almost gone (a faint bruise at the horizon), no sun, the lot lights carrying everything.
  night: { sky: 'dusk', sun: '#8aa0c8', sunI: 0, minEl: 0.1, bg: 0.035, env: 0.05, envIndoor: 0.3, hemi: 0.025, fog: '#06080d', exposure: 1.0, lot: true },
};
let look = 'dusk';
function applyLook(name) {
  const L = LOOKS[name], sky = lib.skies[L.sky];
  look = name;
  scene.background = sky; scene.environment = sky.env;
  scene.backgroundIntensity = L.bg; scene.environmentIntensity = L.env;
  sun.color.set(L.sun); sun.intensity = L.sunI; hemi.intensity = L.hemi;
  scene.fog.color.set(L.fog); renderer.toneMappingExposure = L.exposure;
  const d = sky.sunDirection.clone();
  const el = Math.max(L.minEl, Math.asin(d.y));
  d.y = 0; d.normalize().multiplyScalar(Math.cos(el)); d.y = Math.sin(el);
  sunOffset.copy(d).multiplyScalar(120);
  world?.setTimeOfDay?.(L.lot ? 'dusk' : 'day');
}
let world;
applyLook('dusk');
const sound = createSound(lib.foley);
game.sound = sound;
world = buildWorld(scene, lib, game);   // the Heartland, travel stop included
const zones = zoneCulling(scene, { zones: world.zones, sees: world.sees });   // don't draw wings you can't see
// The Heartland's player (roadside-inn/player.js): physics when Rapier loads, the old walker when it doesn't.
const walker = await createPlayer(scene, world, { sound });
applyLook('dusk');
const detailProps = [];
let detailClock = 0, streamClock = 0;
const detailPosition = new T.Vector3();

// ---------- player ----------
const player = walker.player, currentZone = walker.zone;
const controls = attachInput(canvas, { onUse: use, onInspect: use, onMenu: closePanel });
controls.setLook(world.spawn.yaw, 0);

// Shared with the acts. view: when set, the camera looks from there instead of the player's eyes ({ pos, yaw, pitch, fov }).
const ctx = {
  scene, world, lib, game, player, controls, camera, renderer, fx, sound, FLOOR2, quality, THREE: T,
  view: null,
  applyLook, setGoal, tasks, openPanel, closePanel, say: game.say,
  teleport(x, y, z, yaw = 0, pitch = 0) { Object.assign(player, { x, y, z, vy: 0 }); controls.setLook(yaw, pitch); },
  reset() { bag = ['car keys']; wallet = 725; renderPocket(); },
  faint,
  get busy() { return busy; }, set busy(v) { busy = v; },
  deaths: 0,
};
prepareNight(ctx);
// One night, from a seed (?seed=48213 replays it). ?pace=N: real seconds per game minute (default 2.5).
const plan = generateNight(seedFromUrl());
const run = ctx.run = createRun(ctx, plan, { secondsPerMinute: Number(new URLSearchParams(location.search).get('pace')) || 2.5 });
const sfx = ctx.sfx = createSfx(ctx, run);
const director = createDirector({ fx, ctx, acts: { arrival, night } });
ctx.director = director;

scene.traverse(o => { if (o.userData.hotelProp) detailProps.push(o); });
// Compile every shader now (both reflection maps share a size, so later swaps never recompile).
await renderer.compileAsync(scene, camera);
$('loading').hidden = true; $('start').hidden = false;
renderPocket();


// ---------- interaction ----------
let focus = null;
const view = new T.Vector3(), to = new T.Vector3();
function pick() {
  camera.getWorldDirection(view);
  let best = null, bestScore = Infinity;
  for (const it of world.interact) {
    if (it.when && !it.when(player)) continue;
    to.copy(it.pos); if (it.dynamicY) to.y = it.dynamicY();
    if (Math.abs(to.y - camera.position.y) > 1.7) continue;
    to.sub(camera.position);
    const d = to.length();
    if (d > it.r + 0.6) continue;
    const facing = to.normalize().dot(view);
    if (facing < 0.55) continue;
    const score = d - facing * 1.5 - (it.priority ?? 0);
    if (score < bestScore) { bestScore = score; best = it; }
  }
  return best;
}
function use() {
  if (!started || panelOpen) return;
  if (ctx.view?.onUse) return ctx.view.onUse();
  if (busy) return;
  if (walker.use()) return;   // threw what you were carrying
  focus?.use();
}

// ---------- front desk ----------
function checkIn(clerk) {
  if (busy) return;
  if (run.phase === 'night') return run.askClerk(clerk);
  clerk.root.lookAt(player.x, 0, player.z);
  if (game.has('key card')) {
    const lines = ['“Everything okay with the room? Holler if you need anything.”', '“Checkout’s at eleven. Nobody’s ever late.”', '“Ice machine’s on two, right across from the elevator.”', '“Quiet night. It’s always a quiet night.”'];
    clerk.play('Wave'); setTimeout(() => clerk.play('Idle'), 1800);
    return game.say('Dana: ' + lines[Math.floor(Math.random() * lines.length)]);
  }
  busy = true;
  const again = ctx.deaths > 0;
  const script = [
    ['Wave', again ? 'Dana: “Evening! Welcome to the Heartland Inn. …Have we met?”' : 'Dana: “Evening! Welcome to the Heartland Inn. Checking in?”'],
    ['Interact', 'Dana: “Let me pull that up… there you are. One king, non-smoking.”'],
    ['Idle', 'Dana: “Huh. It doesn’t say how many nights. That’s fine. It happens.”'],
    ['Interact', 'Dana: “You’re in 212, second floor. Elevator’s just down the hall past the lounge, stairs right beside it.”'],
    ['Wave', 'Dana: “Here’s your key. Get some sleep. You look like you’ve been driving a long time.”'],
  ];
  script.forEach(([anim, text], i) => setTimeout(() => {
    clerk.play(anim); game.say(text, 3.6);
    if (i === script.length - 1) {
      game.give('key card'); sound.beep(true);
      tasks.done('checkin'); tasks.add('room', 'Find room 212: second floor, past the lounge');
      setTimeout(() => { clerk.play('Idle'); busy = false; }, 1500);
    }
  }, i * 3700));
}

// ---------- vending ----------
const SNACKS = [['Potato chips', 175], ['Pretzels', 150], ['Candy bar', 125], ['Peanut butter crackers', 100], ['Trail mix', 200], ['Spearmint gum', 100]];
const DRINKS = [['Cola', 200], ['Bottled water', 175], ['Root beer', 200], ['Sweet tea', 225], ['Lemon-lime soda', 200], ['Sports drink', 250]];
function vend(kind = 'snacks') {
  const items = kind === 'drinks' ? DRINKS : SNACKS;
  openPanel(`<h2>${kind === 'drinks' ? 'Cold Drinks' : 'Snacks'}</h2><p>You have <b>$${(wallet / 100).toFixed(2)}</b> in quarters and crumpled ones.</p>
    <div class="grid">${items.map(([n, c], i) => `<button data-i="${i}" ${c > wallet ? 'disabled' : ''}>${n}<small>$${(c / 100).toFixed(2)}</small></button>`).join('')}</div>
    <button class="ghost" id="closePanel">Walk away</button>`);
  $('panelCard').querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
    const [name, cost] = items[b.dataset.i];
    wallet -= cost; closePanel(); sound.vend(); run.onVend(name);
    setTimeout(() => { game.give(name.toLowerCase()); game.say(kind === 'drinks' ? `A ${name.toLowerCase()} thunks down into the tray. Ice cold.` : `The coil turns… and the ${name.toLowerCase()} drops.`); }, 1200);
  });
}
function openPanel(html) {
  panelOpen = true; $('panelCard').innerHTML = html; $('panel').hidden = false; controls.clear();
  document.exitPointerLock?.();
  $('closePanel')?.addEventListener('click', closePanel);
}
function closePanel() {
  if (!panelOpen) return;
  panelOpen = false; $('panel').hidden = true;
  if (started) controls.lock();
}

// ---------- sleeping ----------
function sleep() {
  if (director.name !== 'arrival') return game.say('You can’t. Not now.');
  if (!run.readPlan) return game.say('Not yet. There is a fire plan on the back of the door. You always read it. Habit.', 4);
  openPanel(`<h2>Good night.</h2><p>The PTAC rattles on. Somewhere down the hall, a door thuds shut. Out on I-44, a truck downshifts for the exit.</p>
    <p>You are more tired than you have ever been.</p>
    <button id="sleepNow">Close your eyes</button> <button id="closePanel" class="ghost">Not yet</button>`);
  // Sleep costs time: you wake when the knocking starts, an hour later at least, and never before 12:13.
  $('sleepNow').addEventListener('click', () => { closePanel(); turn(Math.max(run.clock.now + 60, at(0, 13))); });
}

// ---------- the turn ----------
// Falling asleep (or passing out at 12:30) is the turn: the night starts, and the hotel stops pretending.
async function turn(wakeAt) {
  if (run.phase !== 'sim') return;
  tasks.done('sleep');
  ctx.wakeAt = wakeAt;   // applied by the night act the moment you wake, before the fade-in
  await director.go('night', { fadeOut: 3 });
}
async function faint() {
  closePanel(); ctx.view = null;
  game.say('Your legs go first. The carpet comes up to meet you.', 3);
  fx.set({ lids: 1 }, 2.5);
  await new Promise(r => setTimeout(r, 2600));
  await turn(at(1, 13));
}

// ---------- the road ----------
// Traffic is solid. A hit costs an hour: you come to in your car, and the night has moved on without you.
const hitboxes = game.traffic.map(c => { const s = new T.Box3().setFromObject(c.car).getSize(new T.Vector3()); return { c, hx: s.x / 2 + RADIUS, hz: s.z / 2 + RADIUS }; });
let dying = false;
function checkTraffic() {
  if (dying || player.y > 1.5 || player.z < 45 || player.z > 90) return;
  for (const { c, hx, hz } of hitboxes) if (Math.abs(c.car.position.x - player.x) < hx && Math.abs(c.car.position.z - player.z) < hz) return hit();
}
async function hit() {
  dying = true; ctx.view = null; closePanel();
  const s = sound.synth;
  s.tone(880, 0.5, 0.12, 'sawtooth', 0.6); s.burst(0.9, 0.35, 1600, 'bandpass');   // tyres
  s.burst(0.5, 0.9, 140, 'lowpass', 0.45); s.tone(55, 0.6, 0.3, 'sine', 0.5, 0.45);  // impact
  fx.snap({ flash: 1 });
  await new Promise(r => setTimeout(r, 450));
  fx.snap({ flash: 0, fade: 1 });
  run.clock.advance(60);
  await new Promise(r => setTimeout(r, 2000));
  ctx.teleport(1.6, 0, 18.4, Math.PI, 0);
  fx.set({ fade: 0 }, 2.5);
  game.say('You are sitting against your car. Your watch says an hour has gone. You don’t remember the road.', 5);
  dying = false;
}

// ---------- start ----------
$('begin').onclick = async () => {
  $('start').hidden = true; started = true;
  await sound.start();
  controls.lock();
  run.clock.running = true;
  await director.go('arrival');
};
canvas.addEventListener('click', () => { if (started && !panelOpen && document.pointerLockElement !== canvas) controls.lock(); });
addEventListener('keydown', e => { if (e.code === 'KeyM') $('keys').dataset.muted = sound.toggleMute(); if (e.code === 'KeyJ' && started && !panelOpen) run.journal(); });
$('pocket').addEventListener('click', () => { if (started && !panelOpen) run.journal(); });
{ const r = register(); if (r.nights) $('ledger').textContent = `Night ${plan.seed}. You have stayed ${r.nights} night${r.nights > 1 ? 's' : ''} at the Heartland: drove away ${r.drove}, stayed on ${r.staff}.`; else $('ledger').textContent = `Night ${plan.seed}.`; }

// ---------- touch: left joystick moves, dragging the right side looks (handled by input.js), E button uses ----------
{
  const stick = $('stick'), knob = stick.querySelector('i');
  let id = null;
  const moveTo = e => {
    const r = stick.getBoundingClientRect(), max = r.width / 2;
    let dx = e.clientX - (r.left + max), dy = e.clientY - (r.top + max);
    const len = Math.hypot(dx, dy); if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    controls.setMove(dx / max, -dy / max);
  };
  stick.addEventListener('pointerdown', e => { id = e.pointerId; try { stick.setPointerCapture(id); } catch { /* pointer already gone */ } moveTo(e); e.preventDefault(); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === id) moveTo(e); });
  const end = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; controls.setMove(0, 0); };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  $('useBtn').addEventListener('pointerdown', e => { e.preventDefault(); use(); });
}

// ---------- loop ----------
const clock = new T.Clock();
let adapt = 0, lightClock = 0, elapsed = 0, lastFrame = -Infinity;
function frame(now = performance.now()) {
  requestAnimationFrame(frame);
  if (document.hidden) { clock.getDelta(); lastFrame = now; return; }
  const interval = 1000 / ((!started || panelOpen) ? 10 : quality.fps);
  if (now - lastFrame < interval - 0.5) return;
  lastFrame = now;

  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (ctx.view) {
    // A fixed viewpoint (the peephole): no walking; any movement input steps back from it.
    const v = ctx.view;
    camera.position.copy(v.pos); camera.rotation.set(v.pitch ?? 0, v.yaw ?? 0, 0);
    if (v.fov && camera.fov !== v.fov) { camera.fov = v.fov; camera.updateProjectionMatrix(); }
    const i = controls.input; if ((i.x || i.z) && v.onMove) v.onMove();
  } else {
    if (camera.fov !== 70) { camera.fov = 70; camera.updateProjectionMatrix(); }
    if (started && !panelOpen && !dying) walker.move(dt, controls, camera); else { camera.position.set(player.x, player.y + EYE, player.z); camera.rotation.set(controls.input.pitch, controls.input.yaw, 0); player.pos.set(player.x, player.y + 1, player.z); }
  }
  for (const u of world.updaters) u(dt, elapsed, player);
  director.update(dt);
  if (started && !panelOpen) run.update(dt);
  $('watch').textContent = run.watch();
  if (started) checkTraffic();
  sun.position.set(player.x, 0, player.z).add(sunOffset); sun.target.position.set(player.x, 0, player.z);
  lightClock -= dt;
  if (lightClock <= 0) {
    lightClock = 0.2;
    const ranked = world.lightAnchors.filter(a => a.intensity > 0 && world.lightVisible(a, camera.position)).map(a => [a, a.pos.distanceToSquared(camera.position)]).sort((p, q) => p[1] - q[1]);
    lamps.forEach((l, i) => { const a = ranked[i]?.[0]; l.intensity = a ? a.intensity : 0; if (a) { l.position.copy(a.pos); l.color.copy(a.color); l.distance = a.distance; } });
  }
  // Stream the props nearest the eye; a phone skips what it never comes near.
  if (started && (streamClock -= dt) <= 0) { streamClock = 0.3; lib.stream.step(camera.position, { renderer, camera, scene, near: LOW ? 45 : Infinity }); }
  focus = started && !panelOpen && !busy && !ctx.view ? pick() : null;
  $('prompt').style.display = focus || ctx.view?.label ? 'block' : 'none';
  if (ctx.view?.label) $('prompt').innerHTML = `<kbd>E</kbd>${ctx.view.label}`;
  else if (focus) $('prompt').innerHTML = `<kbd>E</kbd>${focus.label()}`;
  if (sayTimer > 0 && (sayTimer -= dt) <= 0) $('say').classList.remove('on');
  const zone = currentZone();
  if (LOW && (detailClock -= dt) <= 0) {
    detailClock = 0.25;
    const distance = zone ? 26 : 130;
    for (const prop of detailProps) {
      if (!prop.visible && !prop.userData.distanceCulled) continue;
      prop.getWorldPosition(detailPosition);
      prop.userData.distanceCulled = detailPosition.distanceTo(camera.position) >= distance + prop.userData.visibilityRadius;
      prop.visible = !prop.userData.distanceCulled;
    }
  }
  const L = LOOKS[look];
  const env = zone ? lib.skies.interior.env : lib.skies[L.sky].env;
  if (scene.environment !== env) scene.environment = env;
  const dark = zone?.name === 'room' && !world.room.lit();
  // The open door lets the hall in: reflections relax toward normal as it opens (they are global, and the hall needs them).
  const door = Math.min(1, world.room.angle / 1.2), darkEnv = (look === 'day' && world.room.drapes > 0.5 ? 0.35 : 0.06) * (1 - door) + 0.5 * door;
  scene.environmentIntensity = !zone ? L.env : L.envIndoor * (dark ? darkEnv : 1);
  hemi.intensity = L.hemi * (dark ? 0.2 + 0.5 * door : 1);
  // Eye adaptation: after a while in a dark room your eyes open up, and a lit hallway glares.
  adapt += ((dark ? 1 : 0) - adapt) * Math.min(1, dt / (dark ? 4 : 1.2));
  renderer.toneMappingExposure = L.exposure * (1 + 0.7 * adapt);
  // Without shadow maps (phones) the sun would shine straight through walls: indoors, it doesn't shine at all.
  sun.intensity = LOW && zone ? 0 : L.sunI;
  $('where').textContent = zone ? (zone.name === 'room' ? 'Room 212' : zone.name) + (player.y > 2.5 && zone.name !== 'room' ? ' · floor 2' : '') : 'outside';
  sound.update({ zone: zone?.name, indoor: !!zone, highwayDistance: Math.abs(player.z - 75), roadLevel: sound.roadLevel ?? 1 });
  if (started) sfx.update(dt, zone?.name);
  zones.update(camera.position);
  fx.render(scene, camera, dt);
}
frame();

// Test hook: teleport and inspect state from automated browser checks.
globalThis.__late = { run, plan, SPOTS, player, physics: walker.physics, world, game, camera, controls, renderer, scene, quality, director, fx, ctx, lib, people: lib.people,
  get idle() { return lib.stream.pending === 0 && !lib.stream.busy; },
  teleport: ctx.teleport, begin: () => $('begin').click(), FLOOR2 };
