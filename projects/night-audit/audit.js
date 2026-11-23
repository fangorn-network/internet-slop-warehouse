// SPDX-License-Identifier: CC0-1.0
// Night Audit: a scene at the Heartland Inn (projects/roadside-inn/stage/scenes.js). It starts in bed in 212 at 3 AM and
// ends at the front desk with Dana, so a coordinator can splice any intro before it and anything after.
//
// night:  3:13 AM. Three slow knocks. Through the peephole someone is standing in the hall, a shape the light doesn't
//         land on; look again and it is right at the door; again, and nobody. Step out, and the door swings shut behind
//         you: your key card blinks red. The elevator's call button lights and nothing comes. Stair A: the lights die
//         on the way down, and the flights don't end where they should.
// below:  floors that aren't in the building, built from its corridors (maze.js), a new set every night. Down below,
//         somewhere, the lobby's music is playing. It's the only way to tell which way the lobby is: it comes round
//         corners and through doors, muffled by every wall between. TVs in the halls play to nobody, louder than the music
//         when you're near them. Turn them off and you can hear the way again.
// lobby:  the real ground floor. Follow the music to the desk. Dana is there.
//
//   prebuild(ctx0, { seed })   before the player exists: floors' colliders must be there when physics starts
//   audit = { acts, start, install }
import * as T from 'three';
import * as F from '../roadside-inn/fixtures.js';
import { createSoundscape } from '../roadside-inn/stage/audio.js';
import { generate, buildFloor, distances, neighbours, C } from './maze.js';
import { createAir, muzak } from './air.js';

const DOOR_X = 12.9;                                    // centre of 212's door; its plane is z = 1, the hall is z < 1
const LENS = new T.Vector3(DOOR_X, 1.55, 0.93);         // y is added to FLOOR2
const SPEAKER = new T.Vector3(-3.5, 2.7, 0.5);          // the lobby's ceiling speaker, over the lounge
const DESK = new T.Vector3(-7.9, 1.2, -2.4);
// The track the lobby plays: three excerpts of 식료품groceries, 인터넷 쇼핑 (Ascension), crossfaded (README.md). null
// plays the generated placeholder instead (air.js muzak()).
export const MUSIC = 'lobby-music';
// The TVs: public-domain films from the Internet Archive, 150 s cut from each (see README.md for sources and cuts).
export const BROADCASTS = [
  { id: 'tv-hoteland', title: 'HOTEL AND RESTAURANT WORKERS', look: 'sepia' },
  { id: 'tv-duck', title: 'CIVIL DEFENSE', look: 'film' },
  { id: 'tv-arctic', title: 'ARCTIC SENTINELS', look: 'radar' },
];
const asset = id => globalThis.WAREHOUSE_PARTS?.[`night-audit-${id}`] ?? new URL(`./assets/${id}.mp3`, import.meta.url).href;
const SIZES = [[8, 6], [9, 7], [10, 7]], LABELS = ['2', '2', 'B'];
const ARRIVE = [
  'The stairs let you out on two. Not your two. The music is down here somewhere, under the hum.',
  'Two again. Every door says 212.',
  'The sign says B. The carpet is the lobby’s. The music is close now.',
];

// ---------------------------------------------------------------- before the player
export function prebuild({ scene, lib, world, game }, { seed }) {
  const floors = SIZES.map(([w, h], level) => {
    const m = generate({ w, h, seed: (seed * 31 + level * 977) >>> 0, straight: [0.78, 0.68, 0.58][level], loops: [0.06, 0.1, 0.14][level] });
    const f = buildFloor({ scene, lib, world, game }, m, { origin: [-4, -40 * (level + 1), -4], level, seed: seed + level, label: LABELS[level] });
    world.zones.push(f.zone); world.sees[f.zone.id] = [];   // from down here, nothing of the hotel is drawn
    f.musicDist = distances(m, m.exit);
    for (const tv of f.tvs) tv.dist = distances(m, tv.cell);
    return f;
  });
  return floors;
}

