# hotel-coffee-station: the coffee counter, rebuilt bare with a waste hole

for: lobby-coffee   kind: counter-bin   replaces: hotel-coffee-station (same id: today it bakes the towers, cups, riser and basket into the counter)   priority: 1

## Real thing
size (cm, W×D×H): 323×66×94 (top surface at 94, as now; keep the current footprint and origin exactly)
construction: as the current model (quartz top 3 cm, walnut vertical-grain front panels, charcoal plinth), MINUS every
item standing on it: towers, hot-water box, cup stacks, riser, creamer bottles, napkins, stirrers, tea box — each of
those becomes its own model (round-1 briefs) so it can carry a kind. ADD: a 20 cm round cut-out through the top near
the right end with a black moulded rim (1 cm lip, 3 mm proud), dark opening below, the top of a black slim bin
(40×28×70) visible 15 cm down inside the cabinet. Keep the wicker basket with its take_cookie* nodes (the game uses
them), moved left of the hole.
materials: as now; rim black ABS satin; the quartz top gets a faint sugar-grit and ring-stain decal layer near the
towers and the hole (roughness variation, no flat stain discs)
wear: rim stained brown on the side toward the towers; scuffed plinth; drip trail down the front edge below the
tower taps (12 cm)
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2022_-_Sarah_Stierch.jpg (main source: the hole at the right end of the top) ·
https://commons.wikimedia.org/wiki/File:Hampton_Inn_hotel_in_Mount_Laurel,_New_Jersey_06.jpg

## Hooks
- bin_opening    centre of the hole at the top surface: local (+1.45, 0.94, +0.03) → world (4.85, 0.94, -8.57)
- take_cookie*   unchanged

## Budget
tris ≤ 20k (less than now, the items move out) · materials ≤ 8 · textures ≤ 1k · phone LOD: no

## Placement (for Natasha)
unchanged: (3.4, 0, -8.6), solid(1.8, 5, 0, 1, -8.95, -8.25) in world/lobby.js; the lead switches it to
put('hotel-coffee-station', 3.4, 0, -8.6, 0) with KIND_OF 'hotel-coffee-station': 'counter-bin' (the bin trait takes the
cup through the hole). Kind is not solid (lobby.js keeps its own collider).
