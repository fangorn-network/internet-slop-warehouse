// SPDX-License-Identifier: CC0-1.0
// The dream, after SDDb melvin-dreams 1993-01-10 (CC BY 4.0): "I heard the sound of walking heavily on a wooden floor,
// clomp, clomp… The ghost's name was Catherine… I reached out to touch the ghost, and my hand passed through it with only
// the faintest sensation of resistance… She was aware of me, and seemed to be bending to peer down, but I never saw her
// face. She reached down to touch me, and her hand passed through mine."
//
// wake: 3 AM in 212. Heavy steps on a wooden floor come down a carpeted hall and stop at your door. Through the peephole
// she is bent to it from the other side, the top of her head against the lens. Look away, look back: still there.
// Open the door: the hall is the house that stood here before the hotel, and the steps walk away from you on its boards.
// The bulbs dip; she is standing at the end of the hall with her back to you. Reach out.
// morning: you wake in 212, and the hall outside is quiet.
import * as T from 'three';
import { createSoundscape } from '../roadside-inn/stage/audio.js';
import { buildHouse, HOUSE_MODELS, X0, X1, Z, BULBS, CLOCK, CEIL } from './house.js';

const DOOR_X = 12.9;   // centre of 212's door (late-checkout/acts/night.js); the door plane is z = 1, the corridor is z < 1
const LENS = new T.Vector3(DOOR_X, 1.55, 0.93);   // y is added to FLOOR2
const END = new T.Vector3(29.1, 0, 0.05);           // where she stands in the house, facing the end wall
export const MODELS = HOUSE_MODELS;

// The house's own solids (its west wall and furniture), only while it stands. Call before the player is created: the
// physics world reads colliders once, and switches the ones with on() every step.
export function houseColliders(world, y, on) {
  const box = (x0, x1, z0, z1, h = CEIL) => world.colliders.push({ x0, x1, y0: y, y1: y + h, z0, z1, on });
  box(X0 - 0.2, X0, -1, 1);                                    // the hall ends here now
  box(CLOCK.x - 0.3, CLOCK.x + 0.3, -1, CLOCK.z + 0.24, 2.1);  // clock
  box(19.1, 20.1, Z - 0.5, 1, 0.95);                            // commode
  box(23.1, 24.1, -1, -Z + 0.4, 1.6);                           // bookshelf
}

// Pale, slightly translucent, lit from within at the edges. She keeps her own textures, drained of colour, so she reads as
// a person who is not quite there rather than a white mannequin.
function ghost(root) {
  root.traverse(m => {
    if (!m.isMesh) return;
    const mat = m.material;
    mat.color.set('#c9cdd0'); mat.roughness = 0.95; mat.metalness = 0;
    mat.emissive = new T.Color('#b9c6cf'); mat.emissiveIntensity = 0.11;   // she carries a little light of her own: pale in any dark
    mat.transparent = true; mat.opacity = 0.82; mat.depthWrite = true;
    mat.onBeforeCompile = s => {   // drain most of the colour from her maps; a faint rim where she meets the dark
      s.fragmentShader = s.fragmentShader
        .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), 0.7);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= 1.0 + 4.0 * pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 4.0);');
    };
    m.castShadow = false;
  });
}