// ---------------------------------------------------------------- install: once, at load
function install(ctx) {
  const { scene, world, lib, game, FLOOR2: y } = ctx;
  const a = ctx.audit = { state: 'off', t: 0, peeks: 0, floor: -1, next: 0, flights: 0, off: 0, began: 0, tvVoices: [], keyDead: false, dark: false };
  const act = () => ctx.director?.name;
  a.floors = ctx.floors;
  a.sc = createSoundscape(ctx.sound.synth, { economy: ctx.quality.economy });
  a.air = createAir(ctx.sound.synth, { economy: ctx.quality.economy });

  // The shape at the door: a man's height, drawn in no light at all.
  const fig = lib.person('rb-marcus-formal', { height: 1.86 });
  fig.root.traverse(m => { if (m.isMesh) { m.material = new T.MeshBasicMaterial({ color: '#020203' }); m.castShadow = false; } });
  const bone = name => { let b; fig.root.traverse(n => { if (!b && n.isBone && n.name.replace(/^mixamorig:?/, '') === name) b = n; }); return b; };
  fig.legs = [bone('LeftUpLeg'), bone('RightUpLeg')];
  // Everyone else in the hotel (walkers and seated guests; staff.js re-shows walkers every frame): out of sight all night.
  // ponytail: hidden each frame from the acts, not unscheduled; the hotel's people keep "living" invisibly.
  a.people = scene.children.filter(o => o !== world.clerk?.root && o.getObjectByProperty('isSkinnedMesh', true));
  scene.add(fig.root); fig.root.visible = false;
  a.figure = fig;
  a.place = z => { fig.root.position.set(DOOR_X, y, z); fig.root.rotation.y = 0; fig.update(0); face(fig, new T.Vector3(0, 0, 1)); fig.root.visible = true; };

  // Hall and stair lights, to turn cold or out.
  a.hall = world.lightAnchors.filter(l => l.pos.y > y + 2 && Math.abs(l.pos.z) < 0.5 && l.pos.y < y + 4).map(l => [l, l.intensity, l.color.clone()]);
  // the stair tower's wraparound lenses (world.js buildStairs), to go dark with their lights
  a.lenses = [];
  scene.traverse(o => { if (o.isMesh && o.material?.emissiveIntensity > 1 && [[10.75, 3.85, -8.36], [9.64, 2.35, -1.7], [11.3, y + 2.55, -1.14]].some(p => o.position.distanceTo(new T.Vector3(...p)) < 0.1)) a.lenses.push(o); });
  a.stair = world.lightAnchors.filter(l => [[10.75, 3.7, -7.9], [9.8, 2.25, -1.7], [11.3, y + 2.45, -1.4]].some(p => l.pos.distanceTo(new T.Vector3(...p)) < 0.3)).map(l => [l, l.intensity]);

  world.interact.push({ pos: new T.Vector3(DOOR_X, y + 1.55, 1.15), r: 0.9, when: p => act() === 'night' && p.z > 1 && world.room.angle < 0.1, label: () => 'Look through the peephole', use: () => peep(ctx) });

  // 212's lock, once the card is dead.
  let led = null;
  scene.traverse(o => { if (o.name === 'led' && !led && o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(DOOR_X, y + 1.1, 1)) < 1.2) led = o; });
  const RED = ['Red.', 'Red again. The lock whirs like it’s thinking about it, and doesn’t.', 'Red. On the other side of the door, your PTAC rattles on without you.'];
  let reds = 0;
  for (const it of world.interact) if (it.pos.distanceTo(new T.Vector3(DOOR_X, y + 1.1, 0.75)) < 0.45) {
    const use = it.use, label = it.label;
    it.label = () => a.keyDead && act() !== 'lobby' ? 'Tap key card' : label();
    it.use = () => {
      if (!a.keyDead || act() === 'lobby') return use();
      game.sound.beep(false);
      if (led) { const m = led.material; led.material = F.glow('#ff3b30', 3); setTimeout(() => (led.material = m), 900); }
      game.say(RED[Math.min(reds++, RED.length - 1)]);
    };
  }
  // The elevator: the call button lights; nothing comes.
  const CALLS = ['The button lights. Far down the shaft, something hums for a second, and stops.', 'Still lit. Nothing is coming.', 'You press it again. The light was already on.'];
  let calls = 0;
  for (const it of world.interact) if (it.label?.() === 'Call elevator') {
    const use = it.use;
    it.use = () => { use(); if (act() === 'night' || act() === 'lobby') setTimeout(() => game.say(CALLS[Math.min(calls++, CALLS.length - 1)]), calls ? 300 : 2600); };
  }

  // Down below: the TVs, and both stair doors on every floor.
  for (const f of a.floors) {
    const here = () => act() === 'below' && a.floor === f.level && !ctx.busy;
    f.tvs.forEach((tv, k) => {
      tv.channel = BROADCASTS[(k + f.level) % BROADCASTS.length];
      tv.tex = F.canvasTexture(256, 144, g => { g.fillStyle = '#000'; g.fillRect(0, 0, 256, 144); });
      tv.screen.material = new T.MeshBasicMaterial({ map: tv.tex, color: '#ffffff' });
      world.interact.push({ pos: tv.pos, r: 1.6, when: here, label: () => tv.on ? 'Turn off the TV' : 'Turn on the TV', use: () => {
        tv.on = !tv.on; game.sound.click(); a.off += tv.on ? -1 : 1;
        tv.screen.material.color.set(tv.on ? '#ffffff' : '#000000');
        if (!tv.on) game.say(a.off === 1 ? 'The picture shrinks to a dot. Under the quiet, the music again.' : 'Off.', 2.5);
      } });
    });
    world.interact.push({ pos: f.stairs.start.pos, r: 1.3, when: here, label: () => 'Stair door', use: () => game.say('It won’t open from this side. There’s no handle on this side.') });
    world.interact.push({ pos: f.stairs.exit.pos, r: 1.3, priority: 1, when: here, label: () => 'Take the stairs down', use: () => descend(ctx) });
  }

  // Dana, and whatever an earlier scene did with the desk and the bed.
  const checkIn = game.checkIn, event = game.event;
  game.checkIn = clerk => act() === 'lobby' ? dana(ctx, clerk) : checkIn?.(clerk);
  game.event = name => act() === 'night' || act() === 'below' ? undefined : event?.(name);
}

