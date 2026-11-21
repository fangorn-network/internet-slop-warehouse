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

/** Seated guests: who, and where (seat surface measured from the furniture's mesh; see REALISM.md, People). */
const SITTERS = [
  // Lounging on the sectional's main run like a tired traveller (seat 0.47, back-cushion face x 2.10, front edge 2.68,
  // back top ~0.9): pelvis slid forward and rolled back into the cushions, settled to one side, knees apart, one foot out,
  // an arm along the sofa back, the other hand in his lap, head tipped toward the TV.
  { id: 'rb-marcus-formal', tint: '#41506b', who: 'A salesman winding down with the news', hips: [2.36, 0.47, 6.55], yaw: Math.PI / 2, sink: 0.035,
    recline: 0.4, roll: 0.08, tilt: 0.1, ahead: [0.56, 0.36], spread: 0.2,
    hands: [[1.98, 0.93, 7.15]], gaze: [6.36, 1.6, 6.4] },
  // At the communal table on a bar stool (seat 0.79), ankles over the stool's front bar (0.26), leaning on her forearms,
  // hands on the oak top (1.05), eyes on her phone.
  { id: 'rb-emma-casual', tint: '#8a3b5c', who: 'A nurse between shifts with her phone', hips: [-2.1, 0.79, -4.62], yaw: Math.PI, sink: 0.005, lean: 0.22, tilt: -0.05,
    feet: [[-2.0, 0.345, -4.82], [-2.2, 0.345, -4.82]], hands: [[-1.96, 1.09, -5.02], [-2.24, 1.09, -5.02]], gaze: [-2.1, 1.06, -5.1] },
  // At a business-center PC on a task chair (seat 0.52, x 5.2-5.5): leaning in a little, forearms forward, left hand on
  // the keyboard, right on the mouse (desk 0.76, edge 5.75), eyes on the monitor.
  { id: 'rb-andre-casual', tint: '#2f3a2f', who: 'A rep printing tomorrow’s boarding pass', hips: [5.33, 0.52, -3.55], yaw: Math.PI / 2, sink: 0.015, lean: 0.38,
    hands: [[5.79, 0.795, -3.64], [5.81, 0.79, -3.33]], gaze: [6.15, 1.05, -3.55] },
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
  clerk = lib.person('rb-sophia-formal', { tint: '#1d4f8f' });
  // Between the two pods, not behind the right one's monitor: from where a guest stands she was a forehead over a screen.
  add(clerk.root, -8.65, 0, -3.95, 0); solid(-8.9, -8.4, 0, 1.7, -4.2, -3.7);   // Dana is solid when you come round behind the desk
  clerk.lookAt(eye);   // she looks up at whoever comes to the desk
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
    const w = { p, r, mind: m, stops: [], i: 0, at: null, wait: 0, speed: r.speed ?? 1.0, v: 0, yaw: start.face ?? 0, say: r.says?.near, said: 0, holding: false, cup: null, cart: null, hidden: false };
    p.root.position.set(...start.p); p.root.rotation.y = w.yaw;
    w.stops = toStops(m.next(start.p, phase()));
    p.lookAt(eye);
    walkers.push(w);
    return w;
  }
  // Seated: the rig bent into a sitting pose over Idle, feet and hands placed by IK (people.js), the hip joints on the
  // seat. Solid, so the chair under them (a loose stool or task chair inside the box) is pinned by physics.js.
  const sitters = [];
  function sitter({ id, tint, hips: [x, seatY, z], yaw, sink = 0.02, gaze, who, ...style }) {
    const p = lib.person(id, { tint });
    const v3 = l => l?.map(h => new T.Vector3(...h));
    p.pose('sit', { ...style, hands: v3(style.hands), feet: v3(style.feet) });
    // they watch what they're doing (the TV, the screen, a phone) and look up at you when you come close
    p.look = new T.Vector3(); p.gaze = gaze ? new T.Vector3(...gaze) : null; p.lookAt(p.look);
    // hip joints ~9 cm over the sitting surface (ANSUR seated hip-joint height), less what the cushion gives
    add(p.root, x, seatY + 0.09 * p.root.scale.y - sink - p.hipJoint, z, yaw);
    p.root.userData.who = who;
    solid(x - 0.3, x + 0.3, 0, seatY + 0.8, z - 0.3, z + 0.3);
    sitters.push(p);
    return p;
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
  }

  const fwd = new T.Vector3(), toward = new T.Vector3(), rel = new T.Vector3(), d = new T.Vector3();
  const near = (a, b) => Math.abs(a.y - b.y) < 1.5;   // same floor
  updaters.push((dt, t, player) => {
    eye.set(player.x, player.y + 1.6, player.z);
    for (const p of sitters) { p.look.copy(p.gaze && p.root.position.distanceTo(player.pos) > 3 ? p.gaze : eye); p.update(dt); }
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
