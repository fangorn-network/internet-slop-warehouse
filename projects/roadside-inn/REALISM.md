# Realism notes: what reads as fake, and what fixed it

Running notes from building the Heartland Inn lobby, kept so they can become a skill on realistic browser
environments. Each entry: the symptom a player sees, the cause, the fix. Newest last.

## Method

- **Reference first.** Work from real photos of the place (the brand's design gallery for the lobby). Copy what is
  there (millwork, what sits on desks and counters, where bins go), not a generic idea of the room.
- **Look the way a player looks.** Screenshot from standing eye height and normal distance (`check.mjs` with a JSON of
  views). Close-up studio renders hide scale and placement problems; jammed-against-the-object shots invent them.
- **Ask the scene, don't guess.** When something looks wrong and the source doesn't explain it, query the running
  scene (`__inn`): which meshes overlap a point, what physics pinned, where bodies are after N seconds.
- **Measure what you change globally.** Lighting changes get a before/after mean-RGB on the same view, not an eyeball.
- **Leave a check.** Every physics fix gets an assertion in `check.mjs physics`.

## Sources

- CC0 scans of modern interior props are scarce. Poly Haven has traditional furniture only (no modern sofa);
  Grab3D's realistic models are AI image-to-3D; Hugging Face's CC0 3D sets are museum scans (see `CC0-SOURCES.md`).
- So: model in Blender by script, and put the realism into the *surfaces* with real CC0 scanned textures at their
  true physical scale (Poly Haven fabrics, woods), plus printed labels drawn as SVG (invented brands).

## Geometry and models

- **Boxes with bevels look like boxes.** Upholstery: inflate stuffed cushions with Blender cloth + pressure (no
  gravity, ~15-20 frames): crowned faces, pinched seams, wrinkles, each one different. Firm foam seat cushions keep
  their volume (cloth at low pressure deflates them into bags), so shape those directly: crown, side bulge,
  subdivided corners, seam puckering, a sitting hollow. Pillows: a thin slab inflated hard.
- **Separate piping floats** once a cushion is simulated: the seam pinch already reads as a seam.
- **Frames are never dead flat:** a low, broad undulation on upholstered panels.
- **Solid boxes where there should be holes.** Bins, cabinets: carve the body and grommet, line the opening with the
  bag, otherwise you see the top of a solid block.
- **Printed things need real print.** Packaging, signage, paperwork, screens: SVG atlases. A flat-colour LCD or a
  blank label reads as a placeholder at once.
- **Layers hide each other.** A can's aluminium sleeve at r 0.0331 sat over its label at r 0.033: every can blank.
- **Leftovers.** Replacing a placeholder (a flat mat box) must delete it; query the scene for duplicates.

## Materials and transparency

- **Alpha < 1 means blended.** A 97 %-opaque juice bottle is drawn transparent and sorted per object; 48 of them
  overlap and ghost. Coloured drinks: opaque. Only genuinely clear plastic stays transparent.
- **Box UVs on small parts** turn a wood veneer map into cork. Small trim: a flat finish colour.

## Light

- **Reflections must be of this place.** An HDRI photo of another hotel room showed up in a chrome bell and as
  glints on a ceiling panel. Capture the room itself (PMREM `fromScene`, from the zone's middle, two bounces so lit
  floors light it back), once per zone and time of day. Match the capture size to the sky maps (1024-wide equirect =
  256 px cube) or every shader recompiles at the door.
- **That photo was also the fill light.** Removing it made the lobby grey and dim: re-balance indoor intensity to
  the old measured brightness, warm the downlights (3500 K) rather than tinting the fill.
- **Point lights shine every way.** A light under a ceiling cloud lit its underside like an uplight. Put downlight
  anchors in the fixture's plane.
- **Close a window you've put furniture in front of.** A coffee bar and sign stood across glass.

## Physics

- **Decoration on a physics prop must move with it.** A static lamp floated when its loose table was shoved.
- **Bolt, don't stack.** A separate top-heavy lamp body gets knocked off and rocks on its shade forever. Bolt it on
  (child of the table) *after* physics shapes the table: a hull around table + lamp puts the mass in the air and
  the lightest nudge tips it.
- **Bodies that appear late get things dropped through them.** A streamed (lazy) table got its body after the lamp
  on it: load both up front.
- **Props starting inside hand-placed boxes** get pinned (or fired out); place them clear of colliders.
- **Headless tests run slow frames** (the first frame in a zone renders its reflections): push until moved, not for
  a fixed time.

- **A top-heavy hull rocks itself off a table.** The lamp's convex hull is mostly shade, so Rapier put its centre of
  mass 35 cm up over an 8.5 cm base: woken on its table it wobbled off on its own, no push needed. Real lamps carry
  their weight in the base: give the body that centre of mass (`attach(..., { centerOfMass })`), not the hull's.
- **Masses in kilograms, not density units.** By density 0.4 a side table weighed 50 g, the same as the lamp on it, so
  the lamp's weight decided how the table moved. A table in kg (6, a coffee table 14, an armchair 16) outweighs what's
  on it; the walker (70 kg) still shoves an armchair. Throws scale with weight too (a remote leaves at 5.5 m/s, a
  6 kg table at ~3).
- **Small things grip.** Felt pads and cup rings: give resting items the higher friction (combine rule Max), or a table
  stopping short under them leaves them sliding.
- **Wake where it sits now.** A resting item wakes the frame after its support moves; a slow (headless) frame moves
  the table 2-4 cm first, so the lamp woke behind, half off. Keep its pose in the support's frame and put it back there
  as it wakes (unless the support was lifted away: then it just drops).
- **Shove like a hand.** Setting a table's velocity every tick is a jolt each frame, not a push; the check pushes with a
  kinematic block ramping up over its first 4 cm, like the player's capsule does.
- **Contact speed is the speed before the hit.** Read after the solver step, a falling cup has already stopped: sounds
  scaled by it were silent. Keep each body's velocity from before the step.
- **A seated person pins their seat.** Their solid box covers the stool or task chair under them, so physics leaves
  it fixed instead of letting the player shove it out from under them.

### Wave 1 (2026-11-20, God)

- **Never let go of a thing inside a wall.** A carried item sits a fixed distance ahead of the eye (0.42 m small, 0.95 m
  big); standing 30 cm from a wall that is inside or past a 14 cm wall, and a remote thrown there flew into the pool hall
  and came to rest on furniture beyond (the "sticks in mid-air" report). Ray-cast from the eye to the hold point each
  frame and keep the item half its footprint short of anything fixed. CCD on anything that's been carried (a thrown
  remote covers 9 cm a step, more than its thickness).
