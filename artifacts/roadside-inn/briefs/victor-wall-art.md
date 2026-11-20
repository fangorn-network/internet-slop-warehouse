# Brief for Victor: replacement wall art (from Natasha, 2026-11-20)

## What it is
The framed "Heartland series" (`painting()` in world.js: barn, tractor, hay bales, windmill on a 384 px canvas, re-laid
as brushstrokes) reads as pixelated, childlike clip art in the lobby (`inv-reading-lamp.png`, `inv-west-living.png`),
the corridors and room 212. Replace it with art that looks like what these hotels actually hang.

## References
- Sequim HIX remodel 2025, photo 1 (a large photographic landscape print over the seating) and photo 2 (room):
  https://www.sequimgazette.com/2025/08/20/holiday-inn-express-finishes-sizable-remodel/
- RDU HIX great room: a framed geometric (lattice) print in a white frame over the business center:
  https://lodgingmagazine.com/holiday-inn-express-rdu-expands-lobby-and-fitness-center/
- Santa Clarita Formula Blue 2.0 lobby (overall palette the art must sit in):
  https://lodgingmagazine.com/holiday-inn-express-opens-over-25-hotels-with-formula-blue-2-0/

## What to make
1. Lobby west wall (x -11.895, y 1.8 top edge, z -0.6, 1.0 x 0.75 m today; may grow to 1.2 x 0.9): one large
   landscape *photograph* print. Source: a real CC0 photograph (e.g. Poly Haven HDRI backplates, or Wikimedia Commons
   files explicitly CC0) of Ozark/Midwest country, graded slightly cool. No AI imagery.
2. Corridors (both floors, 0.8 x 0.6 m, positions in world/corridors.js) and room 212 (1.45 x 0.58 over the headboard,
   1.05 x 0.42 over the TV, 0.45 x 0.6 in the entry): a coherent series of geometric/abstract prints in navy, cobalt,
   grey and one mustard accent, plus two or three of the landscape photographs. Vary them; no repeats side by side.
- Frames: thin satin black or white (RDU), 20-25 mm; white mat optional. Prints matte (roughness ~0.8), glazing not needed.
- Resolution: >= 1024 px on the long side for 0.8 m pieces, 2048 for the big ones (no visible pixel grid at 1 m).

## Deliverable
Textures (with provenance: source URL, licence, author) or a GLB per frame size. `painting(x, y, z, ry, w, h, motif)` is
the placement API: keep its signature (top-centre anchor, faces +z before rotation) so Natasha can swap the canvas for
your texture by motif index. Not pickable.
