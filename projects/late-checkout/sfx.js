// SPDX-License-Identifier: CC0-1.0
// Late Checkout's sound, all synthesized and placed in the world (roadside-inn/stage/audio.js does the placing).
// Before the turn: a hotel at night, machines humming where they stand, the interstate outside, a radio at the travel stop.
// After it: the interstate goes silent, a low drone comes up, the building makes noises somewhere else (footsteps
// overhead, a door down the hall, a knock that isn't yours), the radio slows and goes flat. From 5 AM a heartbeat,
// faster as six gets closer.
import { createSoundscape } from '../roadside-inn/stage/audio.js';
import { at, DAWN } from './run/clock.js';
import { DOORS } from './run/spots.js';

const WET = { lobby: 0.22, pool: 0.5, gym: 0.25, corridor: 0.32, stairs: 0.55, elevator: 0.12, room: 0.1, 'travel stop': 0.18 };

export function createSfx(ctx, run) {
  const { sound, world, FLOOR2: Y, quality } = ctx;
  const synth = sound.synth;
  const sc = createSoundscape(synth, { economy: quality.economy });
  const night = () => run.phase === 'night';

  // ---------- machines ----------
  const hum = (f, cutoff = 220, wobble = 0) => (c, out) => {
    const o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g2 = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2 + wobble; g2.gain.value = 0.5;
    lp.type = 'lowpass'; lp.frequency.value = cutoff;
    o.connect(lp).connect(out); o2.connect(g2).connect(out); o.start(); o2.start();
  };
  const buzz = f => (c, out) => {   // fluorescent / neon: mains harmonics through a bandpass, a little noise
    const o = c.createOscillator(), bp = c.createBiquadFilter(), n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    o.type = 'square'; o.frequency.value = f; bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 2.5;
    n.buffer = synth.noise(3); n.loop = true; nf.type = 'highpass'; nf.frequency.value = 3000; ng.gain.value = 0.25;
    o.connect(bp).connect(out); n.connect(nf).connect(ng).connect(out); o.start(); n.start();
  };
  sc.loop([6.0, 1.0, -6.0], hum(58, 180), { range: 9, gain: 0.05 });                 // snack and drinks machines
  sc.loop([7.5, Y + 1.0, 3.6], hum(49, 260, 0.7), { range: 9, gain: 0.06 });          // ice machine compressor
  sc.loop([34, 8, 45], buzz(120), { range: 26, gain: 0.03 });                         // the pole sign
  sc.loop([-70, 2.8, 119], buzz(120), { range: 18, gain: 0.025 });                    // travel stop fluorescents
  sc.loop([-74, 1.2, 123.4], hum(52, 200), { range: 10, gain: 0.04 });                // its coolers

  // ---------- the radio in the back of the travel stop: an original slow tune, AM-filtered; after the turn it drags ----------
  const TUNE = [57, 60, 64, 62, 60, 57, 55, 57, 0, 60, 62, 64, 67, 64, 62, 60, 0, 0];   // MIDI, 0 = rest
  sc.loop([-64.5, 1.8, 117.6], (c, out) => {
    const o = c.createOscillator(), env = c.createGain(), bp = c.createBiquadFilter(), crackle = c.createBufferSource(), cg = c.createGain();
    o.type = 'triangle'; env.gain.value = 0; bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.9;
    crackle.buffer = synth.noise(4); crackle.loop = true; cg.gain.value = 0.12;
    o.connect(env).connect(bp).connect(out); crackle.connect(cg).connect(bp); o.start(); crackle.start();
    let i = 0, next = c.currentTime + 0.1;
    const id = setInterval(() => {
      const slow = night() ? 1.6 : 1, flat = night() ? -0.45 : 0;
      while (next < c.currentTime + 1.5) {
        const n = TUNE[i++ % TUNE.length], d = 0.42 * slow;
        if (n) { o.frequency.setValueAtTime(440 * 2 ** ((n + flat - 69) / 12), next); env.gain.setValueAtTime(0.0001, next); env.gain.exponentialRampToValueAtTime(0.5, next + 0.03); env.gain.exponentialRampToValueAtTime(0.0001, next + d * 0.95); }
        next += d;
      }
    }, 500);
    return () => clearInterval(id);
  }, { range: 14, gain: 0.06 });

  // ---------- TVs: channel 13 hisses where the set stands ----------
  for (const tv of ctx.game.tvs) {
    const p = tv.screen.getWorldPosition(new ctx.THREE.Vector3());
    sc.loop([p.x, p.y, p.z], (c, out) => { const n = c.createBufferSource(), f = c.createBiquadFilter(); n.buffer = synth.noise(3); n.loop = true; f.type = 'highpass'; f.frequency.value = 1500; n.connect(f).connect(out); n.start(); },
      { range: 9, gain: 0.05, on: () => tv.st.on && tv.st.channel === run.channel13 });
  }

  // ---------- the figure: a thin high tone and a low pressure, close up only ----------
  const whine = sc.loop([0, -50, 0], hum(41, 90, 2400 - 82), { range: 14, gain: 0.05, on: () => run.figure.root.visible });

  // ---------- after the turn: a drone under everything, and the building making noises elsewhere ----------
  let pad = null, nextEvent = 20, beatIn = 0;
  function ensurePad() {
    if (pad || !synth.ctx) return pad;
    const c = synth.ctx, g = c.createGain(); g.gain.value = 0; g.connect(synth.out);
    for (const [f, type] of [[55, 'sine'], [55.6, 'sine'], [82.4, 'triangle']]) { const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = f; og.gain.value = type === 'sine' ? 0.5 : 0.12; o.connect(og).connect(g); o.start(); }
    const n = c.createBufferSource(), lp = c.createBiquadFilter(), ng = c.createGain(); n.buffer = synth.noise(4); n.loop = true; lp.type = 'lowpass'; lp.frequency.value = 160; ng.gain.value = 0.6; n.connect(lp).connect(ng).connect(g); n.start();
    return (pad = g);
  }
  const doorPos = () => { const d = DOORS[Math.floor(Math.random() * DOORS.length)]; return d.pos; };
  const EVENTS = [
    () => { const p = ctx.player; for (let i = 0; i < 6; i++) setTimeout(() => sc.at([p.x + 2 - i * 0.7, p.y + Y + 0.2, p.z + 1], d => synth.burst(0.07, 0.35, 260, 'lowpass', 0, d)), i * 620); },  // footsteps overhead
    () => sc.at(doorPos(), d => { synth.burst(0.25, 0.6, 120, 'lowpass', 0, d); synth.tone(70, 0.2, 0.2, 'sine', 0.6, 0, d); }, { range: 30 }),   // a door shuts down the hall
    () => sc.at(doorPos(), d => { for (let i = 0; i < 3; i++) synth.burst(0.08, 0.6, 220, 'lowpass', i * 0.3, d); }, { range: 30 }),             // someone else's knock
    () => sc.at([7.75, Y + 2.3, -0.9], d => { synth.tone(1245, 1.2, 0.09, 'sine', 1, 0, d); synth.tone(1108, 1.4, 0.08, 'sine', 1, 0.3, d); }, { range: 30 }),  // the elevator, off key
    () => sc.at([7.5, Y + 1, 3.6], d => { for (let i = 0; i < 14; i++) synth.burst(0.05, 0.25, 2600 + Math.random() * 2000, 'bandpass', i * 0.07, d); }, { range: 22 }),  // the ice machine dumps
    () => sc.at([ctx.player.x, ctx.player.y - 0.5, ctx.player.z + 3], d => synth.tone(48, 2.6, 0.18, 'sawtooth', 1.4, 0, d), { range: 12 }),  // a pipe in the wall
  ];

  return {
    sc,
    /** A knock that comes from a door, not from everywhere. */
    knock(p, times = 3) { if (!sc.ready) return sound.knock(); sc.at(p, d => { for (let i = 0; i < times; i++) synth.burst(0.08, 0.7, 220, 'lowpass', i * 0.22, d); }); },
    ring(p) { sc.at(p, d => { synth.tone(440, 0.9, 0.12, 'sine', 1, 0, d); synth.tone(480, 0.9, 0.12, 'sine', 1, 0, d); }, { range: 90, ref: 3 }); },
    slide(p) { sc.at(p, d => synth.burst(0.6, 0.2, 2200, 'highpass', 0, d)); },
    update(dt, zone) {
      const n = night();
      sc.update(ctx.camera, { wet: (WET[zone] ?? 0.05) * (n ? 1.7 : 1) });
      const f = run.figure.root; if (f.visible) whine.move([f.position.x, f.position.y + 1.6, f.position.z]);
      sound.roadLevel = n ? 0.06 : 1;
      if (!ensurePad()) return;
      const t = synth.ctx.currentTime;
      pad.gain.setTargetAtTime(n ? 0.05 + 0.05 * Math.min(1, (run.clock.now - at(0)) / (DAWN - at(0))) : 0, t, 2);
      if (n && (nextEvent -= dt) <= 0) { nextEvent = 14 + Math.random() * 26; EVENTS[Math.floor(Math.random() * EVENTS.length)](); }
      // The last hour: a heartbeat, from one beat a second and a quarter to almost two a second.
      const left = DAWN - run.clock.now;
      if (n && left < 60 && (beatIn -= dt) <= 0) {
        const k = 1 - left / 60; beatIn = 1.25 - 0.7 * k;
        synth.tone(52, 0.16, 0.25 + 0.25 * k, 'sine', 0.7); synth.tone(46, 0.18, 0.18 + 0.2 * k, 'sine', 0.7, 0.22);
      }
    },
  };
}