// Bend her: from the waist, then the neck, about one world axis (her left-right, measured from her hips by face()),
// carried into each bone's own frame. Applied on top of the Idle clip every frame (the mixer overwrites bones).
// Rocketbox rig in Mixamo names: the legs hang off Spine and the arms off Neck, so the bend starts at Spine1, and the upper
// arms take the torso's bend back so they hang plumb instead of swinging out with it.
const _q = new T.Quaternion(), _p = new T.Quaternion(), _a = new T.Vector3();
const PEER = [['spine1', 0.22], ['spine2', 0.22], ['neck', 0.18], ['head', 0.85], ['armL', -0.62], ['armR', -0.62]];
const BOW = [['neck', 0.12], ['head', 0.3]];
function turn(figure, k, angle, axis = figure.left) {
  const b = figure.bones[k];
  b.parent.getWorldQuaternion(_p).invert();
  _q.setFromAxisAngle(_a.copy(axis).applyQuaternion(_p).normalize(), angle);
  b.quaternion.premultiply(_q);
  b.updateMatrixWorld(true);
}
export function bend(figure, amount, pose = PEER) {
  if (!amount) return;
  figure.root.updateMatrixWorld(true);
  for (const [k, angle] of pose) turn(figure, k, angle * amount);
}
// Turn her to face a world direction. Which way the rig faces isn't assumed: it's read off her hip joints (her left is
// where LeftUpLeg sits), then the root is turned by the difference. Keeps figure.left current for bend().
const UP = new T.Vector3(0, 1, 0);
export function face(figure, dir) {
  figure.root.updateMatrixWorld(true);
  const l = figure.bones.legL.getWorldPosition(new T.Vector3()), r = figure.bones.legR.getWorldPosition(new T.Vector3());
  const left = l.sub(r).setY(0).normalize(), fwd = left.clone().cross(UP);
  figure.root.rotation.y += Math.atan2(dir.x, dir.z) - Math.atan2(fwd.x, fwd.z);
  figure.root.updateMatrixWorld(true);
  figure.left = new T.Vector3().crossVectors(UP, new T.Vector3(dir.x, 0, dir.z).normalize());   // up × forward: a positive turn about it tips her forward
}

export async function prepare(ctx) {
  const { scene, world, lib, FLOOR2: y } = ctx;
  const d = ctx.dream = { state: 'off', t: 0, steps: null, peeks: 0, inHouse: false, near: 0 };
  const isWake = () => ctx.director?.name === 'wake';

  const figure = lib.person('rb-sophia-formal', { height: 1.68 });
  ghost(figure.root);
  figure.root.userData.dreamFigure = true;
  const bone = name => { let found; figure.root.traverse(n => { if (!found && n.isBone && n.name.replace(/^mixamorig:?/, '') === name) found = n; }); return found; };
  figure.bones = { legL: bone('LeftUpLeg'), legR: bone('RightUpLeg'), spine1: bone('Spine1'), spine2: bone('Spine2'), neck: bone('Neck'), head: bone('Head'), armL: bone('LeftArm'), armR: bone('RightArm'), foreR: bone('RightForeArm') };
  scene.add(figure.root);
  d.figure = figure;
  // At the door: stood where, bent, the back of her skull is a hand's width from the lens.
  d.atDoor = () => {
    figure.root.position.set(DOOR_X, y, 0.47); figure.root.rotation.y = 0;
    figure.update(0); face(figure, new T.Vector3(0, 0, 1)); bend(figure, 1);
    const head = figure.bones.head.getWorldPosition(new T.Vector3());
    figure.root.position.z += LENS.z - 0.45 - head.z;   // her whole head inside the lens, a forearm's length off
    d.pose = PEER;
  };
  // At the end of the house's hall, back to you, facing the end wall.
  d.atEnd = () => { figure.root.position.set(END.x, y + 0.012, END.z); figure.root.rotation.y = 0; figure.update(0); face(figure, new T.Vector3(1, 0, 0)); d.pose = BOW; };
  d.atDoor();
  figure.root.visible = false;

  d.house = await buildHouse(ctx);

  // Sodium light from the lot through 212's window; the hall burns cold and hard.
  d.windowLight = { pos: new T.Vector3(14.25, y + 1.9, 10.4), color: new T.Color('#ffb46b'), intensity: 0, distance: 8, outdoor: true };
  world.lightAnchors.push(d.windowLight);
  d.hall = world.lightAnchors.filter(a => a.pos.y > y + 2 && Math.abs(a.pos.z) < 0.5 && !a.outdoor && !d.house.lights.includes(a)).map(a => [a, a.intensity, a.color.clone()]);

  try { d.foley = await (await fetch(globalThis.WAREHOUSE_PARTS?.['kenney-wood-foley'] ?? new URL('./assets/wood-foley.json', import.meta.url))).json(); } catch { d.foley = null; }
  d.sc = createSoundscape(ctx.sound.synth, { economy: ctx.quality.economy });

  // The hotel's own interactions (knock on doors, the ice machine…) don't exist in the house.
  for (const it of world.interact) { const w = it.when; it.when = p => !d.inHouse && (!w || w(p)); }
  world.interact.push(
    { pos: new T.Vector3(DOOR_X, y + 1.55, 1.15), r: 0.9, when: p => isWake() && p.z > 1 && world.room.angle < 0.1, label: () => 'Look through the peephole', use: () => peep(ctx) },
    { pos: END.clone().setY(y + 1.3), r: 1.6, priority: 2, when: () => isWake() && d.state === 'there', label: () => 'Reach out', use: () => reach(ctx) },
  );
}

