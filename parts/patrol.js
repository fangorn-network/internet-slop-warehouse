// Walk a loop of waypoints; when the target comes within sight, ask onSee which way to go (default: chase).
import * as THREE from "three";

/** The default onSee: straight at the target. */
export function chase(self, target) {
    return new THREE.Vector3().subVectors(target.position, self.position).setY(0).normalize();
}

export function attach(object, {
    points = [], target = null, speed = 2, alertSpeed = 3.5, sight = 6, touch = 0.9,
    onSee = chase, onTouch = () => {},
} = {}) {
    const hooks = { onSee, onTouch }; // swap these at any time: handle.hooks.onSee = somethingElse
    let next = 0, touching = false, alert = false;
    const step = (dir, v, dt) => {
        object.position.addScaledVector(dir, v * dt);
        if (dir.lengthSq()) object.rotation.y = Math.atan2(dir.x, dir.z);
    };
    return {
        hooks,
        /** true while the target is in sight */
        get alert() { return alert; },
        update(dt) {
            dt = Math.min(dt, 0.05);
            const d = target ? object.position.distanceTo(target.position) : Infinity;
            alert = d < sight;
            const dir = alert ? hooks.onSee(object, target) : null;
            if (dir) step(dir, alertSpeed, dt);
            else if (points.length) {
                const to = new THREE.Vector3().subVectors(points[next], object.position).setY(0);
                if (to.length() < 0.2) next = (next + 1) % points.length;
                else step(to.normalize(), speed, dt);
            }
            const now = d < touch;
            if (now && !touching) hooks.onTouch(object, target);
            touching = now;
        },
        dispose() {},
    };
}
