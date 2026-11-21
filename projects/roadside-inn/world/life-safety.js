// SPDX-License-Identifier: CC0-1.0
// Life-safety devices, placed the way the codes place them (G5; research in artifacts/roadside-inn/briefs/natasha-2026-11-21.md):
// smoke detection in the corridors serving guest rooms and at the elevator lobbies (IBC 907.2.8.3, NFPA 72: 9.1 m
// spacing, within 4.6 m of an end wall), a smoke alarm in the guest room (IBC 907.2.11.1) 0.9 m clear of the bathroom
// door and the PTAC, CO where fuel burns (IBC 915: the gas pool heater's room), horn/strobes 2.03-2.44 m up within
// 4.6 m of corridor ends and at most 30 m apart, pull stations within 1.5 m of each exit with the handle at 1.07-1.22 m,
// emergency lights on the egress path, and sprinklers at no more than 3.5 m centres and 2.3 m from walls (NFPA 13, light
// hazard), concealed in public areas, sidewall in the guest room (bathroom and closet exempt).
// Part of buildWorld (../world.js). Models: Poly Haven fire_alarm (pull station); the rest are Victor's GLBs and appear
// once they are listed in assets.js (each model's origin is its mounting face, +Z out of a wall, -Y down from a ceiling).
import { FLOOR2, CEIL } from '../world.js';

export function buildLifeSafety(ctx) {
  const { lib, add } = ctx;
  const F2 = FLOOR2, C1 = CEIL - 0.002, C2 = FLOOR2 + CEIL - 0.002, C212 = FLOOR2 + CEIL - 0.017;
  // [id, x, y, z, ry]. Walls: corridor faces at z = +-0.93; ry 0 faces +z, PI faces -z, -PI/2 faces -x, PI/2 faces +x.
  const devices = [
    // Pull stations at the exits: the main entrance (inside, latch side) and stair A on both floors.
    ['ph-fire-alarm', -3.95, 1.2, 8.9, Math.PI],
    ['ph-fire-alarm', 11.1, 1.2, -0.93, 0],
    ['ph-fire-alarm', 10.4, F2 + 1.2, -0.93, 0],
    // Corridor smoke detection; the elevator lobby detectors (recall) at x 7.75.
    ...[7.75, 16.4, 23.4, 28.3].map(x => ['hotel-smoke-detector', x, C1, 0]),
    ...[-10.5, -4.4, 2.6, 7.75, 16.6, 24, 28.6].map(x => ['hotel-smoke-detector', x, C2, 0]),
    // Guest room 212: a hardwired smoke/CO alarm mid-room, 2 m from the bathroom door and 3.6 m from the PTAC.
    ['hotel-smoke-co-alarm', 14.2, C212, 5.2],
    // CO beside the gas pool heater (pool equipment room).
    ['hotel-smoke-co-alarm', -8.5, C1, -7],
    // Horn/strobes, lens bottom at 2.1 m.
    ...[10.2, 28.0].map(x => ['hotel-horn-strobe-wall', x, 2.1, 0.93, Math.PI]),
    ...[-9.0, 4.5, 20.6, 27.6].map(x => ['hotel-horn-strobe-wall', x, F2 + 2.1, 0.93, Math.PI]),
    ['hotel-horn-strobe-wall', -12.07, 2.1, -5.5, -Math.PI / 2], ['hotel-horn-strobe-wall', -23.93, 2.1, -0.5, Math.PI / 2],   // pool (damp-rated)
    ...[[-6.3, 0.3], [0.9, 0.3], [-2.7, -6.9], [3.6, 5.7]].map(([x, z]) => ['hotel-strobe-ceiling', x, C1, z]),          // lobby, off the can grid
    // Exit signs over the exits; low-level signs beside the stair doors on the latch side (IBC 1013.2, R-1).
    ['hotel-exit-sign', -2, 2.78, 8.9, Math.PI], ['hotel-exit-sign', 10.12, 2.45, -0.93, 0], ['hotel-exit-sign', 11.37, F2 + 2.45, -0.93, 0],
    ['hotel-exit-sign-low', 10.82, 0.3, -0.93, 0], ['hotel-exit-sign-low', 10.68, F2 + 0.3, -0.93, 0],
    // Emergency lights along the egress path.
    ...[[20, 0], [-6, F2], [22, F2]].map(([x, y]) => ['hotel-emergency-light', x, y + 2.35, -0.93, 0]),
    ['hotel-emergency-light', 9.85, 3.75, -8.36, 0], ['hotel-emergency-light', -6.5, 2.4, -8.9, 0],
    // Sprinklers: concealed pendents in the corridors and the pool corridor, between the downlights.
    ...[7.75, 11.25, 14.75, 18.25, 21.75, 25.25, 28.75].map(x => ['hotel-sprinkler-concealed', x, C1, 0]),
    ...[-10.25, -6.75, -3.25, 0.25, 3.75, 7.25, 10.75, 14.25, 17.75, 21.25, 24.75, 28.25].map(x => ['hotel-sprinkler-concealed', x, C2, 0]),
    ...[-12.25, -8.75, -5.25, -1.75, 1.75, 5.25, 8.75, 12.25].map(x => ['hotel-sprinkler-concealed', x, C1, -10.05]),
    // Lobby: a 3.0-3.3 m grid within 1.6 m of the walls, clear of the great room's coffer (its own heads come with it).
    ...[-10.5, -7.2, -3.9, -0.6, 2.7, 5.6].flatMap(x => [-7.6, -4.6, -1.6, 1.4, 4.3, 7.4].filter(z => !(x > 1.4 && z > 7)).map(z => ['hotel-sprinkler-concealed', x, C1, z])),
    // Room 212: a sidewall head on the bathroom wall throwing into the bedroom, a concealed pendent in the entry hall.
    ['hotel-sprinkler-sidewall', 13.2, FLOOR2 + CEIL - 0.13, 4.17, 0], ['hotel-sprinkler-concealed', 12.95, C212, 2.4],
    // Back of house: exposed pendents in the stair and the pool equipment room.
    ['hotel-sprinkler-pendent', 10.75, 4.0, -7.5], ['hotel-sprinkler-pendent', -8.5, C1, -6.2],
  ];
  const placed = [];
  for (const [id, x, y, z, ry = 0] of devices) {
    if (!lib.models.has(id)) continue;   // ponytail: Victor's models switch on when assets.js lists them
    const o = add(lib.model(id, { origin: true }), x, y, z, ry);   // fire_alarm's own origin is its back plate's centre
    o.userData.onWall = true; o.name = id; placed.push(o);
  }
  Object.assign(ctx, { lifeSafety: placed });
}
