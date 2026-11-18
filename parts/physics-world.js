// Rigid-body physics for any three.js object, on Rapier (Apache-2.0, dimforge.com), run as WebAssembly.
// The game maps "@dimforge/rapier3d-compat" in its import map, next to "three":
//   "@dimforge/rapier3d-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.21.0/dist/rapier.mjs"
//
//   const world = await createWorld();                       // gravity −9.81 m/s², fixed 60 Hz steps
//   attach(floor, { world, body: "fixed" });                 // shape from the object: a box around it
//   const crate = attach(mesh, { world, onContact: ({ speed }) => speed > 2 && play("hit") });
//   crate.impulse([0, 5, 0]);
//   every frame: world.update(dt)                            // steps, then moves every attached object
//
// Units are metres, kilograms and seconds: size objects in metres (a GLB part's `measured.glb.size` says how big it
// is). Attach top-level objects (children of the scene): positions are read and written in world space.
// ponytail: no interpolation between steps (a 144 Hz screen sees 60 Hz motion); no joints yet: world.raw has them.
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

let ready;
const v3 = (v) => new THREE.Vector3(v.x, v.y, v.z);

/** A physics world → { update(dt), raycast(origin, direction, far), dispose(), raw, rapier }. */
export async function createWorld({ gravity = [0, -9.81, 0], step = 1 / 60, maxSteps = 5 } = {}) {
    await (ready ??= RAPIER.init());
    const raw = new RAPIER.World({ x: gravity[0], y: gravity[1], z: gravity[2] }), events = new RAPIER.EventQueue(true);
    raw.timestep = step;
    const bodies = new Set(), byCollider = new Map();
    let carry = 0;
    return {
        raw, rapier: RAPIER, bodies, byCollider,
        /** Steps at a fixed rate (at most maxSteps per call, so a stalled tab doesn't spiral), then syncs objects. */
        update(dt) {
            carry = Math.min(carry + dt, step * maxSteps);
            for (const b of bodies) if (b.kinematic) b.push();
            for (; carry >= step; carry -= step) {
                raw.step(events);
                events.drainCollisionEvents((h1, h2, started) => {
                    if (!started) return;
                    const a = byCollider.get(h1), b = byCollider.get(h2);
                    const speed = a && b ? v3(a.body.linvel()).sub(v3(b.body.linvel())).length() : v3((a ?? b).body.linvel()).length();
                    a?.onContact?.({ other: b?.object ?? null, speed });
                    b?.onContact?.({ other: a?.object ?? null, speed });
                });
            }
            for (const b of bodies) b.update();
        },
        /** The first attached object along a ray → { object, point, normal, distance }, or null. */
        raycast(origin, direction, far = 100) {
            const d = direction.clone().normalize(), hit = raw.castRayAndGetNormal(new RAPIER.Ray(origin, d), far, true);
            if (!hit) return null;
            const t = hit.timeOfImpact ?? hit.toi;   // renamed in Rapier 0.12
            return { object: byCollider.get(hit.collider.handle)?.object ?? null, point: origin.clone().addScaledVector(d, t), normal: v3(hit.normal), distance: t };
        },
        dispose() { for (const b of [...bodies]) b.dispose(); raw.free(); events.free(); },
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
        : D.cuboid(Math.max(size.x / 2, 0.005), Math.max(size.y / 2, 0.005), Math.max(size.z / 2, 0.005));
    if (!desc) throw new Error(`physics: couldn't build a ${shape} for ${object.name || "object"}`);
    return shape === "hull" || shape === "mesh" ? desc : desc.setTranslation(mid.x, mid.y, mid.z);
}

/**
 * Give an object a body → { update(), dispose(), body, impulse([x,y,z]), velocity([x,y,z]?) }.
 * body: dynamic (falls, collides), fixed (floors, walls), kinematic (you move the object; it pushes dynamic ones).
 * shape: box (default), ball, hull (convex hull of its vertices: GLBs) or mesh (exact triangles: fixed bodies only).
 */
export function attach(object, { world, body = "dynamic", shape = "box", mass, density = 1, friction = 0.6, restitution = 0.1, ccd = false, onContact } = {}) {
    if (!world) throw new Error("physics: attach needs { world } from createWorld()");
    if (shape === "mesh" && body === "dynamic") throw new Error("physics: a dynamic body can't be a mesh; use hull");
    const R = RAPIER, desc = body === "fixed" ? R.RigidBodyDesc.fixed() : body === "kinematic" ? R.RigidBodyDesc.kinematicPositionBased() : R.RigidBodyDesc.dynamic();
    const p = object.getWorldPosition(new THREE.Vector3()), q = object.getWorldQuaternion(new THREE.Quaternion());
    const rb = world.raw.createRigidBody(desc.setTranslation(p.x, p.y, p.z).setRotation(q).setCcdEnabled(ccd));
    const cd = collider(object, shape).setFriction(friction).setRestitution(restitution);
    if (mass !== undefined) cd.setMass(mass); else cd.setDensity(density);
    if (onContact) cd.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    const col = world.raw.createCollider(cd, rb);
    const self = {
        object, body: rb, collider: col, onContact, kinematic: body === "kinematic",
        // dynamic: the body moves the object; kinematic: the object moves the body (push() runs before each step)
        update() { if (body !== "dynamic") return; const t = rb.translation(), r = rb.rotation(); object.position.set(t.x, t.y, t.z); object.quaternion.set(r.x, r.y, r.z, r.w); },
        push() { object.getWorldPosition(p); object.getWorldQuaternion(q); rb.setNextKinematicTranslation(p); rb.setNextKinematicRotation(q); },
        impulse([x, y, z]) { rb.applyImpulse({ x, y, z }, true); },
        velocity(v) { if (v) rb.setLinvel({ x: v[0], y: v[1], z: v[2] }, true); const l = rb.linvel(); return [l.x, l.y, l.z]; },
        dispose() { world.bodies.delete(self); world.byCollider.delete(col.handle); world.raw.removeRigidBody(rb); },
    };
    world.bodies.add(self); world.byCollider.set(col.handle, self);
    return self;
}
