# hotel-hot-water-box: hot-water dispenser with a push lever

for: lobby-coffee   kind: dispenser   replaces: the box baked into hotel-coffee-station   priority: 2

## Real thing
size (cm, W×D×H): 20×28×45  ·  powered
construction: black steel box, small hinged fill lid on top, push-back lever over a short spout at 18 cm, built-in
drip tray at the base, red "ready" lamp, orange hot-surface warning sticker on the lever housing (no brand text,
just a pictogram and HOT)
materials: black powder coat; lever chrome; drip tray black; lamp red emissive (material "emiss_lamp")
wear: limescale crust white at the spout, water spots on the tray, sticker corner lifting
refs: https://commons.wikimedia.org/wiki/File:Holiday_Inn_Express_Fort_Bragg_-_August_2022_-_Sarah_Stierch.jpg (black box right of the decaf tower) · https://commons.wikimedia.org/wiki/File:Breakfast_room,_Hampton_Inn,_Penn_Yan,_New_York_-_20230117.jpg

## Hooks
- fill_spout, fill_point   as the tower
- lever                    origin on its pivot
- cord_exit                back bottom, where the cord leaves (it plugs into the duplex at x 3.75 behind it)

## Budget
tris ≤ 3k · materials ≤ 4 · textures ≤ 512 · phone LOD: no

## Placement (for Natasha)
put('hotel-hot-water-box', 3.9, 0.94, -8.75, 0, { out: [3.75, -8.89] }) · counter top, lever facing +Z · collider: none
