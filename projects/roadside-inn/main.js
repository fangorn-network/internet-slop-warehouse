// SPDX-License-Identifier: CC0-1.0
import * as T from 'three';
import { attach as attachInput } from './input.js';
import { loadLibrary } from './assets.js';
import { buildWorld, FLOOR2 } from './world.js';
import { createSound } from './sound.js';
import { quality } from './quality.js';
import { createPlayer, EYE } from './player.js';

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
const LOOKS = {
  dusk: { sun: '#ffb27a', sunI: 1.5, minEl: 0.1, bg: 1.0, env: 0.32, envIndoor: 0.5, hemi: 0.12, fog: '#7e869a', exposure: 1.05 },
  day: { sun: '#fff1dc', sunI: 2.6, minEl: 0.55, bg: 0.85, env: 0.55, envIndoor: 0.8, hemi: 0.35, fog: '#c8cfd2', exposure: 0.95 },
};
let timeOfDay = 'dusk';
function applySky(name) {
  const look = LOOKS[name], sky = lib.skies[name];
  timeOfDay = name;
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
const detailProps = [];
scene.traverse(o => { if (o.userData.hotelProp) detailProps.push(o); });
let detailClock = 0;
const detailPosition = new T.Vector3();
// The player (player.js, shared with Late Checkout): physics when Rapier loads, the old walker when it doesn't.
const walker = await createPlayer(scene, world, { sound }), phys = walker.physics;
// Compile every shader now (both reflection maps share a size, so later swaps never recompile).
await renderer.compileAsync(scene, camera);
$('loading').hidden = true; $('start').hidden = false;
setGoal('Check in at the front desk.');
renderPocket();

// ---------- player ----------
const player = walker.player, currentZone = walker.zone;
const controls = attachInput(canvas, { onUse: use, onInspect: use, onMenu: closePanel });
controls.setLook(world.spawn.yaw, 0);

// ---------- interaction ----------
let focus = null;
const view = new T.Vector3(), to = new T.Vector3();
function pick() {
  camera.getWorldDirection(view);
  let best = null, bestScore = Infinity;
  for (const it of world.interact) {
    if (it.when && !it.when(player)) continue;
    to.copy(it.pos); if (it.dynamicY) to.y = it.dynamicY();
    const eyeY = camera.position.y;
    if (Math.abs(to.y - eyeY) > 1.7) continue;
    to.sub(camera.position);
    const d = to.length();
    if (d > it.r + 0.6) continue;
    const facing = to.normalize().dot(view);
    if (facing < 0.55) continue;
    const score = d - facing * 1.5;
    if (score < bestScore) { bestScore = score; best = it; }
  }
  return best;
}
function use() {
  if (!started || panelOpen) return;
  if (busy) return;
  if (walker.use()) return;   // threw what you were carrying
  focus?.use();
}

// ---------- front desk ----------
function checkIn(clerk) {
  if (busy) return;
  clerk.root.lookAt(player.x, 0, player.z);
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
  const minutes = Math.round(performance.now() / 60000);
  const tried = [game.has('coffee') && 'drank the lobby coffee', bag.some(i => SNACKS.concat(DRINKS).some(([n]) => n.toLowerCase() === i)) && 'raided the vending machine', game.has('ice bucket (full)') && 'got ice', world.room.tv.on && 'fell asleep to the TV'].filter(Boolean);
  openPanel(`<h2>Good night.</h2><p>The PTAC rattles on. Somewhere down the hall, a door thuds shut. Out on I-44, a truck downshifts for the exit.</p>
    <p>${tried.length ? 'You ' + tried.join(', ') + '.' : 'You didn’t even look at the vending machine. Admirable.'}</p>
    <p class="sub">${minutes} minute${minutes === 1 ? '' : 's'} at the Heartland Inn</p>
    ${timeOfDay === 'dusk' ? '<button id="morning">Sleep until morning</button> ' : ''}<button id="closePanel" class="${timeOfDay === 'dusk' ? 'ghost' : ''}">Keep exploring</button>`);
  $('morning')?.addEventListener('click', () => {
    closePanel(); applySky('day');
    game.say('7:12 AM. The PTAC clicks off. Somewhere below, a waffle maker beeps.', 5);
    setGoal('Morning. Hot breakfast is on in the lobby until 9:30 — waffles, eggs, the works.');
  });
}

// ---------- start ----------
$('begin').onclick = async () => {
  $('start').hidden = true; started = true;
  await sound.start();
  controls.lock();
  game.say('The doors are just past the canopy. Your bag is light; the night is warm.');
};
canvas.addEventListener('click', () => { if (started && !panelOpen && document.pointerLockElement !== canvas) controls.lock(); });
addEventListener('keydown', e => {
  if (e.code === 'KeyM') $('keys').dataset.muted = sound.toggleMute();
  if (e.code === 'KeyT' && started) { applySky(timeOfDay === 'dusk' ? 'day' : 'dusk'); game.say(timeOfDay === 'dusk' ? 'Dusk. The pole sign hums on.' : 'Afternoon light.', 2); }
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
    const ranked = world.lightAnchors.filter(a => a.intensity > 0 && (!world.lightVisible || world.lightVisible(a, camera.position))).map(a => [a, a.pos.distanceToSquared(camera.position)]).sort((p, q) => p[1] - q[1]);
    lamps.forEach((l, i) => { const a = ranked[i]?.[0]; l.intensity = a ? a.intensity : 0; if (a) { l.position.copy(a.pos); l.color.copy(a.color); l.distance = a.distance; } });
  }
  focus = started && !panelOpen && !busy ? pick() : null;
  $('prompt').style.display = focus ? 'block' : 'none';
  if (focus) $('prompt').innerHTML = `<kbd>E</kbd>${focus.label()}`;
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
  // Indoors, reflections come from a real hotel-room HDRI; outdoors, from the sky.
  const env = zone ? lib.skies.interior.env : lib.skies[timeOfDay].env;
  if (scene.environment !== env) scene.environment = env;
  // Reflections come from a photo of a lit room: in a dark 212 they would light it like a lamp nobody can switch off.
  const dark = zone?.name === 'room' && !world.room.lit();
  // The open door lets the hall in: reflections relax toward normal as it opens (they are global, and the hall needs them).
  const door = Math.min(1, world.room.angle / 1.2), darkEnv = (timeOfDay === 'day' && world.room.drapes > 0.5 ? 0.35 : 0.06) * (1 - door) + 0.5 * door;
  scene.environmentIntensity = !zone ? LOOKS[timeOfDay].env : LOOKS[timeOfDay].envIndoor * (dark ? darkEnv : 1);
  hemi.intensity = LOOKS[timeOfDay].hemi * (dark ? 0.2 + 0.5 * door : 1);
  // Eye adaptation: after a while in a dark room your eyes open up, and a lit hallway glares.
  adapt += ((dark ? 1 : 0) - adapt) * Math.min(1, dt / (dark ? 4 : 1.2));
  renderer.toneMappingExposure = LOOKS[timeOfDay].exposure * (1 + 0.7 * adapt);
  // Without shadow maps (phones) the sun would shine straight through walls: indoors, it doesn't shine at all.
  sun.intensity = LOW && zone ? 0 : LOOKS[timeOfDay].sunI;
  $('where').textContent = zone ? (zone.name === 'room' ? 'Room 212' : zone.name) + (player.y > 2.5 && zone.name !== 'room' ? ' · floor 2' : '') : 'outside';
  sound.update({ zone: zone?.name, indoor: !!zone, highwayDistance: Math.abs(player.z - 75) });
  renderer.render(scene, camera);
}
frame();

// Test hook: teleport and inspect state from automated browser checks.
globalThis.__inn = { player, world, game, physics: phys, camera, controls, renderer, scene, quality, people: lib.people, teleport(x, y, z, yaw = 0, pitch = 0) { Object.assign(player, { x, y, z, vy: 0 }); controls.setLook(yaw, pitch); }, begin: () => $('begin').click(), FLOOR2 };
