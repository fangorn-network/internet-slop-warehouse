// SPDX-License-Identifier: CC0-1.0
// Staff and guests: who works and stays here, why, where they go and what they do there.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
// Residents are data (RESIDENTS below, schema in ../intent.js); a mind per resident picks what they do next, and the
// walker here carries it out: smooth starts and stops, turning at a person's rate, stepping round people (keeping right
// when two meet head on), never overlapping anyone, and only going out of sight through a door when nobody's watching.
import * as T from 'three';
import { FLOOR2 } from '../world.js';
import { mind, reaction } from '../intent.js';
import { findSpots, nearest, standAt, workstation } from '../affords.js';

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
    says: { near: '“Evening! Need extra towels? I’ve got plenty.”' }, home: 'linen',
    reacts: { hit: [
      { mood: 'startled', do: 'flinch', say: ['“Oh! Careful, honey.”', '“Ow — hey.”'] },
      { mood: 'annoyed', do: 'step-away', say: ['“Please don’t do that. I’m working.”', '“Okay, stop. That’s not funny.”'] },
      { mood: 'angry', do: 'leave', say: ['“I’m telling Dana.”'] }],
      'near-miss': { mood: 'startled', do: 'flinch', say: ['“Oh, my goodness.”'] } } },
  { id: 'deck-guest', model: 'rb-andre-casual', speed: 0.6, start: 'deck-s',
    who: 'A guest in a hotel robe', why: 'Drying off between swims, walking the deck to stay warm',
    activities: { laps: { steps: [['go', 'deck-n'], ['wait', 4, 8], ['go', 'deck-s'], ['wait', 4, 8]] } },
    reacts: { hit: [{ mood: 'startled', do: 'flinch', say: ['“Hey!”'] }, { mood: 'annoyed', do: 'step-away', say: ['“Come on, man. Knock it off.”', '“Really?”'] }],
      'near-miss': { mood: 'startled', do: 'flinch' } } },
  { id: 'dale', model: 'rb-andre-casual', tint: '#a23b2a', speed: 1.0, start: 'car',
    who: 'Dale, driving to his sister’s in Omaha', why: 'Can’t sleep; keeps going out to smoke and check on the car',
    needs: { smoke: { level: 0.6, rate: 1 / 150 } },
    activities: {
      smoke: { need: 'smoke', weight: 1.2, steps: [['go', 'smoke-spot'], ['wait', 30, 60]], satisfies: { smoke: 1 } },
      'check-car': { weight: 0.8, steps: [['go', 'car'], ['wait', 15, 35]] },
      'look-at-road': { weight: 0.5, steps: [['go', 'lot-view'], ['wait', 10, 20]] },
    },
    says: { near: '“Long drive?”' }, home: 'car',
    reacts: { hit: [
      { mood: 'startled', do: 'flinch', say: ['“Whoa — hey!”', '“The heck was that?”'] },
      { mood: 'annoyed', do: 'guard', say: ['“Real mature, bud.”', '“Do that again. See what happens.”'] },
      { mood: 'angry', do: 'leave', say: ['“Nope. I’m done with this place.”'] }],
      'near-miss': { mood: 'startled', do: 'flinch', say: ['“Jeez.”'] } } },
  { id: 'ray', model: 'rb-marcus-formal', tint: '#6b4e2e', speed: 1.05, cup: true, start: 'room-106',
    who: 'Ray, 52, long-haul driver on the I-80 run, two nights a month here',
    why: 'Off the clock for ten hours before a 5 a.m. pickup in Lincoln; drinks too much coffee to sleep',
    needs: { coffee: { level: 0.95, rate: 1 / 200 }, snack: { level: 0.3, rate: 1 / 400 } },
    activities: {
      'coffee-run': { need: 'coffee', weight: 1.3, steps: [['go', 'coffee'], ['wait', 5, 8], ['hold', true], ['pose', 'cup'], ['wait', 2, 3], ['go', 'room-106'], ['wait', 40, 90], ['hold', false], ['pose', null]], satisfies: { coffee: 1 } },
      vending: { need: 'snack', weight: 1.1, steps: [['go', 'vending'], ['wait', 8, 14], ['go', 'room-106'], ['wait', 30, 60]], satisfies: { snack: 1 } },
      'check-rig': { weight: 0.6, steps: [['go', 'front-window'], ['wait', 12, 25]] },   // eyes his truck in the lot
    },
    says: { near: '“Coffee’s better than the truck stop. Barely. You headed east or west?”' }, home: 'room-106',
    reacts: { hit: [
      { mood: 'startled', do: 'flinch', say: ['“Hey! Watch it, buddy.”', '“What the hell, man?”'] },
      { mood: 'annoyed', do: 'guard', say: ['“You do that one more time, we’re gonna have a problem.”', '“I’m not playin’ with you. Knock it off.”'] },
      { mood: 'angry', do: 'leave', say: ['“Unbelievable. I gotta be up at four.”'] }],
      'near-miss': { mood: 'startled', do: 'flinch', say: ['“Easy.”'] } } },
  { id: 'beth', model: 'rb-emma-casual', tint: '#3d6b4f', speed: 0.9, start: 'room-207',
    who: 'Beth, in town for her niece’s graduation', why: 'Up late on the phone; fills the ice bucket every hour',
    needs: { ice: { level: 0.7, rate: 1 / 160 } },
    activities: {
      ice: { need: 'ice', weight: 1.2, steps: [['go', 'ice'], ['wait', 5, 9], ['go', 'room-207'], ['wait', 45, 120]], satisfies: { ice: 1 } },
      'stretch-legs': { weight: 0.5, steps: [['go', 'door-N-12'], ['wait', 3, 6], ['go', 'room-207'], ['wait', 30, 60]] },
    },
    says: { near: '“Ice machine works, it just sounds like a car crash.”' }, home: 'room-207',
    reacts: { hit: [
      { mood: 'startled', do: 'flinch', say: ['“Ow! Excuse me?”', '“Oh my gosh — what?”'] },
      { mood: 'annoyed', do: 'step-away', say: ['“Okay, seriously, stop it.”', '“What is wrong with you?”'] },
      { mood: 'angry', do: 'leave', say: ['“I’m calling the front desk.”'] }],
      'near-miss': { mood: 'startled', do: 'flinch', say: ['“Jeez!”'] } } },
  // Dana works the desk: between guests she's at her pod's keyboard (affords.js: where her hands go and the clack come
  // from the keyboard, not from her); anyone coming up to the desk, she steps to the gap between the pods to serve them.
  // Her places are found from the pod's spots when the world is built (buildStaff).
  { id: 'dana', model: 'rb-sophia-formal', tint: '#1d4f8f', speed: 0.8, start: 'desk-keys', manner: { engage: 3.2, linger: 0.3, share: 0.85 },
    who: 'Dana, night desk clerk', why: 'Checking in late arrivals, answering the phone, keeping the night audit going',
    serves: { at: [-7.9, 0, -2.4], r: 3.0, place: 'desk-serve' },
    activities: {
      audit: { weight: 1.2, steps: [['go', 'desk-keys'], ['use', 'keyboard'], ['wait', 40, 110]] },
      'look-up': { weight: 0.4, steps: [['go', 'desk-serve'], ['wait', 6, 14]] },   // stretches, looks out over the lobby
    },
    // a night clerk alone with a guest throwing things: startled, then firm, then the police (a lasting flag)
    reacts: { hit: [
      { mood: 'startled', do: 'flinch', say: ['“Oh! Hey —”', '“Whoa. Watch it.”', '“Jeez! Careful.”'] },
      { mood: 'annoyed', do: 'guard', say: ['“Okay, that’s enough. Knock it off.”', '“Hey. I’m serious. Quit throwing stuff.”'] },
      { mood: 'angry', do: 'call-police', phone: 'desk-phone', flag: 'policeCalled', say: ['“Alright. I’m calling the police.”', '“That’s it. I’m calling the cops.”'] }],
      'near-miss': { mood: 'startled', do: 'flinch', say: ['“Hey! What was that?”', '“You scared me half to death.”'] } },
    call: '“Hi, yeah, this is Dana at the Heartland Inn, out by the highway. I’ve got a guest throwing things at people in the lobby… No, I’m okay. Can you just send somebody out? …Thank you.”' },
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
      phone: { recline: 0.3, roll: 0.03, tilt: 0, grip: 'phone', ahead: [0.5, 0.42], spread: 0.16, hands: [[2.6, 0.8, 6.5], [2.6, 0.8, 6.6]] },
    },
    things: { tv: { at: [6.36, 1.6, 6.4], kind: 'tv' }, phone: { prop: 'hotel-phone', kind: 'phone' } },
    activities: {
      'watch-tv': { weight: 1.2, steps: [['posture', 'tv'], ['attend', 'tv'], ['wait', 70, 160]] },
      'check-phone': { weight: 0.7, steps: [['posture', 'phone'], ['attend', 'phone'], ['wait', 20, 50]] },
    },
    reacts: { hit: [{ mood: 'startled', do: 'flinch', say: ['“Hey! Easy, pal.”'] }, { mood: 'annoyed', do: 'flinch', say: ['“Alright, you’ve had your fun. Cut it out.”'] }], 'near-miss': { mood: 'startled', do: 'flinch' } } },
  // At the communal table on a bar stool (seat 0.79), balls of her feet on the stool's front rail (measured: top 0.46 at
  // z -4.78, x -2.25..-1.95; there is no ring at 0.26), leaning on her forearms,
  // hands on the oak top (1.05), eyes on her phone on the table.
  { id: 'nurse', model: 'rb-emma-casual', tint: '#8a3b5c', start: 'scroll',
    who: 'A nurse between shifts with her phone', why: 'Killing the hour before her night shift at the county hospital',
    seat: { hips: [-2.1, 0.79, -4.62], yaw: Math.PI, sink: 0.005 },
    postures: { lean: { lean: 0.34, tilt: -0.05, feet: [[-2.0, 0.53, -4.72], [-2.2, 0.53, -4.72]], hands: [[-1.97, 1.08, -4.97], [-2.23, 1.08, -4.97]] } },   // wrists just over the table's near edge (z -4.95, top 1.05): within reach
    things: { phone: { at: [-2.1, 1.06, -5.1], kind: 'phone' } },
    activities: { scroll: { steps: [['posture', 'lean'], ['attend', 'phone'], ['wait', 60, 200]] } },
    reacts: { hit: [{ mood: 'startled', do: 'flinch', say: ['“Ow! Seriously?”'] }, { mood: 'annoyed', do: 'flinch', say: ['“Can you not? Thanks.”'] }], 'near-miss': { mood: 'startled', do: 'flinch' } } },
  // At a business-center PC on a task chair pulled in to the desk (seat 0.52, centre x 5.5): leaning in a little, left hand on the keyboard,
  // right on the mouse (desk 0.76, edge 5.75), eyes on the monitor.
  { id: 'rep', model: 'rb-andre-casual', tint: '#2f3a2f', start: 'print',
    who: 'A rep printing tomorrow’s boarding pass', why: 'The airline app won’t load the pass and the gate agent wants paper',
    seat: { hips: [5.5, 0.52, -3.55], yaw: Math.PI / 2, sink: 0.015 },
    postures: { type: { lean: 0.38, use: 'keyboard' } },   // hands, grip, keys and clicks from the workstation (affords.js)
    things: { screen: { at: [6.15, 1.05, -3.55], kind: 'screen' } },
    activities: { print: { steps: [['posture', 'type'], ['attend', 'screen'], ['wait', 60, 200]] } },
    reacts: { hit: [{ mood: 'startled', do: 'flinch', say: ['“Whoa — okay.”'] }, { mood: 'annoyed', do: 'flinch', say: ['“Dude. I’m trying to print something.”'] }], 'near-miss': { mood: 'startled', do: 'flinch' } } },
];
return { HOTEL, RESIDENTS, SITTERS };
}

