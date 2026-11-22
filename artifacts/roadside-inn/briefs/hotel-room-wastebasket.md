# hotel-room-wastebasket: guest-room wastebasket (bedroom and bath)

for: room-king-bed, room-king-bath   kind: small-bin   replaces: hotel-waste-bin scaled to 0.3 m (stand-in)   priority: 1

## Real thing
size (cm, W×D×H): 27×20×30 (oval/rounded-rectangle, the 13-qt hotel size)  ·  weight: 0.5 kg
construction: one-piece moulded body, 2.5 mm wall, slight taper (top 27×20, base 23×16), rolled rim 8 mm; a clear/white
liner bag folded 4 cm over the rim (separate mesh, slightly crumpled, one corner hanging lower)
materials: body black or charcoal polypropylene, satin (roughness 0.55); liner translucent white LDPE (roughness 0.35,
alpha 0.8 or thin opaque white)
wear: scuffs on the lower sides (lighter grey streaks), dust line inside the base; liner sits unevenly
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2023_-_Sarah_Stierch_05.jpg (black bin beside the vanity) ·
https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2023_-_Sarah_Stierch_02.jpg (bedroom, desk side)

## Hooks
- bin_opening   centre of the top of the opening, at the rim height

## Budget
tris ≤ 2k · materials ≤ 2 · textures: none needed (or one 512 grime mask) · phone LOD: no

## Placement (for Natasha)
put('hotel-room-wastebasket', 12.85, 3.2, 7.47, 0) (bedroom, room side of the desk) and
put('hotel-room-wastebasket', 15.585, 3.2, 1.22, 0) (bath, between vanity and toilet) · on the floor · collider from kind (solid)
Origin: floor centre of the base. Replaces the two scaled hotel-waste-bin calls in world/room-212.js.