// Turn a rig to face a direction, reading which way it faces off its hips (after catherine/dream.js).
const UP = new T.Vector3(0, 1, 0);
function face(fig, dir) {
  fig.root.updateMatrixWorld(true);
  const [l, r] = fig.legs.map(b => b.getWorldPosition(new T.Vector3()));
  const fwd = l.sub(r).setY(0).normalize().cross(UP);
  fig.root.rotation.y += Math.atan2(dir.x, dir.z) - Math.atan2(fwd.x, fwd.z);
}

// ---------------------------------------------------------------- sound
async function loadAudio(ctx) {
  const a = ctx.audit;
  if (a.buffers || !a.air.ready) return;
  const music = (MUSIC ? a.air.decode(asset(MUSIC)) : Promise.resolve(null)).then(b => b ?? muzak());
  const tv = Promise.all(BROADCASTS.map(b => a.air.decode(asset(b.id))));
  a.buffers = { music: await music, tv: await tv };
  a.music = a.air.voice(a.buffers.music);
}
function knock(ctx, n = 3, vol = 0.5, gap = 0.9) {
  const s = ctx.sound.synth, at = [DOOR_X, ctx.FLOOR2 + 1.2, 1.0];
  ctx.audit.sc.at(at, dest => { for (let i = 0; i < n; i++) { s.burst(0.09, vol, 200, 'lowpass', i * gap, dest); s.tone(90, 0.12, vol * 0.2, 'sine', 0.7, i * gap, dest); } }, { range: 30, ref: 1.5 });
}
// Where a sound reaches you from on a floor, by walking: how many cells off (fractional, so it glides), and the point it
// seems to come from: the cell two steps toward it, or the source itself once it's in sight.
const _p = new T.Vector3();
function route(f, dist, from, src) {
  const cell = f.cellAt(from);
  if (cell < 0 || dist[cell] < 0) return null;
  if (dist[cell] === 0) return { steps: from.distanceTo(src) / C * 0.5, pos: src };
  const next = neighbours(f.m, cell).find(j => dist[j] === dist[cell] - 1);
  const steps = dist[next] + _p.copy(f.centre(next)).setY(from.y).distanceTo(from) / C;
  let c = next;
  if (dist[c] > 0) c = neighbours(f.m, c).find(j => dist[j] === dist[c] - 1);
  return { steps, pos: dist[c] === 0 && dist[cell] <= 2 ? src : f.centre(c).setY(f.origin[1] + 1.5) };
}

