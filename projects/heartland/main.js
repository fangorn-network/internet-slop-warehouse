// SPDX-License-Identifier: CC0-1.0
// The Heartland: how many nights can you last? The coordinator that strings the hotel's minigames into one run.
//
//   arrival (catherine/intro.js: check in, find 212, lie down)
//   → night (night-audit: locked out, down the stairs that keep going, back to Dana)
//   → morning (caves: drive to Onyx Caverns, take the tour, bring something back)
//   → evening (back at the Heartland at dusk: another night is $59)
//   → night → morning → …
//
// A run is one seed. Money pays for the room and the tickets; nerve is what the nights take (every time it finds you)
// and what sleep gives back. Out of money at check-in, or out of nerve: the run is over (permadeath). What you learned
// is kept, in this browser, as memories: they're shown when you check in again.
// ponytail: one night card (Night Audit) and one day card (the caves) so far, and the night's floors are built once at
// load, so night two has the same floors (with it coming sooner). More cards, and floors rebuilt per night, need
// physics.js to take colliders after it starts.
import { boot } from './boot.js';
import { checkin } from '../catherine/intro.js';
import { audit, prebuild as prebuildAudit } from '../night-audit/audit.js';
import { caves, prebuild as prebuildCaves, resetCaves } from '../caves/caves.js';

const ROOM = 59, START = { money: 150, nerve: 100 };
const $ = id => document.getElementById(id);

// ---------------------------------------------------------------- memories: kept across runs
const MEMORIES = {
  music: 'The lobby plays music all night. Follow it down.',
  follows: 'Something comes down the stairs after you.',
  lock: 'Lock the room door. It knocks, but it won’t come in.',
  b: 'The last flight down says B. The lobby is right under it.',
  money: 'People leave money on the nightstands down there.',
  onyx: 'When you take a piece of the onyx, the bulbs go out behind you.',
  kept: 'Some guests stay on. You were very nearly one of them.',
  broke: 'Count your money before you check in.',
};
const KEY = 'heartland.memories';
const remembered = (() => { try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); } })();
const learned = new Set();
const remember = id => { if (remembered.has(id) || learned.has(id)) return; learned.add(id); try { localStorage.setItem(KEY, JSON.stringify([...remembered, ...learned])); } catch { /* private window */ } };
if (remembered.size) {
  $('memories').innerHTML = '<b>You’ve stayed here before. You remember:</b><ul>' + [...remembered].map(k => `<li>${MEMORIES[k] ?? k}</li>`).join('') + '</ul>';
  $('memories').hidden = false;
}

// ---------------------------------------------------------------- the run
const run = {
  day: 1, money: START.money, nerve: START.nerve, items: [], over: null,
  spend(n) { if (run.money < n) return false; run.money -= n; hud(); return true; },
  earn(n) { run.money += n; hud(); remember('money'); },
  /** Lose nerve; true if that ended the run. */
  hurt(n, why = 'kept') { run.nerve = Math.max(0, run.nerve - n); hud(); if (run.nerve <= 0) { over(why); return true; } return false; },
  rest(n) { run.nerve = Math.min(100, run.nerve + n); hud(); },
};
function hud() {
  $('run').hidden = false;
  $('day').textContent = `Night ${run.day}`;
  $('money').textContent = `$${run.money}`;
  $('nerve').style.width = run.nerve + '%';
  $('nerve').style.background = run.nerve < 30 ? '#c4493b' : run.nerve < 60 ? '#d9a441' : '#9fb6a0';
}
const ENDS = {
  kept: ['Kept', 'It found you one time too many. In the morning there’s a new name on the night shift, and it’s yours.'],
  broke: ['Checked out', `Dana slides your card back. “It’s $${ROOM}, hon.” You don’t have it. You sleep in the wagon, and in the morning you drive west and don’t come back.`],
};
function over(why) {
  if (run.over) return;
  run.over = why; remember(why);
  const [title, text] = ENDS[why], nights = run.day - (why === 'broke' ? 1 : 0);
  document.exitPointerLock?.();
  $('endTitle').textContent = title;
  $('tally').textContent = `${text} You lasted ${nights} night${nights === 1 ? '' : 's'} at the Heartland, with $${run.money} and ${run.items.length ? run.items.join(', ') : 'nothing'} in your pockets.`;
  $('learned').innerHTML = learned.size ? '<b>You’ll remember:</b><ul>' + [...learned].map(k => `<li>${MEMORIES[k]}</li>`).join('') + '</ul>' : '';
  $('end').hidden = false;
  ctx.frozen = true; ctx.busy = true;
}

