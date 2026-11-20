// physics-world: bodies settle, the walker is stopped by walls, climbs steps but not ledges, rides moving floors,
// shoves loose things, and carries what it's told to ignore.
import { test, expect } from "vitest";
import * as THREE from "three";
import { createWorld, attach, character } from "./physics-world.js";

const block = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d)); m.position.set(x, y, z); m.updateMatrixWorld(); return m; };
const run = (world, seconds, each = () => {}) => { for (let t = 0; t < seconds; t += 1 / 60) { each(); world.update(1 / 60); } };

test("a crate falls and rests on the floor", async () => {
    const world = await createWorld();
    attach(block(20, 1, 20, 0, -0.5, 0), { world, body: "fixed" });
    const crate = block(0.4, 0.4, 0.4, 0, 3, 0);
    attach(crate, { world });
    run(world, 3);
    expect(crate.position.y).toBeCloseTo(0.2, 1);
});

test("a remote set on a round table (a cylinder) stays on top", async () => {
    const world = await createWorld();
    attach(block(20, 1, 20, 0, -0.5, 0), { world, body: "fixed" });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.42, 48)); top.position.set(0, 0.21, 0); top.updateMatrixWorld();
    attach(top, { world, shape: "cylinder", density: 0.6 });
    const remote = block(0.05, 0.018, 0.18, 0.1, 0.6, 0);
    attach(remote, { world, mass: 0.05 });
    run(world, 3);
    expect(remote.position.y).toBeCloseTo(0.42 + 0.009, 2);
});

test("the walker stops at a wall, climbs a step, not a ledge", async () => {
    const world = await createWorld();
    attach(block(40, 1, 40, 0, -0.5, 0), { world, body: "fixed" });
    attach(block(1, 3, 10, 3, 1.5, 0), { world, body: "fixed" });           // wall at x 2.5
    const me = character(world, { position: [0, 0, 0], radius: 0.28, step: 0.45 });
    run(world, 2);                                                            // standing still doesn't sink it
    expect(Math.abs(me.position.y)).toBeLessThan(0.01);
    me.walk(2, 0); run(world, 3);
    expect(me.position.x).toBeLessThan(2.5 - 0.27);
    expect(me.position.x).toBeGreaterThan(2.0);

    attach(block(2, 0.3, 2, 0, 0.15, -4), { world, body: "fixed" });         // a 30 cm step
    attach(block(2, 0.8, 2, -5, 0.4, 0), { world, body: "fixed" });          // an 80 cm ledge
    me.teleport([0, 0, -1.6]); me.walk(0, -1.5); run(world, 2);
    expect(me.position.y).toBeCloseTo(0.3, 1);
    me.teleport([-2.5, 0, 0]); me.walk(-1.5, 0); run(world, 2);
    expect(me.position.y).toBeLessThan(0.05);
    expect(me.position.x).toBeGreaterThan(-4.0 - 0.27 - 0.01);
});

test("the walker rides a moving floor and shoves a loose box", async () => {
    const world = await createWorld();
    attach(block(40, 1, 40, 0, -0.5, 0), { world, body: "fixed" });
    const lift = block(2, 0.2, 2, 5, -0.1, 0);
    attach(lift, { world, body: "platform" });
    const me = character(world, { position: [5, 0, 0] });
    run(world, 0.5);
    run(world, 2, () => { lift.position.y += 1.5 / 60; me.ride(1.5 / 60); });     // up 3 m in 2 s
    expect(me.position.y).toBeCloseTo(3, 0);
    me.walk(0, 1.5); run(world, 0.5);                                         // and it can walk off the lift
    expect(me.position.z).toBeGreaterThan(0.5);
    me.walk(0, 0);

    const box = block(0.5, 0.5, 0.5, 1.2, 0.25, 0);
    attach(box, { world, density: 0.2 });
    me.teleport([0, 0, 0]); run(world, 0.3);
    me.walk(1.5, 0); run(world, 1.5);
    expect(box.position.x).toBeGreaterThan(1.5);
});

test("a carried box doesn't block its carrier, and flies when thrown", async () => {
    const world = await createWorld();
    attach(block(40, 1, 40, 0, -0.5, 0), { world, body: "fixed" });
    const me = character(world, { position: [0, 0, 0] });
    const box = block(0.4, 0.4, 0.4, 0.7, 0.2, 0);
    const held = attach(box, { world, density: 0.3 });
    run(world, 0.5);
    held.grab(); me.ignore(held.collider);
    me.walk(1.5, 0);
    run(world, 1, () => box.position.set(me.position.x + 0.3, 1.2, 0));          // held inside its reach
    expect(me.position.x).toBeGreaterThan(1.2);
    me.walk(0, 0);
    held.release([0, 2, -5]); me.unignore(held.collider);
    run(world, 0.3);
    expect(box.position.z).toBeLessThan(-0.5);
});

