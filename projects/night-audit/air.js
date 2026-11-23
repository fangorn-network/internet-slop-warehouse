// SPDX-License-Identifier: CC0-1.0
// What you hear in the night audit: the lobby's music, and the TVs talking over it.
//
// A voice is a looping buffer through a low-pass (how many walls it came through), a gain and a panner. The panner never
// attenuates by distance: the act sets each voice's level and muffling from how far it is by walking, and puts the
// panner where the sound reaches you from (the next corner toward it), so music comes round corners, not through walls.
//
//   const air = createAir(sound.synth, { economy });
//   const v = air.voice(buffer, { tinny: true });   v.set({ gain, cutoff, pos });   v.stop();
//   air.update(camera)                               // the listener follows the camera
import * as T from 'three';

export function createAir(synth, { economy = false } = {}) {
  let ac = null, dry, wet;
  const fwd = new T.Vector3(), up = new T.Vector3(), at = new T.Vector3();
  function init() {
    if (ac || !synth.ctx) return !!ac;
    ac = synth.ctx;
    dry = ac.createGain(); dry.connect(synth.out);
    // A corridor's reverb: short, bright, a little flutter between hard parallel walls.
    const len = Math.floor(ac.sampleRate * 1.6), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4) * (1 + 0.3 * Math.sin(i / 90)); }
    const conv = ac.createConvolver(); conv.buffer = ir;
    wet = ac.createGain(); wet.gain.value = 0.22;
    wet.connect(conv).connect(synth.out);
    return true;
  }
  const voices = new Set();
  return {
    get ready() { return init(); },
    get ctx() { return init() ? ac : null; },
    /** A looping voice. tinny: through a TV's small speaker. Starts silent. */
    voice(buffer, { tinny = false, offset = 0, rate = 1 } = {}) {
      if (!init() || !buffer) return null;
      const src = ac.createBufferSource(); src.buffer = buffer; src.loop = true; src.playbackRate.value = rate;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.4;
      const g = ac.createGain(); g.gain.value = 0;
      const p = ac.createPanner();
      Object.assign(p, { panningModel: economy ? 'equalpower' : 'HRTF', distanceModel: 'linear', refDistance: 1, maxDistance: 1e4, rolloffFactor: 0 });
      const send = ac.createGain(); send.gain.value = 1;
      let head = src;
      if (tinny) {   // a TV speaker: no lows, a box resonance, no air
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 280;
        const pk = ac.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1800; pk.gain.value = 5; pk.Q.value = 1.2;
        const top = ac.createBiquadFilter(); top.type = 'lowpass'; top.frequency.value = 6500;
        src.connect(hp).connect(pk).connect(top); head = top;
      }
      head.connect(lp).connect(g).connect(p); p.connect(dry); p.connect(send).connect(wet);
      const analyser = ac.createAnalyser(); analyser.fftSize = 256; g.connect(analyser);
      const pre = ac.createAnalyser(); pre.fftSize = 256; head.connect(pre);   // the level at the source: what a screen flickers to
      src.start(0, offset % buffer.duration);
      const buf = new Float32Array(256);
      const v = {
        set({ gain, cutoff, pos, rate }, glide = 0.25) {
          const t = ac.currentTime;
          if (rate !== undefined) src.playbackRate.setTargetAtTime(rate, t, 0.8);   // tape sag: slow, so it groans rather than jumps
          if (gain !== undefined) g.gain.setTargetAtTime(gain, t, glide);
          if (cutoff !== undefined) lp.frequency.setTargetAtTime(cutoff, t, glide);
          if (pos) { p.positionX.setTargetAtTime(pos.x, t, 0.15); p.positionY.setTargetAtTime(pos.y, t, 0.15); p.positionZ.setTargetAtTime(pos.z, t, 0.15); }
        },
        /** Loudness at the source, 0..1 (for a screen's flicker). */
        level() { pre.getFloatTimeDomainData(buf); let s = 0; for (const x of buf) s += x * x; return Math.min(1, Math.sqrt(s / buf.length) * 4); },
        /** What reaches you, 0..1 (for checks). */
        heard() { analyser.getFloatTimeDomainData(buf); let s = 0; for (const x of buf) s += x * x; return Math.sqrt(s / buf.length); },
        get gain() { return g.gain.value; }, get cutoff() { return lp.frequency.value; },
        stop() { try { src.stop(); } catch { /* never started */ } g.disconnect(); voices.delete(v); },
      };
      voices.add(v);
      return v;
    },
    /** A one-off at a point: play(dest, synth) sends its voices into dest, through a low-pass at `cutoff`, at `gain`. */
    shot(pos, play, { gain = 1, cutoff = 20000 } = {}) {
      if (!init()) return;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff;
      const g = ac.createGain(); g.gain.value = gain;
      const p = ac.createPanner();
      Object.assign(p, { panningModel: economy ? 'equalpower' : 'HRTF', distanceModel: 'linear', refDistance: 1, maxDistance: 1e4, rolloffFactor: 0 });
      p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
      const send = ac.createGain(); send.gain.value = 1.3;   // far things are mostly reverb
      lp.connect(g).connect(p); p.connect(dry); p.connect(send).connect(wet);
      play(lp, synth);
      setTimeout(() => lp.disconnect(), 9000);
    },
    /** A bed under everything, not placed: room tone, a heartbeat in your own ears. */
    bed(buffer, { rate = 1 } = {}) {
      if (!init() || !buffer) return null;
      const src = ac.createBufferSource(); src.buffer = buffer; src.loop = true; src.playbackRate.value = rate;
      const g = ac.createGain(); g.gain.value = 0; src.connect(g).connect(dry); src.start();
      return { set({ gain, rate: r }, glide = 0.5) { const t = ac.currentTime; if (gain !== undefined) g.gain.setTargetAtTime(gain, t, glide); if (r !== undefined) src.playbackRate.setTargetAtTime(r, t, glide); }, get gain() { return g.gain.value; } };
    },
    async decode(url) {
      if (!init()) return null;
      try { return await ac.decodeAudioData(await (await fetch(url)).arrayBuffer()); } catch (e) { console.warn('night audit: could not load', url, e); return null; }
    },
    update(camera) {
      if (!init()) return;
      camera.getWorldPosition(at); camera.getWorldDirection(fwd); up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      const L = ac.listener, t = ac.currentTime;
      if (L.positionX) { L.positionX.setTargetAtTime(at.x, t, 0.02); L.positionY.setTargetAtTime(at.y, t, 0.02); L.positionZ.setTargetAtTime(at.z, t, 0.02);
        L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z; L.upX.value = up.x; L.upY.value = up.y; L.upZ.value = up.z; }
      else { L.setPosition(at.x, at.y, at.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z); }
    },
  };
}

