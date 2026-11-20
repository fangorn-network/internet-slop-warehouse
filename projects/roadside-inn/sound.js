// SPDX-License-Identifier: CC0-1.0. Footsteps and impacts: Kenney Impact Sounds (CC0; impacts in assets/impact-foley.json, loaded by assets.js as foley.impacts,
// provenance beside it). Everything else is synthesized here.
/** How loud a hit is, 0..1: by its energy (½mv²: 4 mJ is the quietest you'd hear, ~60 J, a dropped armchair, is full) and distance (m). */
export function impactLevel(kg, speed, distance = 0) {
  const energy = 0.5 * kg * speed * speed;
  if (energy < 0.004 || speed < 0.3) return 0;
  const level = Math.min(1, Math.log10(energy / 0.004) / 4.2) / (1 + distance * 0.3);
  return level < 0.02 ? 0 : level;
}
export function createSound(foley) {
  let ctx = null, master = null, muted = false;
  const steps = [], beds = {}, hits = {};

  async function start() {
    if (ctx) return ctx.resume();
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    // Ambient beds: highway rumble, HVAC hum, pool/hot-tub wash, elevator motor. Gains are driven by update().
    beds.highway = noiseBed(260, 0.6);
    beds.hvac = noiseBed(140, 1.5);
    beds.pool = noiseBed(1800, 0.4, 'bandpass');
    beds.motor = toneBed(92);
    for (const [k, url] of Object.entries(foley?.clips ?? {})) if (/footstep/.test(k)) {
      try { steps.push(await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer())); } catch { /* optional */ }
    }
    try {
      for (const [k, url] of Object.entries(foley?.impacts?.clips ?? {})) hits[k] = await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
    } catch { /* optional: impacts fall back to a synthesized knock */ }
  }
  function noise(seconds = 2) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }   // brown-ish
    return b;
  }
  function noiseBed(freq, q, type = 'lowpass') {
    const src = ctx.createBufferSource(); src.buffer = noise(4); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(master); src.start();
    return g;
  }
  function toneBed(freq) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.frequency.value = 300;
    const g = ctx.createGain(); g.gain.value = 0;
    o.connect(f).connect(g).connect(master); o.start();
    return g;
  }
  // dest: where the voice goes (default the master gain); remixes pass a panner to place it in the world.
  function tone(freq, time = 0.15, vol = 0.1, type = 'sine', bend = 1, delay = 0, dest = master) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * bend), t0 + time);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
    o.connect(g).connect(dest); o.start(t0); o.stop(t0 + time + 0.05);
  }
  function burst(time = 0.2, vol = 0.2, freq = 1200, type = 'bandpass', delay = 0, dest = master) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise(Math.max(0.1, time)); f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
    src.connect(f).connect(g).connect(dest); src.start(t0);
  }
  const fade = (g, v) => g && g.gain.setTargetAtTime(muted ? 0 : v, ctx.currentTime, 0.4);

  return {
    start,
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.7; return muted; },
    // where: {zone, indoor, highwayDistance, elevatorMoving}
    // roadLevel: 0..1 scale on the interstate bed (a remix can silence the road).
    update({ zone, indoor, highwayDistance, roadLevel = 1 }) {
      if (!ctx) return;
      const road = Math.min(0.5, 30 / Math.max(highwayDistance, 10)) * (indoor ? 0.12 : 1) * roadLevel;
      fade(beds.highway, road);
      fade(beds.hvac, indoor ? (zone === 'room' ? 0.06 : 0.035) : 0);
      fade(beds.pool, zone === 'pool' ? 0.05 : 0);
    },
    step(soft) {
      if (!ctx) return;
      if (!steps.length) return burst(0.06, soft ? 0.03 : 0.06, soft ? 500 : 1400);
      const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      src.buffer = steps[Math.floor(Math.random() * steps.length)];
      src.playbackRate.value = 0.9 + Math.random() * 0.2;
      f.type = 'lowpass'; f.frequency.value = soft ? 700 : 6000;
      g.gain.value = soft ? 0.25 : 0.35;
      src.connect(f).connect(g).connect(master); src.start();
    },
    // Something landed or hit: louder with the energy of the hit (½mv²), quieter with distance, silent when it's too light
    // or slow to hear (a key card settling, a pen nudged). material: wood, ceramic, plastic, metal, soft, paper.
    impact(material, kg, speed, distance = 0) {
      if (!ctx || muted) return;
      const level = impactLevel(kg, speed, distance), heavy = kg > 4, mid = kg > 1;
      if (!level) return;
      if (material === 'paper') return burst(0.07, 0.12 * level, 1800, 'bandpass');   // a slap of newsprint
      const pick = { wood: [heavy ? 'impactWood_heavy_000' : mid ? 'impactWood_medium_000' : 'impactWood_light_000', mid ? 'impactPlank_medium_000' : null],
        ceramic: ['impactPlate_light_000', 'impactPlate_light_001'], plastic: ['impactGeneric_light_000', 'impactGeneric_light_001'],
        metal: ['impactMetal_light_000'], soft: [mid ? 'impactSoft_heavy_000' : 'impactSoft_medium_000'] }[material] ?? ['impactGeneric_light_000'];
      const options = pick.filter(k => k && hits[k]);
      if (!options.length) return burst(0.08, 0.3 * level, heavy ? 160 : 900, 'lowpass');
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = hits[options[Math.floor(Math.random() * options.length)]];
      // small things ring higher, big ones lower
      src.playbackRate.value = Math.min(1.4, Math.max(0.75, 1.05 - 0.15 * Math.log10(kg))) * (0.95 + Math.random() * 0.1);
      g.gain.value = 0.7 * level;
      src.connect(g).connect(master); src.start();
    },
    ding() { tone(1318, 1.2, 0.12); tone(1046, 1.4, 0.1, 'sine', 1, 0.25); },
    beep(ok) { ok ? (tone(1760, 0.08, 0.08, 'square'), tone(2093, 0.12, 0.08, 'square', 1, 0.1)) : tone(330, 0.35, 0.08, 'square'); if (ok) burst(0.1, 0.08, 400, 'lowpass', 0.25); },
    click() { burst(0.03, 0.15, 3000); },
    knock() { for (let i = 0; i < 3; i++) burst(0.08, 0.5, 220, 'lowpass', i * 0.22); },
    thud() { burst(0.25, 0.5, 120, 'lowpass'); tone(70, 0.2, 0.15, 'sine', 0.6); },
    slide() { burst(1.0, 0.06, 500, 'bandpass'); tone(160, 0.9, 0.02, 'sawtooth', 1.3); },
    // a newspaper opened or a page turned: a few quick high crackles over a soft rustle (synthesized)
    paper() { burst(0.35, 0.05, 2600, 'bandpass'); for (let i = 0; i < 4; i++) burst(0.04, 0.06, 3500 + Math.random() * 2500, 'highpass', 0.04 + i * 0.06 + Math.random() * 0.03); },
    swish() { burst(0.6, 0.12, 2500, 'highpass'); },
    ice() { for (let i = 0; i < 18; i++) burst(0.05, 0.18, 2500 + Math.random() * 2500, 'bandpass', 0.3 + i * 0.07 + Math.random() * 0.05); tone(90, 1.5, 0.05, 'sawtooth'); },
    water() { burst(1.8, 0.12, 1500, 'bandpass'); },
    pour() { burst(1.4, 0.1, 900, 'bandpass'); },
    bell() { tone(2637, 1.5, 0.1); tone(3520, 1.2, 0.04); },
    vend() { tone(120, 0.6, 0.06, 'sawtooth'); burst(0.2, 0.6, 180, 'lowpass', 1.1); },
    hum(on) { fade(beds.motor, on ? 0.03 : 0); },
    // For remixes that add their own effects: the same synth voices, routed through the master gain and mute.
    synth: { tone: (...a) => ctx && tone(...a), burst: (...a) => ctx && burst(...a), noise: s => noise(s), get ctx() { return ctx; }, get out() { return master; } },
  };
}
