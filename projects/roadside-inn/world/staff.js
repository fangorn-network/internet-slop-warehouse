// SPDX-License-Identifier: CC0-1.0
// Staff and guests: who works and stays here, why, where they go and what they do there.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
// Residents are data (RESIDENTS below, schema in ../intent.js); a mind per resident picks what they do next, and the
// walker here carries it out: smooth starts and stops, turning at a person's rate, stepping round people (keeping right
// when two meet head on), never overlapping anyone, and only going out of sight through a door when nobody's watching.
import * as T from 'three';
import { FLOOR2 } from '../world.js';
import { mind } from '../intent.js';

const TURN = 3;              // rad/s: people turn, they don't snap round
const ACCEL = 1.2, DECEL = 1.6;   // m/s²: a step or two to get going, and to stop
const BODY = 0.3, CART = 0.55;    // radii people keep clear of (a shoulder; a housekeeping cart)
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// Built on first use: world.js imports this file before its FLOOR2 is initialised (a circular import).
let cache = null;
/** The walk graph and places, the residents (intent data, ../intent.js) and the seated guests. */
export function castData() { return cache ??= build(FLOOR2); }
function build(F2) {
// ---------- where people go: the walk graph and places (metres; yaw 0 faces +z) ----------
const door = (x, side, y = 0) => ({ p: [x + 0.4, y, side * 0.55], node: `${y ? 'f2' : 'g'}-${x + 0.4}`, face: side > 0 ? 0 : Math.PI, hide: true });
const HOTEL = {
  nodes: {
    // lobby, ground floor: coffee bar, pantry, the walk past the business center, the elevator lobby, the east hall
    'coffee-n': [2.6, 0, -7.1], pantry: [3.8, 0, -6.9], 'vend-n': [4.7, 0, -6.6], 'biz-w': [3.8, 0, -4.4], 'lobby-e': [3.2, 0, -0.4],
    lounge: [2.2, 0, 2.0], 'window-n': [0.2, 0, 7.4], elev: [7.6, 0, 0],
    'g-12.4': [12.4, 0, 0], 'g-16.9': [16.9, 0, 0], 'g-21.4': [21.4, 0, 0], 'g-25.9': [25.9, 0, 0],
    // second floor corridor (z 0), its ice alcove and the linen closet
    'f2--11.6': [-11.6, F2, 0], 'f2--7.1': [-7.1, F2, 0], 'f2--2.6': [-2.6, F2, 0], 'f2-1.9': [1.9, F2, 0], 'f2-ice': [7.6, F2, 0.2],
    'ice-n': [7.6, F2, 2.0], 'f2-9.4': [9.4, F2, 0], 'f2-12.4': [12.4, F2, 0], 'f2-16.9': [16.9, F2, 0], 'f2-21.4': [21.4, F2, 0], 'f2-25.9': [25.9, F2, 0],
    // the pool's dry deck, and the lot out front
    'deck-s': [-22, 0, -5], 'deck-n': [-22, 0, 3.5],
    'lot-e': [18, 0, 24], 'lot-m': [4, 0, 24], 'lot-w': [1.6, 0, 24], 'walk-w': [-2, 0, 18], canopy: [-2, 0, 11.6],
  },
  edges: [
    ['coffee-n', 'pantry'], ['pantry', 'vend-n'], ['pantry', 'biz-w'], ['biz-w', 'lobby-e'], ['lobby-e', 'elev'], ['lobby-e', 'lounge'], ['lounge', 'window-n'],
    ['elev', 'g-12.4'], ['g-12.4', 'g-16.9'], ['g-16.9', 'g-21.4'], ['g-21.4', 'g-25.9'],
    ['f2--11.6', 'f2--7.1'], ['f2--7.1', 'f2--2.6'], ['f2--2.6', 'f2-1.9'], ['f2-1.9', 'f2-ice'], ['f2-ice', 'ice-n'], ['f2-ice', 'f2-9.4'],
    ['f2-9.4', 'f2-12.4'], ['f2-12.4', 'f2-16.9'], ['f2-16.9', 'f2-21.4'], ['f2-21.4', 'f2-25.9'],
    ['deck-s', 'deck-n'], ['lot-e', 'lot-m'], ['lot-m', 'lot-w'], ['lot-w', 'walk-w'], ['walk-w', 'canopy'],
  ],
  places: {
    coffee: { p: [2.6, 0, -7.55], node: 'coffee-n', face: Math.PI },
    vending: { p: [5.0, 0, -6.6], node: 'vend-n', face: Math.PI / 2 },
    'front-window': { p: [0.0, 0, 8.2], node: 'window-n', face: 0 },
    'room-106': door(21, 1),
    'room-207': door(1.5, -1, F2),
    ice: { p: [7.5, F2, 2.85], node: 'ice-n', face: 0 },
    linen: { p: [9.4, F2, 0.55], node: 'f2-9.4', face: 0, hide: true },
    'deck-s': { p: [-22, 0, -5], node: 'deck-s', face: 0 }, 'deck-n': { p: [-22, 0, 3.5], node: 'deck-n', face: Math.PI },
    car: { p: [17.2, 0, 24.6], node: 'lot-e', face: Math.PI / 2 }, 'lot-view': { p: [4, 0, 24.4], node: 'lot-m', face: 0 },
    'smoke-spot': { p: [-0.5, 0, 11.3], node: 'canopy', face: -Math.PI / 2 },
  },
};
// Rooms on the second floor that want cleaning tonight (late checkouts, stayovers asking for towels); 212 is yours.
const SERVICE = [];
for (const [xs, side] of [[[-12, -7.5, -3, 16.5, 21, 25.5], 1], [[-12, -3, 12, 16.5, 25.5], -1]]) for (const x of xs) {
  const id = `door-${side > 0 ? 'S' : 'N'}${x}`; HOTEL.places[id] = door(x, side, F2); SERVICE.push(id);
}

// The people of the Heartland Inn, as intent data (../intent.js). Order matters to checks: housekeeper first.
const RESIDENTS = [
  { id: 'maria', model: 'rb-emma-casual', tint: '#7a8b99', speed: 0.75, cart: true, start: 'linen',
    who: 'Maria, evening housekeeper, eleven years at the Heartland',
    why: 'Turning down the late checkouts on two and running towels to whoever calls the desk',
    needs: { work: { level: 0.9, rate: 1 / 120 }, linen: { level: 0.1, rate: 0 } },
    activities: {
      service: { need: 'work', weight: 1.2, steps: [['go', SERVICE], ['wait', 25, 55]], satisfies: { work: 0.35, linen: -0.3 } },
      restock: { need: 'linen', weight: 1.4, steps: [['go', 'linen'], ['wait', 15, 30]], satisfies: { linen: 1 } },
      'check-list': { weight: 0.5, steps: [['wait', 6, 12]] },   // stops by the cart, checks the board
    },
    says: { near: '“Evening! Need extra towels? I’ve got plenty.”' } },
  { id: 'deck-guest', model: 'rb-andre-casual', speed: 0.6, start: 'deck-s',
    who: 'A guest in a hotel robe', why: 'Drying off between swims, walking the deck to stay warm',
    activities: { laps: { steps: [['go', 'deck-n'], ['wait', 4, 8], ['go', 'deck-s'], ['wait', 4, 8]] } } },
  { id: 'dale', model: 'rb-andre-casual', tint: '#a23b2a', speed: 1.0, start: 'car',
    who: 'Dale, driving to his sister’s in Omaha', why: 'Can’t sleep; keeps going out to smoke and check on the car',
    needs: { smoke: { level: 0.6, rate: 1 / 150 } },
    activities: {
      smoke: { need: 'smoke', weight: 1.2, steps: [['go', 'smoke-spot'], ['wait', 30, 60]], satisfies: { smoke: 1 } },
      'check-car': { weight: 0.8, steps: [['go', 'car'], ['wait', 15, 35]] },
      'look-at-road': { weight: 0.5, steps: [['go', 'lot-view'], ['wait', 10, 20]] },
    },
    says: { near: '“Long drive?”' } },
  { id: 'ray', model: 'rb-marcus-formal', tint: '#6b4e2e', speed: 1.05, cup: true, start: 'room-106',
    who: 'Ray, 52, long-haul driver on the I-80 run, two nights a month here',
    why: 'Off the clock for ten hours before a 5 a.m. pickup in Lincoln; drinks too much coffee to sleep',
    needs: { coffee: { level: 0.95, rate: 1 / 200 }, snack: { level: 0.3, rate: 1 / 400 } },
    activities: {
      'coffee-run': { need: 'coffee', weight: 1.3, steps: [['go', 'coffee'], ['wait', 5, 8], ['hold', true], ['pose', 'cup'], ['wait', 2, 3], ['go', 'room-106'], ['wait', 40, 90], ['hold', false], ['pose', null]], satisfies: { coffee: 1 } },
      vending: { need: 'snack', weight: 1.1, steps: [['go', 'vending'], ['wait', 8, 14], ['go', 'room-106'], ['wait', 30, 60]], satisfies: { snack: 1 } },
      'check-rig': { weight: 0.6, steps: [['go', 'front-window'], ['wait', 12, 25]] },   // eyes his truck in the lot
    },
    says: { near: '“Coffee’s better than the truck stop. Barely. You headed east or west?”' } },
  { id: 'beth', model: 'rb-emma-casual', tint: '#3d6b4f', speed: 0.9, start: 'room-207',
    who: 'Beth, in town for her niece’s graduation', why: 'Up late on the phone; fills the ice bucket every hour',
    needs: { ice: { level: 0.7, rate: 1 / 160 } },
    activities: {
      ice: { need: 'ice', weight: 1.2, steps: [['go', 'ice'], ['wait', 5, 9], ['go', 'room-207'], ['wait', 45, 120]], satisfies: { ice: 1 } },
      'stretch-legs': { weight: 0.5, steps: [['go', 'door-N-12'], ['wait', 3, 6], ['go', 'room-207'], ['wait', 30, 60]] },
    },
    says: { near: '“Ice machine works, it just sounds like a car crash.”' } },
];

/** Seated guests, as intent data too (seat surface measured from the furniture's mesh; see REALISM.md, People). Their
 *  activities change posture and what they look at; body.js keeps them still in between (GAIT-AND-POSE.md). */
const SITTERS = [
  // Gene on the sectional's main run (seat 0.47, back-cushion face x 2.10, front edge 2.68, back top ~0.9). Watching the
  // TV: pelvis slid forward and rolled back into the cushions, settled to one side, knees apart, one foot out, right arm
  // along the sofa back, phone loose in his left hand in his lap. Checking the phone: sits up a little, both hands
  // bring it up to his chest, head down to it.
  { id: 'gene', model: 'rb-marcus-formal', tint: '#41506b', start: 'watch-tv',
    who: 'Gene, 58, sells commercial flooring across three states', why: 'Checked in early; the room was too quiet, so he watches the late news down here',
    seat: { hips: [2.36, 0.47, 6.55], yaw: Math.PI / 2, sink: 0.035 },
    postures: {
      tv: { recline: 0.4, roll: 0.08, tilt: 0.1, ahead: [0.56, 0.36], spread: 0.2 },   // hands rest on the thighs (people.js default); the arm along the sofa back reached behind the cushions
      phone: { recline: 0.3, roll: 0.03, tilt: 0, ahead: [0.5, 0.42], spread: 0.16, hands: [[2.6, 0.8, 6.5], [2.6, 0.8, 6.6]] },
    },
    things: { tv: { at: [6.36, 1.6, 6.4], kind: 'tv' }, phone: { prop: 'hotel-phone', kind: 'phone' } },
    activities: {
      'watch-tv': { weight: 1.2, steps: [['posture', 'tv'], ['attend', 'tv'], ['wait', 70, 160]] },
      'check-phone': { weight: 0.7, steps: [['posture', 'phone'], ['attend', 'phone'], ['wait', 20, 50]] },
    } },
  // At the communal table on a bar stool (seat 0.79), ankles over the stool's front bar (0.26), leaning on her forearms,
  // hands on the oak top (1.05), eyes on her phone on the table.
  { id: 'nurse', model: 'rb-emma-casual', tint: '#8a3b5c', start: 'scroll',
    who: 'A nurse between shifts with her phone', why: 'Killing the hour before her night shift at the county hospital',
    seat: { hips: [-2.1, 0.79, -4.62], yaw: Math.PI, sink: 0.005 },
    postures: { lean: { lean: 0.22, tilt: -0.05, feet: [[-2.0, 0.345, -4.82], [-2.2, 0.345, -4.82]], hands: [[-1.96, 1.09, -5.02], [-2.24, 1.09, -5.02]] } },
    things: { phone: { at: [-2.1, 1.06, -5.1], kind: 'phone' } },
    activities: { scroll: { steps: [['posture', 'lean'], ['attend', 'phone'], ['wait', 60, 200]] } } },
  // At a business-center PC on a task chair (seat 0.52, x 5.2-5.5): leaning in a little, left hand on the keyboard,
  // right on the mouse (desk 0.76, edge 5.75), eyes on the monitor.
  { id: 'rep', model: 'rb-andre-casual', tint: '#2f3a2f', start: 'print',
    who: 'A rep printing tomorrow’s boarding pass', why: 'The airline app won’t load the pass and the gate agent wants paper',
    seat: { hips: [5.33, 0.52, -3.55], yaw: Math.PI / 2, sink: 0.015 },
    postures: { type: { lean: 0.38, hands: [[5.79, 0.795, -3.64], [5.81, 0.79, -3.33]] } },
    things: { screen: { at: [6.15, 1.05, -3.55], kind: 'screen' } },
    activities: { print: { steps: [['posture', 'type'], ['attend', 'screen'], ['wait', 60, 200]] } } },
];
return { HOTEL, RESIDENTS, SITTERS };
}

