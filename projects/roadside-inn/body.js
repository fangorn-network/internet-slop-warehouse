// SPDX-License-Identifier: CC0-1.0
// Body: how a person holds still, shifts, breathes, blinks, walks and looks, from the study in GAIT-AND-POSE.md.
// Pure logic and numbers, no renderer and no rig: a character part (people.js) feeds it what the person can see and
// hear and applies what it returns to bones. Meant to be published with intent.js as the "behaviour" part kind:
// intent decides what someone is doing (go, wait, sit, attend to the TV); body decides how it looks while they do it.
//
// Positions are [x, y, z] metres, angles radians, yaw about +y with 0 facing +z. Randomness comes from `rng` (a
// () => [0, 1) function) so tests can seed it.
//
// Manner (per person, all optional; defaults from STUDY):
//   { notice: m,          // glance at someone coming within this far, in view (7)
//     civil: m,           // don't stare at someone passing closer than this (2.5)
//     engage: m,          // someone stopped this close gets looked at (2.2; a clerk on duty: 3.2)
//     linger: s,          // ...after standing there this long (1.5; on duty: 0.3)
//     share: 0..1,        // how much of the time they then look at them vs what they were doing (0.5; on duty: 0.85)
//     away: 0..1,         // how often they look at nothing in particular (0.2)
//     hold: s }           // median time between standing weight shifts (22)
// Sense (each tick):
//   { head: [x,y,z], facing: yaw, task: { at, kind } | null, social: { at, speed } | null, noise: at | null }
//   task kinds: 'tv' | 'phone' | 'screen' | 'work' | 'path'; social is the player (or whoever they'd look at).

const D = Math.PI / 180;

/** The study's numbers (GAIT-AND-POSE.md, section 7). Medians are seconds; [median, sigma] are lognormal. */
export const STUDY = {
  breath: { perMin: [12, 16], cv: 0.12, inhale: 0.4, chest: 0.5 * D, shoulder: 0.7 * D },
  sway: { m: 0.006, hz: [0.12, 0.31] },
  stand: { hold: [22, 0.6], min: 8, max: 90, shift: [1.4, 2.2] },
  sit: { shift: 3.5 },
  blink: { perMin: 17, screenPerMin: 7, dur: 0.15, shiftOver: 25 * D, shiftP: 0.6 },
  gaze: { eyeMax: 25 * D, eyeFree: 10 * D, headYaw: 70 * D, headPitch: [-40 * D, 25 * D], pitchFree: 8 * D, torsoYaw: 30 * D, omega: 6, omegaSound: 10, latency: [0.15, 0.3] },
  look: { tv: [7, 1.0], phone: [6, 0.8], screen: [5, 0.8], work: [4, 0.8], path: [2, 0.5], glance: [1.0, 0.4], social: [2.6, 0.5], away: [1.6, 0.5], noise: [2.2, 0.4] },
  interest: { tv: 0.8, phone: 0.85, screen: 0.85, work: 0.75, path: 0.75 },
  social: { notice: 7, civil: 2.5, engage: 2.2, linger: 1.5, share: 0.5, view: 100 * D },
  walk: { ratio: 0.0064, ahead: 3.5 },
};

export const lognormal = ([median, sigma], rng = Math.random, lo = 0.2, hi = Infinity) => {
  const n = Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());   // Box-Muller
  return Math.min(hi, Math.max(lo, median * Math.exp(sigma * n)));
};
/** Minimum-jerk easing: how people move between two held positions (zero velocity and acceleration at both ends). */
export const minJerk = k => { k = Math.min(1, Math.max(0, k)); return k * k * k * (10 - 15 * k + 6 * k * k); };

/** Walking at v m/s: cadence (steps/min) and step length (m) from the walk ratio (Sekiya & Nagasaki 1998). */
export function cadence(v, ratio = STUDY.walk.ratio) {
  const C = Math.sqrt(60 * Math.max(v, 0.05) / ratio);
  return { C, L: 60 * v / C };
}

/** Breathing: tick(dt) → how far into the in-breath, 0..1 (rises over 40 % of the cycle, falls over 60 %). */
export function breather(rng = Math.random) {
  const [a, b] = STUDY.breath.perMin, base = 60 / (a + rng() * (b - a));
  let t = rng() * base, period = base;
  return {
    tick(dt) {
      t += dt;
      if (t >= period) { t -= period; period = base * (1 + STUDY.breath.cv * (rng() * 2 - 1) * 1.7); }   // ±CV-ish, uniform
      const k = t / period, i = STUDY.breath.inhale;
      return k < i ? (1 - Math.cos(Math.PI * k / i)) / 2 : (1 + Math.cos(Math.PI * (k - i) / (1 - i))) / 2;
    },
  };
}

