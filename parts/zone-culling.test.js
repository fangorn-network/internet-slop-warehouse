// zone-culling: what's in another room hides, walls and outdoor things stay, movers and lights never hide.
import { test, expect } from "vitest";
import * as THREE from "three";
import { attach } from "./zone-culling.js";

const box = (x, y, z, w = 0.5) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, w, w)); m.position.set(x, y, z); m.updateMatrixWorld(); return m; };

test("draws only the zones seen from where you stand", () => {
    const scene = new THREE.Scene();
    const zones = [{ name: "lobby", x0: 0, x1: 10, y0: 0, y1: 3, z0: 0, z1: 10 }, { name: "vault", x0: 10, x1: 20, y0: 0, y1: 3, z0: 0, z1: 10 },
        { name: "closet", x0: 1, x1: 3, y0: 0, y1: 3, z0: 1, z1: 3 }];
    const chair = box(5, 1, 5), gold = box(15, 1, 5), mop = box(2, 1, 2), wall = box(10, 1.5, 5, 1), car = box(5, 1, 30), lamp = new THREE.PointLight();
    const walker = box(15, 1, 6); walker.userData.moves = true;
    lamp.position.set(15, 2, 5);
    scene.add(chair, gold, mop, wall, car, lamp, walker);
    const zc = attach(scene, { zones, sees: { lobby: ["outside", "closet"], vault: [], closet: ["lobby"], outside: ["lobby"] } });

    expect(zc.update(new THREE.Vector3(5, 1.6, 5))).toBe("lobby");
    expect([chair.visible, mop.visible, car.visible, gold.visible]).toEqual([true, true, true, false]);
    expect([wall.visible, lamp.visible, walker.visible]).toEqual([true, true, true]); // the border, a light, a mover

    expect(zc.update(new THREE.Vector3(15, 1.6, 5))).toBe("vault");
    expect([gold.visible, chair.visible, car.visible, wall.visible]).toEqual([true, false, false, true]);

    expect(zc.update(new THREE.Vector3(2, 1.6, 2))).toBe("closet"); // the smallest zone wins
    expect([mop.visible, chair.visible, car.visible]).toEqual([true, true, false]);

    const crate = box(15, 1, 4); scene.add(crate); // a late arrival gets bucketed
    zc.update(new THREE.Vector3(5, 1.6, 30));
    expect([crate.visible, chair.visible, car.visible]).toEqual([false, true, true]);
    expect(zc.stats()).toMatchObject({ lobby: 1, vault: 2, closet: 1, outside: 1, always: 3 });
});

test("a zone with no sees entry hides nothing, and a distance culler's verdict stands", () => {
    const scene = new THREE.Scene(), far = box(15, 1, 5);
    far.userData.distanceCulled = true;
    scene.add(far);
    const zc = attach(scene, { zones: [{ name: "a", x0: 0, x1: 10, y0: 0, y1: 3, z0: 0, z1: 10 }, { name: "b", x0: 10, x1: 20, y0: 0, y1: 3, z0: 0, z1: 10 }], sees: {} });
    zc.update(new THREE.Vector3(5, 1, 5));
    expect(far.visible).toBe(false);
    far.userData.distanceCulled = false;
    zc.update(new THREE.Vector3(5, 1, 6)); // same zone: nothing recomputed, but nothing hidden by zones either
    expect(far.userData.zoneHidden).toBe(false);
});

test("a group across a border is split: its inside hides, its shell stays", () => {
    const scene = new THREE.Scene(), store = new THREE.Group();
    const shelf = box(15, 1, 5), sign = box(15, 1, 12), shell = box(10, 1.5, 5, 1);
    store.add(shelf, sign, shell);
    scene.add(store);
    const zc = attach(scene, { zones: [{ name: "lobby", x0: 0, x1: 10, y0: 0, y1: 3, z0: 0, z1: 10 }, { name: "shop", x0: 10, x1: 20, y0: 0, y1: 3, z0: 0, z1: 10 }],
        sees: { lobby: ["outside"], outside: ["lobby"], shop: ["outside"] } });
    zc.update(new THREE.Vector3(5, 1, 5));
    expect([store.visible, shelf.visible, sign.visible, shell.visible]).toEqual([true, false, true, true]);
    const lot = box(5, 1, 5); lot.userData.zone = "outside"; scene.add(lot); // said, not measured
    zc.update(new THREE.Vector3(15, 1, 5));
    expect(lot.visible).toBe(true);
    zc.update(new THREE.Vector3(15, 1, 5.5));
    expect(shelf.visible).toBe(true);
});