// ---------------------------------------------------------------- evening: back at the Heartland
const evening = {
  acts: {
    evening: {
      fadeIn: 2,
      enter(ctx) {
        const { world } = ctx, c = ctx.caves;
        ctx.applyLook('dusk'); world.setTimeOfDay?.('dusk');
        c.wagon.position.set(1.6, 0, 20.75); c.car.heading = Math.PI + 0.02; c.wagon.rotation.y = c.car.heading; c.wagon.visible = true; c.showParked(false);
        ctx.teleport(3.5, 0, 20.2, -Math.PI / 2 + 0.4, 0);
        const room = world.room; room.setLamps(true); room.setBath(true); room.setDesk(false); room.open = false;
        if (world.clerk) world.clerk.root.visible = true;
        ctx.fx.snap({ dream: 0, lids: 0, peep: 0, flash: 0 });
        ctx.goal(`Get some sleep in 212 ($${ROOM} a night)`);
        ctx.say(['Back at the Heartland. The pole sign is just coming on. Your key card works again; Dana saw to that.', 'The Heartland again. The same spot by the canopy. You could keep driving. You don’t.', 'Dusk. The lot fills up with people who are only staying one night.'][Math.min(run.day - 2, 2)], 5);
      },
    },
  },
  start: 'evening',
  install(ctx) {
    const event = ctx.game.event;
    ctx.game.event = name => {
      if (ctx.director.name !== 'evening') return event?.(name);
      if (name !== 'sleep' || ctx.busy) return;
      ctx.busy = true; ctx.goal('');
      ctx.say('The PTAC rattles on. Down the hall, a door thuds shut. You don’t get up to look.', 4);
      ctx.fx.set({ lids: 1 }, 3.5);
      setTimeout(() => { ctx.busy = false; ctx.next({ fadeOut: 2 }); }, 4000);
    };
  },
};

// ---------------------------------------------------------------- the schedule
let phase = 'arrival';
const ctx = await boot({
  scenes: { checkin, audit, caves, evening }, fallback: 'checkin,audit,caves,evening',
  prebuilds: { floors: prebuildAudit, cavesBuilt: prebuildCaves }, hook: '__heartland',
  extend: c => { c.game.money = n => run.earn(n); return { run }; },
});
ctx.next = async (opts = {}) => {
  if (run.over) return;
  const go = (act, o) => ctx.director.go(act, { ...opts, ...o });
  if (phase === 'arrival' || phase === 'evening') {   // asleep in 212: pay for the night, or don't get one
    if (!run.spend(ROOM)) return over('broke');
    phase = 'night'; return go('night');
  }
  if (phase === 'night') {   // Dana, the desk, 4 AM: what the night taught you, then sleep till nine
    const a = ctx.audit;
    remember('music'); if (a.met) remember('follows'); if (a.creature.heldOut) remember('lock'); if (a.floor >= 2) remember('b');
    run.rest(12);
    phase = 'morning'; resetCaves(ctx);
    return go('morning', { fadeOut: 2.5, fadeIn: 2 });
  }
  if (phase === 'morning') {   // back in the wagon with whatever you took
    for (const l of opts.loot ?? []) run.items.push(l);
    if ((opts.loot ?? []).includes('onyx')) remember('onyx');
    run.day++; phase = 'evening';
    return go('evening', { fadeOut: 2, fadeIn: 2 });
  }
};
$('begin').addEventListener('click', hud);
$('again').onclick = () => { location.href = location.pathname; };