// ---------------------------------------------------------------- the peephole
function peep(ctx) {
  const { fx, FLOOR2: y, audit: a } = ctx;
  ctx.sound.synth.burst(0.05, 0.05, 2000);
  fx.set({ peep: 1 }, 0.35);
  const leave = () => { if (!ctx.view) return; ctx.view = null; fx.set({ peep: 0 }, 0.3); if (a.peeks === 2) a.figure.root.visible = false; };
  ctx.view = { pos: LENS.clone().setY(y + LENS.y), yaw: 0, pitch: -0.04, fov: 118, label: 'Step back', onUse: leave, onMove: leave };
  if (a.state !== 'knocked') return ctx.say('The hallway, bent round the lens. Empty.', 3);
  a.peeks++;
  if (a.peeks === 1) { a.place(-0.72); ctx.sound.synth.tone(46, 3, 0.09, 'sine', 0.9); setTimeout(() => ctx.say('Someone is standing across the hall, facing your door. The hall light is on, and none of it lands on them.', 5), 700); }
  else if (a.peeks === 2) { a.place(0.42); ctx.sound.synth.tone(41, 2.5, 0.12, 'sine', 0.9); setTimeout(() => ctx.say('Closer. Right up against the door. Nothing fogs the lens.', 4.5), 500); }
  else { a.figure.root.visible = false; setTimeout(() => ctx.say('Nobody. The hall is empty both ways.', 3.5), 500); }
}

// ---------------------------------------------------------------- moving between floors
function stepsDown(ctx, n = 16, gap = 0.34) {
  const s = ctx.sound.synth;
  for (let i = 0; i < n; i++) { const v = 0.22 * (1 - i / n * 0.5); s.burst(0.05, v, 700, 'lowpass', i * gap + (i % 9 === 8 ? 0.4 : 0)); s.tone(75, 0.08, v * 0.25, 'sine', 0.7, i * gap); }
}
async function descend(ctx) {
  const a = ctx.audit;
  if (ctx.busy) return;
  ctx.busy = true; a.flights++;
  stepsDown(ctx);
  const last = a.floor >= a.floors.length - 1;
  ctx.say(last ? 'Down. A landing. A door with a push bar, and light under it.' : ['Down. A landing. Down. More landings than there are floors.', 'Down. You stop counting the landings.'][Math.min(a.floor, 1)], 4.5);
  a.next = a.floor + 1;
  await ctx.director.go(last ? 'lobby' : 'below', { fadeOut: 0.8, fadeIn: 1.4 });
  ctx.busy = false;
}

// ---------------------------------------------------------------- Dana
async function dana(ctx, clerk) {
  const a = ctx.audit;
  if (a.state === 'dana') return;
  a.state = 'dana'; ctx.busy = true; ctx.goal('');
  clerk.root.lookAt(ctx.player.x, clerk.root.position.y, ctx.player.z);
  const mins = Math.round((performance.now() - a.began) / 60000);
  const script = [
    ['Wave', 'Dana: “Oh! You scared me. Couldn’t sleep?”'],
    ['Interact', 'Dana: “Locked out? Happens all the time, this hour. Give it here.”'],
    ['Interact', 'Dana: “Elevator’s been out since eleven. You took the stairs down?”'],
    ['Idle', `Dana: “Huh.” She slides the card back. “How many floors did you count?”`],
  ];
  for (const [anim, text] of script) { clerk.play(anim); ctx.say(text, 3.8); await new Promise(r => setTimeout(r, 4000)); }
  a.keyDead = false; ctx.game.sound.beep(true);
  a.stats = { flights: a.flights, off: a.off, minutes: mins, seed: ctx.seed };
  ctx.busy = false;
  ctx.next({ fadeOut: 2.5 });
}

