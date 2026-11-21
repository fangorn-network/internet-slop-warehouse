// Rigid-body physics for any three.js object, on Rapier (Apache-2.0, dimforge.com), run as WebAssembly.
// The game maps "@dimforge/rapier3d-compat" in its import map, next to "three":
//   "@dimforge/rapier3d-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.21.0/dist/rapier.mjs"
//
//   const world = await createWorld();                       // gravity −9.81 m/s², fixed 60 Hz steps
//   attach(floor, { world, body: "fixed" });                 // shape from the object: a box around it
//   const crate = attach(mesh, { world, onContact: ({ speed }) => speed > 2 && play("hit") });
//   crate.impulse([0, 5, 0]);
//   every frame: world.update(dt)                            // steps, then moves every attached object
//   const me = character(world, { position: [0, 0, 5] });    // a capsule that walks, climbs steps and pushes things
//   me.walk(vx, vz); me.jump(4); world.update(dt); camera.position.copy(me.position)
//
// Units are metres, kilograms and seconds: size objects in metres (a GLB part's `measured.glb.size` says how big it
// is). Attach top-level objects (children of the scene): positions are read and written in world space.
// ponytail: no interpolation between steps (a 144 Hz screen sees 60 Hz motion); no joints yet: world.raw has them.
import * as THREE from "three";

// Rapier loads when the first world is made, not with this module: if it can't load (offline, a blocked CDN), the
// game's page still runs and only createWorld() rejects, so a game can fall back to walking without physics. A CDN that
// hangs (ERR_TIMED_OUT) gives up after 30 s instead of holding the game's loading screen for ever.
let RAPIER, ready;
const v3 = (v) => new THREE.Vector3(v.x, v.y, v.z);

/** A physics world → { update(dt), raycast(origin, direction, far), dispose(), raw, rapier }. */
export async function createWorld({ gravity = [0, -9.81, 0], step = 1 / 60, maxSteps = 5 } = {}) {
    await (ready ??= Promise.race([import("@dimforge/rapier3d-compat"), new Promise((_, no) => setTimeout(() => no(new Error("Rapier took over 30 s to load")), 30000))]).then(async (m) => { RAPIER = m.default; await RAPIER.init(); }).catch((e) => { ready = null; throw e; }));
    const raw = new RAPIER.World({ x: gravity[0], y: gravity[1], z: gravity[2] }), events = new RAPIER.EventQueue(true);
    raw.timestep = step;
    const bodies = new Set(), byCollider = new Map(), characters = new Set();
    let carry = 0;
    return {
        raw, rapier: RAPIER, bodies, byCollider, characters,
        /** Steps at a fixed rate (at most maxSteps per call, so a stalled tab doesn't spiral), then syncs objects. */
        update(dt) {
            carry = Math.min(carry + dt, step * maxSteps);
            for (; carry >= step; carry -= step) {
                for (const b of bodies) if (b.kinematic) b.push();
                for (const c of characters) c.step(step);
                // contact speed is how fast they met: velocities from before the step (after it, the solver has stopped them)
                for (const b of bodies) if (b.onContact) b.before = v3(b.body.linvel());
                raw.step(events);
                events.drainCollisionEvents((h1, h2, started) => {
                    if (!started) return;
                    const a = byCollider.get(h1), b = byCollider.get(h2), was = (x) => x.before ?? v3(x.body.linvel());
                    const speed = a && b ? was(a).sub(was(b)).length() : was(a ?? b).length();
                    a?.onContact?.({ other: b?.object ?? null, speed });
                    b?.onContact?.({ other: a?.object ?? null, speed });
                });
            }
            for (const b of bodies) b.update(dt);
        },
        /** The first attached object along a ray → { object, point, normal, distance }, or null. */
        raycast(origin, direction, far = 100) {
            const d = direction.clone().normalize(), hit = raw.castRayAndGetNormal(new RAPIER.Ray(origin, d), far, true);
            if (!hit) return null;
            const t = hit.timeOfImpact ?? hit.toi;   // renamed in Rapier 0.12
            return { object: byCollider.get(hit.collider.handle)?.object ?? null, point: origin.clone().addScaledVector(d, t), normal: v3(hit.normal), distance: t };
        },
        dispose() { for (const x of [...bodies, ...characters]) x.dispose(); raw.free(); events.free(); },
    };
}

