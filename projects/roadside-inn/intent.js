// SPDX-License-Identifier: CC0-1.0
// Intent: residents as data. Who someone is, why they are here, what they need, and what they do about it; this runner
// picks what each one does next and turns it into a route of stops for a walker to follow. Nothing here knows about the
// hotel: places, the walk graph and the people come in as data, so it is meant to become a publishable part kind
// ("intent": a JSON resident + this logic) that other games reuse with their own places.
//
// Schema (v0, 2026-11-20). Coordinates are metres, yaw is radians about +y (0 faces +z).
//
//   world = {
//     nodes:  { [id]: [x, y, z] },                 // the walk graph: corridor corners, doorways, stair heads
//     edges:  [[idA, idB], ...],                   // walkable straight lines between nodes (both ways)
//     places: { [id]: {                            // somewhere a person goes to do something
//       p: [x, y, z], node: id,                    //   where they stand, and the graph node they reach it from
//       face?: yaw,                                //   which way they turn once there (a counter, a door, a TV)
//       hide?: true,                               //   a doorway they go through: out of sight while there
//     } },
//   }
//   resident = {
//     id, model, tint?,                            // which body (a rigged character asset) and its outfit tint
//     who, why,                                    // plain text: identity and reason to be here (writers, tools, agents)
//     start: placeId,                              // where they are when the scene opens
//     speed?: m/s,                                 // cruising walk (0.6 old, 0.9 tired, 1.2 brisk)
//     needs?: { [need]: { level: 0..1, rate: per second } },   // drives that build up: coffee, rest, work, air
//     activities: { [name]: {
//       when?: [phase, ...],                       //   time-of-day phases it can happen in ('dusk', 'day', ...)
//       need?: need, weight?: n,                   //   score = need level x weight (+ a little chance); default 0.3
//       satisfies?: { [need]: amount },            //   needs it lowers when done
//       steps: Step[],                             //   what doing it means, in order
//     } },
//     says?: { near?: string },                    // a line when the player is close (once a while)
//     reacts?: { ... },                            // W2, not run yet: see REACTIONS below
//   }
//   Step = ['go', placeId | placeId[]]             // walk there along the graph (stop, turn to its face); a list: one at random
//        | ['wait', min, max?]                     // stay a while (seconds, random in range) where they are
//        | ['pose', 'cup' | 'sit' | null]          // a body pose from the character part
//        | ['hold', true | false]                  // carrying their prop (a cup) or not
//        | ['posture', name]                       // a named posture of theirs (a sitter: 'tv', 'phone'); the body
//                                                  //   blends to it (body.js / people.js), it doesn't snap
//        | ['attend', thingId | null]              // what their eyes are on while doing it (resident.things below)
//        | ['use', kind]                           // use the nearest thing of that kind where they stand (affords.js:
//                                                  //   a keyboard brings its mouse and screen; hands, keys, clicks, eyes)
//
// Seated residents (v1, 2026-11-21) add: seat: { hips: [x, y, z], yaw, sink }, postures: { [name]: sit options },
// things: { [id]: { at?: [x, y, z], prop?: modelId, kind: 'tv' | 'phone' | 'screen' | 'work' } }, and manner (body.js:
// notice / civil / engage / linger distances and times). Their activities use posture / attend / wait, no 'go'.
//
// REACTIONS (v1, 2026-11-21; runs in world/staff.js). What a resident does when something happens to them:
//   reacts = { [event]: Level | Level[], cooldown?: s }   // a list escalates: the nth time it happens, the nth level
//                                                         //   (the last one repeats); cooldown (default 1.5 s) swallows
//                                                         //   repeats of one event (a prop rolling against them)
//   Level = { mood?: 'startled' | 'annoyed' | 'angry',    // how they feel about you from now on (moods only go up;
//                                                         //   anyone startled or worse stops their friendly greeting)
//             do?: 'flinch' | 'guard' | 'step-away' | 'leave' | 'call-police' | Step[],
//                                                         //   flinch: head to it, hands up a moment; guard: turn to face
//                                                         //   you, hands up, hold; step-away: guard, then walk a couple of
//                                                         //   metres off; leave: go to resident.home and stay there a
//                                                         //   long while; call-police: go to place `phone` and dial; a
//                                                         //   Step list: an ad-hoc activity (intent steps, above)
//             say?: string[],                             // one at random (plain lines, the way they'd really say it)
//             flag?: string,                              // a lasting consequence the game reads and saves (game.flags)
//             phone?: placeId }                           // where call-police goes
//   events: 'hit' (a thrown thing touched them: kg, m/s), 'near-miss' (one landed within 1.5 m), later 'player-near',
//   'player-stares', 'noise'. A reaction interrupts the current activity; when it's done the runner picks again.
//   resident.home: placeId they retreat to (their room, their car).

const rand = (a, b = a) => a + Math.random() * (b - a);
const BEAT = { pose: 'pose', hold: 'cup', posture: 'posture', attend: 'attend', use: 'use' };   // step → the stop field it sets

