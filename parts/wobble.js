// Jelly squash-and-stretch on any object: poke() it and it boings back to its size on a damped spring.

export function attach(object, { stiffness = 120, damping = 8, amount = 0.35, onSettle = () => {} } = {}) {
    const base = object.scale.clone();
    let x = 0, v = 0, moving = false;
    return {
        /** kick the spring: positive squashes (flatter, wider), negative stretches */
        poke(strength = 1) { v -= strength * amount * 12; moving = true; },
        /** change the size it springs back to (grow or shrink it) */
        resize(s) { base.setScalar(s); },
        update(dt) {
            dt = Math.min(dt, 0.03);
            v += (-stiffness * x - damping * v) * dt; x += v * dt;
            object.scale.set(base.x * (1 - x * 0.5), base.y * (1 + x), base.z * (1 - x * 0.5));
            if (moving && Math.abs(x) < 1e-3 && Math.abs(v) < 1e-2) { moving = false; onSettle(object); }
        },
        dispose() { object.scale.copy(base); },
    };
}