// The object's vertices and triangles in its own frame (scale applied, position and rotation not).
function geometry(object) {
    object.updateWorldMatrix(true, true);
    const toLocal = new THREE.Matrix4().compose(new THREE.Vector3(), object.getWorldQuaternion(new THREE.Quaternion()), new THREE.Vector3(1, 1, 1))
        .premultiply(new THREE.Matrix4().makeTranslation(object.getWorldPosition(new THREE.Vector3()))).invert();
    const points = [], indices = [], m = new THREE.Matrix4(), p = new THREE.Vector3();
    object.traverse((o) => {
        const pos = o.isMesh && o.geometry.attributes.position;
        if (!pos) return;
        m.multiplyMatrices(toLocal, o.matrixWorld);
        const base = points.length / 3;
        for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(m); points.push(p.x, p.y, p.z); }
        const idx = o.geometry.index;
        if (idx) for (let i = 0; i < idx.count; i++) indices.push(base + idx.getX(i));
        else for (let i = 0; i < pos.count; i++) indices.push(base + i);
    });
    return { points: new Float32Array(points), indices: new Uint32Array(indices) };
}

function collider(object, shape) {
    const { points, indices } = geometry(object);
    if (!points.length) throw new Error(`physics: ${object.name || "object"} has no mesh to make a ${shape} from`);
    const box = new THREE.Box3().setFromArray(points), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const D = RAPIER.ColliderDesc;
    const desc = shape === "ball" ? D.ball(Math.max(size.x, size.y, size.z) / 2)
        : shape === "hull" ? D.convexHull(points)
        : shape === "mesh" ? D.trimesh(points, indices)
        : shape === "cylinder" ? D.cylinder(size.y / 2, Math.max(size.x, size.z) / 2)
        : D.cuboid(Math.max(size.x / 2, 0.005), Math.max(size.y / 2, 0.005), Math.max(size.z / 2, 0.005));
    if (!desc) throw new Error(`physics: couldn't build a ${shape} for ${object.name || "object"}`);
    return { desc: shape === "hull" || shape === "mesh" ? desc : desc.setTranslation(mid.x, mid.y, mid.z), size, offset: shape === "hull" || shape === "mesh" ? new THREE.Vector3() : mid };
}

/**
 * Give an object a body → { update(), dispose(), body, impulse([x,y,z]), velocity([x,y,z]?) }.
 * body: dynamic (falls, collides), fixed (floors, walls), kinematic (you move the object; it pushes dynamic ones),
 * platform (you move the object, a floor characters walk on and ride(): an elevator. Rapier's character controller
 * barely walks on kinematic bodies, so a platform is a fixed body that jumps to the object each step).
 * shape: box (default), ball, cylinder (upright: a round table), hull (convex hull of its vertices: GLBs) or mesh
 * (exact triangles: fixed bodies only). Small things set down on a big hull (a lathed round table top, hundreds of
 * vertices) sink slowly into it: give surfaces a box or cylinder.
 * mass is in kg (or density, kg/m³, of the whole shape). centerOfMass [x, y, z], in the object's frame, overrides where
 * the shape puts it: a table lamp's hull is mostly shade, but its weight is in the base (with mass only).
 * settle: rolling resistance. Rapier has none, so a stool on its side (two round rims) rolls and rocks for ever and never
 * sleeps; with settle (≈ 5), once it's slow (under 0.3 m/s and 1.5 rad/s) it is damped that hard, and still creeping
 * (under 15 cm/s, 0.5 rad/s) for half a second it is put to sleep: static friction.
 */