/** Postural sway about the ankles: tick(dt) → [x, z] metres, millimetres in size, slow (two incommensurate sines). */
export function sway(rng = Math.random) {
  const { m, hz: [f1, f2] } = STUDY.sway, p = [rng(), rng(), rng(), rng()].map(v => v * 7);
  let t = 0;
  return { tick(dt) { t += dt; const s = (f, ph) => Math.sin(2 * Math.PI * f * t + ph); return [m * (0.35 * s(f1, p[0]) + 0.15 * s(f2, p[1])), m * (0.6 * s(f1 * 0.83, p[2]) + 0.25 * s(f2 * 1.1, p[3]))]; } };
}

/**
 * Held stances and the shifts between them (standing weight shifts; seated posture changes pass `to`).
 * tick(dt) → { from, to, w } (blend w from stance `from` to `to`, min-jerk). go(i, dur) starts a shift now.
 */
export function stance(n, { hold = STUDY.stand.hold[0], rng = Math.random } = {}) {
  const S = STUDY.stand, wait = () => lognormal([hold, S.hold[1]], rng, S.min, S.max);
  const st = { from: Math.floor(rng() * n), to: 0, k: 1, dur: 1, left: wait() };
  st.to = st.from;
  const go = (i, dur = S.shift[0] + rng() * (S.shift[1] - S.shift[0])) => { if (i === st.to && st.k >= 1) return; st.from = st.k >= 1 ? st.to : st.k < 0.5 ? st.from : st.to; st.to = i; st.k = 0; st.dur = dur; };
  return {
    state: st, go,
    tick(dt) {
      if (st.k < 1) { st.k = Math.min(1, st.k + dt / st.dur); if (st.k >= 1) { st.from = st.to; st.left = wait(); } }
      else if (n > 1 && (st.left -= dt) <= 0) go((st.to + 1 + Math.floor(rng() * (n - 1))) % n);
      return { from: st.from, to: st.to, w: minJerk(st.k) };
    },
  };
}

/** Blinks: tick(dt, { screen, shift }) → lid closure 0..1. Fewer on a screen; often one with a big gaze shift. */
export function blinker(rng = Math.random) {
  const B = STUDY.blink;
  let next = rng() * 4, t = -1;
  return {
    tick(dt, { screen = false, shift = 0 } = {}) {
      next -= dt;
      if (shift > B.shiftOver && t < 0 && rng() < B.shiftP) next = 0;
      if (next <= 0 && t < 0) { t = 0; next = -Math.log(1 - rng()) * 60 / (screen ? B.screenPerMin : B.perMin) + B.dur; }
      if (t < 0) return 0;
      t += dt; if (t >= B.dur) { t = -1; return 0; }
      return Math.sin(Math.PI * t / B.dur);
    },
  };
}

/** Split a gaze direction (yaw, pitch relative to the body) into eyes, head and torso (eye-head coordination). */
export function split(yaw, pitch, { seated = false } = {}) {
  const G = STUDY.gaze, s = Math.sign(yaw), a = Math.abs(yaw);
  const head = s * Math.min(G.headYaw, Math.max(0, a - G.eyeFree));
  const torso = s * Math.min(seated ? G.torsoYaw / 2 : G.torsoYaw, Math.max(0, a - G.eyeFree - G.headYaw));
  const hp = Math.sign(pitch) * Math.max(0, Math.abs(pitch) - G.pitchFree);
  return { head: [head, Math.min(G.headPitch[1], Math.max(G.headPitch[0], hp))], torso, eyes: [yaw - head - torso, pitch - hp] };
}

/**
 * Attention: what the person looks at, one fixation at a time. tick(dt, sense) → { id, at, lead, changed }:
 * id 'task' | 'social' | 'away' | 'noise' | null; at the point; lead 'eyes' (visual) or 'head' (a sound).
 */
