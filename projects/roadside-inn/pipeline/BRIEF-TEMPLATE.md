# <asset id>: <what it is>

for: <space id>   kind: <kinds.js kind>   replaces: <existing model id, or "new">   priority: <1-3>

## Real thing
size (cm, W×D×H): ...  ·  weight (kg, if it can be picked up): ...
construction: how it's actually built (parts, joints, fasteners, thicknesses)
materials: per part, with finish (brushed nickel, satin, powder coat, oak veneer, vinyl...)
wear: where and how much (from the spec's condition column)
refs: 2+ photo URLs (from the spec)

## Hooks (named nodes in the GLB; required by its kind)
Blender empties or mesh objects named exactly so (glTF drops the ".001" suffix):
- cord_exit                 powered things: where the cord leaves (lamps, appliances)
- bin_opening               bins: centre of the top of the opening
- open_door_* / open_drawer_* / open_lid_*   anything that opens (origin on the hinge line; see world/handling.js)
- take_<noun>               small loose things inside it that can be taken (a roll, a cup)
- socket_*                  outlets built into it
- handle*                   a pull handle (roller bag, luggage cart)
- fill_spout / fill_point   dispensers: where liquid leaves / where a cup sits to be filled
- seat                      somewhere to sit: hips point, facing +Y-front
- grab                      where a hand holds it to carry or push (luggage cart bar)
List the ones this asset needs: ...

## Budget
tris ≤ <n> (props ~5-40k; small things ≤ 3k) · materials ≤ <n> · textures ≤ 1k unless it fills the view
phone LOD: <yes/no> (blender/mobile_lod.py) if > 20k tris

## Placement (for Natasha)
put('<id>', x, y, z, yaw, { ... }) · on/against what · collider: from kind (solid) or none (loose)