test("after any teleport the walker walks at full speed", async () => {
    const world = await createWorld();
    attach(block(80, 0.3, 80, 0, -0.15, 0), { world, body: "fixed" });
    const me = character(world, { position: [0, 0, 0] });
    for (let i = 0; i < 20; i++) {
        const x = i * 1.37 - 13, z = (i % 7) * 0.913 - 3;            // spots that don't round nicely
        me.teleport([x, 0, z]); me.walk(0, 1.5); run(world, 1);
        expect(me.position.z - z).toBeGreaterThan(1.2);
        me.walk(0, 0);
    }
});

test("the walker still shoves furniture at real weight (a 16 kg armchair)", async () => {
    const world = await createWorld();
    attach(block(40, 1, 40, 0, -0.5, 0), { world, body: "fixed" });
    const chair = block(0.8, 0.8, 0.8, 1.2, 0.4, 0);
    attach(chair, { world, mass: 16, friction: 0.7, damping: 1 });
    const me = character(world, { position: [0, 0, 0] });
    run(world, 0.3);
    me.walk(1.5, 0); run(world, 2);
    expect(chair.position.x).toBeGreaterThan(1.6);
});

test("a table lamp (weight in its base) rides a shoved side table instead of rocking off", async () => {
    const world = await createWorld();
    attach(block(20, 1, 20, 0, -0.5, 0), { world, body: "fixed" });
    const table = block(0.5, 0.5, 0.5, 0, 0.25, 0);
    attach(table, { world, mass: 6, friction: 0.7, damping: 1 });
    run(world, 1);
    // base, body, stem and a wide shade: its hull is mostly shade, so the hull alone puts the weight up in the air
    const lamp = new THREE.Group();
    for (const [r0, r1, h, y] of [[0.085, 0.085, 0.03, 0.015], [0.07, 0.07, 0.24, 0.15], [0.008, 0.008, 0.16, 0.35], [0.17, 0.19, 0.24, 0.47]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 24)); m.position.y = y; lamp.add(m); }
    lamp.position.set(0, 0.502, 0); lamp.updateMatrixWorld(true);
    attach(lamp, { world, shape: "hull", mass: 1.8, centerOfMass: [0, 0.08, 0], friction: 0.9, damping: 1 });
    run(world, 2);                                                            // resting: it stays put
    expect(Math.hypot(lamp.position.x, lamp.position.z)).toBeLessThan(0.01);
    const R = world.rapier, hand = world.raw.createRigidBody(R.RigidBodyDesc.kinematicVelocityBased().setTranslation(0, 0.3, -0.28));
    world.raw.createCollider(R.ColliderDesc.cuboid(0.08, 0.05, 0.02), hand);
    let t = 0;
    run(world, 3, () => { t += 1 / 60; hand.setLinvel({ x: 0, y: 0, z: table.position.z < 0.06 ? 0.2 * Math.min(1, t / 0.6) : 0 }, true); });
    expect(table.position.z).toBeGreaterThan(0.05);
    expect(lamp.position.y).toBeGreaterThan(0.49);
    expect(Math.abs(lamp.position.z - table.position.z)).toBeLessThan(0.02);
});

test("a contact reports how fast things met, not what's left after the bounce", async () => {
    const world = await createWorld();
    attach(block(20, 1, 20, 0, -0.5, 0), { world, body: "fixed" });
    const hits = [];
    attach(block(0.1, 0.1, 0.1, 0, 1.3, 0), { world, onContact: ({ speed }) => hits.push(speed) });   // drops 1.25 m: ~5 m/s
    run(world, 1.5);
    expect(hits[0]).toBeGreaterThan(4.5);
    expect(hits[0]).toBeLessThan(5.3);
});

test("settle: a can rolling on its side stops short, as rolling resistance would stop it", async () => {
    const roll = async (opts) => {
        const world = await createWorld();
        attach(block(40, 1, 40, 0, -0.5, 0), { world, body: "fixed" });
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 48)); can.rotation.x = Math.PI / 2; can.position.set(0, 0.1, 0); can.updateMatrixWorld();
        const b = attach(can, { world, shape: "hull", mass: 2, ...opts });
        b.body.setLinvel({ x: 0.25, y: 0, z: 0 }, true); b.body.setAngvel({ x: 0, y: 0, z: -2.5 }, true);
        run(world, 6);
        return { x: can.position.x, asleep: b.body.isSleeping() };
    };
    const free = await roll({}), settled = await roll({ settle: 5 });
    expect(settled.asleep).toBe(true);
    expect(settled.x).toBeLessThan(free.x * 0.7);   // stops in a shorter roll than it would on Rapier's frictionless rolling
});
