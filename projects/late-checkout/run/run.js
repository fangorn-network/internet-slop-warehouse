// SPDX-License-Identifier: CC0-1.0
// Binds one generated night (case.js) to the hotel: search spots, locks, the knock, room 113, the card on the door,
// channel 13, Dana's paid answers, the watch, the journal and both endings. Before the turn (falling asleep, or
// passing out at 12:30) none of it exists and the game is a hotel sim; after it, everything here is live.
import * as T from 'three';
import * as F from '../../roadside-inn/fixtures.js';
import { SPOTS, DOORS } from './spots.js';
import { createClock, format, at, DAWN } from './clock.js';
import { createStrange } from './strange.js';
import { record, register } from './register.js';

const NOTHING = [
  'Dust, a bobby pin, and the smell of someone else’s perfume, which leaves before you can name it.',
  'Nothing. It smells faintly of bleach, the way a place smells when it has been made to forget.',
  'A receipt from 1987, blank except for the total, which is one dollar and thirteen cents.',
  'Nothing here now. You have the certainty, the way you are certain in dreams, that something was here a minute ago.',
  'Only carpet lint and the hum of the building, which sounds tonight like someone breathing through their nose.',
  'A moth, very old, that flies away as if it had been waiting for you to open this and has somewhere to be.',
];
// Each piece has its own look, so you remember finding it.
const TORN = [
  'A page torn so long ago that the tear has gone soft as cloth',
  'A strip that still smells of the bleach that was meant to erase it',
  'A corner, curled the way paper curls when someone has cried on it and let it dry',
  'The last scrap, warm, as if it had been carried in a pocket for thirty years',
];
const SEARCH_COST = 3;   // minutes per search: rummaging costs time, which is the only thing you have

