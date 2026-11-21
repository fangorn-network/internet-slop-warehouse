// SPDX-License-Identifier: CC0-1.0
import * as T from 'three';
import { attach as attachInput } from './input.js';
import { loadLibrary, captureEnv } from './assets.js';
import { buildWorld, FLOOR2 } from './world.js';
import { createSound } from './sound.js';
import { quality } from './quality.js';
import { createPlayer, EYE } from './player.js';
import { attach as zoneCulling } from '../../parts/zone-culling.js';
import { newspaperPage, newspaperPages } from './newspaper.js';

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
// ponytail: fixed pool of 8 point lights re-aimed at the nearest anchors; a constant light count avoids shader recompiles.
const lamps = Array.from({ length: quality.lights }, () => { const l = new T.PointLight('#fff', 0, 8, 2); scene.add(l); return l; });

function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------- game state shared with the world ----------
const bag = [];
let wallet = 725, goal = '', sayTimer = 0, busy = false, started = false, panelOpen = false;
const game = {
  tvs: [], traffic: [],
  has: item => bag.includes(item),
  give(item) { bag.push(item); renderPocket(); },
  take(item) { const i = bag.indexOf(item); if (i >= 0) bag.splice(i, 1); renderPocket(); },
  say(text, seconds = Math.max(3, text.length / 14)) { $('say').textContent = text; $('say').classList.add('on'); sayTimer = seconds; },
  sound: null,
  event(name) {
    if (name === 'room-open' && !game.has('room-found')) { bag.push('room-found'); setGoal('Make yourself at home. Explore the pool, the pantry and the lot — lie down on the bed when you’re done.'); }
    if (name === 'sleep') sleep();
    if (name === 'fire-plan') openPanel(`<h2>Fire evacuation plan</h2><img alt="Floor 2 evacuation plan: exit by stair A" style="width:100%;border-radius:4px" src="${world.room.plan.image.toDataURL()}"><button id="closePanel">Close</button>`);
  },
  checkIn, vend,
};
const setGoal = text => { goal = text; $('goal').textContent = text; };
function renderPocket() {
  $('wallet').textContent = '$' + (wallet / 100).toFixed(2);
  $('bag').innerHTML = bag.filter(i => i !== 'room-found').map(i => `<li>${i}</li>`).join('');
}