/** Shortest node path (Dijkstra over straight edges) from the node nearest `from` to node `to`: [x, y, z][]. */
export function route(world, from, to) {
  const P = world.nodes, ids = Object.keys(P), d3 = (a, b) => Math.hypot(a[0] - b[0], (a[1] - b[1]) * 4, a[2] - b[2]);   // floors are far apart
  const start = ids.reduce((best, id) => d3(P[id], from) < d3(P[best], from) ? id : best, ids[0]);
  const adj = {}; for (const [a, b] of world.edges) { (adj[a] ??= []).push(b); (adj[b] ??= []).push(a); }
  const dist = { [start]: 0 }, prev = {}, open = new Set([start]);
  while (open.size) {   // ponytail: O(n^2) Dijkstra, fine for a few dozen nodes; a heap when a map has hundreds
    const u = [...open].reduce((a, b) => dist[a] <= dist[b] ? a : b); open.delete(u);
    if (u === to) break;
    for (const v of adj[u] ?? []) { const nd = dist[u] + d3(P[u], P[v]); if (nd < (dist[v] ?? Infinity)) { dist[v] = nd; prev[v] = u; open.add(v); } }
  }
  if (dist[to] === undefined) return [];
  const path = []; for (let n = to; n !== undefined; n = prev[n]) path.unshift(P[n]);
  return path;
}

/**
 * Pick a reaction: `memory` is the resident's own record ({} to start; kept between calls), `event` { type, ... }, `t`
 * seconds now. Returns the Level to act out (with `say` picked, `n` how many times so far) or null (no reacts for it,
 * or still in its cooldown).
 */
export function reaction(resident, memory, event, t) {
  const r = resident.reacts?.[event.type]; if (!r) return null;
  const levels = Array.isArray(r) ? r : [r], m = memory[event.type] ??= { n: 0, last: -Infinity };
  if (t - m.last < (resident.reacts.cooldown ?? 1.5)) return null;
  const lv = levels[Math.min(m.n, levels.length - 1)]; m.n++; m.last = t;
  const RANK = { startled: 1, annoyed: 2, angry: 3 };
  if ((RANK[lv.mood] ?? 0) > (RANK[memory.mood] ?? 0)) memory.mood = lv.mood;
  return { ...lv, n: m.n, say: lv.say?.length ? lv.say[Math.floor(Math.random() * lv.say.length)] : null };
}

/**
 * A resident's mind: call next(at, phase) when their current route is done; it picks an activity and returns its stops
 * ({ p, wait, face, pose, cup, hide }: the walker's route format) starting from where they stand (`at`: [x, y, z]).
 */
export function mind(resident, world) {
  const needs = Object.fromEntries(Object.entries(resident.needs ?? {}).map(([k, v]) => [k, { ...v }]));
  const st = { doing: null, last: null, needs };
  function choose(phase) {
    let best = null, score = -Infinity;
    for (const [name, a] of Object.entries(resident.activities)) {
      if (a.when && phase && !a.when.includes(phase)) continue;
      const s = (a.need ? needs[a.need]?.level ?? 0 : 0.3) * (a.weight ?? 1) + rand(0, 0.25) - (name === st.last ? 0.35 : 0);   // rarely the same thing twice running
      if (s > score) { score = s; best = name; }
    }
    return best;
  }
  function compile(name, at) {
    const stops = []; let here = at;
    const last = () => stops.at(-1) ?? (stops.push({ p: here, wait: 0 }), stops.at(-1));
    for (const [op, a, b] of resident.activities[name].steps) {
      if (op === 'go') {
        const pl = world.places[Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a];
        for (const p of route(world, here, pl.node)) stops.push({ p, wait: 0, pass: true });
        stops.push({ p: pl.p, wait: 0, face: pl.face, hide: pl.hide });
        here = pl.p;
      } else if (op === 'wait') last().wait += rand(a, b ?? a);
      else if (op in BEAT) {   // after a wait, a change is a new beat at the same spot (pours, then holds the cup)
        let s = last(); if (s.wait > 0) { s = { p: here, wait: 0 }; stops.push(s); }
        s[BEAT[op]] = a;
      }
    }
    return stops;
  }
  return {
    state: st,
    /** Needs build up over time. */
    tick(dt) { for (const n of Object.values(needs)) n.level = Math.min(1, n.level + (n.rate ?? 0) * dt); },
    /** Finish the current activity (its needs are met) and plan the next: a route of stops from `at`. */
    next(at, phase) {
      if (st.doing) for (const [k, v] of Object.entries(resident.activities[st.doing].satisfies ?? {})) if (needs[k]) needs[k].level = Math.min(1, Math.max(0, needs[k].level - v));   // negative: doing it builds a need (cleaning uses linen)
      st.last = st.doing; st.doing = choose(phase);
      return compile(st.doing, at);
    },
    /** Start a named activity now (tests, scripted beats); or an ad-hoc one: steps instead of a name (a reaction). */
    start(name, at) {
      if (Array.isArray(name)) { resident.activities['(react)'] = { steps: name }; name = '(react)'; }
      st.last = st.doing; st.doing = name; return compile(name, at);
    },
  };
}
