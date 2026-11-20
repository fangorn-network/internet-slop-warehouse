# Brief for Victor: hotel pool equipment room set (from Natasha, 2026-11-20)

## What it is
The plant room for a small hotel's indoor pool and hot tub. It sits behind the front desk at x -12..-5, z -9..-5
(7 x 4 m, ceiling 2.95, concrete floor at y 0.01). The door is on the north wall, x -7.9..-6.9, opening from the guest
pool corridor (briefs/natasha-pool-plan.md). The door stays locked until this set exists. Then God can make it a
staff-key door, and I will place the set and open the door. No CC0 set covers this: Poly Haven, ambientCG and Kenney have
barrels and pipes, but no filter tank, pump, heater or controller.

## References
- https://commons.wikimedia.org/wiki/File:Piscina_comunale_di_Nuoro_-_Locale_caldaia_3.jpg (filter tank with multiport
  valve, pumps, chemical tote, jerrycans, piping)
- https://commons.wikimedia.org/wiki/File:Piscina_comunale_di_Nuoro_-_Locale_caldaia_1.jpg (heater/boiler cabinets,
  burners, wall piping)
- For hotel scale, search Pentair "Triton II" / Hayward "Pro Series" commercial sand filters, a Pentair IntelliFlo/Hayward
  TriStar pump, a Raypak commercial pool heater and a Pulsar/Chemtrol controller for proportions. Model these as
  generic, unbranded equipment.

## Pieces (real sizes)
| piece | size | material | notes |
|---|---|---|---|
| sand filter, pool | 0.75 m dia x 1.25 m tall on a base ring | gloss black or tan fibreglass, white multiport valve with a blue handle, pressure gauge | one filter for the pool, one smaller (0.6 x 1.0) for the hot tub |
| circulation pump + motor | 0.75 L x 0.35 W x 0.4 H | grey/black housing with a clear strainer lid | two pumps on a 10 cm concrete plinth |
| PVC manifold | 2-3 in (60-90 mm) grey Schedule 80 pipe, valves with red/blue handles | grey PVC | runs between filters, pumps and heater, then up the wall into the ceiling |
| pool heater | 0.9 W x 0.75 D x 1.0 H | beige/grey sheet-metal cabinet, flue pipe to the ceiling | gas, with a small display |
| chemical controller | 0.45 x 0.35 x 0.15, wall mounted | white box with a small LCD, sample-cell tubes | pH / ORP readout |
| chlorine feeder | 0.3 dia x 0.9 H | white or grey tube with a screw lid | tablet erosion feeder |
| acid jerrycans | 20 L, 0.3 x 0.25 x 0.45 | blue HDPE with hazard diamonds | 3-5 on a spill pallet; pickable |
| eyewash station | wall unit, 0.3 x 0.2 x 0.4 | green/yellow plastic | required by code near chemicals |
| SDS binder + log clipboard | A4 | | on a hook by the door; pickable |
| fluorescent strip | 1.2 m two-tube | white | the only light |

## Placement (I will do it)
Filters and pumps on the west half (x -11.6..-9), heater in the NE corner (by the door, so the flue reaches the roof),
controller and eyewash on the south wall (z -5.07 face), chemicals on a pallet in the SW corner, away from the heater.

## What must be pickable
Jerrycans, the clipboard and the SDS binder (as separate `take_` objects). Everything else is static, with a box collider
each.

## Licence
Your own Blender modelling, CC0, with provenance in the repo's usual way. No AI-generated geometry or textures, and no
real brand names or logos on the equipment.
