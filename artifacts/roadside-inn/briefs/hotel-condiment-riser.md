# hotel-condiment-riser: 3-tier wood riser with sleeves, sweetener and creamer bins, napkins

for: lobby-coffee   kind: caddy   replaces: the riser baked into hotel-coffee-station   priority: 1

## Real thing
size (cm, W×D×H): 40×25×50; tiers at 2, 18, 34 cm; bins 10×8×6
construction: blond-wood frame, three stepped shelves. Top tier: two liquid-creamer pump bottles (white/blue
vanilla, orange/red hazelnut; generic labels). Middle tier: four plastic bins (orange ×2, blue ×2) of paper
sweetener packets (blue, pink, yellow, white, brown; 6×3.5 cm, ~10 each, some bent) and portion creamer cups; a
stack of kraft cup sleeves (corrugated, 9 cm tall, flattened) standing in a slot. Bottom tier: a stack of white
napkins, pulled out in a clump; space for hotel-lid-bin (16×12, left half).
materials: wood light oak satin; bins glossy PP; packets paper (one atlas); creamer cups white with foil lids; sleeves
kraft corrugated (normal map)
wear: packets spilled on the tier, sticky ring under the pump bottles, a creamer cup lid peeled
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2022_-_Sarah_Stierch.jpg (riser with orange and blue bins right of the hot-water box) · https://commons.wikimedia.org/wiki/File:Breakfast_room,_Hampton_Inn,_Penn_Yan,_New_York_-_20230117.jpg

## Hooks
- take_sleeve        top sleeve of the stack
- take_sugar_packet  one packet on top of each sweetener bin (take_sugar_packet, take_sugar_packet001)
- take_creamer       one portion cup on top of each creamer bin; the pump bottles keep take_creamer_pump*
- take_napkin        the top napkin
- pump_point         the pump nozzles (press for creamer into a held cup)

## Budget
tris ≤ 12k · materials ≤ 5 · textures ≤ 1k (one packet/label atlas) · phone LOD: no

## Placement (for Natasha)
put('hotel-condiment-riser', 4.25, 0.94, -8.72, 0) · counter top, between the hot-water box and the hole · collider: none
