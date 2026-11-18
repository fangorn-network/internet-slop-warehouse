// SPDX-License-Identifier: CC0-1.0
// A soundscape on top of a Web Audio context: sounds placed in the world, one shared reverb whose wetness follows the
// room you're in, looping emitters, and a scheduler for distant one-offs. Phones get the cheap equal-power panner;
// emitters beyond their range are muted at the gain, so a hotel full of hums costs a handful of nodes' worth.
//
//   const sc = createSoundscape(sound.synth, { economy });
//   sc.at([x, y, z], dest => synth.burst(0.08, 0.5, 220, 'lowpass', 0, dest));   // a knock on that door
//   const hum = sc.loop([x, y, z], (ctx, out) => …connect a source to out…, { range: 12, gain: 0.05 });
//   sc.update(camera, { wet: 0.3 });                                              // every frame
import * as T from 'three';

export function createSoundscape(synth, { economy = false } = {}) {
  let ready = false, ctx, dry, wetIn, wetGain;
  const loops = [], fwd = new T.Vector3(), up = new T.Vector3(), pos = new T.Vector3();

  function init() {
    if (ready || !synth.ctx) return ready;
    ctx = synth.ctx;
    dry = ctx.createGain(); dry.connect(synth.out);
    // Reverb: a generated impulse (decaying stereo noise), shared by every placed sound through one send.
    const len = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    wetIn = ctx.createGain(); wetGain = ctx.createGain(); wetGain.gain.value = 0.2;
    wetIn.connect(conv).connect(wetGain).connect(synth.out);
    for (const l of loops) build(l);
    return (ready = true);
  }
  function panner({ range = 20, ref = 1.2 } = {}) {
    const p = ctx.createPanner();
    Object.assign(p, { panningModel: economy ? 'equalpower' : 'HRTF', distanceModel: 'inverse', refDistance: ref, maxDistance: range, rolloffFactor: 1.6 });
    const send = ctx.createGain(); send.gain.value = 1;
    p.connect(dry); p.connect(send).connect(wetIn);
    return p;
  }
  const place = (p, [x, y, z]) => { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; };
  function build(l) {
    l.panner = panner(l); place(l.panner, l.pos);
    l.gainNode = ctx.createGain(); l.gainNode.gain.value = 0; l.gainNode.connect(l.panner);
    l.stop = l.make(ctx, l.gainNode, synth) ?? (() => {});
  }

  return {
    get ready() { return init(); },
    /** For checks: each loop's position, range and current gain. */
    debug: () => loops.map(l => ({ pos: l.pos, range: l.range, gain: l.gainNode?.gain.value ?? 0 })),
    /** A one-shot at a point: play(dest) sends its voice into dest. */
    at(p, play, opts) { if (!init()) return; const pn = panner(opts); place(pn, p); play(pn); setTimeout(() => pn.disconnect(), 8000); },
    /** A looping emitter. make(ctx, out, synth) connects its sources to out and may return a stop function. */
    loop(p, make, { range = 14, gain = 0.05, on = () => true } = {}) {
      const l = { pos: [...p], make, range, gain, on, level: 1 };
      loops.push(l); if (ready) build(l);
      return { move(p2) { l.pos = [...p2]; if (l.panner) place(l.panner, l.pos); }, set level(v) { l.level = v; }, get level() { return l.level; } };
    },
    /** Every frame: the listener follows the camera; loops out of range or switched off are muted. wet: reverb send 0..1. */
    update(camera, { wet = 0.2 } = {}) {
      if (!init()) return;
      camera.getWorldPosition(pos); camera.getWorldDirection(fwd); up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      const L = ctx.listener, t = ctx.currentTime;
      if (L.positionX) { L.positionX.setTargetAtTime(pos.x, t, 0.02); L.positionY.setTargetAtTime(pos.y, t, 0.02); L.positionZ.setTargetAtTime(pos.z, t, 0.02);
        L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z; L.upX.value = up.x; L.upY.value = up.y; L.upZ.value = up.z; }
      else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z); }
      wetGain.gain.setTargetAtTime(wet, t, 0.3);
      for (const l of loops) {
        const d = Math.hypot(l.pos[0] - pos.x, l.pos[1] - pos.y, l.pos[2] - pos.z);
        l.gainNode.gain.setTargetAtTime(d < l.range && l.on() ? l.gain * l.level : 0, t, 0.25);
      }
    },
  };
}