export function buildStaff(ctx) {
  const {
    scene, lib, game, people, interact, updaters, add, solid, colliders,
  } = ctx;
  const eye = new T.Vector3();   // the player's eyes: what people glance at
  const { HOTEL, RESIDENTS, SITTERS } = castData();
  // ---------- staff and guests ----------
  let clerk = null, spots = [];

  // A walker follows a route of stops ({ p: Vector3, wait, face, pose, cup, hide, pass }); a resident's mind hands it
  // the next route when one is done. `at` is the stop it is standing at (waiting), `i` the stop it is heading for next.
  const walkers = [];
  const phase = () => game.timeOfDay ?? 'dusk';   // ponytail: main.js doesn't publish the time of day yet; dusk until it does
  const toStops = list => list.map(s => ({ ...s, p: new T.Vector3(...s.p) }));
  function walker(r) {
    const p = lib.person(r.model, { tint: r.tint, manner: r.manner });
    scene.add(p.root);
    const m = mind(r, HOTEL), start = HOTEL.places[r.start];
    const w = { p, r, mind: m, stops: [], i: 0, at: null, wait: 0, speed: r.speed ?? 1.0, v: 0, yaw: start.face ?? 0, say: r.says?.near, said: 0, task: { at: new T.Vector3(), kind: 'path' }, holding: false, cup: null, cart: null, hidden: false, mem: {}, re: null, k: 0, pts: null, restL: [new T.Vector3(-0.2, 0.82, 0.03), new T.Vector3(0.2, 0.82, 0.03)] };
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
    // a posture that uses something (a keyboard): the hands and the grip come from the thing (affords.js)
    let ws = null, screen = null;
    for (const o of Object.values(postures)) if (o.use) {
      const kb = nearest(spots, o.use, new T.Vector3(x, seatY + 0.3, z)); if (!kb) continue;
      ws = workstation(kb, nearest(spots, 'mouse', kb.pos, kb)); screen = nearest(spots, 'screen', kb.pos, kb);
      o.hands = ws.hands; o.grip = ['keyboard', 'keyboard'];
    }
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
    if (screen && things.screen) things.screen.at.copy(screen.pos);
    const s = { p, r, mem: {}, postures, things, ws, mind: mind({ ...r, activities: r.activities }, HOTEL), stops: [], i: 0, wait: 0, at: [x, seatY, z] };
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
      if (st.posture && s.postures[st.posture]) { p.pose('sit', s.postures[st.posture]); s.using = s.postures[st.posture].use ? s.ws : null; }
      if ('attend' in st) p.attend(things[st.attend] ?? null);
      s.wait = st.wait || 1;
    }
    if (s.using) { for (const t of s.using.update(dt)) { p.tap(t.hand, t.finger); touchSound(t, t.at); } p.sitting.grip[1] = s.using.mousing ? 'mouse' : 'keyboard'; }
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
    // what things offer (affords.js): every keyboard, mouse and screen in the building, found on the placed models
    spots = findSpots(scene); const podKeys = nearest(spots, 'keyboard', new T.Vector3(-7.9, 1.1, -3.3));
    if (podKeys) HOTEL.places['desk-keys'] = { ...standAt(podKeys, 0.3), node: 'desk' };
    HOTEL.places['desk-serve'] = { p: [-8.65, 0, -3.95], node: 'desk', face: 0 };
    HOTEL.nodes.desk = [-8.3, 0, -3.85];
    HOTEL.places['desk-phone'] = { p: [-9.8, 0, -3.78], node: 'desk', face: 0 };   // behind the closed pod, at its desk phone
    ctx.spots = spots;
    for (const r of RESIDENTS) {
      const w = walker(r);
      if (r.cart) {
        w.cart = lib.model('hotel-housekeeping-cart', { origin: true }); scene.add(w.cart);
        w.cartAt = w.p.root.position.clone().add(new T.Vector3(Math.sin(w.yaw), 0, Math.cos(w.yaw)).multiplyScalar(1.2));
      }
      if (r.cup) { w.cup = lib.model('hotel-coffee-cup', { origin: true }); w.cup.visible = false; scene.add(w.cup); }
      if (r.id === 'dana') {
        clerk = w.p;
        // solid where she stands (you can come round behind the desk, but not through her)
        for (const k of ['desk-serve', 'desk-keys', 'desk-phone']) { const [x, , z] = HOTEL.places[k].p; solid(x - 0.25, x + 0.25, 0, 1.7, z - 0.25, z + 0.25, () => pos2(w).distanceTo(new T.Vector3(x, 0, z)) < 0.4); }
        interact.push({ pos: new T.Vector3(-7.9, 1.2, -2.4), r: 2.0, label: () => game.flags.policeCalled ? 'Talk to Dana' : game.has('key card') ? 'Talk to Dana' : 'Check in', use: () => game.checkIn(clerk) });
        // the check-in, beat by beat (main.js checkIn): where she stands, whether she types, what her eyes and right hand
        // are on. { at: 'desk-keys' | 'desk-serve', type, eyes: 'screen' | 'guest' | 'card', hand: 'card' | 'key' } or null
        game.danaBeat = b => { w.desk = b; if (!b) { w.deskAt = null; w.serving = false; w.p.fix(null); } };
        w.keyCard = new T.Mesh(new T.BoxGeometry(0.054, 0.0008, 0.086), new T.MeshStandardMaterial({ color: '#dfe3e8', roughness: 0.4 })); w.keyCard.visible = false; scene.add(w.keyCard);
        interact.push({ pos: new T.Vector3(-7.05, 1.15, -2.65), r: 0.5, label: () => 'Ring the bell', use: () => { game.sound.bell(); game.hear?.(new T.Vector3(-7.05, 1.15, -2.65), 2); clerk.play('Wave'); setTimeout(() => clerk.play('Idle'), 2000); } });
      }
    }
    for (const s of SITTERS) sitter(s);
    // a noise (a thrown thing landing): everyone within earshot on that floor turns to it (God's physics calls this)
    game.hear = (at, joules = 1) => { for (const p of [...walkers.filter(w => !w.hidden).map(w => w.p), ...sitters]) if (p && joules > 0.3 && Math.abs(p.root.position.y - at.y) < 2 && p.root.position.distanceTo(at) < 4 + 3 * Math.sqrt(joules)) p.hear(at); };
  }

  const pos2 = w => w.p.root.position;
  // using something where they stand (a keyboard, with its mouse and screen beside it): hands, keys and eyes from it
  function startUse(w, kind) {
    const kb = nearest(spots, kind, rel.copy(pos2(w)).setY(pos2(w).y + 1)); if (!kb) return;
    w.ws = workstation(kb, nearest(spots, 'mouse', kb.pos, kb)); w.screen = nearest(spots, 'screen', kb.pos, kb); w.grips = ['keyboard', 'keyboard'];
  }
  function stopUse(w) { if (!w.ws) return; w.ws = null; w.screen = null; }   // hands() eases them off the keys
  // a touch on something (a key, a mouse button): its sound, quieter with distance from your ears
  const touchSound = (t, at) => { const d = at.distanceTo(eye), v = 1 / (1 + (d / 1.2) ** 2); if (v > 0.03) t.kind === 'mouse' ? game.sound.mouse?.(0.05 * v) : game.sound.key?.(0.06 * v, t.space); };
  const fwd = new T.Vector3(), toward = new T.Vector3(), rel = new T.Vector3(), d = new T.Vector3();

  // ---------- hands: one smoothed pair of targets per walker, so nothing snaps (keys → guard → rest) ----------
  const restW = [new T.Vector3(), new T.Vector3()], hv = new T.Vector3();
  function hands(w, dt, want, grip, rate = 6) {
    const { p } = w, B = p.bones;
    if (!w.restOk) { w.restOk = true; for (let i = 0; i < 2; i++) p.root.worldToLocal(B.hands[i].getWorldPosition(w.restL[i])); }
    w.cur ??= [new T.Vector3(), new T.Vector3()];
    let off = 0;
    for (let i = 0; i < 2; i++) {
      restW[i].copy(w.restL[i]).applyMatrix4(p.root.matrixWorld);
      if (!w.held) w.cur[i].copy(restW[i]);
      w.cur[i].lerp(want?.[i] ?? restW[i], Math.min(1, dt * rate));
      off = Math.max(off, w.cur[i].distanceTo(restW[i]));
    }
    if (want) w.handGrip = grip;
    if (want || off > 0.015) { p.hold(w.cur, w.handGrip); w.held = true; } else if (w.held) { p.hold(null); w.held = false; }
  }
  // hanging hands at rest, in the body's frame: where they come back to (caught standing still, not held)
  const keepRest = w => { if (!w.held && w.v < 0.05 && w.p.clip.name === 'Idle') for (let i = 0; i < 2; i++) w.p.root.worldToLocal(w.p.bones.hands[i].getWorldPosition(w.restL[i])); };

  // ---------- reactions (intent.js reacts): a thrown thing hits someone, or lands close ----------
  const PHONE = new T.Vector3(-9.8, 1.17, -3.3), CARD = new T.Vector3(-8.72, 1.23, -3.42), KEYOUT = new T.Vector3(-8.66, 1.25, -3.44);   // the closed pod's desk phone keypad; the counter in the gap
  const sayAs = (r, line, sec = 3.5) => line && game.say((r.id === 'dana' ? 'Dana: ' : '') + line, sec);
  const clearAt = (x, y, z) => !(colliders ?? []).some(c => !c.loose && !c.on && x > c.x0 - 0.3 && x < c.x1 + 0.3 && z > c.z0 - 0.3 && z < c.z1 + 0.3 && y + 1.5 > c.y0 && y + 0.2 < c.y1);
  const DUR = { flinch: 1.0, guard: 3.0, 'step-away': 2.0, leave: 1.6, 'call-police': 1.4 };
  function react(who, ev, t) {
    const lv = reaction(who.r, who.mem, ev, t); if (!lv) return null;
    who.p.hear(ev.at); sayAs(who.r, lv.say);
    if (lv.flag) game.flags[lv.flag] = true;   // lasting: saved with the game (main.js save), read by the desk
    if (who.mem.mood) who.say = null;          // no cheery greeting from someone you just hit
    if (!who.r.seat) { stopUse(who); who.re = { lv, t: 0, at: ev.at.clone(), dur: DUR[lv.do] ?? 1.0, gp: [new T.Vector3(), new T.Vector3()] }; }
    return lv;
  }
  function endReact(w, player) {
    const { lv } = w.re, pos = w.p.root.position; w.re = null; w.p.fix(null);
    const you = Math.atan2(player.pos.x - pos.x, player.pos.z - pos.z), redo = steps => { w.stops = toStops(w.mind.start(steps, pos.toArray())); w.i = 0; w.wait = 0; };
    if (lv.do === 'step-away') {   // a couple of metres off from you, somewhere clear, then turn back to keep an eye on you
      const ax = pos.x - player.pos.x, az = pos.z - player.pos.z, n = Math.hypot(ax, az) || 1;
      for (const a of [0, 0.6, -0.6, 1.2, -1.2]) {
        const dx = (ax * Math.cos(a) - az * Math.sin(a)) / n, dz = (ax * Math.sin(a) + az * Math.cos(a)) / n;
        if ([0.9, 1.8].every(k => clearAt(pos.x + dx * k, pos.y, pos.z + dz * k))) { w.stops = toStops([{ p: [pos.x + dx * 1.8, pos.y, pos.z + dz * 1.8], wait: 3 + Math.random() * 3, face: you }]); w.i = 0; w.wait = 0; return; }
      }
    } else if (lv.do === 'leave' && w.r.home) redo([['go', w.r.home], ['wait', 150, 300]]);
    else if (lv.do === 'call-police') { w.police = 'going'; redo([['go', lv.phone], ['wait', 1e6]]); }
    else if (Array.isArray(lv.do)) redo(lv.do);
    // flinch, guard: back to what they were doing, where they were in it
  }
  const hitAt = new T.Vector3();
  function thrown(t, player) {   // physics.js props are bodies, people aren't: test each flying prop against each body
    const phys = game.physics; if (!phys?.loose) return;
    const who = [...walkers.filter(w => !w.hidden), ...seated];
    for (const l of phys.loose) {
      if (!l.b || l === phys.held) { l.fly = null; continue; }
      const v = l.b.body.linvel(), sp = Math.hypot(v.x, v.y, v.z);
      if (sp > 2.5 && !l.fly) l.fly = new Set();   // only a throw gets going this fast (a shove doesn't)
      if (!l.fly) continue;
      const at = l.o.getWorldPosition(hitAt);
      for (const x of who) {
        if (l.fly.has(x) || sp < 1) continue;
        const c = x.r.seat ? null : x.p.root.position, inBody = c ? Math.hypot(at.x - c.x, at.z - c.z) < 0.32 && at.y > c.y + 0.1 && at.y < c.y + 1.8
          : Math.hypot(at.x - x.at[0], at.z - x.at[2]) < 0.4 && at.y > x.at[1] - 0.45 && at.y < x.at[1] + 0.85;
        if (!inBody) continue;
        l.fly.add(x); const kg = l.b.body.mass();
        game.sound.impact?.('soft', kg, sp, at.distanceTo(eye));
        l.b.body.setLinvel({ x: -v.x * 0.2, y: Math.min(v.y, 0) * 0.3, z: -v.z * 0.2 }, true);   // it bounces off them, it doesn't fly through
        react(x, { type: 'hit', kg, speed: sp, at: at.clone() }, t);
      }
      if (sp < 0.3) {   // landed: anyone it didn't hit within 1.5 m had a near miss
        for (const x of who) { if (l.fly.has(x)) continue; const c = x.r.seat ? new T.Vector3(...x.at) : x.p.root.position; if (Math.abs(c.y - at.y) < 1.8 && Math.hypot(at.x - c.x, at.z - c.z) < 1.5) react(x, { type: 'near-miss', at: at.clone() }, t); }
        l.fly = null;
      }
    }
  }
  const near = (a, b) => Math.abs(a.y - b.y) < 1.5;   // same floor
  updaters.push((dt, t, player) => {
    eye.set(player.x, player.y + 1.6, player.z);
    for (const s of seated) seatedTick(s, dt);
    thrown(t, player);
    // who's where this frame: bodies and carts everyone steers round
    const obstacles = [{ pos: player.pos, r: BODY, player: true }];
    for (const w of walkers) if (!w.hidden) { obstacles.push({ pos: w.p.root.position, r: BODY, w }); if (w.cart) obstacles.push({ pos: w.cartAt, r: CART, w }); }
    for (const w of walkers) {
      const { p } = w, pos = p.root.position;
      w.mind.tick(dt);
      let hw = null, hg = 'rest', hr = 6;   // what the hands go to this frame (hands() below)
      if (w.r.serves && !w.re && !w.police && !game.flags.policeCalled) {   // someone at the desk: drop what she's doing, step over and serve them; when they go, back to it
        const sv = w.r.serves, d2 = Math.hypot(player.pos.x - sv.at[0], player.pos.z - sv.at[2]), close = near(player.pos, pos) && d2 < sv.r + (w.serving ? 0.8 : 0);
        if (close && !w.serving) { const pl = HOTEL.places[sv.place]; w.serving = true; stopUse(w); w.stops = toStops([{ p: pl.p, wait: 1e9, face: pl.face }]); w.i = 0; w.wait = 0; }
        else if (!close && w.serving) { w.serving = false; w.wait = 0; w.stops = []; w.i = 0; }
        // checking someone in (main.js checkIn → game.danaBeat): to the keyboard and back to the counter, beat by beat
        if (w.serving && w.desk && w.deskAt !== w.desk.at) { const pl = HOTEL.places[w.desk.at]; w.deskAt = w.desk.at; stopUse(w); w.stops = toStops([{ p: pl.p, wait: 1e9, face: pl.face }]); w.i = 0; w.wait = 0; }
        if (w.serving && w.desk) {
          const e = w.desk.eyes; p.fix(e === 'screen' ? w.screen?.pos ?? CARD : e === 'guest' ? eye : e === 'card' ? CARD : null);
          if (w.desk.hand && w.deskAt === 'desk-serve' && w.wait > 0) { hw = [null, w.desk.hand === 'key' ? KEYOUT : CARD]; hg = w.desk.hand === 'key' ? 'keyboard' : 'table'; }
        }
      }
      const seen = near(player.pos, pos) && player.pos.distanceTo(pos) < 7;   // ponytail: distance, not gaze; a wall between still counts as seen
      let heading = w.yaw, want = 0;
      if (w.re) {   // reacting: a beat, then the hands come up (and, unless it's a flinch, they turn to face you)
        const re = w.re, L = re.lv.do; re.t += dt;
        if (L !== 'flinch' && re.t > 0.3) heading = Math.atan2(player.pos.x - pos.x, player.pos.z - pos.z);
        if (re.t > 0.12) p.fix(re.t < 0.7 ? re.at : L === 'flinch' ? null : eye);
        if (re.t > 0.15 && re.t < re.dur - (L === 'flinch' ? 0.5 : 0.7)) {
          const f = rel.set(Math.sin(w.yaw), 0, Math.cos(w.yaw)), fl = L === 'flinch', y = pos.y + (fl ? 1.36 : 1.2), ah = fl ? 0.26 : 0.3, sp = fl ? 0.1 : 0.14;
          re.gp[0].set(pos.x + f.x * ah + f.z * sp, y, pos.z + f.z * ah - f.x * sp); re.gp[1].set(pos.x + f.x * ah - f.z * sp, y, pos.z + f.z * ah + f.x * sp);   // left (+x when facing +z), right
          hw = re.gp; hg = 'guard'; hr = fl ? 16 : 8;
        }
        if (re.t >= re.dur) endReact(w, player);
      } else if (w.wait > 0) {
        if (w.at.face !== undefined) heading = w.at.face;
        if (w.serving && w.deskAt !== 'desk-keys') heading = Math.atan2(player.pos.x - pos.x, player.pos.z - pos.z);
        if (!w.ws && (w.at.use || (w.serving && w.deskAt === 'desk-keys' && w.desk))) startUse(w, w.at.use ?? 'keyboard');   // back to it after a reaction
        if (w.ws) {
          if (!w.desk || w.desk.type) for (const t of w.ws.update(dt)) { p.tap(t.hand, t.finger); touchSound(t, t.at); }   // between beats her hands rest on the keys
          w.grips[1] = w.ws.mousing ? 'mouse' : 'keyboard'; hw = w.ws.hands; hg = w.grips;
        }
        if (w.police === 'going' && w.at === w.stops.at(-1)) w.police = { t: 0, taps: 0, next: 1.2 };
        if (w.police?.t !== undefined) {   // at the desk phone: dials the non-emergency line on the keypad, talks on speaker
          const c = w.police; c.t += dt;
          if (c.t > 0.5 && c.t < 4.4) { hw = [null, PHONE]; hg = 'keyboard'; if (c.t >= c.next && c.taps < 10) { p.tap(1, 1); touchSound({ kind: 'keyboard' }, PHONE); c.taps++; c.next = c.t + 0.22 + Math.random() * 0.15; } }
          p.fix(c.t < 6 || Math.floor(c.t / 3.5) % 3 ? PHONE : eye);   // eyes on the phone, a look over at you now and then
          if (c.t > 4.8 && !c.said) { c.said = true; game.say('Dana, on the phone: ' + w.r.call, 9); }
          if (c.t > 15) { w.police = 'done'; p.fix(null); w.wait = 0; }
        }
        if (w.at.hide && !w.hidden && !seen) w.hidden = true;   // through the door once nobody's looking
        w.wait -= dt;
        if (w.wait <= 0 && w.hidden && seen) w.wait = 0.5;    // and back out the same way
        if (w.wait <= 0) w.hidden = false;
      } else {
        if (w.ws) stopUse(w);
        if (w.i >= w.stops.length) { w.stops = toStops(w.mind.next(pos.toArray(), phase())); w.i = 0; }
        const stop = w.stops[w.i];
        toward.copy(stop.p).sub(pos); toward.y = 0;
        const dist = toward.length();
        if (dist < (stop.pass ? 0.35 : 0.08)) {   // arrived (corners are cut, stops are reached)
          w.at = stop; w.i++;
          w.wait = stop.wait ?? 0;
          if (stop.cup !== undefined) w.holding = stop.cup;
          if (stop.use) startUse(w, stop.use);
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
              // a cart can't dodge: its pusher only eases over; whoever's on foot keeps to the wall and all but stops for it
              const yields = !w.cart && !!o.w?.cart;
              heading += s * (w.cart ? 0.3 : yields ? 0.6 : 0.7) * (1 - ahead / reach); want *= yields ? 0.4 : w.cart ? 0.95 : 0.8;
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
      } else if (w.ws && w.screen) { w.task.at.copy(w.screen.pos); w.task.kind = 'screen'; }
      else { const f = w.at?.face ?? w.yaw; w.task.at.set(pos.x + Math.sin(f) * 0.9, pos.y + 1.0, pos.z + Math.cos(f) * 0.9); w.task.kind = 'work'; }
      p.attend(w.task);
      if (w.v > 0.05) { p.play('Walk'); p.pace(w.v); } else if (p.clip.name === 'Walk') p.play('Idle');   // a Wave or Talk plays out
      if (!w.cart || hw || w.held) hands(w, dt, hw, hg, hr);
      p.update(dt);
      keepRest(w);
      if (w.keyCard) {   // the key card she hands over, between her fingers
        w.keyCard.visible = w.desk?.hand === 'key' && w.held && w.cur[1].distanceTo(KEYOUT) < 0.1;
        if (w.keyCard.visible) { p.bones.hands[1].getWorldPosition(w.keyCard.position).addScaledVector(rel.set(Math.sin(w.yaw), 0, Math.cos(w.yaw)), 0.08); w.keyCard.position.y -= 0.01; w.keyCard.rotation.set(0, w.yaw, 0); }
      }
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
        // pushing, both hands on the handle bar (about 1 m up, 0.45 m in front of her, hands 0.4 m apart); stopped at a
        // room, she lets go
        if (w.re || w.held) { /* reacting: hands() has them */ } else if (w.v > 0.05 && d.dot(fwd) > 0.3) {
          w.grip ??= [new T.Vector3(), new T.Vector3()];
          const c = rel.copy(pos).addScaledVector(d, 0.45); c.y = pos.y + 0.98;
          w.grip[0].set(d.z, 0, -d.x).multiplyScalar(0.2).add(c); w.grip[1].set(-d.z, 0, d.x).multiplyScalar(0.2).add(c);   // left, right
          w.p.hold(w.grip);
        } else if (w.v > 0.05 && d.dot(fwd) < -0.3) {
          // pulling it behind her: the right hand reaches back to the handle, the left swings free
          w.grip ??= [new T.Vector3(), new T.Vector3()];
          w.grip[1].set(-fwd.z, 0, fwd.x).multiplyScalar(0.17).add(pos).addScaledVector(d, 0.38); w.grip[1].y = pos.y + 0.92;
          w.p.hold([null, w.grip[1]]);
        } else w.p.hold(null);
      }
      if (w.say && p.root.visible && player.pos.distanceTo(pos) < 2.2 && t - w.said > 40) { w.said = t; game.say(w.say); }
    }
  });
  Object.assign(ctx, { clerk, walkers, sitters });
}