export function createRun(ctx, plan, { secondsPerMinute = 2.5 } = {}) {
  const { world, game, lib, FLOOR2: Y } = ctx;
  const clock = ctx.clock = createClock({ secondsPerMinute });
  const run = {
    plan, clock, phase: 'sim', found: new Set(), notes: new Set(), readCard: false, hasKeys: false, watchLies: false, tvLive: false,
    figure: ctx.night.figure, channel13: 0,
    get complete() { return run.found.size === plan.pieces.length; },
    dreamLevel: () => 0.35 + 0.5 * Math.min(1, Math.max(0, (clock.now - at(0)) / (DAWN - at(0)))),
  };
  const isNight = () => run.phase === 'night';
  // A piece exists only once the one before it is found: the trail is a trail, not a scavenger hunt.
  const ready = p => p.n === 1 || run.found.has(p.n - 1);
  const pieceAt = spot => plan.pieces.find(p => p.spot === spot && ready(p));
  const add = it => { world.interact.push(it); return it; };
  const v = a => new T.Vector3(...a);

  // ---------- searching ----------
  for (const [id, s] of Object.entries(SPOTS)) {
    add({ pos: v(s.pos), r: 1.1, priority: 0.3, when: isNight, label: () => s.search, use: () => search(id) });
  }
  function search(id) {
    const piece = pieceAt(id), codeP = plan.pieces.find(p => p.kind === 'code'), note = codeP && ready(codeP) ? plan.notes.find(n => n.spot === id) : null;
    if (SPOTS[id].lock) return piece && !run.found.has(piece.n) ? keypad(piece) : ctx.say('Locked. A keypad, four digits. Nothing behind it you need yet.', 3);
    clock.advance(SEARCH_COST);
    if (id === plan.keysSpot) {
      if (run.hasKeys) return ctx.say('Nothing else here.', 2);
      if (!run.complete) return ctx.say('Something metal, just out of reach, as if the space went down much further than the floor. It will not come to you until the page is whole.', 5);
      run.hasKeys = true; game.give('car keys'); ctx.sound.synth.burst(0.15, 0.25, 3000);
      ctx.tasks.done('keys'); ctx.tasks.add('drive', 'Drive away before 6:00 AM');
      return ctx.say('Your keys. The fob is warm, as if someone had been holding it all night.', 5);
    }
    if (note && !run.notes.has(id)) { run.notes.add(id); game.give('pencilled scrap'); return showPaper('A scrap of hotel notepaper', `<p class="hand">${note.text}</p>`); }
    if (piece && !run.found.has(piece.n)) {
      if (piece.kind === 'window') {
        const m = Math.floor(clock.now) % 60;
        if (m < piece.minute || m >= piece.minute + 15) return ctx.say(m < piece.minute ? 'Nothing yet. The place has the patience of something that knows the time.' : 'Nothing. It was here, you can tell by the warmth, and it has gone back to wherever it waits.', 4);
      }
      if (piece.kind === 'hidden' || piece.kind === 'window') return take(piece);
    }
    ctx.say(NOTHING[(id.length + Math.floor(clock.now)) % NOTHING.length], 3);
  }
  function take(piece) {
    game.take(`torn page ${run.found.size}/4`); run.found.add(piece.n); game.give(`torn page ${run.found.size}/4`); ctx.sound.synth.burst(0.3, 0.12, 2400, 'highpass');
    const back = piece.back ? `<p class="back">On the back, in the handwriting of the note, which you notice is almost your own: <span class="hand">${piece.back}</span></p>` : '<p class="back">The back is blank, except for a fingerprint in something that was once red.</p>';
    showPaper(`${TORN[piece.n - 1]} · ${run.found.size} of 4`, `<p class="type">${piece.text}</p>${back}`);
    if (piece.n === 1) ctx.tasks.done('113');
    ctx.tasks.add('pages', `Find the torn pages · ${run.found.size} of 4`);
    if (run.complete) { ctx.tasks.done('pages'); ctx.tasks.add('keys', 'Find your keys'); setTimeout(() => showDocument(), 50); }
  }

  // ---------- the code lock ----------
  function keypad(piece) {
    let entry = '';
    ctx.openPanel(`<h2>${SPOTS[piece.spot].search.replace(' keypad', '')}</h2><div class="keypad-display" id="kd">____</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '↵'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>
      <button class="ghost" id="closePanel">Step away</button>`);
    const show = () => (document.getElementById('kd').textContent = entry.padEnd(4, '_'));
    document.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k; ctx.sound.click();
      if (k === 'C') entry = ''; else if (k === '↵' || entry.length === 4) { /* handled below */ } else entry += k;
      show();
      if (entry.length === 4) {
        if (entry === piece.code) { ctx.sound.beep(true); ctx.closePanel(); clock.advance(SEARCH_COST); setTimeout(() => take(piece), 300); }
        else { ctx.sound.beep(false); entry = ''; setTimeout(show, 400); document.getElementById('kd').textContent = 'NO'; }
      }
    });
  }

  // ---------- knocking ----------
  for (const d of DOORS) {
    const piece0 = plan.pieces.find(p => p.door === d.n);
    let count = 0, timer = null, refused = 0;
    add({ pos: v(d.pos), r: 1.3, priority: 0.5, when: isNight, label: () => `Knock on ${d.n}`, use: () => {
      ctx.sound.knock(); clearTimeout(timer); count++;
      timer = setTimeout(() => {
        const n = count; count = 0;
        const piece = piece0 && ready(piece0) ? piece0 : null;
        if (!piece || run.found.has(piece.n)) { if (n > 2) setTimeout(() => ctx.sfx.knock(d.pos, 1), 900); return ctx.say(n > 2 ? 'From inside, someone knocks back. Once.' : 'Nothing. A television goes quiet on the other side.', 3); }
        if (clock.now < refused) return ctx.say('The door does not answer twice so soon.', 3);
        if (n === piece.knocks) { ctx.sound.synth.burst(0.4, 0.15, 300); setTimeout(() => { ctx.say('The door opens the width of a chain. A hand, very white, passes you a folded page. The door closes.', 5); take(piece); }, 1600); }
        else { refused = clock.now + 10; setTimeout(() => ctx.sfx.knock(d.pos, n + 1), 900); ctx.say(`Silence. Then, from inside, ${n + 1} knocks, slow, the wrong number.`, 4); }
      }, 2200);
    } });
  }

  // ---------- room 113: a door at the east end of the ground floor that is only there at night ----------
  const door113 = lib.model('hotel-room-door', { origin: true });
  // Not a hotel prop: the phone profile's distance culling re-shows props, and 113 must not appear before the night.
  door113.userData.hotelProp = false;
  door113.position.set(29.0, 0, -1); door113.visible = false; ctx.scene.add(door113);
  const plate = F.sign('113', { w: 0.2, h: 0.12, bg: '#24303f', font: 'bold 150px system-ui, sans-serif' });
  plate.position.set(0.78, 1.5, 0.11); door113.add(plate);
  add({ pos: v([29.0, 1.2, -0.8]), r: 1.4, priority: 1, when: isNight, label: () => run.found.has(1) ? 'Room 113' : 'Knock on 113', use: () => {
    ctx.sound.knock();
    if (run.found.has(1)) return ctx.say('No answer. You know there is nobody behind it, and you know that is not true.', 4);
    fxPulse(); setTimeout(() => ctx.sfx.slide([29.0, 0.1, -0.9]), 1700);
    setTimeout(() => { ctx.say('The lock blinks green by itself. The door opens an inch onto absolute dark, and a page slides out across the carpet.', 6); take(plan.pieces[0]); }, 1800);
  } });
  function fxPulse() { ctx.fx.set({ dream: 1 }, 0.6); setTimeout(() => ctx.fx.set({ dream: run.dreamLevel() }, 4), 2500); }

  // ---------- the card on the back of 212's door ----------
  // A real sheet on the inside of the door, under the fire plan. It was not there when you checked in.
  const noticeTex = F.canvasTexture(256, 340, (g, w, h) => {
    g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d4f8f'; g.font = 'bold 15px Georgia'; g.textAlign = 'center'; g.fillText('GUEST NOTICE', w / 2, 28);
    g.fillRect(24, 36, w - 48, 2); g.fillStyle = '#2b2b33';
    for (let i = 0; i < plan.rules.length; i++) for (let k = 0; k < 2; k++) g.fillRect(28, 56 + i * 30 + k * 9, (w - 56) * (k ? 0.55 + (i * 17 % 30) / 100 : 0.92), 3);
  });
  const notice = new T.Mesh(new T.PlaneGeometry(0.21, 0.28), new T.MeshStandardMaterial({ map: noticeTex, roughness: 0.8 }));
  notice.position.set(0.5, 1.06, -0.027); notice.rotation.y = Math.PI; notice.visible = false; world.room.leaf.add(notice);
  add({ pos: v([12.4, Y + 1.06, 1.12]), r: 0.9, when: p => isNight() && p.z > 1 && world.room.angle < 0.1, label: () => 'Read the notice on the door', use: () => { run.readCard = true; ctx.tasks.done('notice'); showCard(); } });
  function showCard() {
    ctx.openPanel(`<div class="notice"><div class="note-head">Heartland Inn Express · Guest Notice</div><ol>${plan.rules.map(x => `<li>${x}</li>`).join('')}</ol>
      <p class="fine">It was not on the door when you checked in.</p></div><button id="closePanel">Close</button>`);
  }

  // ---------- channel 13 ----------
  run.channel13 = game.tvChannels.length;
  game.tvChannels.push((g, w, h, t) => {
    for (let i = 0; i < 900; i++) { const c = Math.random() * 90 | 0; g.fillStyle = `rgb(${c},${c},${c})`; g.fillRect(Math.random() * w, Math.random() * h, 6, 3); }
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e8e8'; g.font = 'bold 42px monospace'; g.textAlign = 'left'; g.fillText('13', 16, 48);
    g.font = '22px monospace'; g.textAlign = 'right'; g.fillText(format(clock.now), w - 14, 40);   // channel 13 keeps true time
    g.textAlign = 'center';
    if (run.tvLive) { g.font = 'bold 26px monospace'; g.fillText('LIVE · LOT B', w / 2, h / 2 - 10); g.font = '20px monospace'; g.fillText('a station wagon, blue, nose-in, engine ticking', w / 2, h / 2 + 22); return; }
    const code = plan.pieces.find(p => p.kind === 'code');
    const m = Math.floor(clock.now) % 60;
    if (isNight() && code && m >= code.channelWindow && m < code.channelWindow + 15) { g.font = 'bold 64px monospace'; g.fillText(`__ ${code.code.slice(2)}`, w / 2, h / 2 + 20); }
    else { g.font = '20px monospace'; g.fillText(isNight() ? 'PLEASE STAND BY' : 'OFF AIR', w / 2, h / 2 + 8); }
  });

  // ---------- the clerk's honest answers ----------
  run.hint = () => {
    const next = plan.pieces.find(p => !run.found.has(p.n));
    if (!next) return run.hasKeys ? 'Go. Drive west and do not look at the sign.' : plan.keysClue;
    if (next.kind === 'given') return 'She is waiting in 113. The end of the hall downstairs. It is there at night.';
    if (next.kind === 'knock') return `Room ${next.door}. ${next.knocks} knocks. Then patience.`;
    if (next.kind === 'vend') return `Buy the ${next.snack.toLowerCase()}.`;
    if (next.kind === 'code') { const half = plan.notes[0]; return `${SPOTS[next.spot].search.replace(' keypad', '')}. The first half is in ${SPOTS[half.spot].where}. The rest is on 13 ${['on the hour', 'at a quarter past', 'at half past', 'at a quarter to'][next.channelWindow / 15]}.`; }
    return `${SPOTS[next.spot].search}, ${SPOTS[next.spot].where}.${next.kind === 'window' ? ` ${['On the hour', 'A quarter past', 'Half past', 'A quarter to'][next.minute / 15]}, never otherwise.` : ''}`;
  };
  run.askClerk = clerk => {
    clerk.root.lookAt(ctx.player.x, 0, ctx.player.z);
    if (run.keyDead) {
      ctx.openPanel(`<h2>Dana</h2><p>She takes the card before you can explain, and slides it through the encoder twice. The machine thinks about it for a long time.</p><p>“They do that at night,” she says. “Forget who you are. There.”</p><button id="closePanel">Take the card</button>`);
      run.keyDead = false; game.take('key card (dead)'); game.give('key card'); clock.advance(10); clerk.play('Interact'); setTimeout(() => clerk.play('Idle'), 2500);
      ctx.tasks.done('rekey'); if (!run.readCard) ctx.tasks.add('notice', 'Read the notice on your door');
      return;
    }
    ctx.openPanel(`<h2>Dana</h2><p>She is standing exactly where she stood at check-in. She has not blinked.</p><p>“Ask me anything, hon. It’s half an hour, though. It’s always half an hour.”</p>
      <button id="ask">Ask where to look next</button> <button class="ghost" id="closePanel">Say nothing</button>`);
    document.getElementById('ask').onclick = () => { ctx.closePanel(); clock.advance(30); clerk.play('Interact'); ctx.say(`Dana: “${run.hint()}”`, 8); setTimeout(() => clerk.play('Idle'), 3000); };
  };

  // ---------- vending ----------
  run.onVend = name => {
    const piece = plan.pieces.find(p => p.kind === 'vend' && p.snack === name);
    if (isNight() && piece && ready(piece) && !run.found.has(piece.n)) setTimeout(() => { ctx.say('Something else dropped with it: folded paper, pressed flat against the glass.', 4); take(piece); }, 1500);
  };

  // ---------- the car ----------
  add({ pos: v([1.6, 1, 20.75]), r: 2.8, priority: 1, when: isNight, label: () => run.hasKeys ? 'Drive away' : 'Your car', use: () => {
    if (run.hasKeys) return end('drove');
    ctx.say('Your pockets are empty. Not in the ignition, not on the seat. The doors are locked, and you can see your bag in the back.', 5);
  } });

  // ---------- the turn ----------
  run.beginNight = () => {
    run.phase = 'night'; game.take('car keys'); door113.visible = true; notice.visible = true;
    // Someone has been at the fire plan too: a stair down, circled, and a number in pencil.
    const pc = world.room.plan.image.getContext('2d'); pc.strokeStyle = '#b3141a'; pc.lineWidth = 3; pc.beginPath(); pc.ellipse(262, 150, 30, 40, 0, 0, 7); pc.stroke();
    pc.fillStyle = '#5a1010'; pc.font = 'italic 22px Georgia'; pc.fillText('113 ↓', 296, 120); world.room.plan.needsUpdate = true;
    ctx.fx.set({ dream: run.dreamLevel() }, 4);
  };
  // Nobody stays up all night at the Heartland: at 12:30 you are asleep whether you lay down or not.
  clock.on(at(0, 30), () => { if (run.phase === 'sim') ctx.faint(); });
  clock.on(DAWN, () => { if (run.phase === 'night') end('staff'); });
  const strange = createStrange(ctx, plan, run);

  // ---------- paper, the journal, the whole page ----------
  function showPaper(title, html) { ctx.openPanel(`<div class="page"><div class="sub">${title}</div>${html}</div><button id="closePanel">Keep it</button>`); }
  function showDocument() {
    ctx.openPanel(`<div class="page whole"><div class="doc-title">${plan.title}</div>${plan.pieces.map(p => `<p class="type">${p.text}</p>`).join('')}
      <p class="back">When the four pieces touch, a line you had not seen runs across all of them, written over the type in the note’s hand as if the page had been waiting to be whole before it would say it: <span class="hand">${plan.keysClue}</span></p></div><button id="closePanel">Fold it up</button>`);
  }
  run.journal = () => {
    const pieces = plan.pieces.filter(p => run.found.has(p.n));
    ctx.openPanel(`<div class="page"><div class="sub">Your pockets · ${format(clock.now)}</div>
      ${run.readCard ? `<p><b>The notice on the door</b></p><ol class="small">${plan.rules.map(x => `<li>${x}</li>`).join('')}</ol>` : '<p class="small">There was a notice on the back of your door. You haven’t read it.</p>'}
      ${pieces.length ? pieces.map(p => `<p class="type">${p.text}</p>${p.back ? `<p class="back small"><span class="hand">${p.back}</span></p>` : ''}`).join('') : '<p class="small">No pages yet.</p>'}
      ${run.complete ? `<p class="back"><span class="hand">${plan.keysClue}</span></p>` : ''}
      ${[...run.notes].map(s => `<p class="hand small">${plan.notes.find(n => n.spot === s).text}</p>`).join('')}</div><button id="closePanel">Close</button>`);
  };

  // ---------- endings ----------
  async function end(how) {
    if (run.phase === 'ended') return;
    run.phase = 'ended'; clock.running = false;
    record({ seed: plan.seed, how, culprit: plan.culprit.name, victim: plan.victim, year: plan.year, at: format(clock.now) });
    await ctx.fx.to({ fade: 1 }, how === 'drove' ? 2.5 : 4);
    const r = register();
    const text = how === 'drove'
      ? `<h2>Checked out · ${format(clock.now)}</h2><p>The engine catches on the first try, as if it had been waiting. In the mirror the pole sign flickers and goes dark. ${plan.culprit.name} is standing under the canopy, watching you go.</p><p>West on I-44 the sky is going grey, then gold.</p>`
      : `<h2>6:00 AM</h2><p>The lobby lights come up. Dana is waiting by the desk with a vest over her arm. Your name is already on the tag.</p><p>“Front desk,” she says. “You’ll pick it up fast. Everybody does.” She walks out to the lot, gets into your car, and drives west.</p>`;
    ctx.openPanel(`${text}<p class="sub">Night ${plan.seed} · ${plan.victim}, ${plan.year} · ${run.complete ? `it was ${plan.culprit.name}` : `${run.found.size} of 4 pieces`}</p>
      <p class="small">Nights at the Heartland: ${r.nights} · drove away ${r.drove} · stayed on ${r.staff}${r.culprits.length ? ` · exposed: ${r.culprits.join(', ')}` : ''}</p>
      <button id="again">Another night</button> <button class="ghost" id="same">This night again</button>`);
    document.getElementById('again').onclick = () => { location.search = `?seed=${1 + Math.floor(Math.random() * 99998)}${location.search.includes('quality=') ? '&' + location.search.match(/quality=\w+/)[0] : ''}`; };
    document.getElementById('same').onclick = () => location.reload();
  }
  run.end = end;

  run.update = dt => { clock.tick(dt); if (isNight()) strange.update(dt); };
  run.watch = () => run.watchLies ? format(clock.now - 2 * (clock.now % 60) + 7) : format(clock.now);
  run.strange = strange;
  return run;
}
