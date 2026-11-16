// Spawns things into a parent every few seconds, at random spots in an area, up to a maximum alive at once.
import * as THREE from "three";

export function attach(parent, {
    every = 2, max = 10, area = [20, 20], center = [0, 0, 0], y = 0, first = 0,
    make = () => new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshNormalMaterial()),
    where = () => new THREE.Vector3((Math.random() - 0.5) * area[0], y, (Math.random() - 0.5) * area[1]),
    onSpawn = () => {},
} = {}) {
    const alive = new Set();
    let clock = every - first;
    return {
        alive,
        /** forget a spawned thing (and take it out of the scene), so another may spawn */
        remove(o) { alive.delete(o); o.removeFromParent(); },
        update(dt) {
            clock += dt;
            while (clock >= every) {
                clock -= every;
                if (alive.size >= max) continue;
                const o = make(); o.position.copy(where()).add(new THREE.Vector3(...center));
                parent.add(o); alive.add(o); onSpawn(o);
            }
        },
        dispose() { for (const o of alive) o.removeFromParent(); alive.clear(); },
    };
}