- **Rapier has no rolling resistance.** A bar stool landing on its side (seat and base rims) rolled and rocked at
  0.1-0.7 rad/s for as long as we watched and never slept. Damp hard once a body is slow (under 0.3 m/s and 1.5 rad/s):
  `attach(..., { settle: 5 })` in physics-world. Thrown and released bodies get their normal damping back at once.
- **Ride, don't wake, on a gentle shove.** Waking a lamp the moment its table moved let the solver slip the table 2-3 cm
  under it on slow frames, though a real lamp on felt pads would never slide at that push. Things resting on a prop now
  ride along as plain models in its frame and only get a body when a person would see them come loose: the prop lifted
  away, tipped past 5 degrees, or jolted harder than 0.4 g.
- **A pile is separate things.** One "newspaper stack" model came away as a lump. Five papers, each a rest item on the
  one under it (the highest surface under an item's middle is its support), and only the top one is offered.
- **Hold a tall thing by its middle.** A floor lamp held by its base at chest height put its shade through the ceiling.
- **A plug is a property, not a lamp type.** `pluggable(obj, { tether, glow, light })` gives anything a cord, plug, glow
  and a light that follows it; every free outlet offers itself to whichever plug is in reach (the one in your hand
  first). Outlets on floor 2 need their own floor height for the cord's tail.
- **Static friction.** Lying across the seam of two floor boxes, a hull is nudged sideways by their edges and crept
  7 cm in 3 s even with rolling resistance. Under 15 cm/s for half a second, touching only fixed or sleeping things, it is
  put to sleep and stays parked: woken again with nothing moving against it, it goes straight back to sleep.
- **A support is under you, not beside you.** A paper put down next to the pile became the bottom paper's "support"
  (its top was within 4 cm of the paper's bottom) and, still settling, dragged the whole pile awake. A support's top must
  be at or just below the item's bottom, and the support itself below it.
- **Doors dwell on presence, not a clock.** Upstairs the car held its doors 4 s; a slow walker (or a loaded test
  machine) arrived to closed doors. Someone in the doorway or in the car with nothing called holds them; "Close" shuts
  them on a rider, never on the doorway; closing on someone, they reopen.
- **Serve the physics engine with the game.** Rapier from a CDN timed out (ERR_TIMED_OUT) and held the page; the dev
  page now loads it from node_modules (the packaged build rewrites the import map), and createWorld gives up after 30 s so
  the game falls back to walking without physics instead of hanging.
- **A button that lights needs its own material.** The hall call buttons shared one cached `F.glow` material (at 0.1,
  never changed), and the car's buttons shared the cabin's steel: nothing could light alone. Clone per button; a floor
  stays lit from the press until the car arrives, door open/close light while pressed.

## Small geometry against floors and walls

- **Know the real surface height.** The lobby floor's top is y = 0.01, not 0. A 5 mm cord laid at 0.016 clipped.
- **Splines overshoot at bends:** resample and clamp to the surface.
- **Things on walls need a wall.** Two outlets were placed past the end of the wall they were meant for.

## Lived in (rigid and clean reads as lifeless)

- **Nothing people move is square.** Seed a small settle (about ±2° and ±1.5 cm) into every loose prop from its
  position, so it's stable between visits. Apply it where props are tagged loose, so new props get it for free.
- **Wear goes where feet go.** Floor traffic along real walking lines (doors to desk, in front of counters and
  machines), shoe scuffs on toe kicks, cart rubber at hub height on door jambs, rings by the coffee dispensers.
- **Too much wear reads as a bug.** Discrete dark blotches looked like stains or shadow artifacts. Wear is a faint,
  continuous loss of finish: tightly overlapped soft patches at about 20 % opacity, slightly grey rather than brown.
- **Cheap:** one merged mesh per kind of mark over one canvas texture (one draw call each), polygon offset against
  the surface rather than lifting it.

## One environment (2026-11-20)

- **Swapping global reflections per zone breaks the building in two.** From the lot, the lobby floor reflected blue
  sky; step inside and it flipped to wood, and each zone's capture differed. Fix: one interior capture at load (lamps
  aimed at the lobby first), set as `material.envMap` on every mesh inside the building footprint; `scene.environment`
  stays the sky. Streamed props are tagged as they arrive. Only the dark room scales its own materials.
- **PMREM can leave its render target bound:** restore `renderer.setRenderTarget` after a capture or the canvas goes
  black with no error.

## Pick-up (2026-11-20)

- **Small things rest as plain models** and get a physics body only when taken: on approximate counter boxes a body
  would be pinned or launched at load.
- **Mark them in the model** (`take_<noun>`, parts parented) and keep them out of the material merge; the game lifts
  them out by name.
- **Small pickups must not steal focus:** an apple on the counter beat the desk's "Check in". Close range (0.85 m) and
  a direct look for small items.
- **Hold small things in hand** (low, to the right, 0.4 m), not at arm's length like a chair. E puts down, Q throws,
  and E still works on what you look at, so you can use the TV with its remote in hand.

## Publishing

- **Pins resolve from receipts in order.** Read them in natural numeric order (assets-11 after assets-6), or an older
  batch silently overrides a newer model.
- Every new part must be in `parts/parts.json` or the publisher rejects anything that uses it.

## Floors, palette and light (2026-11-20, lobby re-floor)

- **One floor finish everywhere reads as a showroom.** Pale oak wall to wall made the lobby "white and empty" (mean luma
  195). Real lobbies zone the floor: carpet under every seating group, hard LVT/tile on the walk paths. Cut the floor
  slab with holes and lay carpet insets at the *same* height (top y = 0.01); let architecture draw the edge (the column
  line is the carpet edge here).
- **Pieces of one floor show seams** when each box starts its UVs at 0. Give slab top/bottom faces world-space UVs
  (u = x, v = -z) so a floor cut into pieces runs on without a joint.
- **Fine pattern vanishes at standing distance.** A striated loop pile at 0.5 m a tile mipmapped to flat charcoal.
  The stripe spacing has to be 15-30 cm to survive (1 m a tile), with the stripes' contrast lifted in the grade. Check it
  in a player-eye shot, not a texture preview.
- **A multiplied tint darkens twice.** `color` multiplies the scan in linear space: a mid-grey scan times a mid
  blue-grey came out near black. Tint with a light colour (#b4c6e8) and let the scan carry the value.
- **Point lights below the ceiling light the ceiling.** Anchors at 2.1 m (ceiling 2.95) made the ceiling the brightest
  thing in the room (216/255, 23 % blown) and hotspots in the corridor, room 212 and the bathroom. Put ceiling anchors
  1 cm *above* the ceiling face: the ceiling faces away from them, so only the floor and furniture take the light, as
  under real cans. Raise intensity a little for the longer drop.
- **Emissive discs at intensity > 2 blow out** into white ellipses. A downlight is a lens that falls off into a dark
  baffle inside a white trim: one radial-gradient emissiveMap on a white material, intensity ~1.5.
- **A strong colour accent needs a reason.** A navy fabric panel on each column face, with a nailhead border, turned
  two blank white slabs into the reference's signature element; mustard and heather accent chairs (the same chair, its
  fabric material cloned and recoloured) broke up the all-navy seating.
- **Remove what the reference doesn't have.** Toy triangle rugs on top of the new carpet: deleted, not redrawn.

## Screens (2026-11-20)

- **Every TV was black: the indoor reflection multiplied it out.** The interior envMap goes on every material inside
  the building, and a `MeshBasicMaterial` combines its map with the envMap by multiplying (reflectivity 1). A lit
  screen needs `reflectivity: 0` (or no envMap). Query the material, don't assume the channel art is broken.

## People (2026-11-20)

- **Check what the meshes are called before matching names.** The shirt tint matched `/Top_shirt/`; Rocketbox meshes
  are `Body`, `Hair`, `Outfit_original`, `Skin_original`, so duplicates were identical twins. The outfit is one mesh over
  a shared atlas: a half-strength tint recolours it and keeps the weave.
- **Same model, same breath.** `reset()` starts every Idle at t = 0: start each at a random time and rate (0.85-1.15).
- **Feet skate when the clip's speed isn't the walker's.** Measure the walk clip's own speed (foot travel against the
  hips over the stance: 1.0-1.2 m/s for these rigs) and set `timeScale = speed / gait`.
- **People turn, they don't snap.** Turn at most 3 rad/s and slow to a stop while facing well away (turn on the spot,
  then set off).