export function attach(object, { world, body = "dynamic", shape = "box", mass, centerOfMass, density = 1, friction = 0.6, restitution = 0.1, damping = 0, settle = 0, ccd = false, onContact } = {}) {
    if (!world) throw new Error("physics: attach needs { world } from createWorld()");
    if (shape === "mesh" && body === "dynamic") throw new Error("physics: a dynamic body can't be a mesh; use hull");
    const R = RAPIER, desc = body === "fixed" || body === "platform" ? R.RigidBodyDesc.fixed() : body === "kinematic" ? R.RigidBodyDesc.kinematicPositionBased() : R.RigidBodyDesc.dynamic();
    const p = object.getWorldPosition(new THREE.Vector3()), q = object.getWorldQuaternion(new THREE.Quaternion());
    // damping slows spinning: a hull resting on uneven legs (a chair) otherwise rocks forever and never sleeps.
    const rb = world.raw.createRigidBody(desc.setTranslation(p.x, p.y, p.z).setRotation(q).setCcdEnabled(ccd).setAngularDamping(damping));
    const { desc: cd, size, offset } = collider(object, shape);
    cd.setFriction(friction).setRestitution(restitution);
    if (mass !== undefined && centerOfMass) {   // inertia of a solid box its size: close enough for a prop
        const [x, y, z] = [size.x, size.y, size.z].map((v) => v * v * mass / 12), c = new THREE.Vector3(...centerOfMass).sub(offset);
        cd.setMassProperties(mass, c, { x: y + z, y: x + z, z: x + y }, { x: 0, y: 0, z: 0, w: 1 });
    } else if (mass !== undefined) cd.setMass(mass); else cd.setDensity(density);
    if (onContact) cd.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    const col = world.raw.createCollider(cd, rb);
    const self = {
        object, body: rb, collider: col, onContact, kinematic: body === "kinematic" || body === "platform",
        // dynamic: the body moves the object; kinematic: the object moves the body (push() runs before each step)
        update(dt = 1 / 60) {
            if (self.kinematic || body === "fixed" || body === "platform") return;
            const t = rb.translation(), r = rb.rotation(); object.position.set(t.x, t.y, t.z); object.quaternion.set(r.x, r.y, r.z, r.w);
            if (!settle || rb.isSleeping()) return;
            const v = rb.linvel(), w = rb.angvel(), slow = Math.hypot(v.x, v.y, v.z) < 0.3 && Math.hypot(w.x, w.y, w.z) < 1.5;
            const contacts = () => { let supported = false, pushed = false; world.raw.contactPairsWith(col, (c) => { const o = c.parent(); if (!o || o.isFixed() || o.isSleeping()) supported = true; else pushed = true; }); return { supported, pushed }; };
            // Parked (put to sleep below) and woken again with nothing moving against it: the solver nudged it awake at a floor
            // seam. Back to sleep, or it creeps on a few centimetres each time (a stool across a lobby seam crept 7 cm in 3 s).
            if (self.parked) { if (slow && !contacts().pushed) { rb.setLinvel({ x: 0, y: 0, z: 0 }, false); rb.setAngvel({ x: 0, y: 0, z: 0 }, false); rb.sleep(); return; } self.parked = false; }
            if (slow !== !!self.slow) { self.slow = slow; rb.setAngularDamping(slow ? settle : damping); rb.setLinearDamping(slow ? settle / 2 : 0); }
            // Static friction: still creeping a centimetre or two a second after half a second (a hull lying across the seam
            // of two floor boxes gets pushed sideways by their edges), it has stopped. Real things don't creep.
            self.quiet = Math.hypot(v.x, v.y, v.z) < 0.15 && Math.hypot(w.x, w.y, w.z) < 0.5 ? (self.quiet ?? 0) + dt : 0;
            if (self.quiet > 0.5) {   // unless something that moves is touching it (a hand, the walker, a woken neighbour): that's a push
                self.quiet = 0;
                const { supported, pushed } = contacts();
                if (supported && !pushed) { self.parked = true; rb.sleep(); }
            }
        },
        /** Hold a dynamic body: until release(), it follows the object wherever you put it, and still pushes things. */
        grab() { if (body !== "dynamic") return; self.kinematic = true; rb.setBodyType(R.RigidBodyType.KinematicPositionBased, true); },
        /** Let go, optionally throwing it at velocity [x, y, z]. */
        release(v) { if (!self.kinematic || body !== "dynamic") return; self.kinematic = false; rb.setBodyType(R.RigidBodyType.Dynamic, true); self.slow = false; self.parked = false; rb.setAngularDamping(damping); rb.setLinearDamping(0); if (v) self.velocity(v); },
        push() {
            object.getWorldPosition(p); object.getWorldQuaternion(q);
            if (body === "platform") { rb.setTranslation(p, true); rb.setRotation(q, true); } else { rb.setNextKinematicTranslation(p); rb.setNextKinematicRotation(q); }
        },
        impulse([x, y, z]) { self.parked = false; rb.applyImpulse({ x, y, z }, true); },
        velocity(v) { if (v) self.parked = false, rb.setLinvel({ x: v[0], y: v[1], z: v[2] }, true); const l = rb.linvel(); return [l.x, l.y, l.z]; },
        dispose() { world.bodies.delete(self); world.byCollider.delete(col.handle); world.raw.removeRigidBody(rb); },
    };
    world.bodies.add(self); world.byCollider.set(col.handle, self);
    return self;
}

/**
 * A walking character: a capsule with its feet at `position`, moved by Rapier's character controller inside the
 * fixed steps → { walk(vx, vz), jump(speed), ride(dy), teleport([x, y, z]), position, grounded, body, dispose() }.
 * It slides along walls, climbs steps up to `step` and slopes up to `slope` radians, and shoves dynamic bodies.
 * walk() sets the horizontal velocity in m/s until changed; ride(dy) carries it with a moving floor (an elevator).
 */
