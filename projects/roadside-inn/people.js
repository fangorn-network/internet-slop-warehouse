// Rigged, textured Microsoft Rocketbox people, converted by Avatar Studio.
// MIT, © Microsoft. Full notice: licenses/rocketbox-NOTICE.md.
// The four authored clips (Idle, Walk, Wave, Talk) are the base; on top, procedurally, after the mixer each frame: the
// head and neck turn toward what the person looks at, the eyelids blink, the weight shifts from hip to hip while they
// stand, and a pose (sitting, holding a cup) bends limbs from the rig. No new clips (Mixamo motion is not CC0).
import * as T from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const _q = new T.Quaternion(), _p = new T.Quaternion(), _v = new T.Vector3(), _w = new T.Vector3(), UP = new T.Vector3(0, 1, 0);

export function createPerson(source, { height = 1.72, tint } = {}) {
  const body = cloneSkinned(source.scene), root = new T.Group();
  root.name = 'Textured hotel resident'; root.userData.hotelResident = true;
  body.traverse(n => {
    if (!n.isMesh) return;
    n.castShadow = n.receiveShadow = true;
    n.frustumCulled = false;
    n.material = n.material.clone();
    // Preserve authored face, hair and cloth maps. The clothes are one mesh (Outfit_original) over a shared atlas: a
    // half-strength tint recolours them and keeps the weave, so two guests on one model aren't twins.
    if (tint && /Outfit/.test(n.name)) n.material.color.set('#ffffff').lerp(new T.Color(tint), 0.55);
    if (/Hair/.test(n.name)) { n.material.transparent = false; n.material.alphaTest = 0.45; n.material.side = T.DoubleSide; }
  });
  const bounds = new T.Box3().setFromObject(body);
  body.position.y -= bounds.min.y;
  root.add(body); root.scale.setScalar(height / (bounds.max.y - bounds.min.y));
  // glTF bone names lose their ':' ("mixamorig:Head" → "mixamorigHead")
  const bone = re => { let f = null; body.traverse(o => { if (!f && o.isBone && re.test(o.name)) f = o; }); return f; };
  const B = {
    hips: bone(/Hips$/), spine: bone(/Spine2$/), neck: bone(/Neck$/), head: bone(/Head$/),
    lids: [/LEyeBlinkTop/, /REyeBlinkTop/].map(bone).filter(Boolean),
    thighs: [bone(/LeftUpLeg$/), bone(/RightUpLeg$/)], knees: [bone(/LeftLeg$/), bone(/RightLeg$/)],
    arms: [bone(/LeftArm$/), bone(/RightArm$/)], forearms: [bone(/LeftForeArm$/), bone(/RightForeArm$/)], hand: bone(/RightHand$/),
    hands: [bone(/LeftHand$/), bone(/RightHand$/)], feet: [bone(/LeftFoot$/), bone(/RightFoot$/)],
  };
  inPlace(source.animations);
  const mixer = new T.AnimationMixer(body);
  const actions = new Map(source.animations.map(clip => [clip.name, mixer.clipAction(clip)]));

  // How fast the Walk clip walks, m/s: the foot's travel against the hips over the stance (half the cycle). Played at
  // that rate for the walker's real speed, the feet don't skate.
  const walkClip = actions.get('Walk'), foot = bone(/LeftFoot$/);
  let gait = 1.25;
  if (walkClip && foot && B.hips) {
    walkClip.play(); let lo = Infinity, hi = -Infinity;
    const d = walkClip.getClip().duration;
    for (let i = 0; i <= 24; i++) { mixer.setTime(d * i / 24); root.updateMatrixWorld(true); const z = root.worldToLocal(foot.getWorldPosition(_v)).z - root.worldToLocal(B.hips.getWorldPosition(_w)).z; lo = Math.min(lo, z); hi = Math.max(hi, z); }
    walkClip.stop(); mixer.setTime(0);
    const s = (hi - lo) * root.scale.y / (d / 2);
    if (s > 0.5 && s < 2.5) gait = s;   // ponytail: a sanity band; outside it the rig's units fooled the measure
  }

  let current = null, pace = gait;
  const idleRate = 0.85 + Math.random() * 0.3;
  function play(name) {
    const resolved = name === 'Interact' ? 'Talk' : actions.has(name) ? name : 'Idle';
    if (resolved === current) return;
    const next = actions.get(resolved), prev = actions.get(current);
    next.reset().setEffectiveWeight(1).play();
    // idles start anywhere in the clip and run at their own rate: two people on one model don't breathe in step
    if (resolved === 'Idle') { next.time = Math.random() * next.getClip().duration; next.timeScale = idleRate; }
    if (resolved === 'Walk') next.timeScale = pace / gait;
    if (prev) next.crossFadeFrom(prev, 0.3, false);
    current = resolved;
  }

  // Rotate a bone by a world-space rotation, on top of whatever the clip put there.
  const turn = (b, q) => { if (!b) return; b.parent.getWorldQuaternion(_p); b.quaternion.premultiply(_q.copy(_p).invert().multiply(q).multiply(_p)); b.updateMatrixWorld(true); };
  const axisTurn = (b, axis, angle) => turn(b, new T.Quaternion().setFromAxisAngle(axis, angle));
  const right = () => _w.set(1, 0, 0).applyQuaternion(root.quaternion), fwd = () => new T.Vector3(0, 0, 1).applyQuaternion(root.quaternion);

  // Two-bone IK in world space (upper a, middle b, end c reach for point t). The bend stays in the plane the rough pose
  // gave it (knees forward, elbows back and out), so this only fixes lengths and aim: a hip stays a hip.
  const _a = new T.Vector3(), _b = new T.Vector3(), _c = new T.Vector3(), _t = new T.Vector3(), _ax = new T.Vector3();
  const clampAcos = x => Math.acos(T.MathUtils.clamp(x, -1, 1));
  function ik(a, b, c, t) {
    if (!a || !b || !c) return;
    a.getWorldPosition(_a); b.getWorldPosition(_b); c.getWorldPosition(_c);
    const lab = _a.distanceTo(_b), lcb = _b.distanceTo(_c), lat = T.MathUtils.clamp(_a.distanceTo(t), 0.01, lab + lcb - 0.002);
    const ac = _c.clone().sub(_a), ab = _b.clone().sub(_a), ba = ab.clone().negate(), bc = _c.clone().sub(_b);
    _ax.crossVectors(ac, ab); if (_ax.lengthSq() < 1e-10) return; _ax.normalize();
    const ac_ab0 = ac.angleTo(ab), ba_bc0 = ba.angleTo(bc);
    const ac_ab1 = clampAcos((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat)), ba_bc1 = clampAcos((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb));
    axisTurn(a, _ax, ac_ab1 - ac_ab0); axisTurn(b, _ax, ba_bc1 - ba_bc0);
    c.getWorldPosition(_c); a.getWorldPosition(_a);
    turn(a, new T.Quaternion().setFromUnitVectors(_c.sub(_a).normalize(), _t.copy(t).sub(_a).normalize()));
  }

  let target = null, look = 0, t = Math.random() * 100, blinkIn = 1 + Math.random() * 3, blink = 0, pose = null, sit = {};
  const shift = { rate: 0.09 + Math.random() * 0.05, phase: Math.random() * 7 };
  function update(dt) {
    mixer.update(dt); t += dt;
    root.updateMatrixWorld(true);
    // standing about: a slow weight shift from hip to hip, the torso staying upright over it
    const standing = current === 'Idle' && !pose;
    if (standing && B.hips) { const a = Math.sin(t * shift.rate * Math.PI * 2 + shift.phase) * 0.035; axisTurn(B.hips, fwd(), a); axisTurn(B.spine, fwd(), -a * 0.8); }
    if (pose === 'sit') {
      // Rough pose first (thighs forward, knees bent, upper arms down, forearms forward): it sets the bend planes. Then
      // the spine (recline into the cushions or lean in to a desk, a sideways settle, a head tilt), then IK: feet flat on
      // what they rest on, hands on the thighs or on what they're given (a keyboard, a table, the top of a sofa back).
      const r = right().clone(), f = fwd(), up = UP, s = root.scale.y;
      for (const b of B.thighs) axisTurn(b, r, -1.5);
      for (const b of B.knees) axisTurn(b, r, 1.45);
      for (const b of B.arms) axisTurn(b, r, -0.35);
      for (const b of B.forearms) axisTurn(b, r, -1.1);
      if (sit.recline) axisTurn(B.hips, r, -sit.recline);   // pelvis rolled back, slid forward: slumped into the cushions
      if (sit.lean) axisTurn(B.spine, r, sit.lean);          // leaning in to a desk or table
      if (sit.roll) axisTurn(B.spine, f, sit.roll);          // settled to one side
      const nod = (sit.lean ?? 0) * 0.6 - (sit.recline ?? 0) * 0.7;   // eyes back toward level
      if (nod) axisTurn(B.neck, r, -nod);
      if (sit.tilt) axisTurn(B.head, f, sit.tilt);
      // which side each limb is on, so targets go to the near hand or foot (they can't cross)
      const lr = B.thighs[0].getWorldPosition(new T.Vector3()).sub(B.thighs[1].getWorldPosition(new T.Vector3())).normalize();
      const centre = B.hips.getWorldPosition(new T.Vector3());
      const sides = list => { const out = [null, null]; for (const p of list ?? []) if (p) out[p.clone().sub(centre).dot(lr) > 0 ? 0 : 1] = p; return out; };
      const feetGiven = sides(sit.feet), handsGiven = sides(sit.hands);
      for (let i = 0; i < 2; i++) {
        const hip = B.thighs[i].getWorldPosition(new T.Vector3()), sign = i === 0 ? 1 : -1;
        let foot = feetGiven[i];   // given (a stool's bar), or flat on the floor ahead of the knee, a little apart
        if (!foot) {
          const ahead = Array.isArray(sit.ahead) ? sit.ahead[i] : sit.ahead ?? (thighLen + 0.08) * s;
          foot = hip.clone().addScaledVector(f, ahead).addScaledVector(lr, sign * (sit.spread ?? 0.03 * s)); foot.y = (sit.floor ?? 0) + footY0 * s;
        }
        ik(B.thighs[i], B.knees[i], B.feet[i], foot);
      }
      for (let i = 0; i < 2; i++) {
        let hand = handsGiven[i];
        if (!hand) {
          const hip = B.thighs[i].getWorldPosition(new T.Vector3()), knee = B.knees[i].getWorldPosition(new T.Vector3());
          const mid = hip.clone().add(B.thighs[1 - i].getWorldPosition(new T.Vector3())).multiplyScalar(0.5);
          hand = hip.lerp(knee, 0.62).addScaledVector(up, 0.075 * s).lerp(mid.setY(hip.y), 0.12);   // on the top of the thigh, a little inboard
        }
        ik(B.arms[i], B.forearms[i], B.hands[i], hand);
      }
    }
    if (pose === 'cup') { axisTurn(B.arms[1], right().clone(), -0.2); axisTurn(B.forearms[1], right().clone(), -1.35); }
    // look at: the head and neck turn toward the target when it's in front and near, easing in and out
    let yaw = 0, pitch = 0, want = 0;
    if (target && B.head) {
      B.head.getWorldPosition(_v); const d = _w.copy(target).sub(_v), h = Math.hypot(d.x, d.z);
      const local = d.clone().applyQuaternion(root.quaternion.clone().invert());
      yaw = Math.atan2(local.x, local.z); pitch = Math.atan2(d.y, h);
      want = h < 4 && Math.abs(d.y) < 1.2 && Math.abs(yaw) < 1.9 ? 1 : 0;   // near, in front, on the same floor
    }
    look += (want - look) * Math.min(1, dt * 3);
    if (look > 0.01) {
      const y = T.MathUtils.clamp(yaw, -1.2, 1.2) * look, p = T.MathUtils.clamp(pitch, -0.45, 0.35) * look, r = right().clone();
      for (const [b, k] of [[B.spine, 0.15], [B.neck, 0.35], [B.head, 0.5]]) { axisTurn(b, UP, y * k); axisTurn(b, r.clone().applyAxisAngle(UP, y * k), -p * k); }
    }
    // blinks: every 2-6 s, 0.15 s, sometimes twice
    if ((blinkIn -= dt) <= 0) { blink = 0.15; blinkIn = Math.random() < 0.2 ? 0.3 : 2 + Math.random() * 4; }
    if (blink > 0) { blink -= dt; const c = Math.sin(Math.max(0, blink) / 0.15 * Math.PI); for (const b of B.lids) b.quaternion.multiply(_q.setFromAxisAngle(LID, BLINK * c)); }   // in the lid bone's own frame
  }
  play('Idle'); mixer.update(0);
  root.updateMatrixWorld(true);
  const hipHeight = B.hips ? B.hips.getWorldPosition(_v).y : height * 0.53;   // standing, root at the origin: where a seat must meet
  // the hip joints (thigh bones) and ankles above the floor, standing, in the body's own units (x root.scale = metres)
  const hipJoint = B.thighs[0] ? B.thighs[0].getWorldPosition(_v).y : hipHeight;
  const footY0 = B.feet[0] ? B.feet[0].getWorldPosition(_v).y / root.scale.y : 0.08;
  const thighLen = B.thighs[0] && B.knees[0] ? B.thighs[0].getWorldPosition(_v).distanceTo(B.knees[0].getWorldPosition(_w)) / root.scale.y : 0.4;
  return {
    root, play, update, bones: B, gait, hipHeight, hipJoint,
    /** Walking speed, m/s: the Walk clip runs at the rate that matches it. */
    pace(v) { pace = Math.max(0.2, v); const w = actions.get('Walk'); if (w && current === 'Walk') w.timeScale = pace / gait; },
    /** Look toward a world point (a Vector3 that may keep moving), or null. */
    lookAt(v) { target = v; },
    /** 'sit', 'cup' or null. Sitting takes { floor: world y the feet rest on, ahead: m from hip to ankle (or [left, right]),
     *  spread: m each foot out from its hip, hands / feet: world points (Vector3s, may move; each goes to the hand or foot on
     *  its side, the other rests on the thigh / floor), lean: rad forward at the chest, recline: rad back at the pelvis,
     *  roll: rad sideways at the chest, tilt: rad head roll }. */
    pose(p, opts) { pose = p; if (p === 'sit' && opts) sit = opts; },
    get looking() { return look; },
    get posed() { return pose; },
    get sitting() { return pose === 'sit' ? sit : null; },
    /** The clip playing: { name, time, rate } (checks read it). */
    get clip() { const a = actions.get(current); return { name: current, time: a?.time, rate: a?.timeScale }; },
  };
}
// Rocketbox's Walk carries root motion: the hips travel ~1.2 m forward over the 1.2 s cycle and jump back when it loops,
// on top of the walker's own movement (the "walk-teleport"). Take the straight-line drift out of the hips' x/z so the
// clip walks on the spot; the walker's speed moves the body. Done once per clip (clips are shared by clones).
export function inPlace(clips) {
  for (const clip of clips) {
    if (clip.userData?.inPlace) continue;
    for (const tr of clip.tracks) {
      if (!/Hips\.position$/.test(tr.name)) continue;
      const v = tr.values, n = tr.times.length, d = tr.times[n - 1] || 1;
      // and its start offset: the walk began 1.2 m behind the body, so every Idle/Walk cross-fade slid it a stride
      const x0 = v[0], z0 = v[2], dx = v[(n - 1) * 3] - x0, dz = v[(n - 1) * 3 + 2] - z0;
      for (let i = 0; i < n; i++) { const f = tr.times[i] / d; v[i * 3] -= x0 + dx * f; v[i * 3 + 2] -= z0 + dz * f; }
    }
    clip.userData = { ...clip.userData, inPlace: true };
  }
}
// The upper lid bone (Rocketbox Bip01 ?EyeBlinkTop) closes turning about its own z: -0.8 rad comes about half down, +
// opens wide. ponytail: half a blink; -1.2 and -1.5 rendered wide open again (the skinning folds), not tuned further.
const LID = new T.Vector3(0, 0, 1), BLINK = -0.8;
