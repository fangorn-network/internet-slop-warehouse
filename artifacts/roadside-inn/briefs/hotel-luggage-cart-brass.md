# hotel-luggage-cart-brass: brass bellman's (birdcage) luggage cart

for: lobby (entrance)   kind: luggage-cart   replaces: hotel-luggage-cart (lobby.js, -5.0, 0, 6.3)   priority: 2

## Real thing
size (cm, W×D×H): 112×61×183 (deck 107×58 at 33 cm up)  ·  weight: 40 kg (pushed, never carried)
construction: carpeted plywood deck with a wrap-around grey rubber bumper; two 3.8 cm (1.5 in) solid-brass uprights
at each end joined by an arched top rail (the "birdcage"), a hanging bar along the top for garment bags; welded
tube joints with brass ferrules; 2 fixed 20 cm wheels + 2 swivel 12 cm casters, grey rubber, chrome forks
materials: brass: metalness 1, base colour #e1b56a-ish (real brass F0 ~ (0.91, 0.78, 0.42)), roughness 0.18 on the
polished tube with a roughness/colour variation map: hand-polished bright where held (grab height), duller and
browner (tarnish, roughness 0.35) low on the uprights and in the joints; fingerprints as roughness smudges. Deck carpet
dark red or navy cut-pile (CC0 fabric texture, e.g. ambientCG Fabric026/Fabric023, provenance recorded); bumper grey
rubber matt; casters grey rubber
wear: tarnish at the ferrules, carpet worn pale in the middle of the deck, bumper scuffed black, one caster turned sideways
refs: https://forbesindustries.com/products/hotel-operations/luggage-carts-bellmans-equipment/elite-luggage-carts/birdcage-luggage-cart-2419/ ·
https://www.1stdibs.com/furniture/more-furniture-collectibles/racks-stands/luggage-racks/vintage-hotel-brass-luggage-cart/id-f_3326162

## Hooks
- grab        the push point on the end upright at 100 cm (hand height), on the end the player approaches from
- deck        top centre of the deck (things set here ride along)
- caster_*    each swivel caster's fork, origin on its swivel axis (rotates to the direction of travel)

## Budget
tris ≤ 25k · materials ≤ 4 · textures ≤ 1k · phone LOD: yes (blender/mobile_lod.py)

## Placement (for Natasha)
put('hotel-luggage-cart-brass', -5.0, 0, 6.3, 0.3) · near the entrance, as now · collider from the kind's loose (it's
pushed, so no solid() box; lobby.js drops its solid(-5.6, -4.4, …) line when this lands). Origin: floor centre.
