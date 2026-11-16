// A grove of procedural low-poly trees (cone pines and blob broadleaves) scattered over an area, swaying in the wind.
import * as THREE from "three";

/** A seeded random in [0, 1): the same seed grows the same grove. */
export const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** One tree as a Group, its feet at the origin. */
export function makeTree(rand = Math.random, { leaves = [0x3f8f3a, 0x5aa642, 0x2e6b34, 0x8bbf3f], trunk = 0x6b4a2b } = {}) {
    const g = new THREE.Group(), flat = { flatShading: true };
    const h = 1.2 + rand() * 1.6, pine = rand() < 0.5;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, h, 6), new THREE.MeshLambertMaterial({ color: trunk, ...flat }));
    t.position.y = h / 2; g.add(t);
    const mat = new THREE.MeshLambertMaterial({ color: leaves[Math.floor(rand() * leaves.length)], ...flat });
    if (pine) for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.22, 1.1, 7), mat); c.position.y = h + i * 0.55; g.add(c);
    } else for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + rand() * 0.35, 0), mat);
        b.position.set((rand() - 0.5) * 0.7, h + 0.3 + rand() * 0.5, (rand() - 0.5) * 0.7); g.add(b);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    return g;
}

export function attach(parent, {
    count = 40, area = [30, 30], center = [0, 0, 0], seed = 7, scale = [0.8, 1.6], sway = 0.03, clear = 0,
    place = (rand, i) => new THREE.Vector3((rand() - 0.5) * area[0], 0, (rand() - 0.5) * area[1]),
    grow = (rand) => makeTree(rand),
} = {}) {
    const rand = rng(seed), trees = [];
    while (trees.length < count) {
        const p = place(rand, trees.length).add(new THREE.Vector3(...center));
        if (Math.hypot(p.x - center[0], p.z - center[2]) < clear) continue; // keep a clearing in the middle
        const tree = grow(rand); tree.position.copy(p); tree.rotation.y = rand() * Math.PI * 2;
        tree.scale.setScalar(scale[0] + rand() * (scale[1] - scale[0])); tree.userData.phase = rand() * 10;
        parent.add(tree); trees.push(tree);
    }
    let t = 0;
    return {
        trees,
        update(dt) { t += dt; for (const tr of trees) tr.rotation.z = Math.sin(t * 1.3 + tr.userData.phase) * sway; },
        dispose() { for (const tr of trees) tr.removeFromParent(); },
    };
}