// ---------------------------------------------------------------- acts
const night = {
  fadeIn: 1.5,
  async enter(ctx) {
    const { world, fx, FLOOR2: y, audit: a, game } = ctx;
    ctx.applyLook('night'); ctx.goal('');
    if (!game.has('key card')) game.give('key card');
    const room = world.room;
    room.setLamps(false); room.setBath(false); room.setDesk(false); room.drapes = 1; room.open = false; room.timer = 0;
    for (const w of world.walkers) { w.say0 ??= w.say; w.say = null; w.p.root.visible = false; if (w.cart) w.cart.visible = false; }
    if (world.clerk) world.clerk.root.visible = false;
    for (const [l, i] of a.hall) { l.intensity = i * 1.6; l.color.set('#f2f6ff'); }
    if (world.elevator) { world.elevator.stopped = true; if (world.elevator.floor) Object.assign(world.elevator, { floor: 0, y: 0, open: false }); }
    Object.assign(a, { state: 'asleep', t: 0, peeks: 0, keyDead: false, dark: false, heard: false, began: performance.now() });
    a.figure.root.visible = false;
    ctx.teleport(14.0, y, 5.0, 0.27, -0.05);
    fx.snap({ lids: 1, dream: 0.3, peep: 0, flash: 0 });
    await loadAudio(ctx);
  },
  update(dt, ctx) {
    const { world, fx, FLOOR2: y, audit: a, player, camera, game } = ctx;
    for (const o of a.people) o.visible = false;
    a.sc.update(camera, { wet: 0.12 }); a.air.update(camera);
    if (a.figure.root.visible) a.figure.update(dt);
    a.t += dt;
    const at = s => a.t > s && a.t - dt <= s;
    if (at(0.6)) fx.set({ lids: 0.35 }, 1.6);
    if (at(2.4)) fx.set({ lids: 0.8 }, 0.25);
    if (at(2.8)) { fx.set({ lids: 0 }, 1.8); ctx.say('3:13 AM. The PTAC has cycled off. It’s very quiet.', 4.5); }
    if (at(6.5) && a.state === 'asleep') { a.state = 'knocked'; knock(ctx); setTimeout(() => ctx.say('Three knocks at your door. Slow, like whoever it is has all night.', 4.5), 2600); }
    if (at(24) && a.state === 'knocked' && !a.peeks && world.room.angle < 0.05) { knock(ctx, 3, 0.75, 0.8); setTimeout(() => ctx.say('Again.', 2.5), 2200); }

    // The lobby's music, from its speaker a floor down: through a slab, you only hear it once you're out in the hall.
    const out = player.z < 1 && Math.abs(player.y - y) < 1.2, inStair = player.x > 9.4 && player.x < 12.1 && player.z < -1 && player.z > -8.6;
    a.music?.set({ gain: (inStair ? (a.dark ? 0.09 : 0.05) : out ? 0.035 : 0.006) * (1.6 / (1 + 0.04 * camera.position.distanceTo(SPEAKER))), cutoff: inStair ? 650 : 320, pos: SPEAKER }, 0.6);
    if (out && !a.heard && a.state === 'out') { a.heard = true; setTimeout(() => ctx.say('Somewhere under your feet, very faint: music. The lobby, playing to nobody.', 4.5), 2500); }

    // The door: whoever it was is gone. Step out and it swings shut behind you, and your card is dead.
    if (world.room.angle > 0.02 && a.figure.root.visible) a.figure.root.visible = false;
    if (a.state !== 'out' && a.state !== 'asleep' && out && player.x > 11 && player.x < 15) {
      a.state = 'out'; a.keyDead = true;
      world.room.open = false; world.room.timer = 0;
      setTimeout(() => { game.sound.thud(); ctx.say('Behind you the door swings shut. The latch clicks.', 3.5); }, 700);
      ctx.goal('Get down to the front desk');
    }
    // Stair A: the lights go on the way down, and the stairs keep going.
    if (a.state === 'out' && inStair && !a.dark && player.y < y - 0.6) {
      a.dark = true;
      for (const [l] of a.stair) l.intensity = 0;
      for (const o of a.lenses) { o.userData.lit ??= o.material; o.material = F.mat('#2a2a2a', { roughness: 0.6 }); }
      ctx.sound.synth.tone(120, 0.4, 0.05, 'sawtooth', 0.5); ctx.sound.synth.burst(0.12, 0.08, 3000, 'highpass');
      ctx.say('The stair lights tick off. The exit sign is enough to see the next step by.', 4);
    }
    const dim = a.dark && inStair ? 0.08 : 1;   // no lights: the room's reflections and fill go with them
    ctx.envScale += (dim - ctx.envScale) * Math.min(1, dt * 3); ctx.exposure += ((a.dark && inStair ? 0.7 : 1) - ctx.exposure) * Math.min(1, dt * 3);
    if (a.dark && inStair && player.y < 1.95 && player.z < -6.3 && !ctx.busy) {
      a.next = 0; ctx.busy = true; stepsDown(ctx, 20);
      ctx.say('The landing. Then another flight down, where the stairs should turn back up to one. Down. Down.', 5);
      ctx.director.go('below', { fadeOut: 1.0, fadeIn: 1.6 }).then(() => { ctx.busy = false; });
    }
  },
};

