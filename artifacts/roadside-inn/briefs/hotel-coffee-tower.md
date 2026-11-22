# hotel-coffee-tower: insulated thermal coffee dispenser tower (COFFEE / DECAF)

for: lobby-coffee   kind: dispenser   replaces: the towers baked into hotel-coffee-station   priority: 1

## Real thing
size (cm, W×D×H): 26×26×58 incl. drip base (body 21 dia-ish rounded square × 50, base 28×28×6)  ·  weight: 6 kg full (not takeable)
construction: double-wall steel body with a black powder-coat shell; a coloured wrap band 14 cm tall carrying a big
printed word (COFFEE / DECAF, plain sans, no brand); sight gauge tube on the front (dark brown liquid line at 60 %);
black lid with a handle on top; black lever tap on the front at 28 cm (lever pivots down 25°); separate black
ridged drip base with a removable grille
materials: shell black powder coat (roughness 0.5); band dark blue #1d3557 (COFFEE) or light blue #8fb8de (DECAF):
one model with two material variants, or a node 'band' whose material the lead swaps; tap black ABS; grille black
wear: dried brown drips down the tap and pooled on the grille, sugar grains on the base, the band's print a little
rubbed at hand height
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2022_-_Sarah_Stierch.jpg (two dark-blue COFFEE towers and a light-blue DECAF) ·
https://commons.wikimedia.org/wiki/File:Hampton_Inn_hotel_in_Mount_Laurel,_New_Jersey_06.jpg

## Hooks
- fill_spout    the tap outlet (where coffee leaves, pointing down)
- fill_point    centre of the drip grille top, under the spout (where a cup sits to be filled)
- lever         the tap lever as its own node, origin on its pivot (presses down)
- band          the coloured wrap (variant material)

## Budget
tris ≤ 6k · materials ≤ 5 · textures ≤ 1k (one label atlas for both words) · phone LOD: no

## Placement (for Natasha)
put('hotel-coffee-tower', 2.9, 0.94, -8.72, 0), (3.25 …), and (3.6 …, { band: 'decaf' }) · on the counter top, tap
facing +Z (the room) · collider: none (counter collider covers it; not loose: it's heavy and staff-only)
Origin: centre of the base's underside.
