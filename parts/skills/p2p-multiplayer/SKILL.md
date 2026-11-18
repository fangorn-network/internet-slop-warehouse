---
name: p2p-multiplayer
description: Add peer-to-peer co-op to a browser game with no server - encrypted WebRTC rooms over public relays, joined by a share link. Covers who owns what (host vs each peer), what to send and how often, validating untrusted peers, smoothing, deterministic worlds, and testing with two real browsers. Use when asked for multiplayer, co-op, "play with a friend", rooms or share links in a web game.
---

# Peer-to-peer multiplayer

A browser game can be multiplayer with no server of yours: browsers find each other through public relays (Trystero, the `trystero-027` part) and then talk directly over WebRTC. The room code carries its password, so only people with the link can read it. Two warehouse games ship this way with real-browser tests: Mosslight Commons (co-op building) and Escape from Slopov II (real-time shooter).

## 1. Pick the pattern by how fast the game changes

| game | pattern | part |
|---|---|---|
| turns, building, crafting, puzzles: changes a few times a second at most | **host-authoritative snapshot**. The host holds the whole state and replicates it; peers send *requests* ("place a plank"), which the host checks and applies. | `p2p-homestead` (Mosslight) |
| action: movement, shooting, AI | **split ownership**. Each peer owns its own avatar and streams its pose. The host owns everything else and streams it. Peers *ask* the host to change the world. | `p2p-room` (Slopov II's pattern) |

Don't stream a whole snapshot at 10 Hz for an action game (too big), and don't let every peer simulate the AI (they disagree within seconds).

## 2. Ownership, written down before any code

For every thing that changes, one peer owns it. Everyone else only displays it.

| thing | owner | channel | rate |
|---|---|---|---|
| my avatar: position, heading, animation state, held item | me | `pose`, from any | 12 Hz |
| AI, doors, pickups, score, round state | host | `world`, from host | 10 Hz, plus on change |
| "I hit actor 7", "I picked up the key" | asker → host | `hit` / `use`, from any | on event |
| effects anyone can see (a shot's tracer, a sound) | the one who did it | `shot`, from any | on event |
| level geometry, props, terrain | nobody | not sent: built from a shared seed | — |

A hit is a request. The guest says "I hit 7 in the head with ammo X". The host checks it (is 7 alive, in range, was a shot plausible) and applies the damage, then the next `world` message shows the result. Nobody but the host ever *writes* host-owned state.

## 3. Wiring `p2p-room`

```js
const transport = await logic('trystero-027');
const P = await logic('p2p-room');
const room = await P.connect(transport, { app: 'my-game.v1', host: !joinCode, code: joinCode }); // joinCode from ?room= in WAREHOUSE_URL
share(P.shareLink(window.WAREHOUSE_URL, room.code));        // a link, and a QR code for phones

const finite = (d) => Array.isArray(d) && d.every(Number.isFinite);
const pose = room.channel('pose', { validate: (d) => finite(d) && d.length === 4, limitHz: 20 });
const world = room.channel('world', { from: 'host', validate: (d) => Array.isArray(d?.a) });
const hit = room.channel('hit', { validate: (d) => Number.isInteger(d?.n) && actors.has(d.n), limitHz: 15 });

const tick = P.every(12), worldTick = P.every(10);
// in the frame loop:
if (tick(dt)) pose.send([P.q(me.x), P.q(me.z), P.q(me.yaw), me.moving ? 1 : 0]);
if (room.isHost && worldTick(dt)) world.send({ a: [...actors].map(([n, a]) => [n, P.q(a.x), P.q(a.z), P.q(a.yaw), a.state]) });
for (const r of remotes.values()) { r.x = P.approach(r.x, r.tx, dt); r.z = P.approach(r.z, r.tz, dt); r.yaw = P.approachAngle(r.yaw, r.tyaw, dt); }

pose.on(([x, z, yaw, moving], id) => { const r = remote(id); r.tx = x; r.tz = z; r.tyaw = yaw; r.moving = moving; });
hit.on((d, id) => room.isHost && damage(actors.get(d.n), remotes.get(id)));
room.onLeave((id) => dropRemote(id));
room.onHostLeft(() => say('The host left. You can keep playing solo.'));
```

Rules that keep it working:

- **Send arrays of rounded numbers**, not objects. `[1.23, 4.5, 0.78, 1]` is a fraction of `{"x":1.23456789,…}`. Send ids, not names.
- **Send from the frame loop, not a timer** (`every(hz)`), so a hidden tab stops sending and simulating together.
- **Ease toward what you receive** (`approach`, rate about 10–12). Snap instead when the distance is big (a respawn or teleport).
- **Validate everything a peer sends.** Check the shape, finite numbers, ids that exist and plausible values: clamp a pose that moved faster than anyone can run. `limitHz` drops floods. Peers are other people's browsers.
- **Seed the world.** Every peer builds the same level from the same seed and the same parts. Never sync static geometry.
- **Say what's happening.** "Opening an encrypted room…", "Finding host via public relays…", "2/4 here", "Host left". Connecting takes 2–15 s.

## 4. In the warehouse player

Games run in a sandboxed iframe (scripts only, an opaque origin), and WebRTC works there. The page hands the game `window.WAREHOUSE_URL`, so `shareLink(WAREHOUSE_URL, code)` builds a link that reopens this game and joins the room (`?part=…&room=…`). On load, read `?room=` from `WAREHOUSE_URL` and join automatically.

## 5. Test with two real browsers

1. **Logic without a network.** Give `connect` an in-memory transport (`parts/p2p-room.test.js` has a 30-line fake shaped like Trystero) and test joining, ownership, validation and leaving in vitest.
2. **Real WebRTC.** Two Playwright pages, the host's code passed to the guest, then assert the guest sees the host's world and both see each other's poses (`scripts/test-p2p-room.mjs`, `scripts/test-slopov-ii-p2p.mjs`). Allow 90 s for relays.
3. Then two real devices on different networks (a phone on mobile data plus a laptop), since the strict-NAT case only shows up there.

## Limits to say out loud

- **The host is the session.** If the host leaves, the room ends. There's no host migration, so keep sessions short or save progress locally.
- **No TURN server**, so a few strict networks (some corporate, some mobile carriers) can't connect. Tell the player, and offer solo.
- **Peer-owned state can be faked.** Someone can claim to be anywhere. That's fine for co-op among friends. For anything competitive, the host must check movement too, and real anti-cheat needs a server.
- **Up to 4–6 players.** Every peer connects to every other, so bandwidth grows with the square of the player count.