// ---------- sound ----------
let buffers = null;
async function decode(ctx) {
  const ac = ctx.sound.synth.ctx;
  if (buffers || !ac || !ctx.dream.foley) return buffers;
  buffers = {};
  for (const [k, uri] of Object.entries(ctx.dream.foley.clips)) buffers[k] = await ac.decodeAudioData(await (await fetch(uri)).arrayBuffer());
  return buffers;
}
// A wooden clip at a point, through the soundscape (so it gets the hall's reverb and HRTF placement).
function wood(ctx, pos, { kind = 'footstep_wood', rate = 0.75, gain = 0.9, cutoff = 1500 } = {}) {
  const ac = ctx.sound.synth.ctx;
  if (!ac || !buffers) return;
  const names = Object.keys(buffers).filter(k => k.startsWith(kind));
  ctx.dream.sc.at(pos, dest => {
    const src = ac.createBufferSource(); src.buffer = buffers[names[Math.floor(Math.random() * names.length)]];
    src.playbackRate.value = rate * (0.95 + Math.random() * 0.1);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
    const g = ac.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(dest); src.start();
  }, { range: 40, ref: 1.5 });
}
// Her step: a boot on old boards. The heel, then the board giving a little under the weight.
function clomp(ctx, pos, heavy = 1) {
  wood(ctx, pos, { rate: 0.7, gain: 1.1 * heavy, cutoff: 1400 });
  ctx.dream.sc.at(pos, dest => ctx.sound.synth.tone(68, 0.22, 0.12 * heavy, 'sine', 0.75, 0.01, dest), { range: 40, ref: 1.5 });
}
// The house's sounds, built once the audio context exists: a clock that ticks where it stands, bulbs that hum, the hall's
// air, a presence near her. All muted until the house is up (the soundscape mutes loops whose on() is false).
function houseAudio(ctx) {
  const d = ctx.dream, { sc, figure } = d, y = ctx.FLOOR2, inHouse = () => d.inHouse;
  if (d.audioReady) return; d.audioReady = true;
  const synth = ctx.sound.synth;
  // Grandfather clock: tick and tock a second apart, slightly different, a long wooden case behind them.
  sc.loop([CLOCK.x, y + 1.4, CLOCK.z], (ac, out) => {
    let n = 0;
    const id = setInterval(() => {
      const hi = n++ % 2 === 0;
      synth.burst(0.018, 0.5, hi ? 3200 : 2500, 'bandpass', 0, out);
      synth.tone(hi ? 1180 : 960, 0.07, 0.06, 'sine', 0.98, 0, out);
      synth.tone(190, 0.12, 0.05, 'sine', 0.9, 0, out);   // the case
    }, 1000);
    return () => clearInterval(id);
  }, { range: 22, gain: 0.55, on: inHouse });
  // Each bulb: mains hum and its harmonic, thin, only heard close.
  for (const x of BULBS) sc.loop([x, y + CEIL - 0.1, 0], (ac, out) => {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 240; f.Q.value = 6;
    o.connect(f).connect(out); o.start(); return () => o.stop();
  }, { range: 5, gain: 0.05, on: inHouse });
  // Near her: two low tones a hair apart, beating, louder as you come.
  d.presence = sc.loop([END.x, y + 1.2, END.z], (ac, out) => {
    const a = ac.createOscillator(), b = ac.createOscillator(); a.frequency.value = 55; b.frequency.value = 55.6;
    const g = ac.createGain(); g.gain.value = 0.5; a.connect(g); b.connect(g); g.connect(out); a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, { range: 14, gain: 0.35, on: () => inHouse() && figure.root.visible });
  // The house's air: low wind in old walls, not spatial.
  const ac = synth.ctx, air = ac.createBufferSource(); air.buffer = synth.noise(4); air.loop = true;
  const af = ac.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 220;
  d.air = ac.createGain(); d.air.gain.value = 0;
  air.connect(af).connect(d.air).connect(synth.out); air.start();
  // Your own steps are on wood in the house: the player calls sound.step; borrow it while the house stands.
  const step = ctx.sound.step.bind(ctx.sound);
  ctx.sound.step = soft => d.inHouse ? wood(ctx, [ctx.player.x, y + 0.05, ctx.player.z], { rate: 0.9, gain: 0.55, cutoff: 2200 }) : step(soft);
}

// A walk: steps from `from` to `to`, one every `gap` seconds, ticking in update().
const walk = (from, to, count, gap) => ({ from: new T.Vector3(...from), to: new T.Vector3(...to), count, gap, i: 0, t: 0 });
function tickWalk(ctx, w, dt) {
  if (!w || w.i >= w.count) return true;
  if ((w.t -= dt) > 0) return false;
  w.t = w.gap * (0.92 + Math.random() * 0.16);
  clomp(ctx, w.from.clone().lerp(w.to, w.i / Math.max(1, w.count - 1)).toArray(), w.i % 2 ? 0.85 : 1);
  w.i++;
  return false;
}

// ---------- the peephole ----------
function peep(ctx) {
  const { fx, FLOOR2: y, dream: d } = ctx;
  ctx.sound.synth.burst(0.05, 0.05, 2000);   // the viewer's cover sliding aside
  fx.set({ peep: 1 }, 0.35);
  const leave = () => { if (!ctx.view) return; ctx.view = null; fx.set({ peep: 0 }, 0.3); };
  ctx.view = { pos: LENS.clone().setY(y + LENS.y), yaw: 0, pitch: -0.04, fov: 118, label: 'Step back', onUse: leave, onMove: leave };
  if (d.state !== 'waiting') return ctx.say('The hallway, bent round the lens. Empty.', 3);
  d.peeks++;
  if (d.peeks === 1) ctx.sound.synth.tone(46, 3, 0.09, 'sine', 0.9);
  setTimeout(() => ctx.say(d.peeks === 1 ? 'A woman, right up against your door. Her head is bowed to it. You can’t see her face.' : 'Still there. She hasn’t moved. She is waiting for you to open it.', 4.5), 700);
}

// ---------- reaching ----------
async function reach(ctx) {
  const { dream: d, fx, sound, player } = ctx;
  if (d.state !== 'there') return;
  d.state = 'touching'; ctx.busy = true; ctx.frozen = true;
  const s = sound.synth, wait = ms => new Promise(r => setTimeout(r, ms));
  // In, slowly, toward the middle of her back.
  const from = new T.Vector3(player.x, 0, player.z), to = new T.Vector3(END.x - 0.45, 0, END.z);
  d.lean = { from, to, t: 0, len: 2.6 };
  s.tone(110, 3, 0.05, 'sine', 1.5); s.burst(3, 0.04, 400, 'lowpass');
  fx.set({ dream: 0.85 }, 2.5);
  await wait(1600);
  ctx.say('Your hand goes into her. Only the faintest resistance, like the surface of cold water.', 5);
  s.tone(880, 2.5, 0.025, 'sine', 0.99); s.tone(882.5, 2.5, 0.025, 'sine', 0.99);
  await wait(2600);
  // She reaches back, without turning.
  d.reachT = 0;
  ctx.say('She reaches back without turning. Her hand passes through yours.', 5);
  await wait(2400);
  s.tone(60, 1.2, 0.15, 'sine', 0.5); s.burst(0.8, 0.12, 3000, 'highpass');
  await fx.to({ flash: 1 }, 0.25);
  ctx.director.go('morning', { fadeOut: 0.6, fadeIn: 3 });
}

export const wake = {
  fadeIn: 1.5,
  async enter(ctx) {
    const { world, fx, FLOOR2: y, dream: d } = ctx;
    ctx.applyLook('night'); ctx.goal('');
    if (!ctx.game.has('key card')) ctx.game.give('key card');
    const room = world.room;
    room.setLamps(false); room.setBath(false); room.setDesk(false); room.drapes = 1; room.open = false; room.timer = 0;
    for (const w of world.walkers) { w.say0 ??= w.say; w.say = null; w.p.root.visible = false; if (w.cart) w.cart.visible = false; }
    if (world.clerk) world.clerk.root.visible = false;
    d.windowLight.intensity = 2.6;
    for (const [a, i] of d.hall) { a.intensity = i * 1.7; a.color.set('#f2f6ff'); }
    d.state = 'asleep'; d.t = 0; d.peeks = 0; d.figure.root.visible = false; d.atDoor();
    ctx.teleport(14.0, y, 5.0, 0.27, -0.05);
    fx.snap({ lids: 1, dream: 0.55, peep: 0, flash: 0 });
    await decode(ctx);
    houseAudio(ctx);
  },
  update(dt, ctx) {
    const { world, fx, FLOOR2: y, dream: d, house = d.house } = ctx;
    d.sc.update(ctx.camera, { wet: d.inHouse ? 0.38 : 0.12 });
    if (d.air) d.air.gain.setTargetAtTime(d.inHouse ? 0.05 : 0, d.air.context.currentTime, 0.8);
    house.update(dt, d.t);
    d.figure.update(dt);
    if (d.figure.root.visible) {
      d.figure.root.updateMatrixWorld(true);
      bend(d.figure, 1, d.pose);
      if (d.reachT !== undefined) {   // her right arm comes back toward you, palm open
        d.reachT = Math.min(1, d.reachT + dt / 2.2);
        const k = d.reachT * d.reachT * (3 - 2 * d.reachT);
        turn(d.figure, 'armR', -1.05 * k); turn(d.figure, 'foreR', -0.35 * k);
      }
    }
    if (d.lean) {   // your scripted lean in while reaching
      d.lean.t = Math.min(1, d.lean.t + dt / d.lean.len);
      const p = d.lean.from.clone().lerp(d.lean.to, d.lean.t * d.lean.t * (3 - 2 * d.lean.t));
      ctx.player.x = p.x; ctx.player.z = p.z;
      const yaw = Math.atan2(-(END.x - p.x), -(END.z - p.z));
      ctx.controls.setLook(yaw, -0.12);
    }
    d.t += dt;
    const at = s => d.t > s && d.t - dt <= s;
    if (at(0.6)) fx.set({ lids: 0.35 }, 1.6);
    if (at(2.4)) fx.set({ lids: 0.8 }, 0.25);
    if (at(2.8)) { fx.set({ lids: 0 }, 1.8); ctx.say('3:13 AM. Somewhere out in the hall, someone is walking on a wooden floor.', 5); }
    // Up the hall from the west wing, slow and heavy, to your door. The hall is carpet.
    if (at(4) && d.state === 'asleep') { d.state = 'coming'; d.steps = walk([0, y + 0.05, 0.2], [DOOR_X - 0.2, y + 0.05, 0.2], 16, 0.78); }
    if (d.state === 'coming' && tickWalk(ctx, d.steps, dt)) {
      d.state = 'waiting'; d.figure.root.visible = true; d.figure.play('Idle');
      setTimeout(() => ctx.say('The footsteps stop outside your door.', 3.5), 900);
    }
    // The door starts to open, and the hall behind it is a different hall. She is gone; the steps walk away on its boards.
    if (world.room.angle > 0.02 && d.state === 'waiting') {
      d.state = 'gone'; d.inHouse = true; house.show(true); d.figure.root.visible = false;
      ctx.envScale = 0.12; ctx.exposure = 0.85;   // no hotel-room reflections in an unlit old house: its bulbs are the light
      fx.set({ dream: 0.32 }, 2);   // the house is warm and close; the dream grade eases so its bulbs read amber
      for (const [a] of d.hall) a.intensity = 0;
      ctx.sound.synth.burst(1.6, 0.05, 300, 'lowpass');   // the hotel's air going out like a held breath
      d.steps = walk([DOOR_X + 0.6, y + 0.05, 0.1], [END.x - 0.3, y + 0.05, END.z], 21, 0.82);
      setTimeout(() => ctx.say('Floorboards. Wallpaper. A bulb on a chain. The steps walk away from you, toward the end of the hall.', 5.5), 1200);
    }
    // The last step lands. The bulbs dip, and she is there.
    if (d.state === 'gone' && tickWalk(ctx, d.steps, dt)) {
      d.state = 'dip'; d.dipT = 0;
      ctx.sound.synth.tone(52, 0.6, 0.08, 'sine', 0.8);
    }
    if (d.state === 'dip') {
      d.dipT += dt;
      for (const a of house.lights) { a.intensity = d.dipT < 0.5 ? a.base * 0.08 : a.base; a.bulb.traverse(n => { if (n.isMesh) n.material.emissiveIntensity = d.dipT < 0.5 ? 0.1 : 1.2; }); }
      if (d.dipT > 0.25 && !d.figure.root.visible) { d.atEnd(); d.figure.root.visible = true; d.figure.play('Idle'); }
      if (d.dipT > 0.5) { d.state = 'there'; setTimeout(() => ctx.say('A woman, at the end of the hall. White, a little transparent. Her back to you.', 5), 600); }
    }
    d.windowLight.intensity = world.room.drapes > 0.5 ? 2.6 : 0.5;
  },
  exit(ctx) {
    const d = ctx.dream;
    d.house.show(false); d.inHouse = false; ctx.envScale = 1; ctx.exposure = 1; d.figure.root.visible = false; d.reachT = undefined; d.lean = null;
    ctx.busy = false; ctx.frozen = false; ctx.view = null;
  },
};

export const morning = {
  enter(ctx) {
    const { world, fx, FLOOR2: y, dream: d } = ctx;
    for (const [a, i, c] of d.hall) { a.intensity = i; a.color.copy(c); }
    world.room.open = false; world.room.timer = 0; world.room.drapes = 1;
    d.state = 'morning';
    ctx.teleport(14.0, y, 5.0, 0.27, -0.05);
    fx.snap({ flash: 0, lids: 1, dream: 0.12, peep: 0 });
    setTimeout(() => fx.set({ lids: 0 }, 2.5), 2600);
    setTimeout(() => ctx.say('4:02 AM. The PTAC rattles on. The hall outside is quiet.', 5), 4200);
    setTimeout(() => ctx.next(), 12000);
  },
  update(dt, ctx) { ctx.dream.sc.update(ctx.camera, { wet: 0.12 }); },
};

// The scene (see intro.js for the contract): starts in bed in 212 at 3 AM, ends when you wake.
export const catherine = { acts: { wake, morning }, start: 'wake', install: prepare };