// Until the real track arrives: a generic lobby loop, rendered once. Bossa-ish at 84 bpm in F, eight bars: a soft
// electric piano comping, a round bass, a vibraphone line, brushes. Royalty-free because nobody wrote it.
// ponytail: placeholder; swap for MUSIC in audit.js when there's a file.
export async function muzak(sampleRate = 22050) {
  const bpm = 84, beat = 60 / bpm, bars = 8, dur = bars * 4 * beat;
  const oc = new OfflineAudioContext(2, Math.ceil(dur * sampleRate), sampleRate);
  const out = oc.createGain(); out.gain.value = 0.5;
  const warm = oc.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200;
  out.connect(warm).connect(oc.destination);
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const note = (midi, t, len, { vol = 0.1, type = 'sine', partial = 2, pd = 0.25, trem = 0, pan = 0 } = {}) => {
    const g = oc.createGain(), p = oc.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(vol * 0.35, t + len * 0.5); g.gain.exponentialRampToValueAtTime(0.0005, t + len);
    const o = oc.createOscillator(); o.type = type; o.frequency.value = hz(midi); o.connect(g); o.start(t); o.stop(t + len + 0.05);
    if (partial) {   // a bell-ish upper partial that dies first: the tine
      const g2 = oc.createGain(); g2.gain.setValueAtTime(vol * pd, t); g2.gain.exponentialRampToValueAtTime(0.0005, t + Math.min(len, 0.5)); g2.connect(p);
      const o2 = oc.createOscillator(); o2.frequency.value = hz(midi) * partial; o2.connect(g2); o2.start(t); o2.stop(t + len);
    }
    if (trem) { const l = oc.createOscillator(), lg = oc.createGain(); l.frequency.value = trem; lg.gain.value = vol * 0.4; l.connect(lg).connect(g.gain); l.start(t); l.stop(t + len); }
  };
  // Fmaj7 Dm9 Gm7 C9 | Am7 D7b9 Gm7 C7
  const chords = [[53, [57, 60, 64, 65]], [50, [57, 60, 64, 65]], [55, [58, 62, 65, 69]], [48, [58, 62, 64, 67]], [57, [55, 60, 64, 67]], [50, [54, 57, 60, 63]], [55, [58, 62, 65, 69]], [48, [58, 64, 67, 70]]];
  const tune = [[72, 0, 1.5], [69, 1.5, 0.5], [67, 2, 2], [65, 4, 1], [69, 5, 1], [72, 6, 2], [70, 8, 1.5], [69, 9.5, 0.5], [67, 10, 2], [64, 12, 3], [65, 16, 1.5], [67, 17.5, 0.5], [69, 18, 2], [66, 20, 2], [65, 22, 2], [67, 24, 1], [70, 25, 1], [69, 26, 2], [67, 28, 3]];
  chords.forEach(([root, voicing], b) => {
    const t0 = b * 4 * beat;
    for (const [at, len] of [[0, 1.6], [1.5, 0.9], [3, 0.8]]) voicing.forEach((n, i) => note(n, t0 + at * beat + i * 0.008, len * beat, { vol: 0.045, pan: -0.25 + i * 0.12 }));
    note(root - 12, t0, 1.4 * beat, { vol: 0.2, type: 'triangle', partial: 0 });
    note(root - 12 + 7, t0 + 2 * beat, 1.4 * beat, { vol: 0.16, type: 'triangle', partial: 0 });
    note(root - 12 + 12, t0 + 3.5 * beat, 0.45 * beat, { vol: 0.1, type: 'triangle', partial: 0 });
  });
  for (const [n, at, len] of tune) note(n, at * beat, len * beat + 0.4, { vol: 0.07, partial: 4, pd: 0.15, trem: 5.5, pan: 0.2 });
  // Brushes: swept noise on the eighths, a soft accent on 2 and 4.
  const noise = oc.createBuffer(1, sampleRate, sampleRate); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  for (let i = 0; i < bars * 8; i++) {
    const t = i * beat / 2, s = oc.createBufferSource(); s.buffer = noise;
    const f = oc.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 6000; f.Q.value = 0.7;
    const g = oc.createGain(), v = i % 4 === 2 ? 0.05 : 0.02;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0005, t + beat * 0.45);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + beat * 0.5);
  }
  return oc.startRendering();
}

