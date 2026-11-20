# Heartland Inn scene investigation, 2026-11-20

Observer only. No game code or assets changed.

## How this was done

- **Renders:** one `FULL=1 check.mjs` run with 24 player-eye views (`artifacts/roadside-inn/inv-*.png`). It took 10 minutes and logged no console errors (draw calls 1264, 1.38 M triangles, 449 textures).
- **Scene census:** one low-quality headless run of a read-only script (scratchpad `query.mjs`). It used the same server and Chrome as check.mjs and queried `__inn` directly: mesh census, people, clips, bone motion, and brightness of the full-quality shots. It also captured a few extra low-quality shots (`inv-people-*.png`).
- **Room 212:** my two room views landed inside walls and are unusable (`inv-room-door.png`, `inv-room-bed.png`). For the bedroom I used today's 01:04 low-quality `flow-in-room.png`. The full-quality bathroom shot is fresh.
- **Not observable:** sound (headless runs muted). I did not test plug/unplug on the lamps; I only saw the cords and the prompts (`Unplug the lamp` / `Plug in the lamp` exist).

### References (what the room is judged against)

1. Santa Clarita HIX, Formula Blue 2.0 lobby (lodgingmagazine.com, `Santa-Clarita-03`). This is exactly the user's reference: striated blue-grey carpet, light-grey heathered sofa with a navy geometric pillow, navy fabric-wrapped columns in white surrounds, mustard accent chair, a large blue map mural, wood slat screen, and recessed oak-trimmed coffers with diffuse warm panels.
2. RDU Airport HIX great room (lodgingmagazine.com). Grey-beige tile, patterned banquette, mixed-colour chairs, oak-trimmed recessed ceiling, framed geometric art, business center with real clutter.
3. Sequim HIX remodel, 2025 (sequimgazette.com, photo 1). Oak slat wall, navy fabric column, orange chairs, a large photographic landscape print, and a TV showing content.
4. Sequim HIX guest room (photo 2). Grey textured carpet with a faint linear pattern, blue accent wall, grey laminate headboard, patterned roller shades.