const below = {
  fadeIn: 1.4,
  enter(ctx) {
    const a = ctx.audit, f = a.floors[a.floor = a.next];
    const c = f.centre(f.m.start);
    ctx.teleport(c.x - 0.4, f.origin[1], c.z, -Math.PI / 2, 0);
    ctx.envScale = 0.8;
    for (const v of a.tvVoices) v?.stop();
    a.tvVoices = f.tvs.map((tv, k) => {
      const b = a.buffers?.tv[BROADCASTS.indexOf(tv.channel)];
      return a.air.voice(b, { tinny: true, offset: (k * 37.3 + f.level * 11) % 150 });
    });
    a.tick = 0;
    ctx.goal('Follow the music to the lobby');
    setTimeout(() => ctx.say(ARRIVE[f.level] ?? ARRIVE.at(-1), 5), 1200);
  },
  update(dt, ctx) {
    const a = ctx.audit, f = a.floors[a.floor], cam = ctx.camera.position;
    for (const o of a.people) o.visible = false;
    a.air.update(ctx.camera);
    if ((a.tick -= dt) <= 0) {
      a.tick = 0.1;
      const exit = f.stairs.exit.pos.clone().setY(f.origin[1] + 1.8);
      const r = route(f, f.musicDist, cam, exit);
      if (r) a.music?.set({ gain: 0.5 / (1 + 0.3 * r.steps), cutoff: 300 + 11000 * Math.exp(-0.38 * r.steps), pos: r.pos });
      f.tvs.forEach((tv, k) => {
        const v = a.tvVoices[k], q = route(f, tv.dist, cam, tv.pos);
        if (!v || !q) return;
        v.set({ gain: tv.on ? 0.95 / (1 + 0.7 * q.steps * q.steps) : 0, cutoff: 300 + 7500 * Math.exp(-0.75 * q.steps), pos: q.pos }, 0.15);
      });
    }
    // Screens: what's on, flickering with what's being said, only drawn when you're near enough to see.
    a.draw = (a.draw ?? 0) - dt;
    if (a.draw <= 0) {
      a.draw = 0.11;
      const t = performance.now() / 1000;
      f.tvs.forEach((tv, k) => {
        tv.light.intensity = tv.on ? 0.9 + 1.4 * (a.tvVoices[k]?.level() ?? 0.3) : 0;
        if (tv.on && tv.pos.distanceTo(cam) < 11) tv.tex.redraw((g, w, h) => screen(g, w, h, t + k * 13, tv.channel, a.tvVoices[k]?.level() ?? 0.3));
      });
    }
  },
  exit(ctx) {
    const a = ctx.audit;
    for (const v of a.tvVoices) v?.stop();
    a.tvVoices = [];
    ctx.envScale = 1;
  },
};

