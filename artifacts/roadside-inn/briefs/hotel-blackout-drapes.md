# hotel-blackout-drapes: textured blackout drapes on a ceiling track with a pelmet

for: room-king-bed   kind: drapes   replaces: the flat-colour drape planes in fixtures.js hotelWindow (room 212 only)   priority: 1

## Real thing
size (cm, W×D×H): track/pelmet 260×22×20 at the ceiling; two pleated panels each 150 wide flat (≈45 gathered when
parked, 130 drawn), 285 drop (this room's ceiling is 295, hem 1 cm above the carpet); a sheer behind them 260 wide
construction: aluminium ceiling track hidden by a painted pelmet box; pinch-pleated panels on carrier hooks every
12 cm (folds 10-12 cm deep); lined: face fabric + white blackout backing (backing visible as a white edge at the
leading edge and from outside); sheer voile on the inner track
materials: face fabric grey or taupe heavy woven polyester with a visible slub/basket weave, NOT a flat colour: use
ambientCG Fabric031 (grey large weave, CC0) as colour/normal/roughness, tinted to the room (#6f7d8c-ish grey-blue or
taupe), tiled so a weave cell is ~4 mm; Fabric030 is the fallback. Ingest it the way the repo does
(ingestion/ambientcg/batches/hotel: parts.json + provenance.json, licence CC0-1.0, source URL
https://ambientcg.com/a/Fabric031). Backing white matt; sheer white voile, alpha 0.6, faint weave; pelmet white
satin paint
wear: sun-faded band along the leading edges (lighter, 10 cm), hem slightly frayed at one corner, a crease where
they are always grabbed (115 cm up)
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2023_-_Sarah_Stierch_02.jpg ·
https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express,_Downtown_Nashville,_room.jpg ·
https://commons.wikimedia.org/wiki/File:A_Comfort_Inn_%26_Suites_hotel_guest_room_in_Huntingdon,_Pennsylvania_12.jpg

## Hooks
- open_drapes_left, open_drapes_right   each panel, origin at its outer (wall-end) edge on the track; authored
  OPEN (gathered); a shape key "closed" (or a second mesh) for the drawn state, so the kind can blend 0-1
- open_sheer                            the sheer, same convention
- grab_left, grab_right                 leading-edge points at 115 cm where a hand pulls

## Budget
tris ≤ 20k total (pleats need real geometry) · materials ≤ 4 · textures ≤ 1k · phone LOD: yes if > 20k

## Placement (for Natasha)
put('hotel-blackout-drapes', 14.25, 6.13, 8.93, Math.PI) · track centred on the window, flush to the ceiling,
on the south wall · collider: none. Origin: track centre at the ceiling face, +Z into the room.
room-212.js then passes { drapes: false } to placeWindow and the curtain interaction drives the kind.