// ---------------------------------------------------------------- rendered once, offline
const render = async (seconds, fn, sampleRate = 22050) => { const oc = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate); fn(oc, sampleRate); return oc.startRendering(); };
const noiseOf = (oc, sr, seconds, brown = false) => {
  const b = oc.createBuffer(1, Math.ceil(sr * seconds), sr), d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; d[i] = brown ? (last = (last + 0.02 * w) / 1.02) * 3.5 : w; }
  const s = oc.createBufferSource(); s.buffer = b; return s;
};
/** Building air: a far air handler's rumble, mains hum, a ballast's whine. 8 s, loops. */
export const roomTone = () => render(8, (oc, sr) => {
  const n = noiseOf(oc, sr, 8, true), f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140;
  const g = oc.createGain(); g.gain.value = 0.9; n.connect(f).connect(g).connect(oc.destination); n.start();
  for (const [hz, v] of [[60, 0.05], [120, 0.035], [180, 0.012], [7800, 0.0025]]) { const o = oc.createOscillator(); o.frequency.value = hz; const og = oc.createGain(); og.gain.value = v; o.connect(og).connect(oc.destination); o.start(); }
});
/** Something breathing: slow, wet, too deep for the chest it comes from. In 1.6 s, out 2.4 s, a catch at the top. */
export const breath = () => render(8, (oc, sr) => {
  const n = noiseOf(oc, sr, 8), bp = oc.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 1.4;
  const lo = oc.createBiquadFilter(); lo.type = 'lowpass'; lo.frequency.value = 1600;
  const g = oc.createGain(); g.gain.value = 0; n.connect(bp).connect(lo).connect(g).connect(oc.destination); n.start();
  for (const t0 of [0, 4]) {
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 1.3); g.gain.linearRampToValueAtTime(0.05, t0 + 1.6);   // in, and it catches
    g.gain.linearRampToValueAtTime(0.75, t0 + 1.9); g.gain.exponentialRampToValueAtTime(0.01, t0 + 3.9);                              // out, long
    bp.frequency.setValueAtTime(700, t0); bp.frequency.linearRampToValueAtTime(430, t0 + 1.6); bp.frequency.linearRampToValueAtTime(300, t0 + 3.9);
    const o = oc.createOscillator(), og = oc.createGain(); o.frequency.setValueAtTime(58, t0 + 1.7); o.frequency.linearRampToValueAtTime(46, t0 + 3.6);   // a groan under the out-breath
    og.gain.setValueAtTime(0, t0 + 1.7); og.gain.linearRampToValueAtTime(0.35, t0 + 2.2); og.gain.linearRampToValueAtTime(0, t0 + 3.7); o.connect(og).connect(oc.destination); o.start(t0 + 1.7); o.stop(t0 + 3.8);
  }
});
/** Your own heart, in your ears: lub-dub at 60 bpm (play faster to race it). */
export const heartbeat = () => render(1, (oc) => {
  for (const [t, v] of [[0, 1], [0.28, 0.7]]) {
    const o = oc.createOscillator(), g = oc.createGain(); o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(oc.destination); o.start(t); o.stop(t + 0.2);
  }
});
