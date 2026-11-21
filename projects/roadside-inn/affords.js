// SPDX-License-Identifier: CC0-1.0
// Affordances: what a thing offers a body. Objects say how they're used; people only say what they want to do.
//
// A part lists its touch spots (SPOTS: in the model's own frame, metres, as authored in Blender and exported +Y up), each
// of a KIND. The kind says what using it means for any body: where the wrists go (in the spot's frame: x to the user's
// right, y up, +z toward the user), the grip the fingers take, the motion while in use, and what each touch sounds like.
// A resident's intent then says ['use', 'keyboard'] and the body, the motion and the clack all come from here. Nothing
// here knows about the hotel; it is meant to become a publishable part kind (an "affords" block on each model part, read
// by this logic), so a keyboard modelled for any game types the same way.
import * as T from 'three';

/** What touching each kind means. hands: [left, right] wrist points (null: that hand stays free); grip: finger curl
 *  (people.js CURL); motion: 'type' | 'mouse' | null; sound: the game's sound per touch; look: where the eyes go. */
export const KINDS = {
  // compact keyboard, origin at the case's base centre: fingers on the home row, wrists floating just off its front edge
  keyboard: { hands: [[-0.085, 0.035, 0.095], [0.05, 0.035, 0.095]], grip: 'keyboard', motion: 'type', sound: 'key' },
  // mouse, origin at its base centre: palm on its back, wrist behind it
  mouse: { hands: [null, [0, 0.03, 0.095]], grip: 'mouse', motion: 'mouse', sound: 'click' },
  screen: { look: [0, 0, 0] },
};
const R = d => d * Math.PI / 180;
// Blender (x, y, z) z-up → glTF (x, z, -y); a Blender yaw about z is the same yaw about +y.
const bl = (x, y, z, yaw = 0, rest = {}) => ({ at: [x, z, -y], yaw: R(yaw), ...rest });
/** Per model part: its spots (blender/props.py business_center, desk_items; blender/desk.py monitor24). */
export const SPOTS = {
  'hotel-business-center': [0, 1].flatMap(i => {
    const x = [-0.55, 0.15][i];
    return [
      { kind: 'keyboard', station: i, ...bl(x - 0.02, -0.12, 0.7625, 2 - i * 4) },
      { kind: 'mouse', station: i, ...bl(x + 0.3, -0.12, 0.7655, -8 + i * 14) },
      { kind: 'screen', station: i, ...bl(x, 0.14, 0.7625 + 0.32, -4 + i * 7) },
    ];
  }),
  // Dana's pod: the staff side is +Y in Blender, so her keyboard faces the other way (yaw 183)
  'hotel-desk-items': [
    { kind: 'keyboard', station: 0, ...bl(-0.25, 0.27, 1.08, 183) },
    { kind: 'mouse', station: 0, ...bl(0.02, 0.28, 1.083, 174) },
    { kind: 'screen', station: 0, ...bl(-0.25, 0.1, 1.38, 180) },
  ],
};

/** Every spot in the scene, in world space: { kind, part, station, frame: Matrix4, pos: Vector3, yaw (toward the user) }.
 *  Finds placed models by name (assets.js names each clone's group after its part id). Call once the world is built. */
export function findSpots(scene) {
  const out = [];
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    const list = SPOTS[o.name]; if (!list || !o.isGroup) return;
    for (const s of list) {
      const local = new T.Matrix4().compose(new T.Vector3(...s.at), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), s.yaw), new T.Vector3(1, 1, 1));
      const frame = o.matrixWorld.clone().multiply(local);
      const pos = new T.Vector3().setFromMatrixPosition(frame), z = new T.Vector3(0, 0, 1).transformDirection(frame);
      out.push({ kind: s.kind, part: o.name, station: s.station, frame, pos, yaw: Math.atan2(z.x, z.z), group: o });
    }
  });
  return out;
}
/** The spot of `kind` nearest a world point, or one at the same station as `with` (the mouse beside this keyboard). */
export function nearest(spots, kind, at, alongside) {
  let best = null, d = Infinity;
  for (const s of spots) {
    if (s.kind !== kind) continue;
    if (alongside && (s.group !== alongside.group || s.station !== alongside.station)) continue;
    const k = s.pos.distanceTo(at); if (k < d) { d = k; best = s; }
  }
  return best;
}
/** Where a body stands to use a spot: `back` metres toward the user from it, on the floor `y`; facing it. */
export function standAt(spot, back = 0.42, y = 0) {
  return { p: [spot.pos.x + Math.sin(spot.yaw) * back, y, spot.pos.z + Math.cos(spot.yaw) * back], face: spot.yaw + Math.PI };
}

