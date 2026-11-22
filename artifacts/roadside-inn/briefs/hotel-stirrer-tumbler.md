# hotel-stirrer-tumbler: clear tumbler of stir straws, plus a small wicker basket of creamer cups

for: lobby-coffee   kind: caddy   replaces: the stirrers baked into hotel-coffee-station   priority: 2

## Real thing
size (cm, W×D×H): tumbler 8 dia × 10 with straws standing to 20; basket 15 dia × 7 (separate root node in the same GLB)
construction: thick-base clear glass tumbler; ~40 thin white/clear stir straws (14 cm), splayed; a few lying on the
counter beside it. Basket: round wicker, ~30 foil-lidded creamer thimbles (3.5 dia × 2.5) heaped
materials: glass (transmission or alpha 0.3, roughness 0.05); straws white PP; wicker (CC0 texture or modelled weave);
creamer cups white PP with silver foil lids
wear: a sticky ring under the tumbler; 3 creamer cups leaking a white smear
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2022_-_Sarah_Stierch.jpg (stir straws in a glass at the right end, creamers in a wicker basket) ·
https://commons.wikimedia.org/wiki/File:Hampton_Inn_hotel_in_Mount_Laurel,_New_Jersey_06.jpg

## Hooks
- take_stirrer       one straw standing proud of the rest
- take_creamer_cup   one cup on top of the heap (basket node)

## Budget
tris ≤ 6k · materials ≤ 4 · textures ≤ 512 · phone LOD: no

## Placement (for Natasha)
put('hotel-stirrer-tumbler', 4.6, 0.94, -8.75, 0) · counter top, right of the riser, left of the hole; the basket sits
in front of the riser (offset (-0.35, 0, +0.2) from the tumbler) · collider: none
