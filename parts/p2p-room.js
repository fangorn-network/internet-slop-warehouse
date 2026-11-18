// SPDX-License-Identifier: CC0-1.0
// p2p-room: the real-time co-op pattern from Escape from Slopov II, as a part. Up to N browsers in an encrypted
// WebRTC room (Trystero over public relays, no server of yours), joined by a share link.
//
// The architecture it encodes:
// - Each peer owns its own avatar and says where it is (`poses`, ~12 Hz, small arrays, rounded numbers).
// - The host owns everything else that moves or decides (AI, pickups, doors, score) and sends it out (~10 Hz).
// - A peer asks the host to change the world (a hit, a pickup) over a `from: 'any'` channel; the host checks it and
//   applies it. Peers never trust each other's claims about the world: validate every message.
// - Everyone eases what they receive toward its latest value (`approach`), so 10 Hz looks smooth at 60 fps.
// - The static world is never sent: build it from the same seed on every peer.
// ponytail: no host migration; when the host leaves, the room is over (onHostLeft). Add it when sessions run long.
// ponytail: public relays and no TURN server: a few strict networks (some corporate, some mobile carriers) can't connect.

/** The room code (or the whole share link) → the code. */
export const roomFrom = (v) => { v = String(v ?? "").trim(); try { return new URL(v).searchParams.get("room") ?? v; } catch { return v; } };
/** A link to this game that joins `code`. In a warehouse game, pageURL is window.WAREHOUSE_URL. */
export const shareLink = (pageURL, code) => { if (!pageURL) return code; const u = new URL(pageURL); u.searchParams.set("room", code); return u.href; };
/** Round for the wire: 2 decimals is centimetres, enough for positions; it halves message size. */
export const q = (n, places = 2) => +n.toFixed(places);
/** Ease `from` toward `to`: framerate-independent, `rate` per second (12 ≈ settles in a quarter second). */
export const approach = (from, to, dt, rate = 12) => from + (to - from) * (1 - Math.exp(-rate * dt));
/** The same for angles, the short way round. */
export const approachAngle = (from, to, dt, rate = 12) => { const d = Math.atan2(Math.sin(to - from), Math.cos(to - from)); return from + d * (1 - Math.exp(-rate * dt)); };

/**
 * connect(transport, { app, host, code, maxUsers, relayConfig }) → Promise<room>
 * transport: the trystero-027 part (its joinRoom and roles). app: a stable id for your game, e.g. "my-game.v1".
 * host: true opens a new room; false joins `code` (a share link works too).
 * room: { id, hostId, isHost, code, peers, channel(name, opts), onJoin(cb), onLeave(cb), onHostLeft(cb), leave() }
 */
export async function connect(transport, { app, host = false, code = "", maxUsers = 4, relayConfig } = {}) {
    const pieces = roomFrom(code).split("/");
    if (!host && (pieces.length !== 2 || !pieces[0].includes("~") || pieces[1].length < 8)) throw new Error("That is not a whole share link or room code.");
    const random = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => n.toString(16).padStart(2, "0")).join("");
    const password = host ? random() : pieces[1]; // the code carries the password: only people with the link can read the room
    const raw = transport.joinRoom({ appId: app, identity: "none", password, maxUsers, use: [transport.roles(host ? { selfAsAdmin: true } : {})], ...(relayConfig ? { relayConfig } : {}) },
        host ? `${app.replace(/\W/g, "")}-${random()}` : pieces[0]);
    const self = await raw.getSelf();
    const hostId = host ? self.userId : self.roomId.split("~").at(-1);
    const peers = new Set(), joins = [], leaves = [], hostLeft = [];
    raw.onUserJoin?.(({ userId }) => { peers.add(userId); for (const f of joins) f(userId); });
    raw.onUserLeave?.(({ userId }) => { peers.delete(userId); for (const f of leaves) f(userId); if (userId === hostId) for (const f of hostLeft) f(); });
    return {
        id: self.userId, hostId, isHost: host, code: `${self.roomId}/${password}`, peers, raw,
        /**
         * A named message channel. from: "host" drops anything not sent by the host (world state), "any" takes all
         * (poses, requests). validate(data, userId) → boolean drops malformed or impossible messages. limitHz drops a
         * sender's messages that arrive faster than that (a flood, or a cheat).
         * → { send(data, target?), on(cb(data, userId)) }
         */
        channel(name, { from = "any", validate = () => true, limitHz = 30 } = {}) {
            const action = raw.makeAction(name), last = new Map(), gap = 1000 / limitHz;
            return {
                send: (data, target) => action.send(data, target ? { target } : {}).catch(() => {}),
                on: (cb) => action.onMessage((data, { userId }) => {
                    if (from === "host" && userId !== hostId) return;
                    const now = performance.now();
                    if (now - (last.get(userId) ?? -Infinity) < gap * 0.8) return; // 0.8: timers jitter
                    last.set(userId, now);
                    let ok = false; try { ok = validate(data, userId); } catch { /* malformed */ }
                    if (ok) cb(data, userId);
                }),
            };
        },
        onJoin: (f) => joins.push(f), onLeave: (f) => leaves.push(f), onHostLeft: (f) => hostLeft.push(f),
        leave: () => raw.leave(),
    };
}

/**
 * Send something every 1/hz seconds from your frame loop, not from a timer (a hidden tab stops both, together).
 * every(hz) → (dt) → boolean: true when it's time.
 */
export const every = (hz) => { let t = 0; return (dt) => ((t -= dt) <= 0 ? ((t = 1 / hz), true) : false); };
