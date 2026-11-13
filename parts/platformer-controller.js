// Run and jump on boxes: keyboard (WASD/arrows, space), gravity, and box collision against `solids`.
import * as THREE from "three";

export function attach(object, {
    solids = [], speed = 5, runSpeed = 9, jump = 9, gravity = 25, size = [0.7, 1.6], camera = null,
    onJump = () => {}, onLand = () => {}, onFall = (o, spawn) => o.position.copy(spawn),
} = {}) {
    const keys = new Set(), vel = new THREE.Vector3(), spawn = object.position.clone();
    const down = (e) => { keys.add(e.code); if (e.code === "Space") e.preventDefault(); }, up = (e) => keys.delete(e.code);
    addEventListener("keydown", down); addEventListener("keyup", up);
    const boxes = solids.map((s) => new THREE.Box3().setFromObject(s));
    const me = new THREE.Box3(), [w, h] = size, move = new THREE.Vector3(), fwd = new THREE.Vector3();
    let grounded = false, state = "idle";
    // Box3 counts touching as intersecting: sideways, the body starts a hair above the feet, so standing on a box isn't
    // walking into it; up and down it doesn't, so landing is caught the moment the feet reach the top
    const hit = (p, lift = 0) => {
        me.min.set(p.x - w / 2, p.y + lift, p.z - w / 2); me.max.set(p.x + w / 2, p.y + h, p.z + w / 2);
        return boxes.find((b) => b.intersectsBox(me));
    };

    return {
        velocity: vel,
        get grounded() { return grounded; },
        /** "idle" | "walk" | "run" | "jump": what an animator should play. */
        get state() { return state; },
        update(dt) {
            dt = Math.min(dt, 0.05);
            const k = (...c) => c.some((x) => keys.has(x));
            move.set((k("KeyD", "ArrowRight") ? 1 : 0) - (k("KeyA", "ArrowLeft") ? 1 : 0), 0, (k("KeyS", "ArrowDown") ? 1 : 0) - (k("KeyW", "ArrowUp") ? 1 : 0));
            if (camera && move.lengthSq()) { // relative to where the camera looks, flattened
                camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
                const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
                move.set(right.x * move.x - fwd.x * move.z, 0, right.z * move.x - fwd.z * move.z);
            }
            const running = k("ShiftLeft", "ShiftRight"), v = running ? runSpeed : speed;
            if (move.lengthSq()) { move.normalize(); object.rotation.y = Math.atan2(move.x, move.z); }
            vel.x = move.x * v; vel.z = move.z * v;
            if (grounded && keys.has("Space")) { vel.y = jump; grounded = false; onJump(object); }
            vel.y -= gravity * dt;

            const p = object.position;
            for (const axis of ["x", "z"]) { const was = p[axis]; p[axis] += vel[axis] * dt; if (hit(p, 0.01)) p[axis] = was; }
            const wasGrounded = grounded; grounded = false;
            p.y += vel.y * dt;
            const b = hit(p);
            if (b) {
                if (vel.y <= 0) { p.y = b.max.y; grounded = true; if (!wasGrounded) onLand(object); }
                else p.y = b.min.y - h;
                vel.y = 0;
            }
            if (p.y < -20) { vel.set(0, 0, 0); onFall(object, spawn); }
            state = !grounded ? "jump" : move.lengthSq() ? (running ? "run" : "walk") : "idle";
        },
        dispose() { removeEventListener("keydown", down); removeEventListener("keyup", up); },
    };
}
