# Thrift store fire-safety design notes

Researched 2026-11-15 for game layout. US federal workplace rules are a baseline, not a complete retail building-code determination. No jurisdiction, occupancy calculation or adopted code edition is specified in the brief. Local fire/building officials determine the applicable adopted codes and project requirements. Do not label this fictional store “code compliant.”

## Primary sources and design implications

- OSHA 29 CFR 1910.157(c)(1): when extinguishers are provided, mount, locate and identify them so employees can readily access them. Section (d)(2) limits employee travel distance to a Class A extinguisher to 75 ft / 22.9 m. Placement follows walking routes, not just a circle through fixtures. Section (d)(4) gives a different 50 ft / 15.2 m distance for Class B hazards. Section (e) covers inspection/maintenance, and (g) covers employee education/training. Source: https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.157
- OSHA 29 CFR 1910.36(b): ordinarily at least two suitably separated exits, subject to the stated single-exit exception based on safe evacuation factors. Section (d)(1) requires inside opening without keys, tools or special knowledge; (e)(1) requires a side-hinged door connecting a room to an exit route. The automatic storefront entrance is therefore not the sole modeled exit. Source: https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.36
- OSHA 29 CFR 1910.37(a)(3): unobstructed exit routes. Section (b) addresses exit signs and lighting. Source: https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.37

## First-slice choices and limits

Visible red extinguishers near the front-left and rear-right perimeter. Accessible rear side-hinged emergency door in addition to automatic storefront doors. Emergency exit remains usable without payment; unpaid goods alert the manager instead of locking the exit. The rear exit is abstracted to a transition around the building in this slice, not an animated door assembly. Main circulation remains clear before the surreal cat event.

The prototype does not yet calculate shortest walking distance from every location to extinguishers, actual occupant load, total required exit capacity, accessible egress, mounting heights, sprinkler requirements or local amendments. Add a walkable-grid route audit when the final floor plan and jurisdiction are chosen. Fire and extinguisher gameplay values are deliberately fictional, not operational training.