Sources: [lodgingmagazine.com Formula Blue 2.0](https://lodgingmagazine.com/holiday-inn-express-opens-over-25-hotels-with-formula-blue-2-0/), [lodgingmagazine.com RDU](https://lodgingmagazine.com/holiday-inn-express-rdu-expands-lobby-and-fitness-center/), [Sequim Gazette 2025](https://www.sequimgazette.com/2025/08/20/holiday-inn-express-finishes-sizable-remodel/)

## The headline

**The scene still reads as a bright, clean 3D catalogue, not a lived-in Holiday Inn Express.** Three causes:

- **Wrong palette and too much light.** The lobby is pale oak floor, white walls, white columns and a white ceiling, lit almost flat.
  - Mean luma of the lobby entry view is 195/255 and mean saturation 0.15. The ceiling view is 216/255, with 23 % of pixels above 235.
  - The reference is mid-value: blue-grey carpet, navy columns, grey fabric, with light pooled under coffers.
- **Every soft surface reads smooth.** At player distance no weave shows on the sofas, pillows are solid colours, rugs are high-contrast toy geometry, and paintings are visibly pixelated.
- **Almost nobody is there, and the people who are don't behave like people.** In the lobby you see one clerk, mostly hidden behind a monitor, and one man standing motionless at the coffee bar.

## Scores (0-10; G = geometry, M = materials, L = lighting, D = dressing, B = behaviour)

| Area | G | M | L | D | B | Score |
|---|---|---|---|---|---|---|
| Exterior arrival | 4 | 3 | 4 | 3 | 5 | **3.8** |
| Lobby desk | 6 | 5 | 4 | 6 | 5 | **5.2** |
| Market | 6 | 6 | 4 | 5 | 4 | **5.0** |
| Pantry / coffee | 6 | 6 | 4 | 5 | 5 | **5.2** |
| Great room / TV | 5 | 4 | 4 | 4 | 5 | **4.4** |
| West living room | 5 | 4 | 4 | 4 | 5 | **4.4** |
| Business center | 6 | 5 | 4 | 5 | 4 | **4.8** |
| Corridors | 5 | 4 | 3 | 4 | 5 | **4.2** |
| Elevator / stairs | 3 | 3 | 4 | 2 | 6 | **3.6** |
| Pool | 5 | 4 | 4 | 4 | 4 | **4.2** |
| Gym (seen only through the corridor glass) | 4 | 4 | 4 | 3 | – | **3.8** |
| Room 212 (bathroom fresh; bedroom from today's 01:04 low-quality flow shot) | 5 | 3 | 3 | 4 | 6 | **4.2** |
| **Overall (mean of areas)** | | | | | | **4.4** |
| People (scored separately) | | | | | | **3.0** |

## Findings by area

Each finding gives what you see, where it is, why it reads fake, the owner, and how sure I am.

### Lobby-wide (applies to desk, great room, west living room, business center)

1. **Floor is pale oak laminate everywhere.**
   - Where: `world.js:296`, slab −12..6.5 × −9..9, `grade: brightness(1.18)`.
   - Why fake: the reference has striated blue-grey carpet under all seating, with tile or LVT only on the walk paths. This floor is the single biggest reason the room reads "white and empty".
   - Owner: Natasha. Sure: high.
2. **Columns are plain white drywall boxes with a charcoal plinth.**
   - Where: (−5.2, 2.2) and (1.2, 2.2).
   - Why fake: the reference columns are navy fabric-wrapped panels with nailhead trim inside a white surround. Here they are blank white slabs (`inv-sectional.png`, `inv-lobby-entry.png`).
   - Owner: Natasha for the spec, Victor for the model. Sure: high.
3. **Ceiling is a flat white plane, with an oak "cloud" only over the great room.**
   - Where: ceiling; cloud at (3.6, CEIL, 6.4).
   - Why fake: there are no recessed coffers and no warm cove. Downlights are 0.075 m emissive discs that render as blown white ellipses (`inv-lobby-ceiling.png`). The oak cloud uses a plank texture at floor scale, so from the sofa it reads as a floor on the ceiling (`inv-great-room.png`).
   - Owner: Natasha. Sure: high.
4. **Lighting is flat fill, not layered light.**
   - Where: lobby-wide. The scene has 1 hemisphere light, 1 directional light and 5 point lights in total. The 10 light anchors in the lobby are mostly 3500 K points at 2.1 m.
   - Why fake: there is no pooling under fixtures and no darker zones between them. Table and floor lamps (intensity 2.5) make no visible pool.
   - Owner: Natasha for intent, God for the renderer. Sure: medium-high.
5. **Every TV is pure black.**
   - Where: lobby slat-wall TV (−7.2, 2.1, −4.87); great room TV (6.36, 1.95, 6.4); room 212.
   - Why fake: the code comment says the lobby screen "runs the weather", but in every capture it is black, and the lobby one has thin black vertical artifacts (`inv-clerk.png`). Real lobby screens are always on.
   - Owner: God. Sure: high that it is black in headless captures. I did not check whether it lights after a delay.
6. **Window views are low-poly.** Lollipop trees, flat black asphalt and boxy pastel cars show through the breakfast window, the pantry window and the pool glass (`inv-communal.png`, `inv-pantry.png`, `inv-elevator.png`). This is cartoonish and visible from almost every lobby view. Owner: Victor. Sure: high.
7. **Most surfaces are flat colour.** 415 of 552 meshes in the lobby have no texture map, and 56 are raw `BoxGeometry`: routed grooves, pendant rods, the credenza, the map frame, signs. Owner: Victor. Sure: high on the count. Some of these are rightly plain (cords, rods).

### Exterior arrival (3.8)

1. **Canopy columns and facade use an oversaturated tan sandstone at oversized scale.** It reads like a cartoon castle wall (`inv-arrival.png`, `inv-entry-out.png`). Real HIX facades are EIFS/stucco panels in greys and whites with some stone veneer. Owner: Natasha / Victor. Sure: high.
2. **Asphalt is near-black and uniform**, with almost no markings, oil stains or patching; the curb is a plain brown band. Owner: Victor. Sure: high.
3. **The canopy soffit is flat black** with square glowing panels and one large lens-flare-like glow. Owner: Natasha. Sure: medium.
4. **Good:** through the storefront glass you can see furniture and the pantry board. The entry mat with the logo reads well.

### Lobby desk (5.2)

1. **Dana is hidden.** At the check-in spot (−7.65, −1.7) her face is behind the monitor; you see hair and an eye line (`inv-clerk.png`, `inv-people-clerk-*.png`). A real clerk stands beside the monitor and turns to face you. Owner: God (placement and behaviour). Sure: high.
2. **The slat wall is good geometry**, but its oak is very orange and evenly lit. At low quality it moirés badly (`inv-people-clerk-0.png`). Owner: Victor. Sure: high on the moiré at low quality.
3. **Pods are clean white blocks with a navy stripe.** Plausible for the prototype. Desk clutter (apples, bell, Wi-Fi card, pens) is good and reads lived-in.
4. **The logo sign is a flat navy panel with serif text**, lit as an emissive plate. It reads like a placeholder sign rather than dimensional letters. Owner: Victor. Sure: medium.

### Market (5.0)

1. **Every facing is an identical, perfectly aligned row.** Same snack box repeated left to right, all shelves full to the front (`inv-market.png`). Real markets have gaps, pulled-forward stock, price strips and odd items. Owner: Victor. Sure: high.
2. **The shelving is flat brown** with no visible material or price channels. Owner: Victor. Sure: high.
3. **The cooler is the best prop in the area**: printed bottles, a lit header.

### Pantry / coffee (5.2)

1. **The rebuilt condiment organizer reads well**: a wooden cubby with coloured sugar packets and two creamer bottles on top (`inv-coffee-close.png`). Its weak points:
   - The packets stand in perfectly even rows.
   - Nothing is spilled, there are no stir sticks lying out, and there are no torn packets.
   - The cubbies are untextured pale wood.
   - Owner: Victor. Sure: high.
2. **The dispensers are plausible**, but the counter is spotless apart from a few faint rings. Owner: Victor / Natasha. Sure: medium.
3. **The trucker stands motionless in front of the dispensers forever.** See People. Owner: God. Sure: high.
4. **The red snack machine (`g3-vending-machine`) has a large blown specular blob** on its side (`inv-business.png`). Owner: Victor. Sure: high.

### Great room / TV (4.4)

1. **The rebuilt sectional reads as smooth putty-taupe foam.**
   - Where: (2.2, 6.4).
   - What you see: no visible weave at player distance, crisp edges, and a warm brown-grey (`inv-sectional.png`, `inv-sectional-close.png`, `inv-great-room.png`).
   - What the reference has: light cool grey heathered fabric.
   - The pillows are solid navy and bright cobalt, not the patterned navy pillows of the reference. They stand fairly upright; the slump is barely visible from standing height.
   - Owner: Victor. Sure: high.
2. **The "regional map" is a 2.5 × 1.45 m mostly white print** with a few lines (`inv-great-room.png`). It reads as a placeholder poster. The reference has a wall-scale, saturated blue map mural that defines the room. Owner: Natasha / Victor. Sure: high.
3. **The area rug is high-contrast navy/white/grey triangles**, toy-like, under both seating groups. Owner: Natasha. Sure: high.
4. **The side table is orange pine** and looks cheap against the reference oak. Owner: Victor. Sure: medium.
5. **The navy chairs are good shapes, but all are the same navy.** The reference mixes in mustard and grey accent chairs. Owner: Natasha. Sure: high.
6. **The navy TV wall with routed grooves is the closest match to the references** in the whole lobby.

### West living room (4.4)

1. **The framed artwork is pixelated and childlike**: a red barn and a sunset, blurred, with a visible pixel grid (`inv-reading-lamp.png`, `inv-west-living.png`). The same set appears in the corridors and room 212. Owner: Victor. Sure: high.
2. **Same toy rug and same all-navy chairs as the great room.** The sofa is warm taupe. Owner: Natasha. Sure: high.
3. **Good:** the reading-lamp cord runs visibly to the west-wall outlet (`inv-reading-lamp.png`), and the ring pendant and floor lamps read correctly.

### Business center (4.8)

1. **Plausible, but sterile.** The screens show login/browser UI (good) and there is one coffee cup. Missing:
   - paper in the printer tray;
   - a phone charger, scrap paper, a pen cup;
   - a stray chair turned away from the desk.
   - Owner: Victor. Sure: medium.
2. **The sign is a flat dark plate**; the wall behind is blank beige. Owner: Natasha. Sure: medium.

### Corridors (4.2)

1. **Walls are a uniform beige with no wallcovering texture, and the carpet is plain flat navy** with no visible pattern at player distance (`inv-corridor1.png`, `inv-corridor2.png`). Reference corridors have a patterned carpet and vinyl wallcovering. Owner: Natasha. Sure: high.
2. **Blown ceiling hotspot** on corridor F1 near the elevator: 7.9 % of the frame is above 235 luma. Owner: God. Sure: high.
3. **Good:** door hardware, room-number plaques, fire extinguishers and the exit sign are all present.

### Elevator / stairs (3.6)

1. **Stair treads are floating boxes**: no stringer, no balusters, a single thin rail on a bare white shaft (`inv-stairs.png`). Owner: Victor. Sure: high.
2. **The elevator door is one flat panel with a chrome frame.** It works (the flow check rides it), but it reads as a smooth plank. Owner: Victor. Sure: medium.

### Pool (4.2)

1. **Flat mint walls, an evenly lit beige tile deck, low-poly views through every window.** The pool water reads as a striped texture (`inv-pool.png`). Owner: Natasha / Victor. Sure: high.
2. **One guest paces the deck in a straight line**, 8.5 m each way, forever. Owner: God. Sure: high.

### Gym (3.8, partial)

Seen only from the corridor through the glass (`inv-gym.png`). Two treadmills, one bike and a dumbbell rack on a dark rubber floor, in a large empty white box. I did not go inside.

### Room 212 (4.2)

1. **Bathroom is washed out**: mean luma 227/255, saturation 0.07, glowing mirror frame (`inv-bathroom.png`). Owner: God / Natasha. Sure: high.
2. **Bedroom** (from `flow-in-room.png`, low quality):
   - The striped carpet reads as wooden planks.
   - The accent wall is orange; the reference room's accent wall is blue.
   - The art is pixelated, the TV is black, and there is a blown ceiling hotspot.
   - Owner: Natasha. Sure: medium (old low-quality frame).
3. **Behaviour is the strongest of any area**: many interactions (lamps, curtains, fridge, microwave, DND sign, bed).

## People (3.0)

Census:

- Six residents, but only **four distinct models**. Sophia: the clerk. Marcus: the trucker. Emma: twice, as the housekeeper and as the floor-2 guest, who share the same corridor. Andre: twice, as the pool guest and the lot walker.
- Each model has **80 bones, 0 morph targets, and 4 clips**: Idle (11.7 or 15.5 s), Walk (1.2 s), Wave, Talk.

What reads robotic, and why:

1. **The shirt tint never applies (bug).** `people.js` tints `/Top_shirt/`, but the meshes are named `Body`, `Hair`, `Outfit_original` and `Skin_original`. So the duplicates are identical twins, and two Emmas walk the same floor-2 corridor. Owner: God. Sure: high.
2. **Faces are dead.** With no morph targets there is no blinking, no lip movement in Talk, and no expression. Nobody's head turns toward the player (there is no look-at). Owner: God (Victor if new rigs are needed). Sure: high.
3. **Idles are in phase.** Every `play()` calls `reset()`, so residents sharing a model start their Idle at t = 0 together. Owner: God. Sure: medium-high (from the code; not observed side by side).
4. **The trucker is a statue.**
   - Code: his path is two identical points, so he idles forever facing the counter (pause 9, reached immediately).
   - Measured over 8 s of Idle: head turns up to 15°, spine moves 1.7 cm.
   - What's missing: he never pours, holds a cup or shifts his weight to leave.
   - Owner: God. Sure: high.
5. **Walkers move like a lawnmower.**
   - Ping-pong paths at constant speed.
   - `rotation.y` is set straight to the heading, so they snap 180° at each turn.
   - When the player blocks them they stop dead and idle instead of stepping around.
   - Walk is a fixed 1.2 s cycle while speeds run 0.6–1.1 m/s, so the slow ones (pool guest 0.6, housekeeper 0.7) should foot-slide. That is from the code and not watched in motion.
   - Owner: God. Sure: high on the snapping and blocking; medium on the sliding.
6. **The clerk's idle does move** (head up to 38°, spine 2.8 cm over 8 s), so she is not frozen. But she is mostly hidden and never faces the guest until you check in. Owner: God. Sure: high.
7. **Nobody sits, reads, eats or queues.**
   - Nobody occupies the great room, west living room, communal table or business center.
   - There is no sitting clip at all.
   - A real HIX lobby in the evening has one or two guests on laptops or phones, someone with luggage at the desk, and someone at the coffee. This is the "devoid of life" the user feels.
   - Owner: God for behaviour, Natasha for where people go. Sure: high.

## The five changes that would raise the score most

1. **Re-floor and re-palette the lobby to the reference** (Natasha). Blue-grey striated carpet under seating, tile/LVT on paths, navy fabric-wrapped columns, mustard and grey accent chairs. Biggest single visual gain; touches every lobby area.
2. **Darken and layer the light** (Natasha + God). Lower ambient/exposure, add recessed coffers with a warm cove, make lamps throw visible pools, and fix the blown hotspots (corridor F1, room ceiling, bathroom, ceiling disc glows). Target a mid-value frame (mean luma about 140–160) with pooled highlights rather than 195 overall.
3. **Soft goods with real weave** (Victor). Recolour the sectional and sofa to light cool grey with a visible heathered fabric at true scale, make pillows patterned navy and more slumped, and swap the toy triangle rugs for low-contrast textured ones.
4. **Art and screens** (Victor + God). A wall-scale, high-resolution map mural in the great room; replace the pixelated barn and sunset prints; put content on every TV.
5. **Put life in the room** (God):
   - fix the tint bug;
   - seat two or three guests (sit/phone/laptop clips);
   - give the trucker a pour-and-leave loop;
   - add head look-at, smoothed turns, speed-matched walk, and de-phased idles;
   - add blink/face motion if the rigs allow.

## Per-owner shortlist

**Natasha (interior design)**

- Lobby floor carpet/tile split.
- Navy columns.
- Coffered ceiling with cove light; plan the light layering.
- Mix in mustard/grey accent chairs.
- Low-contrast rugs.
- Corridor carpet pattern and wallcovering.
- Room 212 accent colour (blue) and its carpet.

**Victor (Blender assets)**

- Sectional and sofa fabric and colour; patterned, slumped pillows.
- Map mural; replace the pixelated art.
- Low-poly exterior seen through windows (trees, cars, asphalt).
- Facade stone scale and colour.
- Varied market facings and shelving material.
- Condiment organizer disorder.
- Stair stringers and balusters.
- Blown specular on the vending machine.
- Oak cloud texture scale.

**God (physics, sound, animation)**

- People: tint bug, look-at, turn smoothing, foot sliding, phase offsets, seated guests, trucker loop, clerk placement so her face shows at the desk, step-around instead of stopping.
- TVs black.
- Blown hotspots and exposure.
- Sound not verified headless; needs a local play-test.
