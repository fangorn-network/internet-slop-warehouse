// SPDX-License-Identifier: CC0-1.0
// Catherine: one dream, played out in the Heartland Inn (projects/roadside-inn). From a dream report in the Sleep and
// Dream Database (SDDb, melvin-dreams, 1993-01-10), CC BY 4.0. Forked from late-checkout/main.js, minus the case, the
// clock and everything a single scene doesn't need.
import * as T from 'three';
import { attach as attachInput } from '../roadside-inn/input.js';
import { loadLibrary } from '../roadside-inn/assets.js';
import { buildWorld, FLOOR2 } from '../roadside-inn/world.js';
import { createSound } from '../roadside-inn/sound.js';
import { quality } from '../roadside-inn/quality.js';
import { createPlayer, EYE } from '../roadside-inn/player.js';
import { attach as zoneCulling } from '../../parts/zone-culling.js';
import { createDream } from '../roadside-inn/stage/dream.js';
import { createReel, pickScenes } from '../roadside-inn/stage/scenes.js';
import { catherine, MODELS, houseColliders } from './dream.js';
import { checkin } from './intro.js';

// Scenes (roadside-inn/stage/scenes.js), spliced into a reel: ?scenes=checkin,catherine plays the evening then the
// dream; the default is the dream alone. The last scene's ctx.next() shows the end card.
const reelScenes = pickScenes({ checkin, catherine }, 'catherine');

const $ = id => document.getElementById(id);
const canvas = $('world'), LOW = quality.economy;
const renderer = new T.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'low-power' });
renderer.setPixelRatio(quality.pixelRatio);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.shadowMap.enabled = !LOW;
renderer.shadowMap.type = T.PCFSoftShadowMap;

const scene = new T.Scene();
scene.fog = new T.Fog('#06080d', 180, 760);
const camera = new T.PerspectiveCamera(70, 1, 0.05, 900);
camera.rotation.order = 'YXZ';
const hemi = new T.HemisphereLight('#dfe8ef', '#5d5a4c', 0.025);
scene.add(hemi);
const sun = new T.DirectionalLight('#ffd7a8', 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const lamps = Array.from({ length: quality.lights }, () => { const l = new T.PointLight('#fff', 0, 8, 2); scene.add(l); return l; });
const fx = createDream(renderer, { economy: LOW });
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); fx.resize(); }
addEventListener('resize', resize); resize();

let sayTimer = 0, started = false;
const bag = [];
const game = {
  tvs: [], traffic: [],
  has: item => bag.includes(item), give: item => bag.push(item), take: item => bag.splice(bag.indexOf(item) >>> 0, 1),
  say(text, seconds = Math.max(3, text.length / 14)) { $('say').textContent = text; $('say').classList.add('on'); sayTimer = seconds; },
  event() {}, checkIn() {}, vend() {},   // intro.js fills these in
};

// ---------- loading ----------
const lib = await loadLibrary(p => ($('progress').style.width = Math.round(p * 100) + '%'), { stream: true, extra: MODELS });
// Looks (from late-checkout/main.js): dusk for the evening, night for the dream.
const LOOKS = {
  dusk: { sky: 'dusk', sun: '#ffb27a', sunI: 1.5, minEl: 0.1, bg: 1.0, env: 0.32, envIndoor: 0.5, hemi: 0.12, fog: '#7e869a', exposure: 1.05 },
  night: { sky: 'dusk', sun: '#8aa0c8', sunI: 0, minEl: 0.1, bg: 0.035, env: 0.05, envIndoor: 0.3, hemi: 0.025, fog: '#06080d', exposure: 1.0 },
};
let look = 'dusk';
const sunOffset = new T.Vector3();
function applyLook(name) {
  const L = LOOKS[look = name], sky = lib.skies[L.sky];
  scene.background = sky; scene.environment = sky.env; scene.backgroundIntensity = L.bg; scene.environmentIntensity = L.env;
  sun.color.set(L.sun); sun.intensity = L.sunI; hemi.intensity = L.hemi; scene.fog.color.set(L.fog);
  const d = sky.sunDirection.clone(), el = Math.max(L.minEl, Math.asin(d.y));
  d.y = 0; d.normalize().multiplyScalar(Math.cos(el)); d.y = Math.sin(el);
  sunOffset.copy(d).multiplyScalar(120);
}
applyLook('dusk');
const sound = createSound(lib.foley);
game.sound = sound;
const world = buildWorld(scene, lib, game, { station: false });
world.setTimeOfDay?.('dusk');
let houseUp = () => false;   // set once ctx exists (physics may ask before)
houseColliders(world, FLOOR2, () => houseUp());   // before the player: physics reads colliders once
const zones = zoneCulling(scene, { zones: world.zones, sees: world.sees });
const walker = await createPlayer(scene, world, { sound });
const player = walker.player, currentZone = walker.zone;
const controls = attachInput(canvas, { onUse: use, onInspect: use });