/**
 * A body using a workstation: a keyboard, its mouse beside it and the screen. update(dt) moves the wrist targets
 * (Vector3s handed to person.hold / sit hands, which follow them) and returns the touches this frame: [{ kind, hand,
 * finger, at }] (play the kind's sound at `at`; person.tap(hand, finger) dips that finger).
 *
 * Typing is bursts: keys ~0.12-0.3 s apart (a 35-50 wpm typist), a space every few, a pause of 0.6-2 s now and then
 * to read the screen; sometimes the right hand goes to the mouse for a while and clicks.
 */
export function workstation(keyboard, mouse, rng = Math.random) {
  const hands = [new T.Vector3(), new T.Vector3()], home = [0, 1].map(i => wrist(keyboard, i)), onMouse = mouse ? wrist(mouse, 1) : null;
  const st = { mode: 'type', modeLeft: 6 + rng() * 10, next: 0.3, word: 0, wordLen: 3 + Math.floor(rng() * 5), dip: [0, 0], shift: [0, 0], toMouse: 0 };
  const touches = [];
  function update(dt) {
    touches.length = 0;
    st.modeLeft -= dt;
    if (st.modeLeft <= 0) {   // switch: type a while, then mouse a while (or pause and read), then type again
      st.mode = st.mode === 'type' && onMouse && rng() < 0.55 ? 'mouse' : st.mode === 'type' ? 'read' : 'type';
      st.modeLeft = st.mode === 'type' ? 5 + rng() * 12 : st.mode === 'mouse' ? 3 + rng() * 6 : 1.5 + rng() * 3;
    }
    st.toMouse += ((st.mode === 'mouse' ? 1 : 0) - st.toMouse) * Math.min(1, dt * 5);   // the hand travels, it doesn't jump
    if ((st.next -= dt) <= 0) {
      if (st.mode === 'type') {
        const space = ++st.word > st.wordLen;
        if (space) { st.word = 0; st.wordLen = 2 + Math.floor(rng() * 6); }
        const hand = space ? 1 : rng() < 0.5 ? 0 : 1, finger = space ? 0 : 1 + Math.floor(rng() * 3);
        st.dip[hand] = 1; st.shift[hand] = (rng() - 0.5) * 0.03;
        touches.push({ kind: 'keyboard', hand, finger, at: keyboard.pos, space });
        st.next = space ? 0.2 + rng() * 0.15 : rng() < 0.06 ? 0.6 + rng() * 1.4 : 0.12 + rng() * 0.18;
      } else if (st.mode === 'mouse' && st.toMouse > 0.9) {
        touches.push({ kind: 'mouse', hand: 1, finger: 1, at: mouse.pos }); st.dip[1] = 0.4;
        st.next = rng() < 0.3 ? 0.12 : 0.8 + rng() * 2.5;   // now and then a double click
      } else st.next = 0.2;
    }
    for (let i = 0; i < 2; i++) {
      st.dip[i] = Math.max(0, st.dip[i] - dt * 9);   // a keystroke is ~0.1 s down and up
      const k = keyboard.frame, x = new T.Vector3(1, 0, 0).transformDirection(k);
      hands[i].copy(home[i]).addScaledVector(x, st.shift[i]);
      hands[i].y -= 0.006 * st.dip[i];
      if (i === 1 && onMouse) hands[1].lerp(onMouse, st.toMouse);
    }
    return touches;
  }
  return { hands, update, get mode() { return st.mode; }, get mousing() { return st.toMouse > 0.5; } };
}
const wrist = (spot, i) => new T.Vector3(...KINDS[spot.kind].hands[i]).applyMatrix4(spot.frame);
