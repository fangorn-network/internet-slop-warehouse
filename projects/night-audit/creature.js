// SPDX-License-Identifier: CC0-1.0
// What was at your door. It comes down the stairs after you, a while after you arrive on each floor, and looks for you.
//
// It goes cell to cell like you do. It hears by walking distance, not through walls: running carries seven cells,
// walking two or three, crouching nothing; doors and TV switches carry four. It sees down a straight hall. Searching it
// drifts toward wherever you are, slowly, as if it can smell the general idea of you; when it hears you it comes faster;
// when it sees you it runs, a little slower than you can. In a guest room with the door shut it can't see you, but it
// can come and stand outside: three slow knocks, like the first ones. If the door's unlocked, it opens it.
// You hear it before you see it: one heavy foot and one that drags, breathing too deep for its chest, the downlights
// stuttering where it passes, the music sagging like a tape being slowed by a thumb, your own heart.
import * as T from 'three';
import { distances, neighbours, route, DIRS, C } from './maze.js';

const SPEED = { search: 0.85, hunt: 1.25, chase: 2.25, door: 0, look: 0 };
const ARRIVE = [38, 26, 16];   // seconds after you reach each floor before it comes down after you
const _v = new T.Vector3(), _d = new T.Vector3();

export function createCreature(ctx, fig) {
  const a = ctx.audit, s = ctx.sound.synth;
  // Which way the rig faces at rotation 0 (read off its hips), so it can be turned to face where it walks.
  fig.root.rotation.y = 0; fig.update(0); fig.root.updateMatrixWorld(true);
  const [l, r] = fig.legs.map(b => b.getWorldPosition(new T.Vector3()));
  const fwd = l.sub(r).setY(0).normalize().cross(new T.Vector3(0, 1, 0)), base = -Math.atan2(fwd.x, fwd.z);
  const head = (() => { let h; fig.root.traverse(n => { if (!h && n.isBone && /Head$/.test(n.name)) h = n; }); return h; })();
  const neck = (() => { let h; fig.root.traverse(n => { if (!h && n.isBone && /Neck$/.test(n.name)) h = n; }); return h; })();

  const c = {
    state: 'off', f: null, pos: new T.Vector3(), cell: -1, target: -1, field: null, timer: 0, stride: 0, threat: 0, seen: false,
    noise: 0, heard: null, lastSeen: 0, room: null, waitAt: null, catches: 0, from: null,
  };

  /** A new floor: it isn't here yet. */
  c.enter = (f, delay = ARRIVE[f.level] ?? 16) => {
    Object.assign(c, { f, state: 'away', timer: delay, threat: 0, room: null, target: -1, seen: false });
    fig.root.visible = false;
    for (const l of f.lights) l.base ??= l.intensity;
  };
  c.leave = () => { c.state = 'off'; fig.root.visible = false; restoreLights(); };
  /** Something you did made a sound: how far it carries, in cells. */
  c.hear = cells => { c.noise = Math.max(c.noise, cells); };

  const centre = i => c.f.centre(i);
  const setTarget = t => { if (t === c.target && c.field) return; c.target = t; c.field = distances(c.f.m, t); };
  const playerSpot = () => {   // the cell you're in, or the hall cell outside your room
    const p = ctx.camera.position, rm = c.f.roomAt(p), cell = rm ? rm.cell : c.f.cellAt(p);
    return { cell, rm };
  };
  function lineOfSight(from, to) {   // straight down an open hall
    const m = c.f.m, ax = from % m.w, az = (from / m.w) | 0, bx = to % m.w, bz = (to / m.w) | 0;
    if (from === to) return true;
    if (ax !== bx && az !== bz) return false;
    const d = ax === bx ? (bz > az ? 2 : 0) : (bx > ax ? 1 : 3);
    let i = from, n = 0;
    while (i !== to && n++ < 8) { if (!(m.open[i] & (1 << d))) return false; i = m.at(i % m.w + DIRS[d][0], ((i / m.w) | 0) + DIRS[d][1]); }
    return i === to;
  }
  function wander(near) {   // somewhere 2–6 cells from where you are, but not right where it already is
    c.room = null;
    const dist = distances(c.f.m, near), pool = [];
    for (let i = 0; i < dist.length; i++) if (dist[i] >= 2 && dist[i] <= 6 && i !== c.cell) pool.push(i);
    setTarget(pool.length ? pool[Math.floor(Math.random() * pool.length)] : near);
  }

  // ---------------------------------------------------------------- sound
  function placed(play, { loud = 1, reach = 0.5 } = {}) {   // a one-off from where it is, heard by walking distance
    const field = c.cell >= 0 ? distances(c.f.m, c.cell) : null;
    const q = field && route(c.f, field, ctx.camera.position, c.pos.clone().setY(c.f.origin[1] + 1.2));
    if (!q) return;
    a.air.shot(q.pos, play, { gain: loud / (1 + reach * q.steps * q.steps), cutoff: 250 + 9000 * Math.exp(-0.55 * q.steps) * (q.muffled ? 0.25 : 1) });
  }
  function step() {
    const drag = c.stride++ % 2;
    placed(dest => {
      s.burst(0.09, 0.6, 150, 'lowpass', 0, dest); s.tone(52, 0.18, 0.22, 'sine', 0.7, 0, dest);
      if (drag) s.burst(0.42, 0.06, 1900, 'bandpass', 0.06, dest);   // the other foot doesn't lift
    }, { loud: 1.1, reach: 0.35 });
  }
  const knock = () => placed(dest => { for (let i = 0; i < 3; i++) { s.burst(0.09, 0.65, 200, 'lowpass', i * 1.1, dest); s.tone(90, 0.12, 0.15, 'sine', 0.7, i * 1.1, dest); } }, { loud: 1.4, reach: 0.2 });
  const rattle = () => placed(dest => { for (let i = 0; i < 5; i++) s.burst(0.05, 0.3, 2400, 'bandpass', i * 0.11 + Math.random() * 0.03, dest); }, { loud: 1.2, reach: 0.2 });
  const stairDoor = () => placed(dest => { s.burst(0.12, 0.7, 300, 'lowpass', 0, dest); s.tone(1500, 0.9, 0.02, 'sawtooth', 0.6, 0.15, dest); s.burst(0.25, 0.6, 120, 'lowpass', 2.1, dest); }, { loud: 1.2, reach: 0.12 });
  function sting() {   // it has seen you: two low notes rubbing, a swell of air
    const out = ctx.sound.synth.out;
    s.tone(49, 2.4, 0.12, 'sawtooth', 0.98, 0, out); s.tone(51.9, 2.4, 0.1, 'sawtooth', 0.98, 0, out); s.burst(1.6, 0.08, 500, 'lowpass', 0, out);
  }

  // ---------------------------------------------------------------- lights
  function restoreLights() { for (const l of c.f?.lights ?? []) if (l.base !== undefined) l.intensity = l.base; }
  function lights() {
    for (const l of c.f.lights) {
      const d = Math.hypot(l.pos.x - c.pos.x, l.pos.z - c.pos.z);
      l.intensity = fig.root.visible && d < 3.4 ? l.base * (Math.random() < 0.35 ? 0.05 : 0.25 + 0.5 * (d / 3.4)) : l.base;
    }
  }

  // ---------------------------------------------------------------- caught
  async function caught() {
    c.state = 'caught'; ctx.busy = true; ctx.frozen = true; c.catches++;
    const cam = ctx.camera.position, h = head?.getWorldPosition(new T.Vector3()) ?? c.pos.clone().setY(c.f.origin[1] + 1.8);
    ctx.controls.setLook(Math.atan2(-(h.x - cam.x), -(h.z - cam.z)), Math.atan2(h.y - cam.y, Math.hypot(h.x - cam.x, h.z - cam.z)));
    const out = s.out;
    a.music?.set({ gain: 0 }, 0.05); a.bedTone?.set({ gain: 0 }, 0.05);
    s.burst(0.5, 0.9, 90, 'lowpass', 0, out); s.tone(38, 2.5, 0.4, 'sine', 0.6, 0, out); s.burst(1.2, 0.25, 3000, 'highpass', 0.02, out);
    await ctx.fx.to({ flash: 1 }, 0.12);
    ctx.fx.snap({ fade: 1, flash: 0 });
    ctx.say(['It doesn’t have a face. You knew it wouldn’t.', 'Up close it is only the shape of someone.', 'It is colder than the hall.'][Math.min(c.catches - 1, 2)], 4);
    await new Promise(r => setTimeout(r, 3500));
    const st = centre(c.f.m.start);
    ctx.teleport(st.x - 0.4, c.f.origin[1], st.z, -Math.PI / 2, 0);
    c.enter(c.f, 24);
    ctx.say('The stair door, behind you. The same floor. It will come down again.', 4);
    ctx.frozen = false; ctx.busy = false;
    await ctx.fx.to({ fade: 0 }, 1.6);
  }

  // ---------------------------------------------------------------- every frame
  let tick = 0;
  c.update = dt => {
    if (c.state === 'off' || c.state === 'caught' || !c.f) return;
    if (c.state === 'away') {
      if ((c.timer -= dt) > 0) return;
      c.cell = c.f.m.start; c.pos.copy(centre(c.cell)); c.pos.x -= 0.6;
      c.state = 'search'; fig.root.visible = true; fig.play('Walk');
      fig.root.scale.setScalar(1 + 0.07 * c.f.level);   // a little taller every floor down
      stairDoor();
      if (!a.met) { a.met = true; setTimeout(() => ctx.say('Behind you, back the way you came: the stair door, and its closer hissing shut. Something else has come down.', 5.5), 2500); }
      wander(playerSpot().cell);
    }
    const p = ctx.camera.position, { cell: pc, rm } = playerSpot();
    const shut = rm && rm.door.angle < 0.1;
    // senses, four times a second
    if ((tick -= dt) <= 0) {
      tick = 0.25;
      const i = ctx.controls.input, moving = Math.hypot(i.x, i.z) > 0.1;
      c.hear(moving ? (i.crouch ? 0 : i.run ? 7 : 2.5) : 0);
      const toYou = pc >= 0 ? distances(c.f.m, pc)[c.cell] : 99, carried = c.noise * (shut ? 0.5 : 1);
      const sees = pc >= 0 && !shut && (rm ? c.cell === pc : lineOfSight(c.cell, pc)) && toYou <= 7;
      if (sees) {
        if (c.state !== 'chase') { if (!c.seen) sting(); c.seen = true; }
        c.state = 'chase'; c.lastSeen = 0; setTarget(pc); c.room = rm;
      } else if (c.state === 'chase' && (c.lastSeen += 0.25) > 4) { c.state = 'hunt'; }
      else if (c.state !== 'chase' && c.state !== 'door' && toYou <= carried) { c.state = 'hunt'; setTarget(pc); c.room = rm; }
      c.noise = 0;
      c.threat += ((c.state === 'chase' ? 1 : Math.max(0, 1 - toYou / 6)) - c.threat) * 0.35;
    }
    // where it goes
    if (c.state === 'door') {
      c.timer -= dt;
      if (c.timer < 4.5 && !c.knocked) { c.knocked = true; knock(); }
      if (c.timer <= 0) {
        const r2 = c.waitAt;
        if (r2.door.locked) { rattle(); c.state = 'search'; wander(pc);
          setTimeout(() => ctx.say(r2.inside(p) ? 'The handle turns as far as the lock lets it. Then the steps go away.' : '', 4), 900); }
        else { r2.door.slow = true; r2.setOpen(true, 'it'); c.state = 'chase'; c.room = r2; setTimeout(() => { r2.door.slow = false; }, 3000); }
        c.waitAt = null; c.knocked = false;
      }
    } else if (c.state === 'look') {
      if ((c.timer -= dt) <= 0) { c.state = 'search'; wander(pc >= 0 ? pc : c.cell); fig.play('Walk'); }
    } else {
      const speed = SPEED[c.state];
      let aim;
      if (c.cell === c.target) {
        const want = c.room && c.room.cell === c.cell ? c.room : null;
        if (want && c.state !== 'search') {
          if (want.door.angle < 0.3 && !c.inRoom) {   // shut: stand at it, knock, wait
            c.state = 'door'; c.waitAt = want; c.timer = 7; c.knocked = false; fig.play('Idle'); faceTo(want.doorway); return;
          }
          aim = want.inside(c.pos) || c.pos.distanceTo(want.doorway) < 0.4 ? p : want.doorway;   // through the doorway, then at you
        } else if (c.state === 'chase' && c.cell === pc) aim = p;
        else if (c.pos.distanceTo(centre(c.cell)) < 0.15) { c.state = 'look'; c.timer = 1.5 + Math.random() * 2.5; fig.play('Idle'); return; }
        else aim = centre(c.cell);
      } else {
        const next = neighbours(c.f.m, c.cell).find(j => c.field[j] === c.field[c.cell] - 1) ?? c.target;
        aim = c.pos.distanceTo(centre(c.cell)) > 0.6 && !c.inRoom ? centre(c.cell) : centre(next);
        if (c.inRoom) aim = c.room.doorway;
      }
      _d.copy(aim).sub(c.pos).setY(0);
      const len = _d.length();
      if (len > 0.01) {
        c.pos.addScaledVector(_d.normalize(), Math.min(len, speed * dt));
        fig.root.rotation.y = base + Math.atan2(_d.x, _d.z);
        fig.pace?.(speed);
        if ((c.strideT = (c.strideT ?? 0) - dt) <= 0) { c.strideT = 0.62 * 1.2 / Math.max(0.6, speed); step(); }
      }
      c.inRoom = !!c.room?.inside(c.pos);
      const nc = c.f.cellAt(c.pos); if (nc >= 0) c.cell = nc;
    }
    fig.root.position.copy(c.pos).setY(c.f.origin[1]);
    fig.update(dt);
    if (neck && head) { neck.rotateZ(0.22); head.rotateZ(0.38); head.rotateX(0.18); }   // its head hangs to one side
    lights();
    // too close
    if (fig.root.visible && Math.hypot(p.x - c.pos.x, p.z - c.pos.z) < 0.8 && !ctx.busy) caught();
  };
  function faceTo(at) { _v.copy(at).sub(c.pos).setY(0); if (_v.lengthSq() > 1e-4) fig.root.rotation.y = base + Math.atan2(_v.x, _v.z); fig.root.position.copy(c.pos).setY(c.f.origin[1]); }
  return c;
}
export { C };
