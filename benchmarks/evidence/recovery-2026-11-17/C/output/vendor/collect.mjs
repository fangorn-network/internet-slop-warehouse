// Pickups: items spin and bob until the collector comes near, then onCollect (default: remove the item).

export function attach(collector, {
    items = [], radius = 0.9, spin = 2.5, bob = 0.15,
    onCollect = (item) => item.removeFromParent(), onAll = () => {},
} = {}) {
    const left = new Set(items), base = new Map(items.map((i) => [i, i.position.y]));
    let t = 0;
    return {
        /** how many are still out there */
        get left() { return left.size; },
        update(dt) {
            t += dt;
            for (const item of left) {
                item.rotation.y += spin * dt;
                item.position.y = base.get(item) + Math.sin(t * 3 + base.get(item)) * bob;
                const dx = item.position.x - collector.position.x, dz = item.position.z - collector.position.z;
                const dy = item.position.y - (collector.position.y + 0.8);
                if (dx * dx + dy * dy + dz * dz < radius * radius) {
                    left.delete(item); onCollect(item, collector);
                    if (!left.size) onAll(collector);
                }
            }
        },
        dispose() { left.clear(); },
    };
}
