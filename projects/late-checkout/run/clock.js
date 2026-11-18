// SPDX-License-Identifier: CC0-1.0
// The night's clock, in minutes after 6 PM (so 9:40 PM is 220 and 6:00 AM is 720). Time is the pressure:
// at dawn, whoever is still here works here. One game minute passes every `secondsPerMinute` real seconds.
export const DAWN = 720;
export const at = (h, m = 0) => ((h + 24 - 18) % 24) * 60 + m;            // at(2, 20) → 2:20 AM

export function format(min, { seconds = false } = {}) {
  const total = 18 * 60 + Math.floor(min), h24 = Math.floor(total / 60) % 24, m = total % 60;
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')}${seconds ? '' : h24 < 12 ? ' AM' : ' PM'}`;
}

export function createClock({ start = at(21, 40), secondsPerMinute = 2.5 } = {}) {
  const events = [];   // { at, fn, done }
  const clock = {
    now: start, running: false, secondsPerMinute,
    get text() { return format(clock.now); },
    /** Run fn once when the clock reaches minute `when` (also when a jump skips past it). */
    on(when, fn) { events.push({ at: when, fn, done: false }); events.sort((a, b) => a.at - b.at); },
    /** Jump forward (sleeping, a hint that costs time, the road). Events skipped over fire in order. */
    advance(minutes) { clock.now += minutes; fire(); },
    tick(dt) { if (!clock.running) return; clock.now += dt / clock.secondsPerMinute; fire(); },
    between: (a, b) => clock.now >= a && clock.now < b,
  };
  function fire() { for (const e of events) if (!e.done && clock.now >= e.at) { e.done = true; e.fn(clock.now); } }
  return clock;
}