// Shared with the acts. view: when set, the camera looks from there instead of the player's eyes ({ pos, yaw, pitch, fov }).
const ctx = {
  scene, world, lib, game, player, controls, camera, renderer, fx, sound, FLOOR2, quality, say: game.say, view: null,
  applyLook, envScale: 1, exposure: 1,
  goal(text) { $('goal').textContent = text; $('goal').hidden = !text; },
  end() { document.exitPointerLock?.(); $('end').hidden = false; started = false; },
  teleport(x, y, z, yaw = 0, pitch = 0) { Object.assign(player, { x, y, z, vy: 0 }); controls.setLook(yaw, pitch); },   // player.js syncs the capsule
};
const reel = await createReel(ctx, reelScenes, { fx, onEnd: () => ctx.end() }), director = reel.director;
houseUp = () => !!ctx.dream?.inHouse;
await renderer.compileAsync(scene, camera);
$('loading').hidden = true; $('start').hidden = false;

// ---------- interaction ----------
let focus = null;
const view = new T.Vector3(), to = new T.Vector3();
function pick() {
  camera.getWorldDirection(view);
  let best = null, bestScore = Infinity;
  for (const it of world.interact) {
    if (it.when && !it.when(player)) continue;
    to.copy(it.pos);
    if (Math.abs(to.y - camera.position.y) > 1.7) continue;
    to.sub(camera.position);
    const d = to.length(); if (d > it.r + 0.6) continue;
    const facing = to.normalize().dot(view); if (facing < 0.55) continue;
    const score = d - facing * 1.5 - (it.priority ?? 0);
    if (score < bestScore) { bestScore = score; best = it; }
  }
  return best;
}
const eyesShut = () => fx.values.lids > 0.4 || fx.values.fade > 0.4;   // lying there with your eyes closed, there is nothing to reach
function use() {
  if (!started) return;
  if (ctx.view?.onUse) return ctx.view.onUse();
  if (ctx.busy || eyesShut() || walker.use()) return;
  focus?.use();
}

