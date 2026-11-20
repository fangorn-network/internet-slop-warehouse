# Brief for Victor: great-room regional map mural (from Natasha, 2026-11-20)

## What it is
A wall-scale printed vinyl mural of an invented regional map, the "sense of place" graphic of the current prototype's
perching area. It replaces the 2.5 x 1.45 m mostly-white canvas print (`regionalMap()` in world.js, mesh "Regional map")
that reads as a placeholder poster. Not the brand's art: invent the region and the style details (the game's region is the
"Ozark Highlands" along I-44 / old Route 66, see `regionalMap()` for names and the "you are here" dot).

## References (study before drawing)
- Santa Clarita, Formula Blue 2.0 lobby, photo "Santa-Clarita-03": https://lodgingmagazine.com/holiday-inn-express-opens-over-25-hotels-with-formula-blue-2-0/
  (left of frame: saturated cyan/cobalt field, darker navy land blocks, thin white road and river lines, floor to soffit).
- IHG on the new design (regional artwork with a state-specific wall map graphic in the perching area):
  https://hotelbusiness.com/ihg-opens-first-holiday-inn-express-hotels-with-new-design/
- A listing describing the map mural in a real lobby (Columbus-Polaris): https://www.travelocity.ca/Columbus-Hotels-Holiday-Inn-Express-Hotels-Suites-Columbus-Polaris-Parkway.h4319179.Hotel-Information
- Local copy of the Santa Clarita photo the investigator used: scratchpad ref/santa-clarita.jpg (ask the lead for it).

## Dimensions and placement
- East wall of the great room, face at x = 6.43 (navy accent wall `loungeAccent`, wall runs z 1..9), mural spans
  z 1.10..4.20 (3.1 m wide), y 0.12..2.93 (2.81 m tall; the ceiling is 2.95, floor top 0.01). The TV panel starts at
  z 4.3: keep 10 cm clear of it. The map plane faces -x.
- Flat print, no frame (it is wallcovering): 1-2 mm proud of the wall, polygon offset rather than lift.

## Materials
- Printed matte vinyl: roughness ~0.85, a faint fine texture (normal from a CC0 paper/vinyl scan at true scale).
- Palette: cyan #2f8fd0 to cobalt #1d4fb8 field, navy #13264a land masses, white #f4f6f8 hairline roads/rivers,
  one mustard #e8b400 "you are here". Mid-value: the frame mean should stay near 140-160/255 in the great-room view.
- Resolution: at least 4096 px on the long side (no visible pixels at 1 m); text large and sparse (town names, OZARK
  HIGHLANDS), no fine print.

## Deliverable
A texture (SVG source + baked JPG/PNG) or a thin GLB `hotel-map-mural` with provenance like the other hotel- parts.
Natasha will place it and remove the old `regionalMap()` print. Nothing on it is pickable.