- **Step round, don't freeze.** Someone in the way: bend the heading away from their side, slow a little, and only stop
  when they're right in front.
- **Layer procedural motion after the mixer.** The clips key every bone (240 channels = 80 bones x 3, face bones
  too), so head look-at, blinks (the rig's `Bip01 ?EyeBlinkTop` bones turned about their own z; -0.8 rad brings the lid about half down, larger angles fold back open), weight shifts and poses
  are applied as world-space rotations on top, each frame, after `mixer.update`. Rotating a bone by a world rotation:
  `local' = parentWorld^-1 * q * parentWorld * local` (getting the order wrong bent knees backwards).
- **Only look when it makes sense:** near (< 4 m), in front (< ~110 deg) and on the same floor: the housekeeper upstairs
  was turning to look at the player through the floor. Ease the weight in and out.
- **Sitting from the rig.** No CC0/MIT sitting clip: thighs forward ~86 deg, knees back ~83 deg, arms forward with
  forearms raised (hands in the lap or on a keyboard), hips set on the seat from the standing hip height. Reads right
  at player distance on a sofa, a bar stool and a task chair.
- **A clerk must be seen from where the guest stands.** Dana stood behind the right pod's monitor; between the pods her
  face is in view. The check ray-casts from the guest's eye to her head.
- **Give a static person a loop.** The trucker pours (cup appears in hand, forearm raised), walks the cup down the east
  hall to his room, disappears for a while, and comes back for another. (Now one of his activities, chosen by need: see intent below.)
- **Check a clip for root motion before blaming the walker (Cast).** Rocketbox's Walk moves the hips ~1.2 m forward
  over its 1.2 s cycle and snaps back on loop; on top of the walker's own movement that read as "walk-teleporting".
  Subtract the straight-line x/z drift from the hips track once per clip (`inPlace` in people.js); the walker's speed
  carries the body.
- **Measure a sitter against the furniture's mesh, not its collider box.** The sofa guest sat half off the end of the
  chaise facing along it (box says seat, mesh says edge), so his shins went into the cushion. Ray-cast the seat profile
  (height, front edge, back-cushion face) and seat the hip joints (thigh bones, not the Hips bone) ~9 cm over the
  surface (ANSUR seated hip-joint height) less the cushion's give (sofa 3 cm, vinyl stool 0.5 cm).
- **Fixed joint angles can't fit every seat: use two-bone IK.** Rough pose first (sets the bend planes), then IK the
  ankles onto what the feet rest on (floor; a bar stool's ring at 0.26 m) and the wrists onto the thighs, a keyboard or
  a tabletop. The old fixed forearm angle left hands hanging in the air ("arms outstretched"). Keep IK targets inside
  arm's reach (~0.5 m shoulder to wrist on these rigs) or the arm locks straight: move the sitter nearer the desk instead.
- **Short rigs dangle on high seats.** These bodies' knees reach only ~0.46 m with feet flat; a 0.47 m sofa slopes the
  thighs slightly down. Real enough as cushion give; don't force knees level or the feet leave the floor.
- **People never overlap.** Steering alone fails when two meet head on: both keep right (bend the heading the same way
  when nearly centred), and a soft positional push apart (0.6 m between bodies, 0.85 m to a cart) guarantees no
  interpenetration. A housekeeping cart rolls (pushed it swings toward her heading, pulled it trails), it doesn't orbit
  her at arm's length when she turns.
- **Ease in and out.** 1.2 m/s² to get going, 1.6 to stop, slowing on the approach (v ≤ √(2·a·d)); corners are cut
  (0.35 m) instead of stopping at each waypoint.
- **Nobody vanishes in front of you.** Going into a room waits at the door until the player is > 7 m away or on
  another floor; coming out likewise.
- **Residents are data with reasons.** Who, why, needs that build up, activities that meet them (intent.js); the next
  activity is chosen by need, so the trucker alternates coffee, the vending machine and checking his rig, not one loop.

## Sound (2026-11-20)

- **Impacts by energy and material.** Loudness from ½mv² on a log scale (4 mJ is the quietest audible, ~60 J full),
  fading with distance; under that, silence (a key card settling, a pen nudged). Material picks the clip: Kenney Impact
  Sounds (CC0) wood, plate (ceramic), generic (plastic), metal, soft; paper is a synthesized slap. Small things play
  higher, big ones lower.

- **A paper sound for paper.** Opening or turning a newspaper is a synthesized rustle (soft band of noise plus a few
  quick high crackles); a dropped paper is a slap, and a light one is silent.

## Save (2026-11-20, God)

- **Save what the player changed, not the world.** Bag, wallet, goal, time of day, where you stand, each prop that's off
  its built pose by more than 5 mm or 1 degree (keyed by model name and where it was built), and which outlet each plug is
  in. Positions restore before the first frame; what rests on what is worked out again afterwards.
- **Storage can fail.** Private windows and full quotas throw: every touch of localStorage is in try/catch and the game
  plays the same without it. A saved spot inside the elevator shaft is moved to the hall (the car may be on another
  floor when you come back).

## Fabric, pillows and wall graphics (2026-11-20, Victor)

- **A weave map alone reads as smooth foam.** The sectional had the herringbone's normal and roughness over a flat
  colour: at 3 m every texel mipmaps to the same grey, and the 3500 K downlights turned that grey into putty taupe.
  Heathered upholstery reads from its *colour* variation: a melange colour map (Poly Haven jogging_melange) with its
  mottling contrast lifted x1.6 (it survives mipmapping), under the herringbone weave relief.
- **Pick fabric colour for the light it sits in.** A neutral light grey (sRGB ~195) came out warm off-white under the
  warm lobby lights. Bake the target into the map, cooler than you want (~174/179/198): a glTF baseColorFactor cannot
  brighten (max 1), so lightening and cooling a scan has to happen in the texture.
- **Patterned pillows are a print, not a tint.** The reference's navy pillows carry an ogee lattice; solid navy and
  cobalt read as plastic. Draw the jacquard as a seamless tile at the cube-projection's physical tile (here 0.27 m =
  3 x 2 ogees, each 9 x 13.5 cm), soften edges a pixel or two (woven, not printed), keep the weave normal on top. Check
  the fill colour sequence repeats with the tile period, or a seam shows where the tile wraps.
- **Slump has to be bigger than feels right in a studio render** to show from standing height: seat hollows 3 cm (not
  1.5), back cushions dented 3-4 cm where backs lean, pillows tipped back 24 deg with their tops flopped 6 cm.
- **Map graphics: public land is blocky.** Forest tracts drawn as noisy blobs looked like ink splats; built from
  survey-grid cells (3 % of the width) they read as real land parcels. Rivers wander with a couple of low-frequency
  sines pinned at their control points; per-vertex random wobble makes seismographs.
- **Wall murals are printed in panels.** Two faint butt seams at 1.37 m (54 in) intervals sell "vinyl on a wall".
- **Art reads as art from its frame depth.** A 22 x 30 mm moulding with the mat set 5 mm back and a bevel-cut window
  casts a real inner shadow; a flat picture on a box did not. Hang each piece a fraction of a degree off true.

## Front-desk hardware (2026-11-20, Victor)

- **Devices read from their faces, and the face must match the relief.** A keypad drawn on a flat box reads as a
  sticker; boxes for keys with no legends read as toys. Draw the face (screen, legends, LEDs) as one print with its
  key rects saved next to it (labels/desk.json), raise each key as a frustum exactly on its drawn rect, and project
  every face part's UVs from the same print: legends land on the caps, cap sides take the cap colour.
- **Proportions come from the spec sheet:** a TM-T88-class printer is 145 x 195 x 148 mm with a clamshell cover over a
  shallow paper exit (a full-depth slot reads as two stacked boxes); a countertop PIN pad is a 187 x 82 mm wedge on a
  swivel stand, tilted at the guest; a desk phone leans ~48 deg on a foot with its handset in a left cradle.
- **Cables make equipment look installed.** Power and data leads leaving the back and dropping into a desk grommet, a
  coiled handset cord. A NURBS helix keeps Blender's default 12 segments per point: 700 points became 100k triangles.
  Dense point lists need resolution_u 1.
- **Screens are on.** A staff monitor shows a live PMS page (invented), dimly emissive, glossy.
- **Check UVs in local space.** `box()` leaves the object at its location with vertices centred on it: a UV formula
  written for world heights mapped only half the PMS onto the screen.

## Room 212 art, popcorn ceiling, pool corridor (2026-11-20, Natasha)

- **Art over a headboard needs headroom.** The 1.45 x 0.58 m print was centred 2.12 m up on the headboard wall, and
  the headboard (about 1.6 m) ran into its frame (B8). Cause: art placed by the wall's centre, not by what is in front of
  it. Fix: the print moved to the bathroom wall facing the bed (z 4.1), centred 1.6 m up, clear of nightstand and lamp.
- **Popcorn is grain, not bumps.** A bump map of 1-4 mm lumps sparkled (white dots) at standing distance, because bump
  mapping shades from screen-space derivatives and those alias. Fix: build a normal map from the same height field
  (normal maps mipmap cleanly), keep it gentle (0.6), and put the crevice shade in the colour map. Draw it at true scale
  (0.5 m tile, ~1 mm a pixel, lumps wrapped at the edges). The bathroom stays smooth drywall, as redone bathrooms do.
- **A wet route doesn't cross the lobby.** The only way to the pool was the glass door beside the check-in pods, so
  every wet guest crossed the lobby. Real limited-service hotels reach the pool from a back guest corridor. Fix: a
  key-card pool door at the end of a tiled, single-storey link along the back, entered beside the stair. Its tile floor
  says "wet route"; carpet there would read wrong.
- **Wall reveals show the wall's skins.** A door cut through an exterior facade (stone or charcoal skin, plus paint)
  showed bands of stone in its jambs once that facade became an interior wall. Fix: painted jamb and head liners
  through the full depth.
- **Ceiling tile's relief sparkles under cans set flush with it.** In a narrow corridor the acoustic tile's normal map
  glittered around each downlight. A humid link corridor gets painted gypsum anyway.
- **A door plate can end up inside the wall.** openableDoor hangs its number plate 11 cm in front of the leaf. In a
  28 cm reveal the plate sits inside the wall, so use a wall sign beside the door instead.
- **A stair tower is painted block, not lobby plaster.** Stair A's walls had the same warm-white plaster as the lobby,
  so it read as a hallway with steps in it. Fix (B9): thin liners inside the tower with painted CMU drawn at true
  scale: 406 x 203 mm blocks in running bond, 10 mm tooled joints as a normal map, semi-gloss (roughness 0.55).
  Lit by surface-mounted LED wraparounds on the walls rather than hidden cans, with fire-code floor ID signs
  (floor, stair, exit direction) on the stair side of each door.

## Residents going wild (2026-11-21, lead)

- **Procedural turns must start from a known pose each frame.** Breath, gaze and posture turns are applied on top of
  what the mixer wrote. Bones the clips don't drive (or have stopped driving: frozen idle, seated) kept last frame's
  turn, so turns piled up, quaternions drifted off unit length and limbs scaled: arms growing and shrinking, a seated
  guest folding through the sofa, one stretching across the screen. Fix: people.js restores every bone's bind pose
  before mixer.update. Probe: max |q| - 1 over all bones stays 0 for 20 s.

## Cast (2026-11-21)

Study: `GAIT-AND-POSE.md`; rules as data + logic in `body.js` (CC0, no rig or renderer: a reusable "behaviour" part
with `intent.js`), applied to the Rocketbox rigs by `people.js`.

- **Doll-like = continuous motion without reasons.** Measure it: share of time the head turns > 5 deg/s with nobody
  around. Real people at rest: well under 25 % (still, then a 0.2-0.6 s gaze shift). Ours were 38-69 %.
- **Never play a standing idle under a seated pose.** The idle's hip sway (6-11 deg) rocked the whole seated torso and
  IK dragged the hands after it: the sofa guy's "wily shifting". Seated people breathe; that's all, until they change
  posture because they changed what they're doing (an intent beat: TV → phone), blended over ~2 s minimum-jerk.
- **A looping idle is a metronome.** Hold a stance instead (two frames of the authored idle where the hips are over
  each foot: contrapposto), shift weight now and then (lognormal hold, median 22 s; ~1 s shift). Only frames with both
  feet where they are, or the blend slides the feet. The idle's head also looks about by itself (+-25-35 deg): hold the
  neck and head at a straight-ahead frame and let the gaze system turn them.
- **Gaze is fixations on things.** Give everyone real targets (TV, phone, screen, the path ahead, the counter) and
  pick one at a time with lognormal durations (TV looks median 7 s: attentional inertia); look away at nothing
  sometimes. Eyes jump first (the rig has eye bones), the head follows over ~0.3 s for what's beyond ~10 deg, the
  torso only past the head's range; the eyes re-centre as the head arrives. A sound turns the head first.
- **Notice people like people.** Glance at someone entering ~7 m in view; don't stare at someone passing close (civil
  inattention); someone who stops beside you (< 2.2 m, 1.5 s) gets looked at, alternating with what you were doing.
  A clerk on duty engages at 3.2 m after 0.3 s and looks at the guest ~85 % of the time.
