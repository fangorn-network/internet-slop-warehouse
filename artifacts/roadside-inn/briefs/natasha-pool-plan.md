# Pool wing plan: guest walkway and pool equipment room (Natasha, W1, 2026-11-20)

## Why
Today the only way to the pool is the glass door at (-12, z -3..-1.8), right beside the check-in pods. Every wet guest
drips across the lobby LVT past Dana. Real limited-service hotels put the pool off a back guest corridor, behind a
key-card door, and keep the pump/filter plant in a locked room next to the pool.

## References
- Pool plant room, Nuoro municipal pool (Wikimedia Commons, CC BY-SA, reference only, not used as an asset):
  https://commons.wikimedia.org/wiki/File:Piscina_comunale_di_Nuoro_-_Locale_caldaia_3.jpg ,
  https://commons.wikimedia.org/wiki/File:Piscina_comunale_di_Nuoro_-_Locale_caldaia_1.jpg .
  What is there: a black sand-filter tank about 1 m across with a white multiport valve, grey PVC pipe, pumps with motors
  on a plinth, a caged chemical tote, stacks of blue acid jerrycans, a red expansion tank, galvanised pipes on the
  walls, a bare fluorescent tube, a painted concrete or quarry-tile floor and a plain steel door.
- Corridor to an indoor pool (Amantaka, Luang Prabang, Commons):
  https://commons.wikimedia.org/wiki/File:Corridor_leading_to_indoor_pool_of_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos_front_view.jpg .
  What is there: a tile floor (a wet route never gets carpet), plain light walls with a base trim, ceiling diffusers, and
  the pool door at the far end.
- Limited-service practice (HIE, Hampton): a "POOL" sign and a "Room key required" reader on a glazed door, the pool
  rules posted inside, a fire extinguisher on the way, and a steel "Authorized personnel only" door to the equipment room.

## Plan view (metres; x east, z south, y up; floor 1 top y = 0.01, ceiling face CEIL = 2.95)

```
 z
-11.16 +----------------------------------------------------------------------------+   north skin (charcoal)
       | W  [win -10]        [win -2]               [win 5]             [win 11]   |E|
-10.9  |   POOL CORRIDOR (tile)   x -13.85 .. 13.43, z -10.9 .. -9.18, 1.72 m clear | |
-9.18  +==D1====+======D2=====+===[lobby win -4..0]===+==========+=========D3=+     | |
       |  pool  | POOL EQUIP. |  market / communal    | core     | stair      |PASS| gym (narrowed)
-9     |  wing  | x -12..-5   |  (lobby)              |          | 9.5..12    |AGE | x 13.5..18
       | (-24.. | z -9..-5    |                       |          |            |12.07
-5     |  -12)  +-------------+                       |          |            |..  |
       |        |  front desk pods / slat wall        |          |            |13.43
-1     |        |                                     | corridor F1 ======D4==+    |== corridor (z -1..1)
```

- D1: key-card glass door into the pool, centre (-13.15, z -9), opening x -13.65..-12.65. Opens into the pool (+z).
  The reader is on the walkway side; from the pool you push it open. It is a copy of the lobby pool door's behaviour.
- D2: pool equipment room door, opening x -7.9..-6.9 at z -9. It is locked (the hole stays solid). Steel-grey leaf,
  "POOL EQUIPMENT · AUTHORIZED PERSONNEL ONLY" sign.
- D3: cased opening from the passage into the walkway, x 12.07..12.97 at z -9, 2.15 m high. It stops at 12.97 because
  the gym's exterior pane (outside.js, x 13..17 at z -9) would show in a wider opening.
- D4: open doorway off the floor-1 corridor into the passage, x 12.15..13.35 at z -1, with a "POOL · HOT TUB" sign over it.
  It is 1.5 m from the stair door (9.55..10.7): "by the stairwell".
- Passage: x 12.07..13.43, z -9..-1 (1.36 m clear). It runs along the stair's east wall (x 12). Its new east wall at
  x 13.5 narrows the gym to x 13.5..18; the gym window becomes x 13.8..17 and the corridor glass 13.8..16.6.

## Walls (world.js)
| wall | axis / at | span | y | material | collides |
|---|---|---|---|---|---|
| walkway north skin | x / -11.08 | x -14.06..13.66 | 0..3.5 | charcoal, t 0.16, 4 window holes 1.2 x 1.2 (b 0.9..2.1) | no |
| walkway north inner | x / -10.95 | x -13.9..13.5 | 0..CEIL | paint, t 0.1, same holes | yes |
| walkway west skin + inner | z / -13.98, -13.85 | z -11..-9.16 | 0..3.5 / CEIL | charcoal / paint | inner |
| walkway east skin | z / 13.58 | z -11..-9.16 | 0..3.5 | charcoal | no |
| passage/gym wall | z / 13.5 | z -10.9..-1 | 0..CEIL | paint | yes |
| old facade lining (walkway side) | x / -9.17 | x -13.85..13.43 | 0..CEIL | paint, t 0.02; holes D1, D2, lobby window, D3 | yes |
| stair-slot closer | z / 12 | z -9..-8.5 | 0..CEIL | paint | yes |
| pool north facade | +hole D1 | | | | |
| floor-1 north facade | +holes D2, D3; gym window 13.8..17 | | | | |
| corridor north wall 12..18 | holes D4, glass 13.8..16.6, gym door | | | | |

## Colliders
- Every wall above collides through wall() (inner faces only; the skins don't). Holes D2 and the windows stay solid.
- D1 leaf: solid(-13.65, -12.65, 0, 2.2, -9.08, -8.92) while the leaf is nearly closed (angle < 1.1).
- The pool rules sign moves off the D1 jamb onto the pool's east wall (x -12.08, z -7.6).
- Gym props shift 1.4 m east with their colliders (treadmills x 14.6 and 16.0, bike 17.4, mirror 4.2 m wide).

## Walkable surfaces
- y = 0 everywhere through the existing ground floorAt (-400..400). No new floorAt is needed.
- Visual slabs (top y 0.01): tile in the walkway (x -13.9..13.5, z -11..-9) and the passage (x 12..13.5, z -9..-1);
  gym rubber shrinks to x 13.5..18; the equipment room gets concrete (a hole in the lobby LVT).
- Ceilings: acoustic tile at CEIL + 0.02 over the walkway (the passage is already covered). Roof slab top 3.5, under
  the floor-2 windows (y 3.95).

## Zones (zone culling: smallest box wins; player.zone(): first match, so these go before 'lobby' and 'gym')
| zone | box | sees |
|---|---|---|
| pool corridor (two boxes) | x -13.9..13.5, z -11.2..-9 and x 12..13.5, z -9..-1; y -1..3 | corridor, pool, lobby, outside, stairs, elevator |
| pool equipment | x -12..-5, z -9..-5, y -1..3 | pool corridor |
| gym | now x 13.5..18 | unchanged |

Added to existing `sees`: lobby (through the north window), corridor (D4), pool (glass D1) and outside (walkway windows)
all see 'pool corridor'. Nothing sees 'pool equipment' while D2 stays locked. All of this is in world.js `sees`; main.js
only passes world.sees to zone culling and needs no change.

## Lights
- Downlights (anchors at CEIL + 0.01, plus emissive discs) at x -10, -2, 5, 11 on z -10, and in the passage at z -6
  and -2.5.

## Not in this wave (W2, the pool room itself)
The equipment room is locked and stays empty until real equipment exists; Victor's brief is
briefs/victor-pool-equipment.md. The pool room itself (deck, water, finishes, furniture) is W2.