$('begin').onclick = async () => {
  $('start').hidden = true; started = true;
  await sound.start(); controls.lock();
  await reel.start();
};
canvas.addEventListener('click', () => { if (started && document.pointerLockElement !== canvas) controls.lock(); });
addEventListener('keydown', e => { if (e.code === 'KeyM') sound.toggleMute(); });
{ // touch: left joystick moves, the right side looks (input.js), E button uses
  const stick = $('stick'), knob = stick.querySelector('i');
  let id = null;
  const moveTo = e => {
    const r = stick.getBoundingClientRect(), max = r.width / 2;
    let dx = e.clientX - (r.left + max), dy = e.clientY - (r.top + max);
    const len = Math.hypot(dx, dy); if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`; controls.setMove(dx / max, -dy / max);
  };
  stick.addEventListener('pointerdown', e => { id = e.pointerId; try { stick.setPointerCapture(id); } catch { /* gone */ } moveTo(e); e.preventDefault(); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === id) moveTo(e); });
  const end = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; controls.setMove(0, 0); };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  $('useBtn').addEventListener('pointerdown', e => { e.preventDefault(); use(); });
}

// ---------- loop ----------
const clock = new T.Clock();
let elapsed = 0, lightClock = 0, adapt = 0, streamClock = 0, lastFrame = -Infinity;
function frame(now = performance.now()) {
  requestAnimationFrame(frame);
  if (document.hidden) { clock.getDelta(); lastFrame = now; return; }
  if (now - lastFrame < 1000 / (started ? quality.fps : 10) - 0.5) return;
  lastFrame = now;
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (ctx.view) {   // a fixed viewpoint (the peephole): any movement input steps back from it
    const v = ctx.view;
    camera.position.copy(v.pos); camera.rotation.set(v.pitch ?? 0, v.yaw ?? 0, 0);
    if (v.fov && camera.fov !== v.fov) { camera.fov = v.fov; camera.updateProjectionMatrix(); }
    const i = controls.input; if ((i.x || i.z) && v.onMove) v.onMove();
  } else {
    if (camera.fov !== 70) { camera.fov = 70; camera.updateProjectionMatrix(); }
    if (started && !ctx.frozen) walker.move(dt, controls, camera);
    else { camera.position.set(player.x, player.y + EYE, player.z); camera.rotation.set(controls.input.pitch, controls.input.yaw, 0); }
  }
  for (const u of world.updaters) u(dt, elapsed, player);
  director.update(dt);
  if ((lightClock -= dt) <= 0) {
    lightClock = 0.2;
    const ranked = world.lightAnchors.filter(a => a.intensity > 0 && world.lightVisible(a, camera.position)).map(a => [a, a.pos.distanceToSquared(camera.position)]).sort((p, q) => p[1] - q[1]);
    lamps.forEach((l, i) => { const a = ranked[i]?.[0]; l.intensity = a ? a.intensity : 0; if (a) { l.position.copy(a.pos); l.color.copy(a.color); l.distance = a.distance; } });
  }
  if (started && (streamClock -= dt) <= 0) { streamClock = 0.3; lib.stream.step(camera.position, { renderer, camera, scene, near: LOW ? 45 : Infinity }); }
  focus = started && !ctx.view && !ctx.busy && !eyesShut() ? pick() : null;
  $('prompt').style.display = focus || ctx.view?.label ? 'block' : 'none';
  if (ctx.view?.label) $('prompt').innerHTML = `<kbd>E</kbd>${ctx.view.label}`;
  else if (focus) $('prompt').innerHTML = `<kbd>E</kbd>${focus.label()}`;
  if (sayTimer > 0 && (sayTimer -= dt) <= 0) $('say').classList.remove('on');
  // A dark room: reflections and fill follow the door; your eyes open up after a while, so the hall glares.
  const zone = currentZone(), dark = zone?.name === 'room' && !world.room.lit();
  const L = LOOKS[look];
  const env = zone ? lib.skies.interior.env : lib.skies[L.sky].env; if (scene.environment !== env) scene.environment = env;
  const door = Math.min(1, world.room.angle / 1.2);
  scene.environmentIntensity = (!zone ? L.env : L.envIndoor * (dark ? 0.06 * (1 - door) + 0.5 * door : 1)) * ctx.envScale;
  hemi.intensity = L.hemi * (dark ? 0.2 + 0.5 * door : 1) * ctx.envScale;
  adapt += ((dark ? 1 : 0) - adapt) * Math.min(1, dt / (dark ? 4 : 1.2));
  renderer.toneMappingExposure = L.exposure * ctx.exposure * (1 + 0.7 * adapt);
  sun.position.set(player.x, 0, player.z).add(sunOffset); sun.target.position.set(player.x, 0, player.z);
  sun.intensity = LOW && zone ? 0 : L.sunI;   // no shadow maps on phones: indoors the sun would shine through walls
  sound.update({ zone: zone?.name, indoor: !!zone, highwayDistance: Math.abs(player.z - 75), roadLevel: look === 'dusk' ? 1 : 0.4 });
  zones.update(camera.position);
  fx.render(scene, camera, dt);
}
frame();

// Test hook for automated browser checks.
globalThis.__catherine = { THREE: T, ctx, world, player, camera, fx, director, lib, scene, renderer, FLOOR2, begin: () => $('begin').click(),
  get idle() { return lib.stream.pending === 0 && !lib.stream.busy; } };
