// Rigged, textured Microsoft Rocketbox people, converted by Avatar Studio.
// MIT, © Microsoft. Full notice: licenses/rocketbox-NOTICE.md.
// The four authored clips (Idle, Walk, Wave, Talk) are the base. How the body behaves on top comes from body.js (the
// study in GAIT-AND-POSE.md): standing people hold a stance taken from the authored idle and shift weight now and then,
// seated people are still but for breathing and change posture when what they're doing changes, walkers step at the
// cadence their speed implies, and everyone looks at things (eyes first, the head after) one fixation at a time.
// Applied after the mixer each frame as rotations from the rig. No new clips (Mixamo motion is not CC0).
import * as T from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { STUDY, attention, breather, blinker, sway, stance, split, cadence, minJerk } from './body.js';

const _q = new T.Quaternion(), _p = new T.Quaternion(), _v = new T.Vector3(), _w = new T.Vector3(), UP = new T.Vector3(0, 1, 0);

/** options: height (m), tint (outfit colour), manner (body.js: how they notice people). */
export function createPerson(source, { height = 1.72, tint, manner } = {}) {
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
    // Wet eyes. The eyeballs are painted into the head atlas and share the skin's roughness, so they never catch a
    // highlight and read dead. Both eyes use one UV island (u 0.207-0.320, v 0.875-0.989 on every Rocketbox head here,
    // found from the vertices weighted to the eye bones): make it glossy there, under the lids, nothing added on top.
    if (/_head$/.test(n.material.name) && n.material.map) {
      n.material.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\n  if (vMapUv.x > 0.207 && vMapUv.x < 0.320 && vMapUv.y > 0.875 && vMapUv.y < 0.989) roughnessFactor = 0.1;'); };
      n.material.customProgramCacheKey = () => 'wet-eyes';
    }
  });
  const bounds = new T.Box3().setFromObject(body);
  body.position.y -= bounds.min.y;
  const base = body.position.clone();   // sway and the walk's ground fix move the body from here
  root.add(body); root.scale.setScalar(height / (bounds.max.y - bounds.min.y));
  // glTF bone names lose their ':' ("mixamorig:Head" → "mixamorigHead")
  const bone = re => { let f = null; body.traverse(o => { if (!f && o.isBone && re.test(o.name)) f = o; }); return f; };
  const B = {
    hips: bone(/Hips$/), spine: bone(/Spine2$/), chest: bone(/Spine1$/), neck: bone(/Neck$/), head: bone(/Head$/),
    eyes: [bone(/LeftEye$/), bone(/RightEye$/)].filter(Boolean), shoulders: [bone(/LeftShoulder$/), bone(/RightShoulder$/)],
    lids: [/LEyeBlinkTop/, /REyeBlinkTop/].map(bone).filter(Boolean),
    thighs: [bone(/LeftUpLeg$/), bone(/RightUpLeg$/)], knees: [bone(/LeftLeg$/), bone(/RightLeg$/)],
    arms: [bone(/LeftArm$/), bone(/RightArm$/)], forearms: [bone(/LeftForeArm$/), bone(/RightForeArm$/)], hand: bone(/RightHand$/),
    hands: [bone(/LeftHand$/), bone(/RightHand$/)], feet: [bone(/LeftFoot$/), bone(/RightFoot$/)],
  };
  inPlace(source.animations);
  const mixer = new T.AnimationMixer(body);
  // Every bone's bind pose, put back at the start of each frame: the procedural turns (breath, gaze, posture) are applied
  // on top of what the mixer wrote, so a bone the clips don't drive (or one they've stopped driving) would otherwise
  // pile turns up frame on frame, drift off unit length and stretch the limb.
  const bind = []; body.traverse(b => { if (b.isBone) bind.push([b, b.quaternion.clone(), b.position.clone(), b.scale.clone()]); });
  const actions = new Map(source.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  const local = o => root.worldToLocal(o.getWorldPosition(_v)).multiplyScalar(root.scale.y);   // metres, body frame

  // How fast the Walk clip walks, m/s: the foot's travel against the hips over the stance (half the cycle).
  const walkClip = actions.get('Walk'), foot = B.feet[0];
  let gait = 1.25;
  if (walkClip && foot && B.hips) {
    walkClip.play(); let lo = Infinity, hi = -Infinity;
    const d = walkClip.getClip().duration;
    for (let i = 0; i <= 24; i++) { mixer.setTime(d * i / 24); root.updateMatrixWorld(true); const z = root.worldToLocal(foot.getWorldPosition(_v)).z - root.worldToLocal(B.hips.getWorldPosition(_w)).z; lo = Math.min(lo, z); hi = Math.max(hi, z); }
    walkClip.stop(); mixer.setTime(0);
    const s = (hi - lo) * root.scale.y / (d / 2);
    if (s > 0.5 && s < 2.5) gait = s;   // ponytail: a sanity band; outside it the rig's units fooled the measure
  }
  // The clip's own step and cadence; a person keeps their walk ratio (step / cadence) at every speed (body.js cadence).
  const walkDur = walkClip?.getClip().duration ?? 1.2, clipCadence = 120 / walkDur, clipStep = gait * walkDur / 2, walkRatio = clipStep / clipCadence;
  const stride = v => { const c = cadence(v, walkRatio); return { rate: c.C / clipCadence, amp: c.L / clipStep }; };

  // Held stances from the authored idle: the frames where the weight is furthest onto each leg (hips over that foot),
  // and the middle one for sitting. The idle is never played as a loop: the person holds one, then shifts.
  const idle = actions.get('Idle'), idleClip = idle.getClip(), shiftTo = mixer.clipAction(idleClip.clone());
  const stances = [], frames = [];
  idle.play();
  for (let i = 0; i < 32; i++) { const t = idleClip.duration * i / 32; mixer.setTime(t); root.updateMatrixWorld(true); frames.push([t, local(B.hips).x, B.feet.map(f => local(f).clone())]); }
  // only frames with both feet where they are in the first (an idle that steps would slide the feet on a blend)
  const planted = frames.filter(f => f[2].every((p, i) => p.distanceTo(frames[0][2][i]) < 0.025));
  const pool = planted.length >= 4 ? planted : frames, xs = pool.map(f => f[1]), mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  stances.push(pool[xs.indexOf(Math.min(...xs))][0], pool[xs.indexOf(Math.max(...xs))][0]);
  const seatFrame = pool.reduce((a, f) => Math.abs(f[1] - mean) < Math.abs(a[1] - mean) ? f : a)[0];
  idle.stop();
  const legs = [B.hips, ...B.thighs, ...B.knees, ...B.feet, ...B.arms, ...B.forearms].filter(Boolean);
  idle.reset().play(); idle.timeScale = 0; idle.time = seatFrame; mixer.update(0);
  const rest = new Map(legs.map(b => [b, b.quaternion.clone()]));   // the standing pose a short stride swings less far from
  // The idle's head looks about by itself (+-25-35 deg over the loop): held still, the neck and head come from its first
  // frame (facing ahead) and turn only to what the person looks at.
  idle.time = 0; mixer.update(0);
  const calm = [B.neck, B.head].filter(Boolean).map(b => [b, b.quaternion.clone()]);
  // The per-frame reset (below) goes back to this standing frame, not the bind pose: the bind pose is a T-pose, so an arm
  // no clip was driving (after a Wave or Talk ends) stood out straight.
  for (const e of bind) { e[1].copy(e[0].quaternion); e[2].copy(e[0].position); e[3].copy(e[0].scale); }
  idle.stop();

  const rng = Math.random, att = attention(manner, rng), breath = breather(rng), blinks = blinker(rng), drift = sway(rng);
  const stand = stance(stances.length, { hold: manner?.hold, rng });
  let current = null, pace = gait, since = 0;
  function play(name) {
    const resolved = name === 'Interact' ? 'Talk' : actions.has(name) ? name : 'Idle';
    if (resolved === current) return;
    const next = actions.get(resolved), prev = actions.get(current);
    if (current === 'Idle') { const s = stand.tick(0); idle.time = stances[s.w > 0.5 ? s.to : s.from]; idle.setEffectiveWeight(1); shiftTo.setEffectiveWeight(0); stand.go(s.w > 0.5 ? s.to : s.from, 0.01); }
    next.reset().setEffectiveWeight(1).play();
    if (resolved === 'Idle') { next.timeScale = 0; next.time = pose === 'sit' ? seatFrame : stances[stand.state.to]; shiftTo.play(); shiftTo.timeScale = 0; shiftTo.setEffectiveWeight(0); }
    if (resolved === 'Walk') next.timeScale = stride(pace).rate;
    if (prev) next.crossFadeFrom(prev, 0.3, false);
    current = resolved; since = 0;
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

  // Hands. IK only puts the wrist somewhere; left alone the palm faces wherever the arm chain leaves it (up, for a
  // typist) and the fingers stay splayed as in the bind pose. After IK: turn the wrist so the palm faces what it rests
  // on (down on a desk, a table or a thigh; toward the phone when holding one), fingers carrying on from the forearm,
  // then curl the fingers for the grip. palmSign / curlSign are measured from the rig once (rigs differ in bone axes).
  const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
  const fingers = [0, 1].map(i => FINGERS.map(n => [1, 2, 3].map(k => bone(new RegExp(`${i ? 'Right' : 'Left'}Hand${n}${k}$`)))));
  const palmSign = [1, 1], curlSign = [1, 1];
  // radians at the base, middle and tip joints of each finger (the thumb takes half)
  const CURL = { rest: [0.22, 0.35, 0.25], table: [0.2, 0.35, 0.3], keyboard: [0.25, 0.5, 0.4], phone: [0.75, 0.95, 0.6], handle: [0.95, 1.05, 0.7] };
  function handFrame(i) {
    const f0 = fingers[i], mid = f0[2][0], ix = f0[1][0], pk = f0[4][0];
    if (!B.hands[i] || !mid || !ix || !pk) return null;
    const h = B.hands[i].getWorldPosition(new T.Vector3());
    const f = mid.getWorldPosition(new T.Vector3()).sub(h).normalize();
    const a = ix.getWorldPosition(new T.Vector3()).sub(pk.getWorldPosition(new T.Vector3()));
    a.addScaledVector(f, -a.dot(f)).normalize();
    return { h, f, a, n: new T.Vector3().crossVectors(f, a).multiplyScalar(palmSign[i]) };
  }
  function orientHand(i, nWant) {
    const F = handFrame(i); if (!F) return;
    // fingers continue the forearm, laid into the plane the palm faces
    const fore = F.h.clone().sub(B.forearms[i].getWorldPosition(new T.Vector3())).normalize();
    const n2 = nWant.clone().normalize(); let f2 = fore.addScaledVector(n2, -fore.dot(n2));
    if (f2.lengthSq() < 0.05) f2 = fwd().addScaledVector(n2, -fwd().dot(n2));
    f2.normalize();
    const basis = (f, n) => new T.Matrix4().makeBasis(f, n, new T.Vector3().crossVectors(f, n));
    const q = new T.Quaternion().setFromRotationMatrix(basis(f2, n2).multiply(basis(F.f, F.n).transpose()));
    turn(B.hands[i], q);
  }
  function curlHand(i, c) {
    const F = handFrame(i); if (!F) return;
    for (let n = 0; n < 5; n++) fingers[i][n].forEach((b, k) => { if (b && (n || k)) axisTurn(b, F.a, curlSign[i] * c[k] * (n ? 1 : 0.5)); });
  }
  // what they look at: the person they'd notice (the player), what they're doing, a noise just heard
  let target = null, task = null, heard = null, socialSpeed = 0;
  const lastTarget = new T.Vector3();
  // gaze state: head yaw/pitch and torso yaw as critically damped springs (eyes jump, the head follows)
  const G = { hy: 0, hp: 0, ty: 0, vy: 0, vp: 0, vt: 0, first: true, dir: new T.Vector3(0, 0, 1) };
  let look = 0, focus = { id: null }, inhale = 0, pose = null, sit = {}, sitFrom = null, sitK = 1;
  const shrugSign = [1, -1];
  function spring(x, v, goal, w, dt) { const a = w * w * (goal - x) - 2 * w * v; v += a * dt; return [x + v * dt, v]; }

  let reach = null, reachGiven = [false, false], tipUp = 0, held = null;
  function update(dt) {
    since += dt;
    // standing: hold a stance; now and then shift the weight to the other leg (two copies of the idle, both frozen)
    const standing = current === 'Idle' && pose !== 'sit';
    if (current === 'Idle') {
      if (pose === 'sit') idle.time = seatFrame;
      else if (since > 0.35) { const s = stand.tick(dt); idle.time = stances[s.from]; shiftTo.time = stances[s.to]; idle.setEffectiveWeight(1 - s.w); shiftTo.setEffectiveWeight(s.w); }
    }
    for (const [b, q, p, k] of bind) { b.quaternion.copy(q); b.position.copy(p); b.scale.copy(k); }
    mixer.update(dt);
    if (current === 'Idle') { const w = Math.min(1, idle.getEffectiveWeight() + shiftTo.getEffectiveWeight()); for (const [b, q] of calm) b.quaternion.slerp(q, w); }
    // walking: a slower walk is a shorter step as well as a slower one; swing the limbs less far from standing
    body.position.copy(base);
    const walkW = current === 'Walk' || walkClip?.isRunning() ? walkClip.getEffectiveWeight() : 0;
    root.updateMatrixWorld(true);
    if (walkW > 0.01) {
      const k = 1 + (Math.min(1.3, Math.max(0.3, stride(pace).amp)) - 1) * walkW;
      if (Math.abs(k - 1) > 0.01) {
        const low0 = Math.min(...B.feet.map(f => f.getWorldPosition(_v).y));
        for (const b of legs) b.quaternion.copy(_q.copy(rest.get(b)).slerp(b.quaternion, k));
        root.updateMatrixWorld(true);
        const low1 = Math.min(...B.feet.map(f => f.getWorldPosition(_v).y));
        body.position.y += (low0 - low1) / root.scale.y;   // the stance foot stays on the floor
        root.updateMatrixWorld(true);
      }
    }
    // postural sway about the ankles, millimetres, only standing
    if (standing) { const [x, z] = drift.tick(dt); body.position.x += x / root.scale.y; body.position.z += z / root.scale.y; root.updateMatrixWorld(true); }
    // breathing: the chest lifts a little and the shoulders rise on the in-breath
    inhale = breath.tick(dt);
    const breathe = () => {
      const r = right().clone(), f = fwd(), c = inhale - 0.5;
      axisTurn(B.chest, r, -STUDY.breath.chest * c);
      B.shoulders.forEach((b, i) => axisTurn(b, f, shrugSign[i] * STUDY.breath.shoulder * c));
    };
    if (pose === 'sit') {
      // Rough pose first (thighs forward, knees bent, upper arms down, forearms forward): it sets the bend planes. Then
      // the spine (recline into the cushions or lean in to a desk, a sideways settle, a head tilt), then IK: feet flat on
      // what they rest on, hands on the thighs or on what they're given (a keyboard, a table, the top of a sofa back).
      // A posture change (pose('sit', other) while seated) blends the two over ~2 s, minimum-jerk.
      if (sitFrom && (sitK = Math.min(1, sitK + dt / STUDY.sit.shift)) >= 1) sitFrom = null;
      const e = minJerk(sitK), mix = k => sitFrom ? (sitFrom[k] ?? 0) * (1 - e) + (sit[k] ?? 0) * e : sit[k] ?? 0;
      const r = right().clone(), f = fwd(), up = UP, s = root.scale.y;
      for (const b of B.thighs) axisTurn(b, r, -1.5);
      for (const b of B.knees) axisTurn(b, r, 1.45);
      for (const b of B.arms) axisTurn(b, r, -0.35);
      for (const b of B.forearms) axisTurn(b, r, -1.1);
      const recline = mix('recline'), lean = mix('lean'), roll = mix('roll'), tilt = mix('tilt');
      if (recline) axisTurn(B.hips, r, -recline);   // pelvis rolled back, slid forward: slumped into the cushions
      if (lean) axisTurn(B.spine, r, lean);          // leaning in to a desk or table
      if (roll) axisTurn(B.spine, f, roll);          // settled to one side
      const nod = lean * 0.6 - recline * 0.7;        // eyes back toward level
      tipUp = 0.3 * recline - 0.4 * lean;            // what the neck leaves of it: the head's tilt up, for the gaze
      if (nod) axisTurn(B.neck, r, -nod);
      if (tilt) axisTurn(B.head, f, tilt);
      breathe();
      // which side each limb is on, so targets go to the near hand or foot (they can't cross)
      const lr = B.thighs[0].getWorldPosition(new T.Vector3()).sub(B.thighs[1].getWorldPosition(new T.Vector3())).normalize();
      const centre = B.hips.getWorldPosition(new T.Vector3());
      const sides = list => { const out = [null, null]; for (const p of list ?? []) if (p) out[p.clone().sub(centre).dot(lr) > 0 ? 0 : 1] = p; return out; };
      const targets = o => {
        const feetGiven = sides(o.feet), handsGiven = sides(o.hands), feet = [], hands = [];
        for (let i = 0; i < 2; i++) {
          const hip = B.thighs[i].getWorldPosition(new T.Vector3()), sign = i === 0 ? 1 : -1;
          let foot = feetGiven[i];   // given (a stool's bar), or flat on the floor ahead of the knee, a little apart
          if (!foot) {
            const ahead = Array.isArray(o.ahead) ? o.ahead[i] : o.ahead ?? (thighLen + 0.08) * s;
            foot = hip.clone().addScaledVector(f, ahead).addScaledVector(lr, sign * (o.spread ?? 0.03 * s)); foot.y = (o.floor ?? 0) + footY0 * s;
          }
          feet.push(foot);
          let hand = handsGiven[i];
          if (!hand) {
            const knee = B.knees[i].getWorldPosition(new T.Vector3());
            const mid = hip.clone().add(B.thighs[1 - i].getWorldPosition(new T.Vector3())).multiplyScalar(0.5);
            hand = hip.clone().lerp(knee, 0.42).addScaledVector(up, 0.07 * s).lerp(mid.setY(hip.y), 0.12);   // on the top of the thigh, a little inboard
          }
          hands.push(hand);
        }
        return { feet, hands };
      };
      const now = targets(sit), was = sitFrom && targets(sitFrom);
      if (was) for (const k of ['feet', 'hands']) now[k] = now[k].map((p, i) => was[k][i].clone().lerp(p, e));
      for (let i = 0; i < 2; i++) ik(B.thighs[i], B.knees[i], B.feet[i], now.feet[i]);
      reach = now.hands; reachGiven = sides(sit.hands).map(Boolean);
    } else breathe();
    if (held && pose !== 'sit') { reach = held.points; reachGiven = [true, true]; }   // standing, both hands on something (a cart's handle)
    if (pose === 'cup') { axisTurn(B.arms[1], right().clone(), -0.2); axisTurn(B.forearms[1], right().clone(), -1.35); }
    gaze(dt);
    // hands last: on these rigs the collarbones hang off the neck, so the head turning moves the shoulders
    if (reach) {
      for (let i = 0; i < 2; i++) {
        ik(B.arms[i], B.forearms[i], B.hands[i], reach[i]);
        const grip = reachGiven[i] ? (held && pose !== 'sit' ? held.grip : sit.grip ?? 'table') : 'rest';
        if (grip === 'phone') {   // palms up and in, toward the phone held between them at the chest
          const inward = B.hips.getWorldPosition(new T.Vector3()).sub(B.hands[i].getWorldPosition(_v)).setY(0).normalize();
          orientHand(i, inward.add(UP).sub(fwd().multiplyScalar(0.3)));
        } else orientHand(i, _w.set(0, -1, 0));
        curlHand(i, CURL[grip] ?? CURL.table);
      }
      reach = null;
    }
    // blinks: ~17/min, fewer watching a screen, often one with a big gaze shift (body.js blinker)
    const c = blinks.tick(dt, { screen: focus.id === 'task' && /tv|screen|phone/.test(task?.kind ?? ''), shift: G.shift });
    if (c > 0) for (const b of B.lids) b.quaternion.multiply(_q.setFromAxisAngle(LID, BLINK * c));   // in the lid bone's own frame
  }

  // Look at things one at a time (body.js attention): eyes jump to the new thing, the head follows over ~0.3 s and
  // carries what's beyond the eyes' easy range, the torso only past the head's; a sound turns the head first.
  function gaze(dt) {
    if (!B.head) return;
    const head = B.head.getWorldPosition(new T.Vector3()), f = fwd(), facing = Math.atan2(f.x, f.z);
    if (target) { socialSpeed += ((dt > 0 ? target.distanceTo(lastTarget) / dt : 0) - socialSpeed) * Math.min(1, dt * 4); lastTarget.copy(target); }
    focus = att.tick(dt, { head: head.toArray(), facing, task: task ? { at: task.at.toArray(), kind: task.kind } : null, social: target ? { at: target.toArray(), speed: socialSpeed } : null, noise: heard });
    heard = null;
    let yaw = 0, pitch = 0;
    const to = focus.at ? new T.Vector3(...focus.at).sub(head) : null;
    if (to && to.lengthSq() > 1e-4) {
      const l = to.clone().applyQuaternion(root.quaternion.clone().invert());
      yaw = Math.atan2(l.x, l.z); pitch = Math.atan2(to.y, Math.hypot(to.x, to.z)) - (pose === 'sit' ? tipUp : 0);
      if (Math.abs(yaw) > 2.6) yaw = 0;   // right behind: they don't wring their neck round
    }
    G.shift = focus.changed && to ? G.dir.angleTo(to.clone().normalize()) : 0;
    if (to) G.dir.copy(to).normalize();
    const goal = split(yaw, pitch, { seated: pose === 'sit' }), w = focus.lead === 'head' ? STUDY.gaze.omegaSound : STUDY.gaze.omega;
    if (G.first) { G.hy = goal.head[0]; G.hp = goal.head[1]; G.ty = goal.torso; G.first = false; }
    const h = Math.min(dt, 0.05);
    [G.hy, G.vy] = spring(G.hy, G.vy, goal.head[0], w, h); [G.hp, G.vp] = spring(G.hp, G.vp, goal.head[1], w, h); [G.ty, G.vt] = spring(G.ty, G.vt, goal.torso, w * 0.6, h);
    const r = right().clone();
    if (Math.abs(G.ty) > 1e-4) axisTurn(B.spine, UP, G.ty);
    for (const [b, k] of [[B.neck, 0.4], [B.head, 0.6]]) { axisTurn(b, UP, G.hy * k); axisTurn(b, r.clone().applyAxisAngle(UP, G.ty + G.hy * k), -G.hp * k); }
    // eyes: whatever the head hasn't covered yet, within their range
    if (to && B.eyes.length) {
      const g = f.clone().applyAxisAngle(UP, G.ty + G.hy); g.applyAxisAngle(new T.Vector3(1, 0, 0).applyQuaternion(root.quaternion).applyAxisAngle(UP, G.ty + G.hy), -G.hp);
      const mid = B.eyes.reduce((m, e) => m.add(e.getWorldPosition(_v)), new T.Vector3()).multiplyScalar(1 / B.eyes.length);
      const want = new T.Vector3(...focus.at).sub(mid).normalize(), ang = g.angleTo(want);
      const q = new T.Quaternion().setFromUnitVectors(g, want);
      if (ang > STUDY.gaze.eyeMax + 0.1) q.slerp(new T.Quaternion(), 1 - (STUDY.gaze.eyeMax + 0.1) / ang);
      for (const e of B.eyes) turn(e, q);
      G.eye = Math.min(ang, STUDY.gaze.eyeMax + 0.1);
    }
    look += ((focus.id === 'social' ? 1 : 0) - look) * Math.min(1, dt * 4);
  }

  play('Idle'); mixer.update(0);
  root.updateMatrixWorld(true);
  // each eye's forward in its own bone frame, standing at rest facing +z (rigs differ in bone axes)
  const hipHeight = B.hips ? B.hips.getWorldPosition(_v).y : height * 0.53;   // standing, root at the origin: where a seat must meet
  // the hip joints (thigh bones) and ankles above the floor, standing, in the body's own units (x root.scale = metres)
  const hipJoint = B.thighs[0] ? B.thighs[0].getWorldPosition(_v).y : hipHeight;
  const footY0 = B.feet[0] ? B.feet[0].getWorldPosition(_v).y / root.scale.y : 0.08;
  const thighLen = B.thighs[0] && B.knees[0] ? B.thighs[0].getWorldPosition(_v).distanceTo(B.knees[0].getWorldPosition(_w)) / root.scale.y : 0.4;
  // which way each collarbone turns to lift its arm (rigs differ in bone axes)
  B.shoulders.forEach((b, i) => { if (!b || !B.arms[i]) return; const y0 = B.arms[i].getWorldPosition(_v).y; axisTurn(b, fwd(), 0.1); shrugSign[i] = B.arms[i].getWorldPosition(_v).y > y0 ? 1 : -1; axisTurn(b, fwd(), -0.1); });
  // which way each palm faces (toward the thigh, standing) and which way the fingers curl into it, for this rig
  for (let i = 0; i < 2; i++) {
    const F = handFrame(i); if (!F) continue;
    const toMid = B.hips.getWorldPosition(new T.Vector3()).sub(F.h).setY(0);
    if (F.n.dot(toMid) < 0) palmSign[i] = -1;
    const n = F.n.multiplyScalar(palmSign[i]), j = fingers[i][1][0], tip = fingers[i][1][2]; if (!j || !tip) continue;
    const t0 = tip.getWorldPosition(new T.Vector3()); axisTurn(j, F.a, 0.3); const t1 = tip.getWorldPosition(new T.Vector3()); axisTurn(j, F.a, -0.3);
    curlSign[i] = t1.sub(t0).dot(n) >= 0 ? 1 : -1;
  }
  return {
    root, play, update, bones: B, gait, hipHeight, hipJoint, stances,
    /** Walking speed, m/s: the Walk clip runs at the cadence and the limbs swing at the step length that speed implies. */
    pace(v) { pace = Math.max(0.2, v); if (walkClip && current === 'Walk') walkClip.timeScale = stride(pace).rate; },
    /** The person they'd notice and look at when it makes sense (a Vector3 that may keep moving, e.g. the player's eyes), or null. */
    lookAt(v) { target = v; if (v) lastTarget.copy(v); },
    /** What they're doing, for the eyes: { at: Vector3 (may move), kind: 'tv' | 'phone' | 'screen' | 'work' | 'path' } or null. */
    attend(t) { task = t; },
    /** Standing, both hands on [left, right] world points (Vector3s, may move), e.g. a cart's handle bar; null lets go. */
    hold(points, grip = 'handle') { held = points ? { points, grip } : null; },
    /** A noise at a world point (a Vector3): they turn to it, head first, after a moment. */
    hear(v) { heard = v.toArray ? v.toArray() : v; },
    /** 'sit', 'cup' or null. Sitting takes { floor: world y the feet rest on, ahead: m from hip to ankle (or [left, right]),
     *  spread: m each foot out from its hip, hands / feet: world points (Vector3s, may move; each goes to the hand or foot on
     *  its side, the other rests on the thigh / floor), lean: rad forward at the chest, recline: rad back at the pelvis,
     *  roll: rad sideways at the chest, tilt: rad head roll }. Sitting again with other options changes posture smoothly. */
    pose(p, opts) {
      if (p === 'sit' && pose === 'sit' && opts && opts !== sit) { sitFrom = sit; sitK = 0; }
      if (p === 'sit' && pose !== 'sit' && current === 'Idle') idle.time = seatFrame;
      pose = p; if (p === 'sit' && opts) sit = opts;
    },
    get looking() { return look; },
    /** What they're looking at now: { id: 'task' | 'social' | 'away' | 'noise', at, lead } (checks read it). */
    get focus() { return focus; },
    get gazeState() { return { head: [G.hy, G.hp], torso: G.ty, eye: G.eye ?? 0 }; },
    get breath() { return inhale; },
    get stanceState() { return stand.state; },
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
