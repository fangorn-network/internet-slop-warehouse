# hotel-roller-bag: the player's 2-wheel carry-on (rollaboard)

for: lobby / everywhere (you arrive pulling it)   kind: roller-bag   replaces: placeholderBag() boxes in world/handling.js   priority: 2

## Real thing
size (cm, W×D×H): 36×22×55 body (22 in carry-on), handle extends 42 above the top; overall 36×25×57 closed  ·  weight: 4.5 kg
construction: soft-side 1680D ballistic nylon over a frame: front panel with one zip pocket (zip pulls dangle),
piping on all edges, a perimeter zip with an expansion gusset; top and side grab handles (padded webbing); two
inline skate wheels 7 cm dia in recessed housings at the back bottom, two plastic feet at the front; telescoping
aluminium handle in two tubes inside a channel on the back, black grip bar with a release button
materials: shell navy or charcoal nylon with a real weave (CC0 fabric normal/roughness, e.g. ambientCG Fabric004 or
Fabric049, provenance recorded), roughness 0.75; piping black; tubes anodised aluminium (metalness 1, roughness 0.3);
wheels black PU; zips black coil with metal pulls; a white paper airline tag tied to the side handle (blank)
wear: scuffed corners (paler fabric), wheel housings scraped grey, a crease across the front pocket
refs: https://store.ricksteves.com/shop/p/rolling-carry-on ·
https://www.swissgear.com/swissgear-6190-20-carry-on-spinner-luggage (handle, wheels, pocket detail) ·
https://en.wikipedia.org/wiki/Valise (Rollaboard: upright, two wheels, telescoping handle)

## Hooks
- handle       the telescoping part (tubes + grip) as one node, origin at its retracted position; slides +Y 0.42 m
- grab_top     top carry handle (lifted when carried by hand)
- wheel_l, wheel_r   wheels, origin on the axle (spin)
Same size and origin as the placeholder: floor centre, wheels at the back (-Z) at (±0.15, 0.035, -0.095), handle node 'handle'.

## Budget
tris ≤ 10k · materials ≤ 4 · textures ≤ 1k · phone LOD: no

## Placement (for Natasha)
none needed: handling.js loads 'hotel-roller-bag' automatically when it exists (4.75, 0, 16.7). The lead then maps
KIND_OF 'hotel-roller-bag': 'roller-bag' and moves its loose() options into the kind.