// Interaction groups are (membership << 16) | filter. Carried things are only in group 2; the walker's queries skip group 2.
const CARRIED = (0x0002 << 16) | 0xffff, WALKER = (0xffff << 16) | 0xfffd;

export function character(world, { position = [0, 0, 0], radius = 0.3, height = 1.75, step = 0.4, slope = 0.8, snap = 0.3, gravity = -9.81, push = true, mass = 70 } = {}) {
    // The controller keeps the capsule `GAP` off every surface; starting it touching the floor sinks it in, and a
    // capsule inside the floor barely walks. So the capsule floats GAP above the feet it reports.
    // Placed (spawned, teleported) a centimetre higher still, it drops and the controller settles it at exactly GAP;
    // placed at exactly GAP, rounding sometimes puts it a hair inside, where it crawls.
    const R = RAPIER, half = Math.max(0.01, height / 2 - radius), GAP = 0.02, up = height / 2 + GAP, DROP = 0.01;
    const rb = world.raw.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(position[0], position[1] + up + DROP, position[2]));
    const col = world.raw.createCollider(R.ColliderDesc.capsule(half, radius), rb);
    const ctl = world.raw.createCharacterController(GAP);
    ctl.enableAutostep(step, radius, false); ctl.enableSnapToGround(snap);   // steps up kerbs and stairs, not onto loose chairs: those it shoves
    ctl.setMaxSlopeClimbAngle(slope); ctl.setMinSlopeSlideAngle(slope + 0.1);
    ctl.setApplyImpulsesToDynamicBodies(push); ctl.setCharacterMass(mass);
    let vx = 0, vz = 0, vy = 0, lift = 0;
    const at = { x: position[0], y: position[1] + up + DROP, z: position[2] };
    const self = {
        body: rb, collider: col, controller: ctl, grounded: false,
        /** Walk through a collider (what it's carrying) until unignore(). Uses a collision group, not a callback:
         *  Rapier can't call back into JavaScript mid-query. */
        ignore(c) { c.setCollisionGroups(CARRIED); },
        unignore(c) { c.setCollisionGroups(0xffffffff); },
        /** Feet, in world space, as of the last step. */
        position: new THREE.Vector3(...position),
        walk(x, z) { vx = x; vz = z; },
        jump(speed) { if (self.grounded) { vy = speed; self.grounded = false; } },
        ride(dy) { lift += dy; },
        teleport([x, y, z]) { at.x = x; at.y = y + up + DROP; at.z = z; vy = 0; lift = 0; rb.setTranslation(at, true); rb.setNextKinematicTranslation(at); self.position.set(x, y, z); },
        step(dt) {
            // Standing: no down force. Snap-to-ground holds it on slopes and stairs; pushing down sinks the capsule into
            // the floor a little each step (Rapier allows it inside the offset), and -0.5 m/s also stops autostep.
            vy = self.grounded && vy <= 0 ? 0 : vy + gravity * dt;
            ctl.computeColliderMovement(col, { x: vx * dt, y: vy * dt, z: vz * dt }, R.QueryFilterFlags.EXCLUDE_SENSORS, WALKER);
            const m = ctl.computedMovement();
            self.grounded = ctl.computedGrounded();
            if (self.grounded && vy < 0) vy = 0;
            // A moving floor carries it rigidly, outside the query: the floor and the capsule move by the same amount in
            // this step. (Asking the controller to climb with it leaves the capsule a hair inside the floor, stuck.)
            at.x += m.x; at.y += m.y + lift; at.z += m.z; lift = 0;
            // Standing a hair inside the offset (float32 rounding when it lands, rides or is placed), the controller
            // treats the floor as an obstacle and crawls. Measure the real gap straight down and lift it out.
            if (self.grounded) {
                const probe = 0.05, bottom = at.y - half - radius;
                const hit = world.raw.castRay(new R.Ray({ x: at.x, y: bottom + probe, z: at.z }, { x: 0, y: -1, z: 0 }), probe + GAP, true, R.QueryFilterFlags.EXCLUDE_SENSORS, WALKER, col);
                const gap = hit ? (hit.timeOfImpact ?? hit.toi) - probe : Infinity;
                if (gap < GAP * 0.999) at.y += GAP - gap;
            }
            rb.setNextKinematicTranslation(at);
            self.position.set(at.x, at.y - up, at.z);
        },
        dispose() { world.characters.delete(self); world.raw.removeCharacterController(ctl); world.raw.removeRigidBody(rb); },
    };
    world.characters.add(self);
    return self;
}
