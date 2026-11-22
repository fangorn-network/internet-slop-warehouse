# hotel-swing-arm-sconce: swing-arm reading sconce on the headboard panel

for: room-king-bed   kind: wall-lamp   replaces: the two table lamps on the nightstands, and the stub sconce_* nodes baked into hotel-headboard   priority: 1

## Real thing
size (cm, W×D×H): back plate 12×2×20 (rounded rectangle); arm reach 35 (two-section, elbow at 18); drum shade 22 dia × 18;
overall 25×40×40  ·  hardwired, no cord
construction: wall plate with a small rocker or push switch on its face; vertical swivel knuckle on the plate; arm
(1.2 cm tube) to a second knuckle, a short drop to the shade holder; white fabric drum shade with a diffuser disc
under it, LED bulb inside
materials: plate and arm brushed nickel (metalness 1, roughness 0.35) or matt black; shade white linen (roughness 0.9,
translucent look: material named "lampshade" so put()'s glow finds it); switch white plastic
wear: dust on the top rim of the shade, scuffed plate edges, the arm a little loose (rests 5° down)
refs: https://commons.wikimedia.org/wiki/File:A_Comfort_Inn_%26_Suites_hotel_guest_room_in_Huntingdon,_Pennsylvania_12.jpg ·
https://commons.wikimedia.org/wiki/File:Hampton_Inn_hotel_in_Mount_Laurel,_New_Jersey_14.jpg ·
https://stories-editor.hilton.com/wp-content/uploads/2022/04/Hampton-Inn-by-Hilton-West-Valley-Salt-Lake-City-King-Guest-Room.jpg

## Hooks
- arm_pivot     the knuckle on the plate (Y axis), the arm and shade parented under it so it swings 0-110°
- light_point   inside the shade where the bulb is (the kind's light follows it)
- switch        the rocker on the plate (its press point)

## Budget
tris ≤ 4k · materials ≤ 3 · textures ≤ 512 · phone LOD: no

## Placement (for Natasha)
put('hotel-swing-arm-sconce', 16.45, 4.35, 5.45, -Math.PI / 2) and (…, 7.75, …) · on the headboard panel face, 115 cm up,
just outside each side of the mattress · collider: none. Origin: back face of the plate, centre; +Z out of the wall.
Natasha then hides the headboard's sconce_* nodes and removes the two table lamps (the desk lamp stays).
