# hotel-tp-holder: wall toilet-paper holder with roll, plus the spare roll

for: room-king-bath   kind: tp-holder   replaces: new (room-212.js already fits 'hotel-tp-holder' when it exists)   priority: 1

## Real thing
size (cm, W×D×H): holder 16×10×9 (hood), roll 11.5 dia × 10, core 4.2 dia; spare roll 11×11×10  ·  weight: roll 0.1 kg
construction: concealed-screw round back plate (6 dia) each end or one rectangular plate, chrome hood over a
spring spindle; roll on the spindle with the loose end hanging 8 cm and folded to a V point (housekeeping fold);
spare roll stands on the toilet tank lid, wrapped in a paper band (separate node so it can be taken alone)
materials: holder polished chrome (metalness 1, roughness 0.15) with water spots; roll white tissue with an embossed
quilt texture (normal map, roughness 0.9); band white paper with faint grey print (no brand)
wear: finger smudges on the hood; one rust freckle on a screw
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2022_-_Sarah_Stierch_04.jpg ·
https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2023_-_Sarah_Stierch_05.jpg (spare roll on the tank)

## Hooks
- take_roll         the roll on the spindle (origin on the spindle axis, so it can shrink in radius about it)
- take_roll_spare   the spare roll; delivered as a second root node in the same GLB, positioned for the tank top (see below)
- roll_tail         the hanging V-fold end (a child of take_roll), so a pull can lengthen it

## Budget
tris ≤ 3k · materials ≤ 3 · textures ≤ 512 · phone LOD: no

## Placement (for Natasha)
put('hotel-tp-holder', 15.67, 3.86, 1.06, 0) · south wall (z = 1), 66 cm up, 20 cm ahead of the bowl · collider: none
Origin: the back plate's wall face, centre; +Z out of the wall. take_roll_spare offset from the origin by
(+0.48, -0.13, +0.40) lands it on the tank lid (toilet tank top at y 3.98, x 16.15, z 1.53, rotated: the lead can
re-parent it if the offset is awkward).
