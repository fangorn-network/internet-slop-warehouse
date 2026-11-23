// SPDX-License-Identifier: CC0-1.0
// Your car, driven: a bicycle model (steer the front wheels, the rear follows) on flat ground, kept on the drivable
// areas you give it, stopped by box colliders. W/S throttle and brake (and reverse from a stop), A/D steer, from the
// hotel's input (controls.input is turned by the look yaw, so the raw keys are recovered from it).
//
//   const car = createCar(object, { areas, boxes, synth });   car.update(dt, controls.input);   car.speed
import * as T from 'three';

const WHEELBASE = 2.75, MAX_STEER = 0.52, TOP = 22, REVERSE = 5, ACCEL = 4.8, BRAKE = 10, DRAG = 0.35, ROLL = 1.2;
const HALF = [0.92, 2.35];   // half the wagon's width and length (Grab3D 1990s station wagon)

/** areas: [[x0, x1, z0, z1]] the car may be on; boxes: { x0, x1, z0, z1 } it can hit (outdoor colliders, low enough to). */
export function createCar(object, { areas, boxes, synth, onHit = () => {} }) {
  const c = { object, speed: 0, steer: 0, heading: object.rotation.y, engine: null };
  const inside = (x, z) => areas.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  const corners = (x, z, h) => {   // the four corners of the body and the middle of each side
    const f = [Math.sin(h), Math.cos(h)], r = [Math.cos(h), -Math.sin(h)], out = [];
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]]) out.push([x + f[0] * HALF[1] * a + r[0] * HALF[0] * b, z + f[1] * HALF[1] * a + r[1] * HALF[0] * b]);
    return out;
  };
  // whatever the car already stands in where it's parked (its own bay's box, a wheel stop) can't hold it there
  const start = corners(object.position.x, object.position.z, object.rotation.y);
  boxes = boxes.filter(b => !start.some(([px, pz]) => px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1));
  const hits = (px, pz) => boxes.filter(b => px > b.x0 && px < b.x1 && pz > b.z0 && pz < b.z1);
  // a move is free if every corner stays on a drivable area and out of any box it isn't already touching: pressed against
  // a car, you can always back away from it (a box you're in can't hold you), never drive further into another
  const free = (x, z, h) => {
    const now = new Set(corners(object.position.x, object.position.z, c.heading).flatMap(([px, pz]) => hits(px, pz)));
    return corners(x, z, h).every(([px, pz]) => inside(px, pz) && hits(px, pz).every(b => now.has(b)));
  };

  function sound() {   // an old six at idle, rising with road speed; tyres hiss on asphalt
    const ac = synth.ctx; if (!ac || c.engine) return;
    const o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = 0;
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(synth.out); o.start(); o2.start();
    const n = ac.createBufferSource(); n.buffer = synth.noise(3); n.loop = true;
    const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; const ng = ac.createGain(); ng.gain.value = 0;
    n.connect(nf).connect(ng).connect(synth.out); n.start();
    c.engine = { o, o2, lp, g, ng };
  }
  c.on = on => { sound(); if (c.engine) { c.engine.g.gain.setTargetAtTime(on ? 0.05 : 0, synth.ctx.currentTime, on ? 0.3 : 0.6); if (!on) c.engine.ng.gain.setTargetAtTime(0, synth.ctx.currentTime, 0.3); } };

  c.update = (dt, input, driving = true) => {
    // raw keys from the yaw-turned input: Z forward, X right
    const cy = Math.cos(input.yaw), sy = Math.sin(input.yaw);
    const X = driving ? input.x * cy - input.z * sy : 0, Z = driving ? -(input.x * sy + input.z * cy) : 0;
    if (Z > 0.1) c.speed += (c.speed < 0 ? BRAKE : ACCEL * (1 - c.speed / TOP)) * dt;
    else if (Z < -0.1) c.speed -= (c.speed > 0.2 ? BRAKE : ACCEL * 0.6) * dt;
    else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), (ROLL + DRAG * Math.abs(c.speed)) * dt);
    c.speed = Math.max(-REVERSE, Math.min(TOP, c.speed));
    const want = -X * MAX_STEER * (1 - 0.55 * Math.min(1, Math.abs(c.speed) / TOP));   // less lock at speed
    c.steer += (want - c.steer) * Math.min(1, dt * 5);
    const turn = c.speed / WHEELBASE * Math.tan(c.steer) * dt;
    const h = c.heading + turn, p = object.position;
    const nx = p.x + Math.sin(h) * c.speed * dt, nz = p.z + Math.cos(h) * c.speed * dt;
    if (free(nx, nz, h)) { p.x = nx; p.z = nz; c.heading = h; }
    else if (free(p.x, p.z, h) && Math.abs(c.speed) < 1) c.heading = h;   // turning on the spot against a kerb is allowed at a crawl
    else { if (Math.abs(c.speed) > 3) onHit(Math.abs(c.speed)); c.speed *= -0.15; }
    object.rotation.y = c.heading;
    if (c.engine && synth.ctx) {
      const t = synth.ctx.currentTime, rpm = 1 + Math.abs(c.speed) / TOP * 3.2 + (Z > 0.1 ? 0.25 : 0);
      c.engine.o.frequency.setTargetAtTime(32 * rpm, t, 0.1); c.engine.o2.frequency.setTargetAtTime(16 * rpm, t, 0.1);
      c.engine.lp.frequency.setTargetAtTime(300 + 260 * rpm, t, 0.1);
      c.engine.ng.gain.setTargetAtTime(Math.min(0.04, Math.abs(c.speed) * 0.002), t, 0.2);
    }
  };
  /** Where a third-person camera sits and looks: behind and above, easing round with the car. */
  const eye = new T.Vector3(), look = new T.Vector3();
  c.camera = dt => {
    const p = object.position, f = new T.Vector3(Math.sin(c.heading), 0, Math.cos(c.heading));
    const want = p.clone().addScaledVector(f, -6.8).setY(p.y + 2.7);
    if (!c.camInit) { eye.copy(want); c.camInit = true; } else eye.lerp(want, Math.min(1, dt * 4));
    look.copy(p).addScaledVector(f, 5).setY(p.y + 1.1);
    const d = look.clone().sub(eye);
    return { pos: eye.clone(), yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
  };
  return c;
}
