# hotel-lid-bin: open bin of white domed cup lids (mixed sizes)

for: lobby-coffee   kind: lid-stack   replaces: new   priority: 1

## Real thing
size (cm, W×D×H): bin 16×12×9 clear or black plastic; inside, two short stacks of white domed sip lids (8.7 and 9.0 dia,
the sizes mixed), a few loose lids lying flat on top
construction: lids nested at 0.6 cm pitch; sip hole and a tear tab moulded in (normal map is fine); one lid upside down
materials: lids white polystyrene, satin (roughness 0.4); bin black PP
wear: lid stack half empty, the bin dusty in its corners
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2022_-_Sarah_Stierch.jpg (lids in the riser's bottom tier) · https://commons.wikimedia.org/wiki/File:Breakfast_room,_Hampton_Inn,_Penn_Yan,_New_York_-_20230117.jpg

## Hooks
- take_lid, take_lid001   the top lid of each stack
- stack_0, stack_1        the rest of each stack

## Budget
tris ≤ 3k · materials ≤ 2 · textures ≤ 256 · phone LOD: no

## Placement (for Natasha)
put('hotel-lid-bin', 4.25, 0.96, -8.68, 0) · in the riser's bottom tier (top of that tier at y 0.96) · collider: none
