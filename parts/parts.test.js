// The seed logic parts, driven headlessly: a player walks, is blocked, jumps a crate, collects; a guard chases,
// flees with the flee-on-see override, touches; falling calls onFall.
import { test } from "vitest";
import assert from "node:assert";
import * as THREE from "three";
import * as ctl from "./platformer-controller.js";
import * as patrol from "./patrol.js";
import * as flee from "./flee-on-see.js";
import * as collect from "./collect.js";
const bus = new EventTarget();
globalThis.addEventListener = bus.addEventListener.bind(bus); globalThis.removeEventListener = bus.removeEventListener.bind(bus);
const key = (type, code) => { const e = new Event(type); e.code = code; e.preventDefault = () => {}; bus.dispatchEvent(e); };

test("platformer-controller, collect, patrol and flee-on-see", () => {
    const box = (x, y, z, w, h, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d)); m.position.set(x, y - h / 2, z); m.updateMatrixWorld(); return m; };
    const ground = box(0, 0, 0, 60, 2, 60), crate = box(0, 1, -3, 1.2, 1, 1.2);
    const player = new THREE.Object3D(); player.position.set(0, 2, 0);
    let jumps = 0, lands = 0;
    const c = ctl.attach(player, { solids: [ground, crate], onJump: () => jumps++, onLand: () => lands++ });
    for (let i = 0; i < 60; i++) c.update(1 / 60);
    assert(c.grounded && Math.abs(player.position.y) < 1e-9, "falls and lands on the ground"); assert.equal(c.state, "idle");
    key("keydown", "KeyW"); for (let i = 0; i < 60; i++) c.update(1 / 60);
    assert(player.position.z > -2.5 && player.position.z < -1.5, `blocked by the crate, z=${player.position.z}`); assert.equal(c.state, "walk");
    key("keydown", "Space"); for (let i = 0; i < 40; i++) { c.update(1 / 60);  } key("keyup", "Space");
    for (let i = 0; i < 60; i++) c.update(1 / 60);
    assert(jumps >= 1 && lands >= 2, "jumped and landed");
    key("keyup", "KeyW");
    const coin = new THREE.Object3D(); coin.position.set(0, 1, player.position.z - 3); new THREE.Scene().add(coin);
    let got = 0, all = 0;
    const col = collect.attach(player, { items: [coin], onCollect: (i) => { got++; i.removeFromParent(); }, onAll: () => all++ });
    key("keydown", "KeyW"); for (let i = 0; i < 120 && !got; i++) { c.update(1 / 60); col.update(1 / 60); } key("keyup", "KeyW");
    assert(got === 1 && all === 1 && col.left === 0 && !coin.parent, "collected the coin");
    // patrol: chases when the target is in sight, flees with the override, touches
    const guard = new THREE.Object3D(), target = new THREE.Object3D(); guard.position.set(5, 0, 0);
    let touched = 0;
    const g = patrol.attach(guard, { points: [new THREE.Vector3(5, 0, 0), new THREE.Vector3(5, 0, 5)], target, sight: 6, onTouch: () => touched++ });
    g.update(0.05); const d0 = guard.position.distanceTo(target.position);
    assert(g.alert && d0 < 5, "chases"); g.hooks.onSee = flee.onSee;
    for (let i = 0; i < 10; i++) g.update(0.05); assert(guard.position.distanceTo(target.position) > d0, "flees with the override");
    g.hooks.onSee = patrol.chase; for (let i = 0; i < 100; i++) g.update(0.05); assert.equal(touched, 1, "touches once");
    // falling off the world calls onFall (default: back to spawn)
    const p2 = new THREE.Object3D(); p2.position.set(0, 5, 100); let fell = 0;
    const c2 = ctl.attach(p2, { solids: [ground], onFall: (o, spawn) => { fell++; o.position.copy(spawn).setY(-1e9); } });
    for (let i = 0; i < 200 && !fell; i++) c2.update(1 / 60); assert.equal(fell, 1, "onFall fires below y=-20");
});

test("boids, spawner, wobble and low-poly-trees", async () => {
    const boids = await import("./boids.js"), spawner = await import("./spawner.js"), wobble = await import("./wobble.js"), trees = await import("./low-poly-trees.js");
    // A flock seeks the target and touches it once per arrival.
    const target = new THREE.Object3D(); target.position.set(8, 0, 0);
    const flock = Array.from({ length: 5 }, (_, i) => { const o = new THREE.Object3D(); o.position.set(-5, 0, i); return o; });
    let touches = 0;
    const b = boids.attach(flock, { target, seek: 3, height: 0, onTouch: () => touches++ });
    for (let i = 0; i < 600; i++) b.update(1 / 60);
    assert(flock.some((o) => o.position.distanceTo(target.position) < 2), "the flock reached the target");
    assert(touches > 0 && flock.every((o) => o.position.y === 0));
    // The spawner caps what's alive, and remove() frees a slot.
    const parent = new THREE.Object3D(), s = spawner.attach(parent, { every: 1, max: 3 });
    for (let i = 0; i < 10; i++) s.update(1);
    assert.equal(s.alive.size, 3); assert.equal(parent.children.length, 3);
    s.remove([...s.alive][0]); s.update(1); assert.equal(s.alive.size, 3);
    // A poked wobble squashes, then settles back to its (resized) scale.
    const blob = new THREE.Object3D(); let settled = 0;
    const w = wobble.attach(blob, { onSettle: () => settled++ });
    w.poke(); w.update(0.02); assert(blob.scale.y < 1, "squashed");
    w.resize(2); for (let i = 0; i < 400; i++) w.update(1 / 60);
    assert.equal(settled, 1); assert(Math.abs(blob.scale.y - 2) < 0.01);
    // The same seed grows the same grove, keeping the clearing clear.
    const g = (seed) => trees.attach(new THREE.Object3D(), { count: 20, seed, clear: 5 }).trees.map((t) => t.position.toArray().join());
    assert.deepEqual(g(3), g(3)); assert.notDeepEqual(g(3), g(4));
    assert(trees.attach(new THREE.Object3D(), { count: 20, clear: 5 }).trees.every((t) => Math.hypot(t.position.x, t.position.z) >= 5));
});
