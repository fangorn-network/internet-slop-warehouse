// CC0. No DOM or engine dependency. Select using distance and eligibility, then invoke explicitly.
export function attach(object, { targets = [], radius = 2, cooldown = 0.2,
    distance = (a,b) => Math.hypot(a.position.x-b.position.x, (a.position.z ?? a.position.y)-(b.position.z ?? b.position.y)),
    canInteract = () => true, onFocus = () => {}, onInteract = () => {},
} = {}) {
    if (!Number.isFinite(radius) || radius < 0 || !Number.isFinite(cooldown) || cooldown < 0) throw new RangeError('Invalid interaction options');
    let focus = null, remaining = 0, disposed = false;
    function pick() {
        let next = null, best = radius;
        for (const target of targets) {
            if (!canInteract(target, object)) continue;
            const d = distance(object, target);
            if (Number.isFinite(d) && d>=0 && d<=best) { if (d<best || !next) { next=target; best=d; } }
        }
        if (next !== focus) { const previous=focus; focus=next; onFocus(next, previous, object); }
    }
    return {
        get focus() { return focus; },
        update(dt) { if (disposed) return; if (Number.isFinite(dt)&&dt>0) remaining=Math.max(0,remaining-dt); pick(); },
        interact() {
            if (disposed || remaining>0) return false;
            pick(); if (!focus) return false;
            remaining=cooldown; onInteract(focus, object); return true;
        },
        dispose() { disposed=true; if (focus) { const old=focus; focus=null; onFocus(null,old,object); } },
    };
}