export function buildStaff(ctx) {
  const {
    scene, lib, game, people, interact, updaters, add, solid,
  } = ctx;
  const eye = new T.Vector3();   // the player's eyes: what people glance at
  const { HOTEL, RESIDENTS, SITTERS } = castData();
  // ---------- staff and guests ----------
  let clerk = null;
  if (people) {
  // on duty: anyone who comes up to the desk gets looked at straight away (a guest doesn't stand there unnoticed)
  clerk = lib.person('rb-sophia-formal', { tint: '#1d4f8f', manner: { engage: 3.2, linger: 0.3, share: 0.85 } });
  // Between the two pods, not behind the right one's monitor: from where a guest stands she was a forehead over a screen.
  add(clerk.root, -8.65, 0, -3.95, 0); solid(-8.9, -8.4, 0, 1.7, -4.2, -3.7);   // Dana is solid when you come round behind the desk
  clerk.lookAt(eye);   // she looks up at whoever comes to the desk
  clerk.attend({ at: new T.Vector3(-8.05, 1.2, -3.3), kind: 'screen' });   // between guests: the right pod's monitor
  updaters.push(dt => clerk.update(dt));
  interact.push({ pos: new T.Vector3(-7.9, 1.2, -2.4), r: 2.0, label: () => game.has('key card') ? 'Talk to Dana' : 'Check in', use: () => game.checkIn(clerk) });
  const ringBell = { pos: new T.Vector3(-7.05, 1.15, -2.65), r: 0.5, label: () => 'Ring the bell', use: () => { game.sound.bell(); clerk.play('Wave'); setTimeout(() => clerk.play('Idle'), 2000); } };
  interact.push(ringBell);
  }

  // A walker follows a route of stops ({ p: Vector3, wait, face, pose, cup, hide, pass }); a resident's mind hands it
  // the next route when one is done. `at` is the stop it is standing at (waiting), `i` the stop it is heading for next.
  const walkers = [];
  const phase = () => game.timeOfDay ?? 'dusk';   // ponytail: main.js doesn't publish the time of day yet; dusk until it does
  const toStops = list => list.map(s => ({ ...s, p: new T.Vector3(...s.p) }));
  function walker(r) {
    const p = lib.person(r.model, { tint: r.tint });
    scene.add(p.root);
    const m = mind(r, HOTEL), start = HOTEL.places[r.start];
    const w = { p, r, mind: m, stops: [], i: 0, at: null, wait: 0, speed: r.speed ?? 1.0, v: 0, yaw: start.face ?? 0, say: r.says?.near, said: 0, task: { at: new T.Vector3(), kind: 'path' }, holding: false, cup: null, cart: null, hidden: false };
    p.root.position.set(...start.p); p.root.rotation.y = w.yaw;
    w.stops = toStops(m.next(start.p, phase()));
    p.lookAt(eye);
    walkers.push(w);
    return w;
  }
  // Seated: the rig bent into a sitting pose (people.js), feet and hands placed by IK, the hip joints on the seat. A mind
  // (intent.js) picks what they do (watch the TV, check the phone); each beat sets a posture and what their eyes are on.
  // Solid, so the chair under them (a loose stool or task chair inside the box) is pinned by physics.js.
  const sitters = [], seated = [];
  const v3 = l => l?.map(h => new T.Vector3(...h));
  function sitter(r) {
    const { hips: [x, seatY, z], yaw, sink = 0.02 } = r.seat;
    const p = lib.person(r.model, { tint: r.tint, manner: r.manner });
    const postures = Object.fromEntries(Object.entries(r.postures).map(([k, o]) => [k, { ...o, hands: v3(o.hands), feet: v3(o.feet) }]));
    p.pose('sit', Object.values(postures)[0]);
    // hip joints ~9 cm over the sitting surface (ANSUR seated hip-joint height), less what the cushion gives
    add(p.root, x, seatY + 0.09 * p.root.scale.y - sink - p.hipJoint, z, yaw);
    p.root.userData.who = r.who;
    solid(x - 0.3, x + 0.3, 0, seatY + 0.8, z - 0.3, z + 0.3);
    // what they look at: a fixed point (the TV, a screen) or a prop in their hands (the phone)
    const things = {};
    for (const [k, t] of Object.entries(r.things ?? {})) {
      things[k] = { at: t.at ? new T.Vector3(...t.at) : new T.Vector3(), kind: t.kind };
      if (t.prop) { const o = new T.Group(), m = lib.model(t.prop, { origin: true }); m.rotation.x = Math.PI / 2; o.add(m); scene.add(o); things[k].prop = o; }   // screen (+y) toward +z, then o.lookAt the face
    }
    const s = { p, r, postures, things, mind: mind({ ...r, activities: r.activities }, HOTEL), stops: [], i: 0, wait: 0, at: [x, seatY, z] };
    s.stops = s.mind.start(r.start, s.at);
    p.lookAt(eye);
    sitters.push(p); seated.push(s);
    return p;
  }
  function seatedTick(s, dt) {
    const { p, things } = s;
    if ((s.wait -= dt) <= 0) {
      if (s.i >= s.stops.length) { s.stops = s.mind.next(s.at, phase()); s.i = 0; }
      const st = s.stops[s.i++];
      if (st.posture && s.postures[st.posture]) p.pose('sit', s.postures[st.posture]);
      if ('attend' in st) p.attend(things[st.attend] ?? null);
      s.wait = st.wait || 1;
    }
    p.update(dt);
    // a prop in hand follows the hands (both, when both hold it; else the lap hand) and faces the eyes
    for (const t of Object.values(things)) if (t.prop) {
      const B = p.bones, sit = p.sitting, both = (sit?.hands?.length ?? 0) >= 2;
      const at = both ? B.hands[0].getWorldPosition(t.at).add(B.hands[1].getWorldPosition(d)).multiplyScalar(0.5) : B.hands[0].getWorldPosition(t.at);
      t.at.y += both ? 0.03 : 0.02;
      t.prop.position.copy(at); t.prop.lookAt(B.head.getWorldPosition(d));
    }
  }
  if (people) {
    for (const r of RESIDENTS) {
      const w = walker(r);
      if (r.cart) {
        w.cart = lib.model('hotel-housekeeping-cart', { origin: true }); scene.add(w.cart);
        w.cartAt = w.p.root.position.clone().add(new T.Vector3(Math.sin(w.yaw), 0, Math.cos(w.yaw)).multiplyScalar(1.2));
      }
      if (r.cup) { w.cup = lib.model('hotel-coffee-cup', { origin: true }); w.cup.visible = false; scene.add(w.cup); }
    }
    for (const s of SITTERS) sitter(s);
    // a noise (a thrown thing landing): everyone within earshot on that floor turns to it (God's physics calls this)
    game.hear = (at, joules = 1) => { for (const p of [clerk, ...walkers.filter(w => !w.hidden).map(w => w.p), ...sitters]) if (p && joules > 0.3 && Math.abs(p.root.position.y - at.y) < 2 && p.root.position.distanceTo(at) < 4 + 3 * Math.sqrt(joules)) p.hear(at); };
  }

  const fwd = new T.Vector3(), toward = new T.Vector3(), rel = new T.Vector3(), d = new T.Vector3();
  const near = (a, b) => Math.abs(a.y - b.y) < 1.5;   // same floor
  updaters.push((dt, t, player) => {
    eye.set(player.x, player.y + 1.6, player.z);
    for (const s of seated) seatedTick(s, dt);
    // who's where this frame: bodies and carts everyone steers round
    const obstacles = [{ pos: player.pos, r: BODY, player: true }];
    for (const w of walkers) if (!w.hidden) { obstacles.push({ pos: w.p.root.position, r: BODY, w }); if (w.cart) obstacles.push({ pos: w.cartAt, r: CART, w }); }
    for (const w of walkers) {
      const { p } = w, pos = p.root.position;
      w.mind.tick(dt);
      const seen = near(player.pos, pos) && player.pos.distanceTo(pos) < 7;   // ponytail: distance, not gaze; a wall between still counts as seen
      let heading = w.yaw, want = 0;
      if (w.wait > 0) {
        if (w.at.face !== undefined) heading = w.at.face;
        if (w.at.hide && !w.hidden && !seen) w.hidden = true;   // through the door once nobody's looking
        w.wait -= dt;
        if (w.wait <= 0 && w.hidden && seen) w.wait = 0.5;    // and back out the same way
        if (w.wait <= 0) w.hidden = false;
      } else {
        if (w.i >= w.stops.length) { w.stops = toStops(w.mind.next(pos.toArray(), phase())); w.i = 0; }
        const stop = w.stops[w.i];
        toward.copy(stop.p).sub(pos); toward.y = 0;
        const dist = toward.length();
        if (dist < (stop.pass ? 0.35 : 0.08)) {   // arrived (corners are cut, stops are reached)
          w.at = stop; w.i++;
          w.wait = stop.wait ?? 0;
          if (stop.cup !== undefined) w.holding = stop.cup;
          if (stop.pose !== undefined) p.pose(stop.pose);
          else if (!stop.pass || w.holding) p.pose(w.holding ? 'cup' : null);
        } else {
          heading = Math.atan2(toward.x, toward.z);
          // ease into a stop; pass through corners at pace
          want = stop.pass ? w.speed : Math.min(w.speed, Math.sqrt(2 * DECEL * dist));
          // someone in the way: the nearest body or cart ahead in our lane
          const reach = 1.8 + (w.cart ? 1.2 : 0);
          let best = null;
          for (const o of obstacles) {
            if (o.w === w || !near(o.pos, pos)) continue;
            rel.copy(o.pos).sub(pos); rel.y = 0;
            const ahead = rel.dot(toward) / dist, side = (toward.x * rel.z - toward.z * rel.x) / dist;   // + : on our right
            if (ahead > 0 && ahead < reach && Math.abs(side) < BODY + o.r + (w.cart ? 0.25 : 0) + 0.2 && (!best || ahead < best.ahead)) best = { ahead, side, o };
          }
          if (best) {
            const { ahead, side, o } = best;
            if (o.player && ahead < 0.55 && Math.abs(side) < 0.4) want = 0;   // right in front of you: wait
            else {
              // bear away from their side; two people meeting head on both keep right
              const s = !o.player && Math.abs(side) < 0.15 ? -1 : side > 0 ? 1 : -1;
              heading += s * 0.7 * (1 - ahead / reach); want *= 0.8;
            }
          }
          want = Math.min(want, dist / Math.max(dt, 1e-3));
        }
      }
      p.root.visible = !w.hidden;
      const diff = wrap(heading - w.yaw);
      w.yaw += Math.sign(diff) * Math.min(Math.abs(diff), TURN * dt);
      want *= Math.max(0, Math.cos(Math.min(Math.abs(diff), Math.PI / 2)));   // turns on the spot before it sets off
      w.v = want > w.v ? Math.min(want, w.v + ACCEL * dt) : Math.max(want, w.v - DECEL * dt);
      fwd.set(Math.sin(w.yaw), 0, Math.cos(w.yaw));
      pos.addScaledVector(fwd, w.v * dt);
      // nobody overlaps: a soft push apart from any body or cart closer than both radii (people, carts, you)
      if (!w.hidden) for (const o of obstacles) {
        if (o.w === w || !near(o.pos, pos)) continue;
        d.copy(pos).sub(o.pos); d.y = 0; const gap = d.length(), min = BODY + o.r;
        if (gap < min && gap > 1e-4) pos.addScaledVector(d, (min - gap) / gap * (o.player || o.pos === o.w?.cartAt ? 1 : 0.5));
      }
      p.root.rotation.y = w.yaw;
      // eyes: on the way ahead while walking (the head leads the turns), on what they're doing when stopped
      const goal = w.wait > 0 ? null : w.stops[w.i];
      if (goal) {
        const next = rel.copy(goal.p).sub(pos).setY(0).length() < 1.5 && w.stops[w.i + 1] ? w.stops[w.i + 1].p : goal.p;
        w.task.at.copy(next).sub(pos).setY(0); const n = w.task.at.length();
        if (n > 1e-3) w.task.at.multiplyScalar(Math.min(n, 3.5) / n);
        w.task.at.add(pos).setY(pos.y + 1.0); w.task.kind = 'path';
      } else { const f = w.at?.face ?? w.yaw; w.task.at.set(pos.x + Math.sin(f) * 0.9, pos.y + 1.0, pos.z + Math.cos(f) * 0.9); w.task.kind = 'work'; }
      p.attend(w.task);
      if (w.v > 0.05) { p.play('Walk'); p.pace(w.v); } else p.play('Idle');
      p.update(dt);
      if (w.cup) {
        w.cup.visible = !!w.holding && p.root.visible;
        if (w.cup.visible) { p.bones.hand.getWorldPosition(w.cup.position); w.cup.position.y -= 0.07; w.cup.position.addScaledVector(fwd, 0.03); w.cup.rotation.set(0, w.yaw, 0); }
      }
      if (w.cart) {
        // The cart rolls, it doesn't hover at arm's length: pushed, its line swings round toward where she's going;
        // pulled (she turned back), it trails behind her. 1.2 m from her to its centre either way; parked while she works.
        d.copy(w.cartAt).sub(pos); d.y = 0; d.normalize();
        if (w.v > 0.02) { if (d.dot(fwd) > 0) d.lerp(fwd, Math.min(1, 2.5 * dt * w.v)).normalize(); w.cartAt.copy(pos).addScaledVector(d, 1.2); }
        w.cartAt.y = pos.y;
        w.cart.position.copy(w.cartAt); w.cart.rotation.y = Math.atan2(d.x, d.z) - Math.PI / 2;   // cart +X (bag end) away from her
      }
      if (w.say && p.root.visible && player.pos.distanceTo(pos) < 2.2 && t - w.said > 40) { w.said = t; game.say(w.say); }
    }
  });
  Object.assign(ctx, { clerk, walkers, sitters });
}