export function attention(manner = {}, rng = Math.random) {
  const S = STUDY.social, M = { notice: S.notice, civil: S.civil, engage: S.engage, linger: S.linger, share: S.share, away: 0.2, ...manner };
  const st = { id: null, at: null, left: 0, lead: 'eyes', pending: null, after: null, d: Infinity, still: 0, engaged: false, seen: false };
  const flat = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  function focus(id, at, dur, lead = 'eyes') { const changed = id !== st.id || id === 'away'; Object.assign(st, { id, at, left: dur, lead }); return changed; }
  function awayPoint(s) {
    const yaw = s.facing + (rng() * 2 - 1) * 50 * D, pitch = (-25 + rng() * 30) * D;
    return [s.head[0] + 3 * Math.sin(yaw) * Math.cos(pitch), s.head[1] + 3 * Math.sin(pitch), s.head[2] + 3 * Math.cos(yaw) * Math.cos(pitch)];
  }
  return {
    state: st,
    tick(dt, s) {
      let changed = false;
      st.left -= dt;
      // the other person: how far, in view, stopped near us, just arrived within noticing distance
      let d = Infinity, inView = false, passing = false, entered = false;
      if (s.social) {
        const at = s.social.at; d = flat(at, s.head);
        inView = Math.abs(at[1] - s.head[1]) < 1.5 && Math.abs(wrap(Math.atan2(at[0] - s.head[0], at[2] - s.head[2]) - s.facing)) < S.view;
        const moving = (s.social.speed ?? 0) > 0.3;
        st.still = d < M.engage && !moving ? st.still + dt : 0;
        if (!st.engaged && st.still > M.linger) { st.engaged = true; changed = focus('social', at, lognormal(STUDY.look.social, rng)) || changed; }
        if (st.engaged && (d > M.engage + 0.8 || !inView)) st.engaged = false;
        passing = !st.engaged && moving && d < M.civil;
        entered = inView && d <= M.notice && !st.seen; st.seen = inView && d <= M.notice + 0.5;
      } else { st.engaged = false; st.seen = false; st.still = 0; }
      st.d = d;
      // a noise: oriented to after a short latency, head first; often a look at whoever is about afterwards
      if (s.noise) st.pending = { at: s.noise, in: STUDY.gaze.latency[0] + rng() * (STUDY.gaze.latency[1] - STUDY.gaze.latency[0]) };
      if (st.pending && (st.pending.in -= dt) <= 0) { changed = focus('noise', st.pending.at, lognormal(STUDY.look.noise, rng), 'head') || changed; st.pending = null; st.after = rng() < 0.6 ? 'social' : null; }
      else if (entered && st.id !== 'noise' && !st.engaged) changed = focus('social', s.social.at, lognormal(STUDY.look.glance, rng)) || changed;
      if (st.id === 'social' && passing) st.left = Math.min(st.left, 0);   // civil inattention: no staring as they pass
      if (st.id === 'social' && (!s.social || !inView)) st.left = Math.min(st.left, 0);
      if (st.id === 'task' && !s.task) st.left = Math.min(st.left, 0);
      if (st.left <= 0) {
        const w = {};
        if (s.task) w.task = STUDY.interest[s.task.kind] ?? 0.75;
        w.away = M.away * (st.id === 'away' ? 0.3 : 1) * (s.task ? 1 : 3);
        if (s.social && inView && d < M.notice && !passing) w.social = st.engaged ? (w.task ?? 0.3) * M.share / (1 - M.share) + 0.3 : d > 4 ? 0.12 : 0.04;
        if (st.after === 'social' && s.social && d < 8) { w.social = (w.social ?? 0) + 2; st.after = null; }
        if (st.id === 'social' && st.engaged && w.task) w.task *= 1.4;   // look away between looks at someone
        let r = rng() * Object.values(w).reduce((a, b) => a + b, 0), pick = 'away';
        for (const [k, v] of Object.entries(w)) { if ((r -= v) <= 0) { pick = k; break; } }
        const L = STUDY.look;
        if (pick === 'task') changed = focus('task', s.task.at, lognormal(st.engaged ? L.glance : L[s.task.kind] ?? L.work, rng)) || changed;   // with someone there: a glance back at it
        else if (pick === 'social') changed = focus('social', s.social.at, lognormal(st.engaged ? L.social : L.glance, rng)) || changed;
        else changed = focus('away', awayPoint(s), lognormal(L.away, rng)) || changed;
      }
      if (st.id === 'social' && s.social) st.at = s.social.at;   // following someone who moves (smooth pursuit)
      if (st.id === 'task' && s.task) st.at = s.task.at;
      return { id: st.id, at: st.at, lead: st.lead, changed };
    },
  };
}