// ---------- loading ----------
const lib = await loadLibrary(p => ($('progress').style.width = Math.round(p * 100) + '%'));
// Time of day: the sun follows the brightest point of each sky so shadows agree with the picture.
const sunOffset = new T.Vector3();
// envIndoor: fill and reflections from the captured interior. Lowered with the re-floor (2026-11-20) so indoor frames sit
// mid-value (about 150/255) instead of 195; REALISM.md "Measure what you change globally".
const LOOKS = {
  dusk: { sun: '#ffb27a', sunI: 1.5, minEl: 0.1, bg: 1.0, env: 0.32, envIndoor: 0.62, hemi: 0.12, fog: '#7e869a', exposure: 1.05 },
  day: { sun: '#fff1dc', sunI: 2.6, minEl: 0.55, bg: 0.85, env: 0.55, envIndoor: 0.8, hemi: 0.35, fog: '#c8cfd2', exposure: 0.95 },
};
let timeOfDay = 'dusk';
function applySky(name) {
  const look = LOOKS[name], sky = lib.skies[name];
  timeOfDay = name; game.timeOfDay = name;   // residents' routines (intent.js) read it
  scene.background = sky; scene.environment = sky.env;
  scene.backgroundIntensity = look.bg; scene.environmentIntensity = look.env;
  sun.color.set(look.sun); sun.intensity = look.sunI; hemi.intensity = look.hemi;
  scene.fog.color.set(look.fog); renderer.toneMappingExposure = look.exposure;
  const d = sky.sunDirection.clone();
  const el = Math.max(look.minEl, Math.asin(d.y));
  d.y = 0; d.normalize().multiplyScalar(Math.cos(el)); d.y = Math.sin(el);
  sunOffset.copy(d).multiplyScalar(120);
  world?.setTimeOfDay?.(name);
}
let world;
applySky('dusk');
const sound = createSound(lib.foley);
game.sound = sound;
world = buildWorld(scene, lib, game);
applySky('dusk');
const zones = zoneCulling(scene, { zones: world.zones, sees: world.sees });
// One indoor environment for the whole building: reflections and fill light captured once (per time of day) from the
// lobby's middle, with the lobby's lamps aimed and lit, and set on every material inside the building. They never switch
// at a doorway (the floor seen through the glass from the lot is the same oak you walk on), and outdoors keeps the sky.
const BUILDING = { x0: -24.5, x1: 30.5, z0: -9.5, z1: 9.5, y1: 7.5 }, LOBBY_EYE = new T.Vector3(-2.75, 1.6, 0);
const interiorMats = new Set(), roomMats = new Set(), tagged = new WeakSet();
let interiorTex = null;
function aimLights(pos) {
  const ranked = world.lightAnchors.filter(a => a.intensity > 0 && (!world.lightVisible || world.lightVisible(a, pos))).map(a => [a, a.pos.distanceToSquared(pos)]).sort((p, q) => p[1] - q[1]);
  lamps.forEach((l, i) => { const a = ranked[i]?.[0]; l.intensity = a ? a.intensity : 0; if (a) { l.position.copy(a.pos); l.color.copy(a.color); l.distance = a.distance; } });
}
const tagBox = new T.Box3(), tagMid = new T.Vector3();
function tagInterior() {                // idempotent; streamed props are tagged when they arrive
  scene.traverse(o => {
    if (!o.isMesh || tagged.has(o)) return;
    tagBox.setFromObject(o); if (tagBox.isEmpty()) return;
    tagged.add(o); tagBox.getCenter(tagMid);
    if (tagMid.x < BUILDING.x0 || tagMid.x > BUILDING.x1 || tagMid.z < BUILDING.z0 || tagMid.z > BUILDING.z1 || tagMid.y > BUILDING.y1) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !('envMap' in m)) continue;
      m.envMap = interiorTex; m.envMapIntensity = LOOKS[timeOfDay].envIndoor; m.needsUpdate = true;
      interiorMats.add(m); if (world.in212?.(tagMid)) roomMats.add(m);
    }
  });
}
function captureInterior() {
  aimLights(LOBBY_EYE); zones.update(LOBBY_EYE);
  const tex = captureEnv(renderer, scene, LOBBY_EYE, { intensity: LOOKS[timeOfDay].envIndoor });
  interiorTex?.dispose(); interiorTex = tex;
  for (const m of interiorMats) { m.envMap = tex; m.envMapIntensity = LOOKS[timeOfDay].envIndoor; }
  zones.update(camera.position);
}
captureInterior(); tagInterior();
const detailProps = [];
scene.traverse(o => { if (o.userData.hotelProp) detailProps.push(o); });
let detailClock = 0, tagClock = 2;
const detailPosition = new T.Vector3();
// The player (player.js, shared with Late Checkout): physics when Rapier loads, the old walker when it doesn't.
const walker = await createPlayer(scene, world, { sound }), phys = walker.physics;
game.holding = () => phys?.holding ?? null;   // world.js asks, e.g. the TV wants its remote in your hand
// Compile every shader now (both reflection maps share a size, so later swaps never recompile).
await renderer.compileAsync(scene, camera);
$('loading').hidden = true; $('start').hidden = false;
setGoal('Check in at the front desk.');
renderPocket();

// ---------- player ----------
const player = walker.player, currentZone = walker.zone;
const controls = attachInput(canvas, { onUse: use, onInspect: () => (phys?.held && started && !panelOpen ? phys.throw() : use()), onMenu: closePanel });
controls.setLook(world.spawn.yaw, 0);

// ---------- interaction ----------
let focus = null;
const view = new T.Vector3(), to = new T.Vector3();
function pick() {
  camera.getWorldDirection(view);
  let best = null, bestScore = Infinity;
  for (const it of world.interact) {
    if (it.heldEntry || (it.when && !it.when(player))) continue;   // the carry prompt is ours (below), not a target
    to.copy(it.pos); if (it.dynamicY) to.y = it.dynamicY();
    const eyeY = camera.position.y;
    if (Math.abs(to.y - eyeY) > 1.7) continue;
    to.sub(camera.position);
    const d = to.length();
    if (d > it.r + 0.6) continue;
    const facing = to.normalize().dot(view);
    if (facing < (it.precise ? 0.95 : 0.55)) continue;   // precise: small pickups need a direct look
    const score = (1 - facing) * 6 + d * 0.3;   // what you look at most directly, then the nearer: a lamp on a table no longer steals the table
    if (score < bestScore) { bestScore = score; best = it; }
  }
  return best;
}
function use() {
  if (!started || panelOpen) return;
  if (busy) return;
  // Carrying something, E still works on what you look at (the TV, with its remote in hand); with nothing in view it
  // puts the thing down. Q or right-click throws it.
  if (phys?.holding === 'newspaper') return readPaper();
  if (focus) return focus.use();
  if (phys?.held) return phys.drop();
  walker.use();
}

