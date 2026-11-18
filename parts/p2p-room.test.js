// p2p-room over an in-memory transport shaped like trystero-027: joining by code, host-only channels, validation,
// flood limits, leaving, and the smoothing helpers.
import { test, expect, vi } from "vitest";
import { connect, attach, roomFrom, shareLink, approach, approachAngle, every, q } from "./p2p-room.js";

function fakeNet() { // rooms by id; each peer gets actions that deliver to the others
    const rooms = new Map();
    let n = 0;
    const transport = {
        roles: () => ({}),
        joinRoom({ password }, roomId) {
            const id = `peer${++n}`, fullId = roomId.includes("~") ? roomId : `${roomId}~${id}`;
            const room = rooms.get(fullId) ?? rooms.set(fullId, { password, peers: new Map() }).get(fullId);
            if (room.password !== password) throw new Error("bad password");
            const me = { joins: [], leaves: [], actions: new Map() };
            for (const p of room.peers.values()) { for (const f of p.joins) f({ userId: id }); }
            const others = [...room.peers.keys()];
            room.peers.set(id, me);
            return {
                getSelf: async () => ({ userId: id, roomId: fullId }),
                onUserJoin: (f) => { me.joins.push(f); for (const o of others) f({ userId: o }); },
                onUserLeave: (f) => me.leaves.push(f),
                makeAction(name) {
                    const subs = []; me.actions.set(name, subs);
                    return {
                        onMessage: (f) => subs.push(f),
                        send: async (data, { target } = {}) => { for (const [pid, p] of room.peers) if (pid !== id && (!target || target === pid)) for (const f of p.actions.get(name) ?? []) f(structuredClone(data), { userId: id }); },
                    };
                },
                leave: async () => { room.peers.delete(id); for (const p of room.peers.values()) for (const f of p.leaves) f({ userId: id }); },
            };
        },
    };
    return transport;
}

test("a guest joins by share link; poses go both ways; world state only from the host", async () => {
    const t = fakeNet();
    const host = await connect(t, { app: "test.v1", host: true });
    const link = shareLink("https://warehouse.example/?part=0xabc/game", host.code);
    expect(roomFrom(link)).toBe(host.code);
    const guest = await connect(t, { app: "test.v1", code: link });
    const other = await connect(t, { app: "test.v1", code: host.code });
    expect(guest.hostId).toBe(host.id);
    expect([...host.peers].sort()).toEqual([guest.id, other.id].sort());

    const poseOk = (d) => Array.isArray(d) && d.length === 3 && d.every(Number.isFinite);
    const [hp, gp] = [host, guest].map((r) => r.channel("pose", { validate: poseOk }));
    const got = [];
    hp.on((d, from) => got.push(["host", from, d]));
    gp.on((d, from) => got.push(["guest", from, d]));
    await gp.send([q(1.234), 0, q(3.14159)]);
    await hp.send([5, 0, 1]);
    expect(got).toEqual([["host", guest.id, [1.23, 0, 3.14]], ["guest", host.id, [5, 0, 1]]]);

    const worldAt = (r) => r.channel("world", { from: "host" }), seen = [];
    worldAt(guest).on((d) => seen.push(d));
    const fromOther = worldAt(other);
    await fromOther.send({ fake: "world" }); // another guest can't speak for the host
    await worldAt(host).send({ actors: [] });
    expect(seen).toEqual([{ actors: [] }]);
});

test("malformed messages and floods are dropped; the host leaving ends the room", async () => {
    const t = fakeNet();
    const host = await connect(t, { app: "test.v1", host: true });
    const guest = await connect(t, { app: "test.v1", code: host.code });
    const hits = [];
    host.channel("hit", { validate: (d) => Number.isInteger(d?.target), limitHz: 10 }).on((d) => hits.push(d));
    const send = guest.channel("hit").send;
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(1000); await send({ target: "everyone" }); // malformed (and it counts toward the limit)
    now.mockReturnValue(1200); await send({ target: 3 });
    now.mockReturnValue(1209); await send({ target: 4 });          // 9 ms later: a flood
    now.mockReturnValue(1400); await send({ target: 5 });
    now.mockRestore();
    expect(hits).toEqual([{ target: 3 }, { target: 5 }]);

    let over = false;
    guest.onHostLeft(() => { over = true; });
    await host.leave();
    expect(over).toBe(true);
    await expect(connect(t, { app: "test.v1", code: "not-a-code" })).rejects.toThrow(/share link/);
});

test("smoothing is framerate-independent and takes the short way round", () => {
    let a = 0, b = 0;
    for (let i = 0; i < 60; i++) a = approach(a, 10, 1 / 60);
    for (let i = 0; i < 30; i++) b = approach(b, 10, 1 / 30);
    expect(a).toBeCloseTo(b, 6);
    expect(a).toBeGreaterThan(9.99);
    expect(approachAngle(3.0, -3.0, 1, 100)).toBeCloseTo(-3.0 + 2 * Math.PI, 3); // across ±π, not through 0
    const tick = every(10);
    expect([tick(0.01), tick(0.05), tick(0.06), tick(0.01)]).toEqual([true, false, true, false]);
});

test("attach: the pose loop sends on schedule and stops when disposed", async () => {
    const t = fakeNet();
    const host = await connect(t, { app: "test.v1", host: true }), guest = await connect(t, { app: "test.v1", code: host.code });
    const seen = [];
    attach(host, { mine: () => [0, 0], onPose: (d, id) => seen.push([id, d]) });
    let x = 0;
    const loop = attach(guest, { mine: () => [q(x), 0], hz: 10 });
    const now = vi.spyOn(performance, "now");
    for (let i = 0; i < 30; i++) { x += 0.1; now.mockReturnValue(i * 1000 / 60); loop.update(1 / 60); } // half a second
    await Promise.resolve();
    expect(seen.length).toBe(5);
    expect(seen[0]).toEqual([guest.id, [0.1, 0]]);
    loop.dispose(); loop.update(1);
    now.mockRestore();
    expect(seen.length).toBe(5);
});