const lobby = {
  fadeIn: 1.8,
  enter(ctx) {
    const { world, audit: a } = ctx;
    for (const [l, i] of a.stair) l.intensity = i;
    for (const o of a.lenses) if (o.userData.lit) o.material = o.userData.lit;
    ctx.exposure = 1;
    ctx.teleport(10.1, 0, -1.65, Math.PI, 0);
    if (world.clerk) { world.clerk.root.visible = true; world.clerk.play?.('Idle'); }
    a.state = 'lobby';
    ctx.goal('Find Dana at the front desk');
    setTimeout(() => ctx.say('1 · STAIR A · EXIT TO LOBBY. The music is in the air out there, not under it.', 5), 1500);
  },
  update(dt, ctx) {
    const a = ctx.audit, cam = ctx.camera.position;
    for (const o of a.people) o.visible = false;
    a.air.update(ctx.camera);
    const inLobby = cam.x < 6.5 && cam.z > -9 && cam.z < 9 && cam.y < 3, inStair = cam.x > 9.4 && cam.x < 12.1 && cam.z < -1;
    const d = cam.distanceTo(SPEAKER);
    a.music?.set({ gain: 0.55 / (1 + 0.1 * d), cutoff: inLobby ? 14000 : inStair ? 900 : 2600, pos: SPEAKER }, 0.4);
  },
};

// A broadcast on a 256x144 screen. Old film: grain, a gate weave, a title now and then. The radar newsreel gets a sweep.
function screen(g, w, h, t, ch, level) {
  const tone = ch.look === 'sepia' ? [150, 124, 92] : [128, 128, 132];
  const lift = 0.55 + level * 0.9, k = c => Math.min(255, c * lift) | 0;
  g.fillStyle = `rgb(${k(tone[0] * 0.35)},${k(tone[1] * 0.35)},${k(tone[2] * 0.35)})`; g.fillRect(0, 0, w, h);
  const weave = Math.sin(t * 7) * 1.5, cycle = t % 28;
  if (cycle < 4) {   // a title card
    g.fillStyle = `rgb(${k(235)},${k(228)},${k(210)})`; g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center';
    g.fillText(ch.title, w / 2, h / 2 + weave);
  } else if (ch.look === 'radar') {
    g.strokeStyle = `rgba(${k(200)},${k(220)},${k(200)},.7)`; g.lineWidth = 1.5;
    for (const r of [20, 40, 60]) { g.beginPath(); g.arc(w / 2, h / 2 + weave, r, 0, 7); g.stroke(); }
    const ang = t * 1.6; g.beginPath(); g.moveTo(w / 2, h / 2 + weave); g.lineTo(w / 2 + Math.cos(ang) * 64, h / 2 + weave + Math.sin(ang) * 64); g.stroke();
  } else {   // figures in a room: a counter, someone behind it, someone walking past
    g.fillStyle = `rgb(${k(tone[0] * 0.7)},${k(tone[1] * 0.7)},${k(tone[2] * 0.7)})`; g.fillRect(0, h * 0.62 + weave, w, h);
    g.fillStyle = `rgb(${k(tone[0] * 0.18)},${k(tone[1] * 0.18)},${k(tone[2] * 0.18)})`;
    g.fillRect(90, 58 + weave, 18, 34); g.beginPath(); g.arc(99, 52 + weave, 8, 0, 7); g.fill();
    const x = ((t * 22) % (w + 60)) - 30; g.fillRect(x, 50 + weave, 16, 46); g.beginPath(); g.arc(x + 8, 44 + weave, 7, 0, 7); g.fill();
    g.fillRect(40, 84 + weave, 120, 26);
  }
  for (let i = 0; i < 260; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgba(${v},${v},${v},.25)`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
  if (Math.random() < 0.15) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(Math.random() * w, 0, 1, h); }   // a scratch
  const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
}

export const audit = { acts: { night, below, lobby }, start: 'night', install };
export { DESK };
