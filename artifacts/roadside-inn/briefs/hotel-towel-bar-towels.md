# hotel-towel-bar-towels: towel bar over the toilet with two folded bath towels

for: room-king-bath   kind: towel-bar   replaces: new (supersedes the 2026-11-21 hotel-towel-bar)   priority: 1

## Real thing
size (cm, W×D×H): bar 61 long (24 in), 1.9 dia, standoff posts 7 deep, round flanges 6 dia; overall 66×8×6 bare;
with towels 66×10×72 (towels hang 70 below the bar)  ·  weight: towel 0.6 kg each
construction: two posts with concealed set screws; bar between them. Two white bath towels 68×137, folded in thirds
lengthwise and hung doubled over the bar (front fold slightly longer than the back, hems at different heights), a
woven dobby band 6 cm from each hem
materials: bar satin/brushed stainless (metalness 1, roughness 0.3); towels white cotton terry, a real pile texture
(normal + roughness from a CC0 terry/fabric, e.g. ambientCG Fabric019 woven wool or Fabric032; record provenance),
slightly grey-white (#eeeceb), not pure white
wear: towels thin and a little pilled; one hangs uneven (a corner lower); water spots on the bar
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2022_-_Sarah_Stierch_04.jpg (bar over the toilet with 2 towels) ·
https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2023_-_Sarah_Stierch_03.jpg (bar seen from the room)

## Hooks
- take_towel, take_towel001   each hung towel as its own node (take one and the other stays)
- hang_point                 bar centre: where a held towel goes back on

## Budget
tris ≤ 8k (towel folds need real geometry: cloth sim baked to mesh is fine) · materials ≤ 2 · textures ≤ 1k · phone LOD: no

## Placement (for Natasha)
put('hotel-towel-bar-towels', 16.44, 4.35, 1.53, -Math.PI / 2) · east wall over the toilet tank, bar 115 cm up · collider: none
Origin: back face of the flanges, at the bar's centre height; +Z out of the wall.
