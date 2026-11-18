// SPDX-License-Identifier: CC0-1.0
// The hauntings. Each night's plan picks a few (case.js) with start and end times; this file makes them happen with
// what the hotel already has: its lights, its TVs, its elevator, one dark figure, the payphone, your watch.
// Every effect starts at `at`, stops at `until` and leaves the hotel as it found it.
import * as T from 'three';

export function createStrange(ctx, plan, run) {
  const { world, clock, fx, FLOOR2 } = ctx;
  const live = new Map();   // id → event currently running
  const handlers = {
    'corridor-loop': {
      // Walk east past the last door upstairs and you are at the west end again, still walking east.
      update(e) {
        const p = ctx.player;
        if (e.blinking || !(p.y > FLOOR2 - 0.5 && Math.abs(p.z) < 1 && p.x > 28.4)) return;
        // A blink, not a skip: the eyes close, the hallway starts over behind them, and the eyes open.
        e.blinking = true; fx.set({ lids: 1 }, 0.12); sting(0.5);
        setTimeout(() => { p.x -= 38.2; fx.set({ lids: 0 }, 0.5); e.blinking = false; ctx.say(e.told ? 'Again. The same painting. The same door.' : 'You blink, and the hallway has started over. The paintings are in the same order.', 4); e.told = true; }, 260);
      },
    },
    'third-floor': {
      start(e) {
        e.button = { pos: new T.Vector3(7.95, 1.3, -1.3), r: 2.4, priority: 1, when: p => p.z < -1.1 && live.has('third-floor'), dynamicY: () => world.elevator.y + 1.3, label: () => 'Press 3', use: () => ride(e) };
        world.interact.push(e.button);
      },
      update(e) { if (!e.told && inElevator()) { e.told = true; ctx.sound.ding(); setTimeout(() => ctx.say('There is a third button on the panel now. It is lit.', 4), 400); } },
      stop(e) { remove(e.button); },
    },
    'figure-hall': {
      start(e) { if (Math.abs(ctx.player.y - e.floor * FLOOR2) < 1.5 && Math.abs(ctx.player.z) < 1.2) sting(0.7); const f = run.figure; f.root.position.set(27.6, e.floor * FLOOR2, 0); f.root.rotation.y = -Math.PI / 2; f.root.visible = true; f.play('Idle'); },
      update(e) {
        const f = run.figure, p = ctx.player, d = Math.hypot(f.root.position.x - p.x, f.root.position.z - p.z), sameFloor = Math.abs(f.root.position.y - p.y) < 1.5;
        if (!f.root.visible || !sameFloor) return;
        // The card was honest: run at them and you lose time.
        if (d < 14 && ctx.controls.input.run && ctx.controls.input.x > 0.3) { f.root.visible = false; blackout(20, 'You were running. Then you were on the carpet, and twenty minutes had gone.'); return; }
        if (d < 6) { f.root.visible = false; ctx.say('Nobody there. The carpet is warm where they stood.', 3); }
      },
      stop() { run.figure.root.visible = false; },
    },
    'tv-all': {
      start() { sting(0.8, 'Somewhere a television turns on. Then every television in the building, at once.'); for (const tv of ctx.game.tvs) { tv.was = { on: tv.st.on, channel: tv.st.channel }; tv.st.on = true; tv.st.channel = run.channel13; tv.screen.material.color.set('#ffffff'); } run.tvLive = true; },
      stop() { run.tvLive = false; for (const tv of ctx.game.tvs) if (tv.was) { Object.assign(tv.st, tv.was); tv.screen.material.color.set(tv.st.on ? '#ffffff' : '#000000'); } },
    },
    'lobby-dark': {
      start(e) {
        e.saved = world.lightAnchors.filter(a => a.pos.x > -12 && a.pos.x < 6.5 && a.pos.y < 3 && Math.abs(a.pos.z) < 9 && !a.outdoor).map(a => [a, a.intensity]);
        // The lights die one bank at a time, west to east, each with a buzz and a pop, the way old ballasts go.
        e.saved.sort((p, q) => p[0].pos.x - q[0].pos.x).forEach(([a], i) => setTimeout(() => {
          a.intensity = 0; ctx.sfx.sc.at([a.pos.x, a.pos.y, a.pos.z], d => { ctx.sound.synth.tone(120, 0.25, 0.08, 'square', 1, 0, d); ctx.sound.synth.burst(0.05, 0.3, 3000, 'highpass', 0.22, d); });
        }, i * 260));
        if (inLobby()) sting(0.6, 'The lobby lights go out, bank by bank, until only the desk lamp is left.');
      },
      stop(e) { for (const [a, i] of e.saved) a.intensity = i; ctx.sfx.sc.at([-3, 2.8, 0], d => ctx.sound.synth.burst(0.2, 0.5, 160, 'lowpass', 0, d)); if (inLobby()) ctx.say('With a clunk somewhere in the walls, the lights come back.', 3); },
    },
    'phone-ring': {
      start(e) {
        e.answer = { pos: new T.Vector3(-62.9, 1.3, 113.05), r: 1.6, priority: 1, when: () => live.has('phone-ring'), label: () => 'Answer the phone', use: () => {
          ctx.sound.click(); stop(e); ctx.say(`A woman’s voice, very far away: “${run.hint()}”`, 8); } };
        world.interact.push(e.answer); e.next = 0;
      },
      update(e, dt) { if ((e.next -= dt) <= 0) { e.next = 3; if (ctx.player.pos.distanceTo(new T.Vector3(-62.9, 1, 113)) < 90) { ctx.sfx.ring([-62.9, 1.3, 113.3]); } } },
      stop(e) { remove(e.answer); },
    },
    'watch-lies': { start() { run.watchLies = true; sting(0.4, 'Your watch ticks. Then it ticks the other way.'); }, stop() { run.watchLies = false; } },
  };

  for (const e of plan.strange) {
    clock.on(e.at, () => { if (run.phase !== 'night') return; live.set(e.id, e); handlers[e.id].start?.(e); });
    clock.on(e.until, () => stop(e));
  }
  function stop(e) { if (!live.has(e.id)) return; live.delete(e.id); handlers[e.id].stop?.(e); }
  // Every haunting announces itself: the picture swells toward the dream, a low tone falls, and (if given) a line says
  // what is happening, so it reads as the hotel doing something and never as the game stuttering.
  function sting(strength = 0.6, text) {
    fx.set({ dream: 1 }, 0.4); setTimeout(() => fx.set({ dream: run.dreamLevel() }, 3), 1400);
    ctx.sound.synth.tone(110, 2.2, 0.12 * strength + 0.04, 'sine', 0.5); ctx.sound.synth.tone(164, 1.6, 0.05 * strength, 'triangle', 0.6, 0.1);
    if (text) ctx.say(text, 5);
  }
  function inLobby() { const p = ctx.player; return p.y < 2 && p.x > -12 && p.x < 6.5 && Math.abs(p.z) < 9; }
  function remove(it) { const i = world.interact.indexOf(it); if (i >= 0) world.interact.splice(i, 1); }
  function inElevator() { const p = ctx.player; return p.x > 6.65 && p.x < 8.85 && p.z < -1.1 && p.z > -4.4; }
  async function blackout(minutes, text) {
    await fx.to({ fade: 1 }, 0.25);
    clock.advance(minutes);
    setTimeout(() => { fx.set({ fade: 0 }, 2); ctx.say(text, 5); }, 900);
  }
  async function ride(e) {
    ctx.sound.click(); stop(e);
    await fx.to({ fade: 1 }, 1); ctx.sound.hum(true);
    // Floor three is floor two with the lights out, and someone at the end of the hall.
    Object.assign(world.elevator, { y: FLOOR2, target: FLOOR2, floor: 1, moving: false, queue: null, open: true, timer: 6 });
    const hall = world.lightAnchors.filter(a => a.pos.y > FLOOR2 && Math.abs(a.pos.z) < 1.2 && !a.outdoor).map(a => [a, a.intensity]);
    for (const [a] of hall) a.intensity = 0;
    ctx.teleport(7.75, FLOOR2, -0.2, Math.PI, 0);
    const f = run.figure; f.root.position.set(24, FLOOR2, 0); f.root.rotation.y = -Math.PI / 2; f.root.visible = true;
    setTimeout(() => { ctx.sound.hum(false); ctx.sound.ding(); fx.set({ fade: 0, dream: 1 }, 1.5); ctx.say('Three. The carpet is the same carpet.', 4); }, 1500);
    setTimeout(() => { f.root.visible = false; for (const [a, i] of hall) a.intensity = i; fx.set({ dream: run.dreamLevel() }, 3); ctx.say('The lights come back. It is the second floor. It was always the second floor.', 5); }, 26000);
    clock.advance(15);
  }
  return {
    get live() { return [...live.keys()]; },
    update(dt) { for (const e of live.values()) handlers[e.id].update?.(e, dt); },
  };
}
