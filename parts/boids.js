// Flocking: a swarm of objects that keep apart, line up and stick together, and drift toward a target if given.
import * as THREE from "three";

export function attach(members, {
    target = null, speed = 3, sight = 2.5, separation = 1.5, alignment = 1, cohesion = 1, seek = 0.8,
    bounds = 15, height = null, touch = 0.8,
    steer = () => null, onTouch = () => {},
} = {}) {
    const flock = [...members], vel = new Map(flock.map((m) => [m, new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).setLength(speed)]));
    const sep = new THREE.Vector3(), ali = new THREE.Vector3(), coh = new THREE.Vector3(), f = new THREE.Vector3(), tmp = new THREE.Vector3();
    const touching = new Set();
    return {
        flock,
        add(m) { flock.push(m); vel.set(m, new THREE.Vector3(1, 0, 0).setLength(speed)); },
        remove(m) { flock.splice(flock.indexOf(m), 1); vel.delete(m); touching.delete(m); },
        update(dt) {
            dt = Math.min(dt, 0.05);
            for (const m of flock) {
                sep.set(0, 0, 0); ali.set(0, 0, 0); coh.set(0, 0, 0); let n = 0;
                for (const o of flock) {
                    if (o === m) continue;
                    const d = m.position.distanceTo(o.position);
                    if (d > sight) continue;
                    n++; ali.add(vel.get(o)); coh.add(o.position);
                    if (d < sight / 2) sep.add(tmp.subVectors(m.position, o.position).divideScalar(d * d + 1e-3));
                }
                f.set(0, 0, 0).addScaledVector(sep, separation);
                if (n) { f.addScaledVector(ali.divideScalar(n).sub(vel.get(m)), alignment * 0.3); f.addScaledVector(coh.divideScalar(n).sub(m.position), cohesion * 0.3); }
                if (target) f.addScaledVector(tmp.subVectors(target.position, m.position).normalize(), seek * speed);
                if (m.position.length() > bounds) f.addScaledVector(m.position, -0.2); // turn back at the edge
                const extra = steer(m, flock, target); if (extra) f.add(extra);
                const v = vel.get(m).addScaledVector(f, dt);
                if (height != null) v.y = 0;
                v.clampLength(speed * 0.4, speed);
                m.position.addScaledVector(v, dt);
                if (height != null) m.position.y = height;
                m.lookAt(tmp.copy(m.position).add(v));
                if (target) {
                    const now = m.position.distanceTo(target.position) < touch;
                    if (now && !touching.has(m)) onTouch(m, target);
                    if (now) touching.add(m); else touching.delete(m);
                }
            }
        },
        dispose() { flock.length = 0; vel.clear(); },
    };
}