- **Slow walkers aren't slow motion.** Time-scaling the clip by v / clip speed keeps the stride and puts everything in
  cadence (50 steps/min at 0.6 m/s). Keep the walk ratio (step / cadence) constant: cadence ∝ sqrt(v), and scale the
  limbs' swing about the standing pose by step / clip step, then re-ground the lowest foot. Feet don't skate.
- **Measure the furniture, not the comment.** The nurse's feet were "on the stool's ring at 0.26": there is no ring; the
  front rail tops out at 0.46 m (z -4.78). Ray-cast the stool mesh before placing feet.
- **Procedural layers start from a known pose every frame** (lead's fix, above): with frozen or seated poses nothing
  else resets the bones. check.mjs people probes |q| - 1 and bone scale over 20 s.
- **Know the rig's hierarchy before ordering layers.** On these Rocketbox rigs the collarbones are children of the
  *neck*, so every head turn moved the shoulders and pulled IK'd hands 10-12 cm off the table. Arm IK runs last, after
  the gaze turns.
- **A check on randomness needs a long enough window.** "Two people breathe out of step" over 3 s failed 2.7 % of the
  time by chance; over 30 s, never (2000 seeded trials).
- **Hands need a wrist and fingers, not just a reach.** Two-bone IK only puts the wrist on the target; the palm faced
  wherever the chain left it (up, on the keyboard) and the fingers stayed splayed from the bind pose. Fix: after IK,
  turn the hand so the palm faces what it rests on (down on a desk, table or thigh; up and in around a phone) with the
  fingers continuing the forearm, then curl the fingers per grip (people.js CURL). Palm and curl directions are
  measured from the rig once (bone axes differ between rigs).
- **Dead eyes are matte eyes.** The eyeballs are painted into the head atlas and took the skin's roughness, so they
  never caught a highlight. The vertices weighted to the eye bones give their UV island (u 0.207-0.320, v 0.875-0.989
  on every Rocketbox head here); the shader makes it glossy there. Eyes also turn at most 15 degrees: past that the
  head turns, as people do; at 25 they parked in the corners (side-eye).
- **Casual looks are slow, startles are quick.** Head spring 6 rad/s for looking about, 14 for a noise.
- **Carts don't dodge.** In a corridor the pusher only eases over and keeps rolling; the person on foot keeps to the
  wall and slows.
- **Being hit is a story, not an event** (2026-11-22). The first hit startles (a ~0.15 s beat, then hands up to the
  face and the head to the impact), the second annoys (turn to face you, hands up at the chest, a sharp plain line),
  the third ends it (guests leave for their room or car; Dana calls the police, `game.flags.policeCalled`, saved, and
  won't serve you). Data in each resident's `reacts` (intent.js `reaction()`); a cooldown stops one rolling prop from
  counting three times. People aren't physics bodies: a per-frame distance test from flying props to each body, and
  the prop bounces off (reversed, 20 %) instead of flying through them.
- **Hands blend between every hold.** Keys → guard → rest snapped in one frame when hold() was set directly; one
  smoothed pair of targets per walker (staff.js hands()) that falls back to where the idle carries the hands (caught
  in the body's frame while standing) fixes every transition, including leaving the keyboard.
- **A check-in is beats at the keyboard.** She types with her eyes on the screen, looks up only when she talks or
  needs something, keeps her hands on the keys while she does, steps to the counter to take the card, and holds the key
  card out over the counter's near edge (an arm only reaches ~0.6 m: the far edge was out of reach, the IK fell short).
  Scripted looks use `person.fix(at)`; attention's random glances would break the beat.
- **The stillness check was measuring the housekeeper.** `__inn.people[0]` is Maria (residents order), not Dana; it
  passed or failed with whether Maria happened to be walking. Now it measures `world.clerk`.

## Things say how they're used (2026-11-21)
- Seen: the rep's hands floated 20 cm short of his keyboard (hand points typed in by hand, guessed); Dana stood still and
  waved, with no keyboard on her pod at all.
- Cause: every touch was hand-placed per person; nothing tied a hand to the object it was meant to be on.
- Fix: `affords.js`. A model part lists its touch spots in its own frame (keyboard, mouse, screen); a kind says where wrists
  go, the grip, the motion (typing bursts, mousing) and the sound per touch. People only say `['use', 'keyboard']`. Dana is
  now a resident (intent.js) who types at her pod and steps to the gap to serve whoever comes up.
- Next: more kinds (door handle, coffee pot lever, ice-machine button, chair seat, bed, cart handle), spots authored in
  Blender as empties and carried in the part record, so new objects work without code.

## Lobby engineering (2026-11-21)
- **Things float without contact shade.** Seen: columns, pods, bins and walls met the floor with no darkening; on phones
  (no shadow maps) everything floated. Cause: point lights cast no shadows, and nothing stood in for ambient occlusion.
  Fix: `buildFloorShade` (lived-in.js) paints one canvas from what stands on the floor (mesh boxes under 6 m², plus the
  tall colliders for walls): a wide soft falloff by height and a tight warm-dark contact line, multiplied over the floor.
  One draw call. Round things get an ellipse (a square shade under a pot reads as a bug); invisible gap closers are low
  colliders and are skipped.
- **A multiply overlay must not get a reflection map.** main.js tags every interior material with the captured env; on
  a MeshBasicMaterial with multiply blending that turned the whole floor black. `material.userData.noEnv` opts out.
- **Paint from the first frame, not at build.** At build time the highway cars sit at the origin until their updaters
  run: their wheels drew dark blocks in the middle of the lobby floor.
- **Walls need a base.** A painted wall meeting LVT bare is the most CG junction in the room. `buildCoveBase` puts a
  4-inch rubber cove on every wall piece face looking into the lobby (from the wall boxes, so glass and millwork get none).
- **Spills are decals with a cause, not a fluid sim.** A coffee cup, the clerk's mug or a creamer bottle (only a hard
  hit pops its cap) that lands hard leaves one puddle where it first hits, running ahead of the throw. What makes it
  read as liquid and not paint: a thick dark middle fading to a thin see-through edge, a bright hairline meniscus at the
  rim, and low roughness with the room reflected in it (the interior env map must be copied on: materials made after
  load miss main.js's tagging). On carpet it soaks instead: matte, darker, and it wicks ~45 % wider over 2 s.
- **Never put a decal on something that moves, or past an edge.** Milk landed on a bar-stool seat and hung in the air
  past it. Loose props are skipped (the liquid runs to the floor below); on counters the sheet shrinks until four rim
  points find the same top.
- **White on white disappears; a puck is not a lid.** A torn sugar packet in counter white and 1 mm grains vanished at
  arm's length; packets are a shade warmer than the counter and grains catch a little emission so they glint. A
  cylinder lid read as a hockey puck: use the lid's real profile (lathe, double-sided). Coffee rings in a dull
  brown-grey read as grime; keep them warm.
- **A blank ceiling is 40 % of the entry view.** Real ones carry services: 4-way supply diffusers with the grey smudge
  halo their air throw leaves on the paint, egg-crate returns, pendant sprinklers on a ~3.6 m grid, dome cameras over
  the desk, doors and market (lobby.js, instanced, ~10 draw calls). The diffuser throat must be mid-grey, not black: black
  rings read as a graphic, not a void with light in it.

## Phone performance (2026-11-21)
- **One transmissive material doubles the frame.** The wall clock's glass (and the pole insulators) used
  KHR_materials_transmission; whenever one is in view three renders every opaque object again into a transmission
  target. Lobby at the phone tier: 1853 -> 956 draw calls from the entrance, with no visible change. assets.js budget()
  turns transmission into plain alpha for every model. Check `transmission > 0` before anything else.
- **Where the calls went** (phone tier, from the entrance, after the transmission fix: 956): parked cars instanced as one
  InstancedMesh per part across the whole lot (its bounding sphere held the camera, so it was never frustum-culled);
  every loose prop drawn from everywhere (zone culling treats anything movable as "always"); anything placed against a
  wall (zone culling wants 25 cm to spare) drawn from every zone, so room 212's furniture from the lobby; the elevator
  car's ~30 button materials behind shut doors; one draw call per material per prop.
- **Fixes, none visible:** instance per 32 m cell; on phones, hide loose props (and the moving housekeeping cart) whose
  zone can't be seen or which are too small to read at their distance (8 m + 30 m per metre of size); pin small statics to
  the zone of their centre; hide the car while its doors are shut and you're not in it; merge each prop's meshes by
  material and, on phones, collapse flat-colour materials into shared vertex-colour ones (glossy or matte,
  metal or not); merge the building's small loose meshes per 8 m cell; a brochure's four edges in one group, not four.
- **Merging breaks what code finds by name or toggles.** Guard by name (doors, leaves, drawers, sockets, screens, lights,
  made/unmade bedding) and skip anything hidden at merge time (the unmade bed is hidden until you sleep; merged, it
  would have shown). Meshes code toggles directly get `userData.keep`.
- **Phones, second pass:** merge across props per 8 m cell (they share the print atlases, oak, quartz, the flat set);
  parked cars and street furniture flatten even their textured parts on phones, coloured by the texture's mean texel (a
  tyre's tread is a few pixels through the lobby glass); brochures are two draw calls, not six (edges drawn with the
  back). Flat geometry for instancing is normalised to position+normal+colour first, or mergeGeometries refuses it.
- **Triangles: decimate the soft things, never the boxes.** A bar stool was 10k triangles, 9k of them its two foam
  cushions; the sectional 42k. `blender/mobile_lod.py` writes `<id>-mobile.glb` with meshes over 2500 triangles
  decimated to ~30 % (custom normals cleared, smooth by angle 40°) and textures at 512 px; carton/print clutter is left
  alone (collapsing a 12-triangle box wrecks it). assets.js loads them on phones (MOBILE_LOD). Seven props: 1.86 M
  -> 0.62 M triangles in source, the lobby entrance view 676k -> 533k. Careful with suffixes: a rename loop over
  `*-phone.glb` also caught `hotel-phone.glb` (the phone on the table).

## Things a real lobby must show (2026-11-21)
- **Stepped solid shapes read as missing texture.** The map mural's public land was solid navy section-grid cells: from
  the sofa, black pixel blocks. Now a darker blue tone at half opacity with soft irregular edges (prints.mjs), as
  wayfinding murals shade it.
- **A Korean extinguisher in a Missouri hotel** is a tell anyone who has worked in one spots. `hotel-extinguisher-cabinet`
  (blender/lifesafety.py): semi-recessed white cabinet, acrylic door with the red vertical lettering, a 10 lb ABC unit with
  gauge, hose and a yellow inspection tag. The "recess" is faked: a white tub back panel just in front of the wall face,
  so the wall never has to be cut. Replaced everywhere; two added in the lobby. Check what a wall already carries before
  hanging something (the first spot was on the map mural).
- **Paper the law requires:** the innkeeper's notice (RSMo 419.010) framed on the slat wall at the desk; AUTOMATIC
  CAUTION DOOR decals on both faces of both slider leaves at 1.27 m (A156.10).
- **Closed, not gone.** The breakfast bar was hidden at night; real ones stand there with lids down, cereal in the
  dispensers and the food and juice put away. Only food/batter/juice nodes hide, and those names are kept out of merging.
- **Glass smudges are haze, not hands.** Drawn palms with finger dots read as cartoon footprints. Smeared ovals at odd
  angles where palms land (0.9-1.5 m, toward the meeting edge), a scatter of fingertip dots, a faint wipe arc, low
  alpha. A mirrored (scale.x -1) plane flips its winding and gets culled: make it double-sided.
- **Lit appliances throw light on the floor.** A soft cold additive pool in front of the cooler and vending machines,
  no light source (phones have four). Make the pool fade to nothing at every edge except the machine's, or it's a
  bright rectangle on the floor.

## Kinds pass (2026-11-21)
- **Lamps without cords (room 212)** → each lamp was wired where it was placed, so the bedroom's were built without the lobby's cord code → `kinds.js` + `world/put.js`: a model's kind gives it its cord, plug, switch, light; every lamp in the building now comes from one path. `check.mjs lint` reports any model of a kind placed without `put()`.
- **Cords climbing walls** → the cord's ground cast starts 30 cm above each link; a link against a wall starts inside it, the hit at distance 0 read as ground 30 cm up, every frame → ground only counts within 5 cm above the link.
- **Cords springing up 70 cm** → Verlet keeps a position correction as velocity: a link snapped onto a nightstand top bounced → kill the vertical velocity when a link is stopped by a surface.
- **Cord through the wall behind a desk** → pushed out of the desk's nearest side, which was its back against the wall → cords collide with the walker's colliders too, leaving toward the lamp's side first (a thin wall's nearest face can be the outside).
- **Extinguisher in the pool-corridor door swing; two semis overlapping by 2 m** → nobody checks placements → `check.mjs lint` (overlaps, door swings, sunk props).
- **Floor lamp through the floor / vanished when dragged by its plug** → continuous collision was only on for held props, and anything below -30 m was deleted → CCD on while leashed; a prop that falls 2.5 m below where it started goes back there instead of being deleted.

## Set pipeline round 1: king room, king bath, coffee counter (2026-11-22, Natasha)
- **Walk-in glass shower in a standard king** → the bath was dressed from a generic bathroom, not this class of room (every ref shows a tub/shower combo with a curtain) → `hotel-tub-shower` across the far wall, spout at the outside end, grab bars hidden (those are the accessible room's).
- **Lounge armchair at the desk** → a chair that existed stood in for the one that belongs → black swivel task chair on casters (`hotel-task-chair`), loose.
- **No wastebaskets in the room or bath** → nobody lists what's missing → the spec's inventory + `pipeline/diff.mjs` SHORT list; `small-bin` kind (stand-in: the lobby bin at 0.3 m until `hotel-room-wastebasket` lands).
- **Bath with no outlet** → GFCI on the side wall at the vanity end, 107 cm up; two duplexes behind the coffee towers at 1 m.
- **Lint calls a cup on the coffee counter an overlap** → the counter's box includes the towers baked into it (1.53 m), so nothing "stands on" it → bake nothing onto counters: items that do something are their own models with kinds (briefs/hotel-coffee-station.md); the abandoned cup waits for the bare counter.
- **Baked props can't have behaviour** → a kind attaches to a model, not to a node inside one (the headboard's stub sconces, the counter's towers) → brief anything a guest will use as its own GLB with its hooks.