// ---------- front desk ----------
// Dana turns to you at a person's pace (at most 3 rad/s, as walkers turn), not in one frame; her head already looks.
let danaYaw = null;
world.updaters.push(dt => {
  if (danaYaw === null || !world.clerk) return;
  const r = world.clerk.root.rotation, d = Math.atan2(Math.sin(danaYaw - r.y), Math.cos(danaYaw - r.y));
  r.y += Math.sign(d) * Math.min(Math.abs(d), 3 * dt);
  if (Math.abs(d) < 1e-3) danaYaw = null;
});
function checkIn(clerk) {
  if (busy) return;
  danaYaw = Math.atan2(player.x - clerk.root.position.x, player.z - clerk.root.position.z);
  if (game.has('key card')) {
    const lines = ['“Everything okay with the room? Holler if you need anything.”', '“Breakfast starts at six. The waffle maker is a little temperamental.”', '“Ice machine’s on two, right across from the elevator.”', '“Quiet night. Truckers mostly, and a youth softball team on the first floor. Sorry in advance.”'];
    clerk.play('Wave'); setTimeout(() => clerk.play('Idle'), 1800);
    return game.say('Dana: ' + lines[Math.floor(Math.random() * lines.length)]);
  }
  busy = true;
  const script = [
    ['Wave', 'Dana: “Evening! Welcome to the Heartland Inn. Checking in?”'],
    ['Interact', 'Dana: “Let me pull that up… there you are. One king, non-smoking, two nights.”'],
    ['Idle', 'Dana: “Can I see an ID and the card you booked with? …Perfect, thank you.”'],
    ['Interact', 'Dana: “You’re in 212, second floor. Elevator’s just down the hall past the lounge, stairs right beside it.”'],
    ['Idle', 'Dana: “Breakfast is six to nine-thirty. Pool and hot tub are open till ten, and the coffee is always on.”'],
    ['Wave', 'Dana: “Here’s your key. Have a good night!”'],
  ];
  script.forEach(([anim, text], i) => setTimeout(() => {
    clerk.play(anim); game.say(text, 3.6);
    if (i === script.length - 1) {
      game.give('key card'); sound.beep(true);
      setGoal('Find room 212 on the second floor. The elevator and stairs are past the lounge, down the east hallway.');
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
    wallet -= cost; closePanel(); sound.vend();
    setTimeout(() => { game.give(name.toLowerCase()); game.say(kind === 'drinks' ? `A ${name.toLowerCase()} thunks down into the tray. Ice cold.` : `The coil turns… and the ${name.toLowerCase()} drops. Victory.`); }, 1200);
  });
}
// ---------- reading the paper ----------
// With a newspaper in hand, E opens it: its pages (newspaper.js), turned with the buttons; fold it up and you still hold it.
function readPaper(page = 0) {
  const edition = phys.held.o.userData.edition ?? 'today', n = newspaperPages(edition);
  openPanel(`${newspaperPage(edition, page)}<div class="turn"><button class="ghost" id="prevPage">‹ Page</button> <button class="ghost" id="nextPage">Page ›</button>
    <button id="closePanel">Fold it up</button> <button class="ghost" id="putDown">Put it down</button></div>`, 'reading');
  sound.paper?.();
  $('prevPage').onclick = () => readPaper((page + n - 1) % n);
  $('nextPage').onclick = () => readPaper((page + 1) % n);
  $('putDown').onclick = () => { closePanel(); phys.drop(); };
}
function openPanel(html, kind = '') {
  panelOpen = true; $('panelCard').innerHTML = html; $('panelCard').className = 'card ' + kind; $('panel').hidden = false; controls.clear();
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
  const minutes = Math.round(performance.now() / 60000);
  const tried = [game.has('coffee') && 'drank the lobby coffee', bag.some(i => SNACKS.concat(DRINKS).some(([n]) => n.toLowerCase() === i)) && 'raided the vending machine', game.has('ice bucket (full)') && 'got ice', world.room.tv.on && 'fell asleep to the TV'].filter(Boolean);
  openPanel(`<h2>Good night.</h2><p>The PTAC rattles on. Somewhere down the hall, a door thuds shut. Out on I-44, a truck downshifts for the exit.</p>
    <p>${tried.length ? 'You ' + tried.join(', ') + '.' : 'You didn’t even look at the vending machine. Admirable.'}</p>
    <p class="sub">${minutes} minute${minutes === 1 ? '' : 's'} at the Heartland Inn</p>
    ${timeOfDay === 'dusk' ? '<button id="morning">Sleep until morning</button> ' : ''}<button id="closePanel" class="${timeOfDay === 'dusk' ? 'ghost' : ''}">Keep exploring</button>`);
  $('morning')?.addEventListener('click', () => {
    closePanel(); applySky('day'); captureInterior();
    game.say('7:12 AM. The PTAC clicks off. Somewhere below, a waffle maker beeps.', 5);
    setGoal('Morning. Hot breakfast is on in the lobby until 9:30 — waffles, eggs, the works.');
  });
}

// ---------- saving ----------
// What you did survives a reload: checked in, the key card and what's in your pockets, the goal, the time of day, where
// you stand, every prop you moved (physics.js snapshot) and which outlet each lamp is plugged into (lamps.js). Storage
// can be missing or full (private windows, file://): every touch is guarded and the game plays the same without it.
const SAVE = 'heartland-inn-save-1';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(SAVE)); } catch { return null; } },
  set(v) { try { localStorage.setItem(SAVE, JSON.stringify(v)); return true; } catch { return false; } },
  clear() { try { localStorage.removeItem(SAVE); } catch { /* nothing saved, nothing to clear */ } },
};
function save() {
  if (!started) return false;
  return store.set({ v: 1, bag: [...bag], wallet, goal, timeOfDay, player: [player.x, player.y, player.z, controls.input.yaw, controls.input.pitch].map(v => +v.toFixed(3)), props: phys?.snapshot?.(), plugs: game.plugs?.save?.() });
}
function load(s) {
  if (!s || s.v !== 1) return false;
  bag.splice(0, bag.length, ...(s.bag ?? [])); wallet = s.wallet ?? wallet; if (s.goal) setGoal(s.goal);
  if (s.timeOfDay && s.timeOfDay !== timeOfDay && LOOKS[s.timeOfDay]) { applySky(s.timeOfDay); captureInterior(); }
  let [x, y, z, yaw = 0, pitch = 0] = s.player ?? [];
  // the car may not be on your floor any more: step out of the shaft into the hall in front of it
  if (x > 6.6 && x < 8.9 && z < -1 && z > -4.5) z = -0.3;
  if (Number.isFinite(x)) Object.assign(player, { x, y, z, vy: 0 }), controls.setLook(yaw, pitch);
  phys?.restore?.(s.props ?? {});
  game.plugs?.load?.(s.plugs);
  renderPocket();
  return true;
}
setInterval(save, 5000);
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ---------- start ----------
const saved = store.get();
if (saved?.v === 1) { $('continue').hidden = false; $('begin').textContent = 'New game'; $('begin').classList.add('ghost'); }
async function begin(resume) {
  $('start').hidden = true;
  if (resume) load(saved); else store.clear();
  started = true;
  await sound.start();
  controls.lock();
  game.say(resume ? 'Back at the Heartland Inn.' : 'The doors are just past the canopy. Your bag is light; the night is warm.');
}
$('begin').onclick = () => begin(false);
$('continue').onclick = () => begin(true);
canvas.addEventListener('click', () => { if (started && !panelOpen && document.pointerLockElement !== canvas) controls.lock(); });
addEventListener('keydown', e => {
  if (e.code === 'KeyM') $('keys').dataset.muted = sound.toggleMute();
  if (e.code === 'KeyT' && started) { applySky(timeOfDay === 'dusk' ? 'day' : 'dusk'); captureInterior(); game.say(timeOfDay === 'dusk' ? 'Dusk. The pole sign hums on.' : 'Afternoon light.', 2); }
});

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
let adapt = 0, lightClock = 0, elapsed = 0;
let lastFrame = -Infinity;
function frame(now = performance.now()) {
  requestAnimationFrame(frame);
  if (document.hidden) { clock.getDelta(); lastFrame = now; return; }
  const interval = 1000 / ((!started || panelOpen) ? 10 : quality.fps);
  if (now - lastFrame < interval - 0.5) return;
  lastFrame = now;

  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (started && !panelOpen) walker.move(dt, controls, camera); else { camera.position.set(player.x, player.y + EYE, player.z); camera.rotation.set(controls.input.pitch, controls.input.yaw, 0); player.pos.set(player.x, player.y + 1, player.z); }
  for (const u of world.updaters) u(dt, elapsed, player);
  sun.position.set(player.x, 0, player.z).add(sunOffset); sun.target.position.set(player.x, 0, player.z);
  lightClock -= dt;
  if (lightClock <= 0) {
    lightClock = 0.2;
    aimLights(camera.position);
  }
  focus = started && !panelOpen && !busy ? pick() : null;
  const carrying = started && !panelOpen && phys?.holding;
  $('prompt').style.display = focus || carrying ? 'block' : 'none';
  if (carrying === 'newspaper') $('prompt').innerHTML = '<kbd>E</kbd>Read the paper · <kbd>Q</kbd>Throw';
  else if (focus) $('prompt').innerHTML = `<kbd>E</kbd>${focus.label()}`;
  else if (carrying) $('prompt').innerHTML = `<kbd>E</kbd>Put down the ${carrying} · <kbd>Q</kbd>Throw`;
  if (sayTimer > 0 && (sayTimer -= dt) <= 0) $('say').classList.remove('on');
  const zone = currentZone();
  if (LOW && (detailClock -= dt) <= 0) {
    detailClock = 0.25;
    // Small furniture in other wings cannot be seen through opaque walls. Keep large landmarks.
    const distance = zone ? 26 : 130;
    for (const prop of detailProps) {
      if (!prop.visible && !prop.userData.distanceCulled) continue;
      prop.getWorldPosition(detailPosition);
      prop.userData.distanceCulled = detailPosition.distanceTo(camera.position) >= distance + prop.userData.visibilityRadius;
      prop.visible = !prop.userData.distanceCulled;
    }
  }
  if ((tagClock -= dt) <= 0) { tagClock = 2; tagInterior(); }
  // Reflections come from a photo of a lit room: in a dark 212 they would light it like a lamp nobody can switch off.
  const dark = zone?.name === 'room' && !world.room.lit();
  // The open door lets the hall in: reflections relax toward normal as it opens (they are global, and the hall needs them).
  const door = Math.min(1, world.room.angle / 1.2), darkEnv = (timeOfDay === 'day' && world.room.drapes > 0.5 ? 0.35 : 0.06) * (1 - door) + 0.5 * door;
  // The building's materials carry their own map; only 212's dim in the dark.
  const roomEnv = LOOKS[timeOfDay].envIndoor * (dark ? darkEnv : 1);
  for (const m of roomMats) m.envMapIntensity = roomEnv;
  hemi.intensity = LOOKS[timeOfDay].hemi * (dark ? 0.2 + 0.5 * door : 1);
  // Eye adaptation: after a while in a dark room your eyes open up, and a lit hallway glares.
  adapt += ((dark ? 1 : 0) - adapt) * Math.min(1, dt / (dark ? 4 : 1.2));
  renderer.toneMappingExposure = LOOKS[timeOfDay].exposure * (1 + 0.7 * adapt);
  // Without shadow maps (phones) the sun would shine straight through walls: indoors, it doesn't shine at all.
  sun.intensity = LOW && zone ? 0 : LOOKS[timeOfDay].sunI;
  $('where').textContent = zone ? (zone.name === 'room' ? 'Room 212' : zone.name) + (player.y > 2.5 && zone.name !== 'room' ? ' · floor 2' : '') : 'outside';
  sound.update({ zone: zone?.name, indoor: !!zone, highwayDistance: Math.abs(player.z - 75) });
  zones.update(camera.position);
  renderer.render(scene, camera);
}
frame();

// Test hook: teleport and inspect state from automated browser checks.
globalThis.__inn = { zones, player, world, game, physics: phys, camera, controls, renderer, scene, quality, people: lib.people, teleport(x, y, z, yaw = 0, pitch = 0) { Object.assign(player, { x, y, z, vy: 0 }); controls.setLook(yaw, pitch); }, begin: () => $('begin').click(), FLOOR2, save, load, store, readPaper };
