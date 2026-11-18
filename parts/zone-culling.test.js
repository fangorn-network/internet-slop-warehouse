// zone-culling: what's in another room hides, walls and outdoor things stay, movers and lights never hide.
import { test, expect } from "vitest";
import * as THREE from "three";
import { attach } from "./zone-culling.js";

// drawn: visible to a camera on layer 0, as three.js decides it (visible up the chain, and the layer)
const drawn = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return (o.layers.mask & 1) === 1; };

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
    expect([drawn(chair), drawn(mop), drawn(car), drawn(gold)]).toEqual([true, true, true, false]);
    expect([drawn(wall), drawn(lamp), drawn(walker)]).toEqual([true, true, true]); // the border, a light, a mover

    expect(zc.update(new THREE.Vector3(15, 1.6, 5))).toBe("vault");
    expect([drawn(gold), drawn(chair), drawn(car), drawn(wall)]).toEqual([true, false, false, true]);

    expect(zc.update(new THREE.Vector3(2, 1.6, 2))).toBe("closet"); // the smallest zone wins
    expect([drawn(mop), drawn(chair), drawn(car)]).toEqual([true, true, false]);

    const crate = box(15, 1, 4); scene.add(crate); // a late arrival gets bucketed
    zc.update(new THREE.Vector3(5, 1.6, 30));
    expect([drawn(crate), drawn(chair), drawn(car)]).toEqual([false, true, true]);
    expect(zc.stats()).toMatchObject({ lobby: 1, vault: 2, closet: 1, outside: 1, always: 3 });
});

test("a zone with no sees entry hides nothing, and the game's own visible is never touched", () => {
    const scene = new THREE.Scene(), zones = [{ name: "a", x0: 0, x1: 10, y0: 0, y1: 3, z0: 0, z1: 10 }, { name: "b", x0: 10, x1: 20, y0: 0, y1: 3, z0: 0, z1: 10 }];
    const breakfast = box(15, 1, 5), note = new THREE.Group(); note.add(box(14, 1, 4));
    breakfast.visible = false; // the game hides it until morning
    scene.add(breakfast, note);
    const zc = attach(scene, { zones, sees: { a: [], b: [] } });
    zc.update(new THREE.Vector3(5, 1, 5));                 // in a: b's things are culled
    expect([drawn(note.children[0]), breakfast.visible]).toEqual([false, false]);
    const late = box(14.5, 1, 4.5); note.add(late);         // streamed in while culled
    zc.update(new THREE.Vector3(15, 1, 5));                // back in b
    expect([drawn(note.children[0]), drawn(late), breakfast.visible]).toEqual([true, true, false]); // still the game's call
    zc.update(new THREE.Vector3(5, 1, 5));
    expect(drawn(late)).toBe(false);                       // a late child hides with its parent

    const open = attach(new THREE.Scene().add(box(15, 1, 5)), { zones, sees: {} });
    expect(open.update(new THREE.Vector3(5, 1, 5))).toBe("a");
});


test("a group across a border is split: its inside hides, its shell stays", () => {
    const scene = new THREE.Scene(), store = new THREE.Group();
    const shelf = box(15, 1, 5), sign = box(15, 1, 12), shell = box(10, 1.5, 5, 1);
    store.add(shelf, sign, shell);
    scene.add(store);
    const zc = attach(scene, { zones: [{ name: "lobby", x0: 0, x1: 10, y0: 0, y1: 3, z0: 0, z1: 10 }, { name: "shop", x0: 10, x1: 20, y0: 0, y1: 3, z0: 0, z1: 10 }],
        sees: { lobby: ["outside"], outside: ["lobby"], shop: ["outside"] } });
    zc.update(new THREE.Vector3(5, 1, 5));
    expect([drawn(store), drawn(shelf), drawn(sign), drawn(shell)]).toEqual([true, false, true, true]);
    const lot = box(5, 1, 5); lot.userData.zone = "outside"; scene.add(lot); // said, not measured
    zc.update(new THREE.Vector3(15, 1, 5));
    expect(drawn(lot)).toBe(true);
    zc.update(new THREE.Vector3(15, 1, 5.5));
    expect(drawn(shelf)).toBe(true);
});
