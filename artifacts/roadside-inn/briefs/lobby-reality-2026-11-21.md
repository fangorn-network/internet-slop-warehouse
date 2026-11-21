# Lobby reality brief, 2026-11-21 (reality consultant)

What a real limited-service highway hotel lobby (Holiday Inn Express "Formula Blue" type, Missouri, I-44/I-70
corridor, late November, 10 p.m.) actually is, at every scale, and where ours falls short. Research only. No code
was changed. The realism engineer builds from this brief. Owners follow the backlog's convention (Victor for
models, Natasha for space, surfaces and light, God for physics and sound, Cast for people).

Sources are cited inline. Where I give a number from physics or my own reasoning and not from a source, it says
**(derived)** or **(estimate)**, so nobody mistakes it for a spec.

---

## 0. What the current lobby gets wrong (from code and screenshots)

I read `world/lobby.js`, `world/lived-in.js`, `world/life-safety.js`, `world/entrance-doors.js`, `REALISM.md` and
`briefs/backlog-2026-11-21.md`, and looked at `natasha/final-*.png`, `checkpoint/people-*.png` and
`checkpoint/flow-breakfast.png`.

What is already right (keep it): the Formula Blue layout (pods, slat wall, market beside the desk, great room, map
mural, communal table), traffic-wear decals along walking lines, toe-kick scuffs, cart rubber on the corridor jambs,
coffee rings, a stir stick and two sugar packets, the ±2° settle on loose props, cords to outlets, the phone
charging on the communal table, newspapers, and the life-safety devices in the corridors.

What makes it read as "rigid, blocky, too clean, too orderly":

1. **The ceiling is a blank plane.** The entry shot (`final-lobby-entry.png`) is 40 % ceiling, and that ceiling holds only
   downlight discs. A real lobby ceiling is the busiest surface in the room: supply diffusers with dust halos,
   return grilles, sprinkler cover plates, smoke detectors, speaker/strobes, dome cameras, access panels, exit signs.
   `life-safety.js` puts lobby sprinklers on a grid, but in the screenshots they are too small or too flat to see.
2. **There is no wall-floor junction.** Walls go straight into the LVT with no 4 in (100 mm) rubber cove base, no dust
   line, and no darker band where the mop stops. That junction is what tells the eye a room has been lived in.
3. **The floor is one uniform finish over 18 x 18 m.** Same plank tone, same sheen, no grit near the entry, no dust in
   corners, nothing under furniture, no salt tide-line (it is November in Missouri).
4. **Every surface has the same just-installed finish.** Solid-surface pods with no hand-grease zone on the leading
   edge. Glass with no fingerprints. Columns with no chair dings. Paint with no touch-up patches. Upholstery with no
   darkened arms or seat fronts.
5. **The disorder is single items placed by hand, not layers left by use.** The coffee bar has one stick and two
   packets. A real one at 10 p.m. has a field of grains, a torn packet half, a creamer cup, wet trails under the
   faucets, a lid stack knocked askew, and napkins.
6. **The legally required paper is missing.** There is no innkeeper-liability notice at the desk (Missouri requires
   one), no "AUTOMATIC CAUTION DOOR" decals, no elevator fire sign at the call station, no fire extinguisher anywhere
   in the lobby, and no door-glass decal clutter. The one extinguisher model in use elsewhere,
   `ph-korean-fire-extinguisher-01`, is by its name a Korean-market unit, wrong for a US hotel (verify its label).
7. **Nothing changes with time.** At 10 p.m. the lobby looks as it does at noon. Real night lobbies dim, the night
   auditor's work spreads out, a wet-floor sign comes out, and the breakfast area sits closed but not empty.
8. **Liquids and powders don't exist as behaviour.** Cups are rigid props. Nothing spills, pools, soaks in or crunches.

---

## 1. How the lobby got this way: one day of use (why the disorder sits where it does)

Every mark should have a cause in this timeline. If a mark has no cause here, leave it out.

| Time | What happens | What it leaves |
|---|---|---|
| 5:00-6:00 | The night auditor or breakfast attendant sets out the hot breakfast. Night-audit job postings list "setting up breakfast for guests in the morning" ([Paylocity posting](https://recruiting.paylocity.com/Recruiting/Jobs/Details/4250416), [Wikipedia: Night auditor](https://en.wikipedia.org/wiki/Night_auditor)) | Cart-wheel tracks from the back office to the buffet |
| 6:00-9:30 | Breakfast peak. The waffle maker, cereal, juice, syrup. Families. | Syrup drips on the floor by the waffle station, cereal under the tables, sticky table edges, crumbs in chair seams. Breakfast attendants wipe tables but rarely the floor until after close |
| 9:30-11:00 | Breakfast teardown and checkout rush. Luggage carts stream out. | Cart rubber at hub height on jambs and columns, tracks across the entry |
| 11:00-15:00 | The quiet middle. A housekeeper or houseman vacuums and mops the public areas: "sweep, mop, and vacuum lobby, elevators, and stairwells daily … wipe glass, mirrors, and high-touch door handles" ([RoomMaster houseman checklist](https://www.roommaster.com/template/hotel-houseman-checklist)) | Fresh vacuum stripes on carpet. Mop edge lines 5-10 cm off the base. Corners, chair-leg feet and under-furniture zones missed |
| 15:00-21:00 | Check-in wave. Travellers in rain or snow. People take coffee 24/7 and buy at the market. The evening desk agent "keeps the lobby tidy and stocked with newspapers, brochures and coffee stations" ([Little Hotelier](https://littlehotelier.com/blog/running-your-property/hotel-front-desk-responsibilities)) | Grit and water past the mat, a sugar field at the coffee bar, fingerprints on the doors and cooler glass, trash bins filling up, gaps in the market |
| 21:00-23:00 | **Our scene.** Arrivals trickle in off the highway. A few guests sit in the great room with the TV on. Shift change at about 23:00 ([HospitalityNet](https://www.hospitalitynet.org/explainer/4113940.html)) | Everything above, about 8 hours after the last proper clean |
| 23:00-07:00 | The night auditor. Late arrivals, wake-up calls, complaints, "keep the lobby and surrounding environment clean" ([job listing](https://www.simplyhired.com/job/EaLlXxKk_cILWE4qoREmsDI6InLDTsvAaQaXzsfulbOO2e_zCsSuxA)), the audit around 1-3 a.m., reports printed, the shift handed off at 07:00 | Paper stacks, a printer running, the wet-floor sign out, the coffee bar wiped once |

**Cleaned nightly** (high-visibility, on the checklist): the coffee bar top, trash bins, glass doors (sometimes), the
front desk top, vacuuming the walk paths.
**Missed nightly** (the realism layer): corners and the wall-floor line, under and behind furniture, the tops of
anything above 1.8 m (vending tops, pendant tops, frame tops, door closers), the HVAC diffusers, upholstery crevices,
the toe kicks, the faces of cabinet doors under the coffee bar, plant leaves, the back of the brochure rack, the sill
track of the sliding doors.

---

## 2. Floors

### Real finishes and their numbers
- **LVT (walk paths):** commercial LVT has a 20 mil minimum wear layer, 28-40 mil in demanding settings ([Koffler](https://kofflersales.com/blog/wp-json/wp/v2/posts/9178), [Mannington](https://blog.manningtoncommercial.com/ultimate-guide-luxury-vinyl-tile)), under a factory urethane, often with aluminium oxide, which "turns white when scratched" ([Karndean](https://karndean.com/en/commercial-flooring/our-blog/2019/march/wear-layers-in-luxury-vinyl-flooring)). "Standard matte gloss level" is the norm ([Parterre](https://www.parterreflooring.com/?p=5514)).
  - Build: base roughness **0.55-0.7** with per-plank tone variation of ±6 % and a few planks visibly from a different
    lot. In traffic lanes the urethane micro-scratches: *duller and slightly lighter/greyer* (raise roughness by
    0.1 and lift value 3-5 %), never darker or brown. That matches the existing REALISM rule ("a faint, continuous
    loss of finish").
  - At standing distance, bevelled plank edges show as hairline darker seams where grime packs in. Those seams are
    darker in traffic lanes.
- **Carpet tile (seating groups):** commercial loop pile, typically solution-dyed nylon. "Low, dense loop pile shows
  traffic patterns the least", but "grit acts like sandpaper", and lanes show as **shading**: the pile lies over and
  reflects light differently ([Mannington](https://blog.manningtoncommercial.com/best-modular-carpet-office), [ConsumerAffairs](https://www.consumeraffairs.com/homeowners/best-carpet-tiles.html)).
  Tiles are rotated to even out wear, so the odd tile is a shade off (a newer replacement).
  - Build: roughness 0.95-1. Traffic lanes slightly *lighter and flatter* (crushed pile shows more of the tip).
    Tile seams show at a 61 cm (24 in) grid as faint lines. One or two tiles are a touch off-colour.
- **Walk-off mat (entry):** "roughly 80 % of soil … is tracked in on shoes" (ISSA, quoted by [CleanLink](https://www.cleanlink.com/hs/article/Floor-Care-Rolling-Out-The-Welcome-Mat--8939)); "85 % … can be contained within the first 15-18 ft with proper matting" ([AmTrust guide](https://AmTrustFinancial.com/getmedia/9e02d8bb-0bd9-4802-acac-cd3aaeeadde4/Did-You-Know-A-Best-Practices-Guide-for-Floor-Mats-and-Runners.pdf)). Hotels rarely have 15 ft of mat. Ours is about 1.8 m.
  - So the soil gradient runs **past the mat**: grit and dust are densest at the mat's inner edge and fade over about
    4-5 m along the walk to the desk. In November, add a faint **white salt tide-line** (dried meltwater rings) just
    inside the mat. Missouri treats roads with salt, and the residue tracks in.
  - The mat itself: dark centre where feet land, a lighter worn lane, one corner slightly curled or rippled, grit in
    the rubber border, and the mat a few degrees off square to the doors.

### Where dirt accumulates and why
- **Wall-floor line:** mops and vacuums stop 5-10 cm short. A grey dust/lint line 1-3 cm wide in the corner, darker
  in internal corners, with a crescent of buffing marks on the cove base.
- **Around fixed bases:** pod bases, column bases, the vending machine's feet, the communal table's pedestal. A darker
  ring, because cleaning tools go around them, not under.
- **Chair-leg zones:** little grey arcs and scratches where stools are dragged (LVT), and dimples in the carpet where
  furniture sits (crushed pile ~1 cm deeper in tone, visible when a chair is moved).
- **Under the coffee bar toe kick:** dried drips, a sugar crust, a wrapper that slid under.
- **Under the sectional:** a lost lid, crumbs, a coin, lint bunnies. Visible only crouched (crouch G1 makes this worth it).

### Behaviour on the floor
- **Hard floor (LVT):** spills bead up and spread to a puddle. Its thickness is set by surface tension:
  h ≈ 2·ℓc·sin(θ/2) (puddle-height relation, see [arXiv 1610.10090](https://arxiv.org/pdf/1610.10090), [capillary length](https://en.wikipedia.org/wiki/Capillary_length)).
  For water or coffee (ℓc ≈ 2.7 mm) on urethane-topped vinyl (θ about 70-90°, estimate), h ≈ **3-4 mm** (derived).
  For milk (lower surface tension, ℓc ≈ 2.2 mm), about **2.5-3 mm** (derived). A 12 oz (355 ml) spill that came to rest
  as one puddle would cover about 0.1 m² (a 35 cm circle) (derived). Real spills land with momentum: an elongated
  main sheet 40-70 cm along the throw direction, a fringe of fingers at its leading edge, satellite drops beyond it.
- **Carpet:** no standing pool after 1-3 s. The liquid wicks into the pile and backing, and the wet patch
  (darker, less sheen) ends up about **1.5-2x** the footprint of the liquid (estimate). As it dries over hours,
  the stain migrates to the edge (the coffee-ring effect, Deegan et al., *Nature* 389, 827, 1997,
  https://doi.org/10.1038/39827) and **re-appears after cleaning** because residue in the backing wicks back up
  ([Chem-Dry](https://chemdry.com/blog/carpet-cleaning-wicking), [CMM](https://cmmonline.com/articles/how-to-remove-reoccurring-carpet-spots)).
  So: old coffee spots on lobby carpet look like faint **rings with lighter centres**, not blobs.

---

## 3. Walls, columns and ceilings

### Walls
- **Finishes:** lobby walls are painted drywall in eggshell/satin (roughness about 0.6-0.75), with feature panels
  (our slat wall, the fabric column panels). Corridors use Type II vinyl wallcovering with visible seams every 54 in
  (1.37 m). Note it where the corridor mouths open off the lobby.
- **Rubber cove base, 4 in (100 mm), black or charcoal, everywhere** there is no millwork. It is the single most
  ubiquitous commercial-interior detail, and ours has none. It has a satin sheen, scuffed with shoe marks, a seam
  at each internal corner, an occasional lifting end.
- **Wear marks, each with its cause:**
  - Chair-back scuffs and slight dents at **0.75-0.9 m** on walls behind seating and the communal stools (stools
    tipped back), and behind the business-center task chairs.
  - Luggage-cart rubber and dings at **0.2-0.4 m** (wheels and deck) and **1.0-1.1 m** (the cart's rail) on corridor
    mouths, column corners and the elevator jambs. Already partly done on one jamb pair. Extend it.
  - **Corner guards:** clear polycarbonate or stainless, 1.2 m tall, on the outside corners at the corridor mouths
    and the market alcove. They exist *because of* the cart damage, and seeing them reads as "real hotel" at once.
  - **Paint touch-up "flashing":** rectangular patches 10-30 cm where a scuff was painted over, the same colour but a
    different sheen. Visible only at grazing light angles. Do it in the roughness channel (±0.1), not in colour.
  - Patched nail holes where art was moved: three or four tiny dimples near the painting.
  - Hand smudges at **1.0-1.3 m** beside door pulls and on the back-office door at the push plate.
- **Columns** (our navy fabric panels): the fabric pills and lightens at **0.9-1.2 m** on the walk side (bags, hips,
  carts brushing), and the white surround chips at the corners at cart-deck height.

### Ceilings
- **What a real one carries** (an empty ceiling is the biggest tell in our screenshots):
  - **Supply diffusers** (square louvered face, 24 x 24 in or 12 x 12 in neck in drywall) every 4-6 m, each with
    **smudging**: a grey haze around the face. "Dirt in the room air is deposited on the ceiling next to the diffuser
    where induction occurs"; square diffusers give "a graying effect" over a wide area ([Price Industries](https://blog.priceindustries.com/what-is-smudging), [ACHR News](https://www.achrnews.com/articles/121501-smudging-around-air-distribution-diffusers)).
    A textured ceiling concentrates it. Build: one radial grey decal per diffuser at 10-15 % opacity, stronger on the
    sides the louvres blow toward.
  - **Return grilles** (egg-crate or perforated), their louvres furred with grey dust.
  - **Sprinkler heads:** in public areas, concealed pendents with a flat white cover plate 2.75-3.3 in (70-84 mm)
    across, or semi-recessed chrome heads with an escutcheon. On a 3.0-3.3 m grid (already placed in life-safety.js;
    make them visible: they need a slight shadow gap and a white ring).
  - **Smoke detectors** at the elevator lobby (recall), **speaker/strobes** on walls or ceiling, **exit signs**.
  - **Dome security cameras** over the desk, the entry, the market and the elevator lobby: tinted acrylic dome
    10-15 cm, white housing. Almost universal, and nowhere in our lobby.
  - An **access panel** (30 x 30 cm white steel door with a cam latch), often with grubby fingerprints around the latch.
  - One or two **downlight trims** slightly yellowed, or a lamp of different CCT (see §4).
  - Over the coffee bar: a faint brown-grey stain from years of rising steam (estimate; subtle).
- **Surface:** lobby ceilings are often painted drywall with a light texture. Keep it matte (roughness 0.9-1) and *not
  uniform* in value: darker toward the walls (less light reaching them) and a hairline crack or tape-joint ridge
  here and there.

---

## 4. Lighting at night

- **Levels:** a common recommendation is about **10 fc (108 lux)** horizontal in a hotel lobby ([Houston CPTED table](https://www.houstontx.gov/police/cpted/lighting_information/recommended-footcandles.pdf)), with vendor guidance of 200-400 lux at night and higher at the reception desk ([Leviton hospitality guide](https://leviton.com/content/dam/contech/lliterature/Hospitality%20Lighting%20Guide.pdf)). The current IES document is RP-9-23 ([ANSI preview](https://webstore.ansi.org/preview-pages/IESNA/preview_IES+DG-25-17.pdf)).
  - Night practice (observed, common): the lobby drops to a scene setting after about 10-11 p.m. The decorative
    pendants and the logo stay on, while the general cans dim to about 50-60 %. **The desk stays brightest.** The
    great room becomes a pool of TV and lamp light, and the breakfast area dims furthest (closed).
- **Colour:** the brand uses warm-white downlights (3000-3500 K). The *mix* is what reads as real:
  - The cooler and vending fronts are **cold 5000-6500 K** LED tubes. They cast a bluish slab of light onto the floor
    in front of them.
  - Exit signs: **red** (US) letters with a faint red bloom on the ceiling and wall nearby, lit to ≥5 fc on the face
    ([CSE Magazine](https://www.csemag.com/exit-sign-and-emergency-light-requirements-for-facilities/)).
  - TV glow: a moving, blue-white wash on the sectional and the floor that changes with the picture (cheap to fake:
    sample the average colour of the TV texture every 200 ms into a point light).
  - **One mismatched lamp:** one can in the grid that is visibly cooler (4000 K) or dimmer. Maintenance replaced it with
    whatever was in stock. Extremely common, nearly free to build.
- **Flicker:** good LED drivers run at 120 Hz with under 10 % modulation (IEEE 1789's limit at 120 Hz), but "DC LEDs with
  simple/inexpensive drivers" and dimmed LEDs flicker ([DOE flicker review](https://www.energy.gov/sites/prod/files/2018/05/f51/lfi2018_miller_0.pdf), [DOE IEEE 1789](https://www.energy.gov/eere/ssl/articles/flicker-understanding-new-ieee-recommended-practice)).
  In a game, *one* failing tube in the market cooler or one can that pulses faintly (a 2-4 % brightness wobble at a
  few Hz, with an occasional dropout) reads as a real building. It also fits Late Checkout's horror. More than one
  reads as a bug. Respect the user's rule: no bug-looking effects.
- **Emergency lighting:** battery units (twin-head "frog eyes") on walls near exits and the corridor mouths. They
  must give 1 fc average along the egress path for 90 min, with a small green or red charging LED always lit and a
  test button ([Signify Bodine codes](https://signify.com/en-us/brands/bodine/resources/code-requirements)).
  The always-on charging LED is a nice tiny light in the dark lobby.

---

## 5. Entrance vestibule and sliding doors

- **Hardware:** a bi-parting automatic slider in aluminium storefront with an operator header and a motion/presence
  sensor. ANSI/BHMA A156.10 requires decals on both sides reading **"AUTOMATIC CAUTION DOOR"**, letters at least
  0.5 in (12.7 mm), centred at **50 ± 12 in** (1.27 m) since 2017, and on breakaway sliders a
  **"IN EMERGENCY PUSH TO OPEN"** sign ([I Dig Hardware](https://idighardware.com/2017/10/decoded-new-requirements-for-pedestrian-automatic-door-operators-and-sensors-december-2017/), [DH Pace owner's manual](https://www.dhpace.com/wp-content/uploads/2023/04/Slide-Door-Owners-Manual.pdf)).
  An AAADM inspection sticker (small, dated) on the glass or the header. The daily safety check is the owner's
  job, and doors must not close faster than 1 ft/s (DH Pace).
- **Door-glass clutter** (all common, all cheap SVG decals, most on the latch-side panel at 1.2-1.6 m): the hours or
  "Open 24 hours", credit-card brand logos, the brand's loyalty decal, a AAA or TripAdvisor sticker, "No smoking"
  (IHG hotels are non-smoking), a "Video surveillance in use" decal, and possibly a Missouri no-concealed-carry sign
  (owners *may* post one, RSMo 571.107; optional, so use it only for character). Older decals have **sun-faded** reds
  (they go pink-orange) and a peeling corner.
- **Glass:** fingerprints and palm prints cluster at **0.9-1.3 m** on the meeting edges, where people push a door that
  is slow to open, plus kids' hand and nose prints at **0.6-1.0 m**, and the cleaner's wipe arcs. Build: one
  roughness/alpha "smudge" texture over the glass, mostly invisible except when lights or the night sky are behind it.
  It shows most at night, when the lobby reflects in the glass.
- **Threshold:** an aluminium sill or floor guide track with **grit and leaves packed into its groove**, a dull grey
  wear band on the anodising.
- **Sound:** an operator whir about 1.5-2.5 s each way, a soft rubber thump at the close, the highway's roar and
  outside air rushing in while open (our sound.update already scales the highway; tie a +6-10 dB swell to the door
  state).

---

## 6. Front desk (check-in pods) and the clerk's working clutter

### Code and standard
- **ADA 2010 §904.4:** a hotel registration counter needs an accessible section **≤ 36 in (915 mm)** high, **≥ 36 in long**
  for a parallel approach (≥ 30 in for a forward approach), with 30 x 48 in clear floor space in front ([Access Board ch. 9](https://www.access-board.gov/ada/chapter/ch09/), [ADA small business guide](https://archive.ada.gov/reachingout/salesservice.html)).
  The pods' transaction tops are about 1.05-1.1 m. **One pod, or a section of one, needs a 36 in (0.915 m) top.**
  Check `hotel-checkin-pod`: if neither pod has a lowered section, that is a visible code gap to anyone who knows.
- **Missouri innkeeper notice (RSMo 419.010):** the liability cap ($200 total, unless the establishment agrees in
  writing to more; valuables only if deposited at the office against a claim check) applies only if "this section
  shall be posted in a conspicuous manner at the guest registration desk and in every guest room"
  ([Revisor of Missouri 419.010](https://revisor.mo.gov/main/OneSection.aspx?section=419.010)). Real ones are a
  framed or laminated letter-size sheet of dense statute text, often yellowed, on the desk's back wall or
  taped to the pod's side. **Room rates (RSMo 419.040)** go in each guest room, not the lobby, and are exempt if rates are
  published online ([419.040](https://revisor.mo.gov/main/OneSection.aspx?section=419.040)), so don't post rates in the lobby.

### What's on and around a pod at 10 p.m. (build list)
Per working pod (Dana's), at real sizes:
- A monitor angled toward the clerk with **sticky notes on the bezel** (Wi-Fi codes, "rm 214 late c/o 1pm", an
  extension number) and a **privacy filter** with greasy fingerprints.
- A keyboard with shiny keycaps (the A, S, D, space bar and Enter go glossy over time) and a mouse on a worn pad.
- A **key-card encoder** (small black box, about 12 x 9 x 5 cm, with a card slot and a status LED) and a fan of blank
  key cards beside it.
- **Key-card sleeves** (paper folders with the hotel logo, the room number handwritten in pen, the Wi-Fi printed on
  them) in a stack, with one open on the counter.
- A **card terminal** on a swivel stand, its screen smeared, a curl of receipt paper.
- A **cup of pens** (mismatched: brand pens plus one from a bank and a Sharpie), a stapler, a highlighter, a stack of
  registration cards or folio printouts.
- The desk phone with a coiled cord (twisted, as cords always are) and a **two-line display**.
- The clerk's own things: an insulated tumbler or energy-drink can (never on the guest side), a phone charging off
  a USB port, a hoodie or cardigan over the chair or a hook (night shifts are cold), a snack, a book or a phone
  propped up on the shelf below the counter.
- Guest-facing: a bell (exists), the apple bowl (exists, HIE-like), a loyalty tent card, a local-attractions stand.
- **After about 1 a.m.:** a laminated **"Night Audit in Progress, please be patient"** sign (a real product sold by
  hotel suppliers) and the printer running reports.

### Wear on the pods
- Solid-surface or quartz tops (roughness about 0.35-0.5 for honed, 0.15-0.25 for polished) pick up a **hand-grease
  band along the guest-side leading edge** (3-8 cm deep, slightly glossier and darker), faint pen marks, a
  coffee ring, and a scratch arc where the bell or the card terminal stand is swivelled.
- The white faces: shoe scuffs at the toe kick (done), a **grey band at 0.9-1.0 m** where bags and hips rub, a nick
  in a corner.

---

## 7. The market (sundry shop)

- **Format:** Formula Blue's "24/7 market" sits beside the desk so the clerk can see it ([Hotel Business](https://hotelbusiness.com/ihg-opens-first-holiday-inn-express-hotels-with-new-design/), [Lodging Magazine](https://lodgingmagazine.com/ihg-introduces-new-holiday-inn-express-prototype)). You pay at the desk: a small **"Please pay at the front desk"** sign or shelf talker.
- **Stock:** chips (Pringles cans, single-serve bags), candy, cookies, microwave meals (mac cups, ramen), ice
  cream in a small freezer, sodas, water, energy drinks, milk or chocolate milk (8 fl oz, 237 ml), toiletries
  (toothbrush kits, razors, travel pain-reliever packets), phone chargers, possibly beer and wine (Missouri allows it
  with a licence).
- **Disorder of use:**
  - **Facings pulled out unevenly:** front rows empty in the popular slots (a missing front row reads as a dark
    gap), the rest pushed back at different depths, labels turned slightly askew, **one item in the wrong slot**
    (a soda put back among the waters), one bag fallen over.
  - Shelf-edge price strips with a couple of tags missing or hand-written.
  - **Cooler:** fingerprints and nose prints on the glass door at the handle height; a grimy gasket; when the door
    opens, a **cold fog ring** forms briefly on the glass in a humid room (anti-sweat heaters clear it in seconds);
    the fan noise steps up; **one LED tube dimmer or flickering** (see §4).
  - Dust on the cooler top and the shelf tops above 1.8 m (out of the clerk's wiping reach).
- **Sound:** the cooler's condenser fan and compressor, cycling on with a relay click every 10-20 minutes (estimate).

---

## 8. The coffee and breakfast bar (closed for breakfast, but coffee always on)

### Equipment (real specs)
- **Thermal servers:** a Bunn ThermoFresh 1.5 gal (5.7 L) server is **14.7 in H x 9.1 in W x 12.7 in D** without a
  base, **22.7 in H** with one, with a faucet guard and a sight gauge ([Bunn spec sheet via WebstaurantStore](https://www.webstaurantstore.com/documents/specsheets/bunn_tf_digital_coffee_servers_with_bases.pdf)).
  Thermal servers hold quality for 2-4 hours ([Breville](https://www.breville.com/us/en/blog/coffee-and-espresso/how-to-keep-coffee-warm.html), [Curtis 2 h hold](https://www.webstaurantstore.com/curtis-tft642h-64-oz-thermal-freshtrac-carafe-with-2-hour-holding-time/945TFT642H.html)).
  The *glass carafe on a warmer* is what goes burnt and bitter ([Breville](https://www.breville.com/us/en/blog/coffee-and-espresso/how-to-keep-coffee-warm.html), [Batali et al. sensory poster](https://alphavisa.com/asic/2021/documents/eposters/S8-P-02_5066_BATALI.pdf)).
  At night in a limited-service hotel, the coffee is often hours old, so the smell is *stale*, not fresh.
- **Condiments:** 2.8 g sugar packets ([Domino via WebstaurantStore](https://www.webstaurantstore.com/domino-2-8-gram-sugar-packets-case/110PCSDOMINO.html)), about 70 x 38 mm (estimate), and the sweetener colours (white sugar, pink saccharin, blue aspartame, yellow sucralose, brown raw). Shelf-stable creamer cups are 0.375 fl oz (11 ml) ([Coffee mate via WebstaurantStore](https://www.webstaurantstore.com/nestle-coffee-mate-0-375-oz-italian-sweet-creme-single-serve-liquid-creamer-case/125PCITSWCRM.html)), about 35 mm across and 20 mm tall (estimate), at night in a bowl (half-and-half on ice only at breakfast).
  Stir sticks (wood, about 140 mm, 5.5 in) stand in a cylinder. Cups come in 12 and 16 oz with matching lids and
  sleeves, plus napkins.

### What it looks like at 10 p.m. (build list)
- **Sugar field:** a fan of loose grains (hundreds of instances, about 0.4-0.6 mm) on the counter in front of the
  caddy, densest where packets are torn. Two torn **packet halves** (the corner strip torn off), one still holding a few grains.
- **Creamer:** one cup peeled open and empty on its side, a white **drip spot** of creamer beside it, a full cup that
  rolled to the backsplash, the foil lid tabs.
- **Faucets:** each server's drip tray has a **brown film and a few drops**. Real trays are never dry. A dried drip
  trail runs down the server's front from the faucet, and a coffee ring sits where a cup was filled and pulled away.
- **Cups and lids:** one stack leaning, a lid on the counter, a lid on the floor in front of the cabinet. The lid
  dispenser's top lid sits misaligned.
- **Used stir sticks:** one on the counter (exists), two jammed in the trash hole's flap, one on the floor.
- **Napkins:** one crumpled, one damp with a brown blot.
- **Counter:** sticky rings (glossier, slightly darker, a sugar crust at the edge), a wipe streak from the last
  clean (a lighter arc through the haze).
- **Trash cabinet:** the flap's push area is darker with hand grease. A cup is stuck half through the hole. The bag
  overhangs inside.
- **Breakfast area (closed):** the sneeze guards smudged at forehead height, the cereal dispensers half full with
  dust on top, the waffle irons closed with a **batter crust around the hinge**, a dry syrup spot on the floor by the
  waffle station (missed by the mop, sticky underfoot: play a tacky "tk" step sound), chairs pushed in but one
  pulled out, table tops wiped but not the edges, and the breakfast-hours sign (exists).

---

## 9. Great room (sectional and TV)

- **TV at night:** a news or weather channel, usually **muted with closed captions** (the white-on-black caption box is
  instantly recognisable), or low volume. The remote is on the coffee table or the sectional arm, never in a
  holder. Dust on the TV's top edge and a smeared screen at child height.
- **Upholstery soiling** (contract fabrics are rated to 30,000-100,000 double rubs, but soiling shows early,
  [Loomlan](https://loomlan.com/pages/contract-grade-furniture-decoding)). Care guides say to clean "arm covers and head
  rests … to minimize difference" and to rotate cushions so "wear and soiling levels are equalized" ([care guide](https://linda-taylor-7mt1.squarespace.com/cleaning-instructions)).
  So build darkening on **arm tops, the seat front edge, the middle of each seat, and the backrest top (head oil)**,
  each 5-10 % darker with a faint sheen on the arm tops.
- **Cushions:** each one at a slightly different height and position, the favourite seat (the one facing the TV)
  visibly compressed with a sitter's dent and its zipper side creeping forward. The throw pillows are not lined up:
  one lies flat, one has slipped into the corner, one is on the floor.
- **In the crevices:** crumbs and a receipt in the seam between seat and back, a lost hair tie (visible only up close).
- **The coffee table:** water rings (pale, on wood: moisture blush is **white**, not dark), a TV-guide-style card, a
  used cup (exists), a takeout bag from the gas station next door at 10 p.m.
- **The carpet around it:** a crumb fan in front of the sectional, a dent field where the coffee table was moved and
  put back 5 cm off.

## 10. Communal bar-height table

- **Stools** (we have eight, perfectly placed in pairs): real ones at 10 p.m. are **pulled out at different
  distances and angles**, one turned to face the TV, one against the wall. The footrests are **worn to bare metal**
  on the front bar (shoes), with scuff marks.
- **Top:** crumbs, a water ring, a forgotten **charger in the pop-up outlet** (cords: one exists), a coffee cup, a
  receipt, finger smudges round the pop-up lids.
- **Pendant:** dust on its top surface (seen from the stair or when standing on a stool).

## 11. Business center (two PCs, printer)

- **Printer:** a boarding pass or a document left in the output tray (very common), a paper jam door ajar on one,
  a ream wrapper in the bin, a hand-lettered "Printer: ask front desk for help" note on the lid.
- **PCs:** a "Please log out when finished" or "Do not save personal information" sticker on the monitor, a
  greasy screen, shiny keycaps (WASD, space, Enter), mouse buttons worn glossy, a coffee ring, cable spaghetti
  behind and under the desk (power strip on the floor with a dust bunny), a USB stick left in a port.
- **Chairs:** one rolled away from the desk and turned, the other pushed under. Casters leave arcs on the floor.

## 12. Elevator lobby and corridor mouths

- **ADA §407 (elevators):** hall call buttons **≥ ¾ in**, within reach range; hall lanterns centred **≥ 72 in** (1.83 m),
  their visible elements **≥ 2½ in**; floor numbers on **both jambs**, tactile characters **≥ 2 in** high with braille,
  baseline **48-60 in** AFF, and a **star** on both jambs at the main entry level ([Access Board guide, ch. 4](https://www.access-board.gov/ada/guides/chapter-4-elevators-and-platform-lifts/)).
- **IBC 3002.3:** a standard pictorial sign **"IN FIRE EMERGENCY, DO NOT USE ELEVATOR. USE EXIT STAIRS"** beside
  every call station on every floor ([Massachusetts adoption of IBC 3002.3](https://regulations.justia.com/states/massachusetts/780-cmr/chapter-30/section-3002/subsection-3002-3)).
- **Elevator certificate:** in Missouri the state operating certificate is posted **in the machine/equipment room** in a
  framed vision panel, not in the car ([RSMo 701.375](https://law.justia.com/codes/missouri/title-xli/chapter-701/section-701-375/), [11 CSR 40-5.100](https://regulations.justia.com/states/missouri/title-11/division-40/chapter-5/section-11-csr-40-5-100)).
  So **don't** put one in the car. Many states do require it in the car. Missouri doesn't.
- **Wear:** brushed stainless doors with **fingerprints at the centre seam at 1.0-1.4 m** (people stop the doors by
  hand), a clean wipe arc, cart dings at 0.3 m on the frames, grit in the sill groove, the up button's bezel worn
  shiny, the floor darker in a fan in front of the doors (people wait there).
- **Corridor mouths:** corner guards (see §3), the vinyl wallcovering seam beginning, a carpet transition strip
  (metal or vinyl reducer) that is scuffed and slightly lifted, cart rubber on both jambs.

---

## 13. Life safety and legal: what a real lobby must visibly show

Already placed in `life-safety.js` (verify that each one *reads* at player distance in the lobby): pull station at the
main entrance (NFPA 72: handle **42-48 in** AFF, within **5 ft (1.5 m)** of the exit door, ≤ 200 ft between boxes,
[EC&M](https://www.ecmag.com/magazine/articles/article-detail/manual-fire-alarm-boxes-what-to-know-from-nfpa-72-and-other-codes)),
exit signs, emergency lights, sprinklers, horn/strobes, smoke detection at the elevator lobby.

Missing from the lobby:
| Item | Requirement | Where in our lobby | Source |
|---|---|---|---|
| **Fire extinguisher** | Class A travel distance **≤ 75 ft (22.9 m)**. Top **≤ 5 ft (1.53 m)** for units ≤ 40 lb, bottom **≥ 4 in**. In circulation, a cabinet whose leading edge is 27-80 in up projects **≤ 4 in** (so semi-recessed or fully recessed) | One semi-recessed cabinet near the back-office door / market alcove (x ≈ -4.93, z ≈ -5), and one by the corridor mouth (x ≈ 6.42, z ≈ 1.5). A 10 lb ABC unit (red, about 0.5 m tall) with a **yellow annual inspection tag** on the neck and a "FIRE EXTINGUISHER" sign above | [OSHA placement](https://www.osha.gov/etools/evacuation-plans-procedures/emergency-standards/portable-extinguishers/placement), [Fire Engineering](https://www.fireengineering.com/fire-safety/fire-extinguisher-installation/), [Access Board protruding objects](https://www.access-board.gov/ada/guides/chapter-3-protruding-objects), [JL Industries](https://www.buildsite.com/pdf/jlindustries/JL-Industries-ADA-Guidelines-for-Mounting-Cabinets-2973236.pdf) |
| **Replace the Korean extinguisher** used in the corridors, gym and pool | US ABC dry chemical, UL label, red steel, pressure gauge, pull pin with tamper seal | Swap the model everywhere | (model name `ph-korean-fire-extinguisher-01`) |
| **Innkeeper liability notice** | Posted conspicuously at the registration desk | Back wall of the desk or a pod side | [RSMo 419.010](https://revisor.mo.gov/main/OneSection.aspx?section=419.010) |
| **Automatic door decals** | "AUTOMATIC CAUTION DOOR", both sides, ≥ 0.5 in letters, centred at 50 ± 12 in | Both slider leaves | [I Dig Hardware](https://idighardware.com/2017/10/decoded-new-requirements-for-pedestrian-automatic-door-operators-and-sensors-december-2017/) |
| **Elevator fire sign** | Pictorial, beside each call station | Elevator lobby | [IBC 3002.3 (MA)](https://regulations.justia.com/states/massachusetts/780-cmr/chapter-30/section-3002/subsection-3002-3) |
| **Hoistway jamb plates** | Tactile floor number plus a star at the main level, both jambs | Elevator lobby | [Access Board ch. 4](https://www.access-board.gov/ada/guides/chapter-4-elevators-and-platform-lifts/) |
| **Accessible counter section** | ≤ 36 in high, ≥ 36 in long | One pod | [Access Board ch. 9](https://www.access-board.gov/ada/chapter/ch09/) |
| **Human-trafficking hotline poster** | Missouri RSMo 595.120 (2018) requires the DPS poster at listed establishments, near restrooms or the entrance. **Verify** whether hotels are on the list before placing it | By the lobby restroom corridor or the entrance | [Revisor 595.120](https://revisor.mo.gov/main/OneSection.aspx?section=595.120), [MO DPS](https://dps.mo.gov/human-trafficking/) |
| ISA (wheelchair) symbol at the accessible entrance | ADA 216.6 directional/identification signage where not all entrances are accessible | Entry door glass, only if relevant | [Access Board ch. 2](https://www.access-board.gov/ada/chapter/ch02/) |

**Not required in the lobby; don't add them as "realism":** an occupant-load sign (that's for assembly rooms), an
evacuation diagram in the lobby (diagrams belong on the **back of each guest-room door**, [Minnesota SFM guide](https://ci.redwood-falls.mn.us/download/11942), [HotelSigns](https://blog.hotelsigns.com/2021/12/27/emergency-exit-route-signage-under-the-international-fire-code/)),
a room-rate card (in the rooms), and the elevator certificate (machine room, in Missouri).

---

## 14. Physical behaviour of things a player will handle or throw

The existing impact sound model (energy → loudness, material → clip) is right. These are the behaviours it lacks.
Masses are estimates unless cited.

| Object | Mass / size | Handled | Thrown or dropped | Sound |
|---|---|---|---|---|
| **Paper coffee cup, 12 oz, lidded, 3/4 full** | ~280 g, 90 mm rim x 110 mm (estimate) | Liquid sloshes at the walking frequency. A normal gait excites the lowest slosh mode, and **sudden starts** spill within a few steps ([Mayer & Krechetnikov, Phys. Rev. E 85, 046117](https://link.aps.org/doi/10.1103/PhysRevE.85.046117)). Coffee beads out of the sip hole when jolted | The lid pops off at impact from about 1 m most of the time (estimate). The cup crumples at the rim and does **not bounce**: a soft thud. Liquid exits as a sheet in the direction of travel → puddle on LVT (§2) or soak on carpet. Steam for a few seconds (coffee from a thermal server is about 70-80 °C) | A paper thud plus a splash (a broad-band "slap" of 100-200 ms), then a little trickle |
| **Ceramic mug (the clerk's)** | ~350 g | — | Heavy dull clack on the solid surface. From desk height onto LVT: usually the handle snaps or it chips. Onto carpet: survives with a thud | Ceramic "plate" clip, low pitch |
| **Creamer cup, 11 ml** | ~14 g full | Peel the tab, pour: a 1-2 s thin stream | Too light to burst from a drop. It **bounces and skitters** like a plastic die. Thrown hard at a wall or **stepped on**, the foil splits and it squirts a white jet 20-40 cm with a few drops | A light plastic "tick", a wet "pff" on a burst |
| **Sugar packet, 2.8 g** | ~3 g, 70 x 38 mm | Shake, flick, tear the corner | **Flutters and tumbles**: drag dominated, lands 1-2 m away whatever the throw speed, often face up (falling plate dynamics: Field et al., *Nature* 386, 1997, https://doi.org/10.1038/386281a0). Silent | None (below audibility, as the existing 4 mJ floor already gives). Torn and poured: a hiss of grains. Grains underfoot on LVT: **a crunch on every step for the next 2-3 m** |
| **Milk, 8 fl oz carton or bottle (market)** | ~250 g | Cold: condensation beads on it after a minute out of the cooler | Sealed paperboard survives a 1 m drop with a dented corner. A hard throw splits the side seam or bursts the gable top open, and milk glugs out in pulses. An opened carton tips and **glugs** (air in, milk out). Milk is opaque white, **lower surface tension, so thinner, wider puddles than water** (§2) and many satellite drops. On carpet: a pale patch that goes dark grey as it soaks, then a sour smell over hours (text cue only) | A cardboard "thock", a wet splat, a glug rhythm of about 4-6 Hz (estimate) |
| **Soda can (vending/market)** | 370 g | Cold, condensation | A dropped can dents at the rim and **rolls** in an arc (it's tapered). Shaken and opened: a foam burst | A bright metal "tink" then rolling |
| **Pen** | 6-10 g | Click | Bounces 2-3 times, then rolls along the floor's slope until it hits the base or a chair leg; rolls off tables | A light plastic rattle. The click is the sound everyone knows |
| **Paper sheet / brochure / newspaper** | 5 g / 15 g / 200-300 g | Paper rustle (exists) | A single sheet glides and side-slips its own length or more before landing. A brochure tumbles. A newspaper falls flat and splays (exists) | A soft slap for the newspaper (exists). A sheet is silent |
| **Key card** | 5 g | — | Slides on solid surface, stops in a short skid. Silent below the threshold (exists) | — |
| **Napkin** | 1-2 g | — | Barely travels. Crumpled, it bounces once | — |
| **Ice cube (from the ice machine)** | 10-20 g | Wet, slips | Skids far on LVT, **melts to a small puddle over about 20-30 min** (estimate) | Hard click and skitter |

### How to build liquid without a fluid sim (mobile-safe)
- On a liquid container's impact above a threshold: pick the surface under it (hard vs carpet), spawn **one puddle
  decal** from a small atlas of authored splash shapes (main sheet + fingers + satellites), oriented along the
  velocity, scaled by volume, growing to full size over 0.3-0.6 s with ease-out.
  - **Hard floor:** dark-tinted, low roughness (0.05-0.15, so it shows a wet sheen against the 0.6 LVT), slight
    normal bump at the edge. Coffee has a thin brown with a lighter rim; milk is opaque off-white.
  - **Carpet:** no sheen; a darker multiply patch that grows to 1.5-2x over about 2 s and then *fades* over
    minutes to a faint ring (§2).
- Spray: 10-30 instanced droplets on ballistic arcs, each leaving a tiny decal where it lands. No collision except
  the floor plane and the counter tops.
- Puddles persist (save them like props). One is cleaned only if the night PA passes (a later story beat).
- Cup contents: a `fill` value on containers (0-1). Walking with a cup at a sprint or turning hard has a small
  chance per step to slop (the Mayer & Krechetnikov finding), dropping a drip decal and a line of text ("You slop
  coffee on your hand.").
- Sugar: 100-300 instanced quads (one draw call) fan out from the tear point. On the floor they trigger a crunch on
  footsteps within 15 cm. They never move again: cheap.

---

## 15. Ambient sound at 10 p.m.

A lobby's background noise is about **NC 35-40** ([Engineering Toolbox NC table](https://www.engineeringtoolbox.com/nc-noise-criterion-d_725.html), [VA design alert](https://vacriteria.tpub.com/alert028/alert0280001.htm)): quiet enough to hear a fridge, loud enough to mask a whisper at 5 m. Layer it, and give each layer a source position and a cycle:

| Source | Character | Cycle |
|---|---|---|
| HVAC supply | A soft broadband hiss from the diffusers, louder under them. The rooftop unit starts with a distant low **thunk** and rumble | The compressor cycles every 10-20 min in heating season (estimate) |
| Market cooler and vending machines | A compressor hum at about 50-60 Hz plus harmonics, a condenser fan, and a **relay click** at start and stop. The vending machine's LED ballast buzz is audible up close | On about 40-60 % of the time, cycles 10-20 min (estimate) |
| Ice machine (in the elevator lobby or a vending alcove) | Freeze: quiet hum and water trickle. **Harvest: water dump, then a clattering avalanche of cubes into the bin** | Complete cycle **15-40 min** depending on model ([Orien manual via ManualsLib](https://www.manualslib.com/manual/518940/Orien-Fs260im.html?page=14), [KaTom](https://www.katom.com/learning-center/why-is-ice-machine-making-noises.html)) |
| Elevator | A hall-lantern **ding** (one chime up, two down, as ADA 407.2.2 describes), door operator whir, hydraulic pump whine when called (many 2-4 storey limited-service hotels have hydraulic elevators) | Random, every few minutes at 10 p.m. |
| TV | Muted with captions, or news at low volume. A murmur with ad-break jingles | Constant |
| Front desk | Keyboard bursts (exist), the encoder's beep, the card terminal's beep, the phone (a two-tone electronic ring; internal calls from rooms), the printer warming up | The phone rings once every 15-30 min (estimate). The audit printer runs about 1-3 a.m. |
| Doors | The slider's whir and the highway rushing in (§5) | Per arrival |
| Outside | Truck tyre hiss and jake brakes from the interstate, faint through the glass | Already partly in sound.update |
| Building | The occasional knock of ductwork expanding, a distant laundry dryer thump if the laundry adjoins, a toilet flush through a wall near the lobby restroom | Rare, irregular |

Footsteps already depend on the surface (sound.step(soft)). Add a **sticky** variant (syrup or a soda spot) and a
**crunch** variant (sugar, salt grit near the entry in November).

---

## 16. Smell, and how a game conveys it

| Smell | Where and why | How to convey it |
|---|---|---|
| **Stale coffee** | The coffee bar, all night. Thermal-server coffee hours old, plus the scorched film in the drip trays | Brown drip-tray film; a wisp of steam only while pouring; a one-time caption on first approach ("Coffee that's been waiting since dinner."); the pour sound |
| **Chlorine (chloramines)** | Leaks from the pool door. "If you smell chlorine … you are probably smelling chloramines", formed from sweat and urine, worse with poor ventilation ([CDC](https://www.cdc.gov/healthy-swimming/toolkit/chloramines-and-pool-operation.html)) | A caption when passing the pool door; the pool door's glass slightly fogged at the bottom; a humid-air whoosh when it opens; a faint blue-green light from the pool through the glass |
| **Carpet shampoo / floor cleaner** | Where the night PA has just mopped or extracted. A sweet-floral chemical smell | A wet-floor sign, a wet sheen on the LVT in one zone with a mop's figure-of-eight streaks, a yellow mop bucket parked by the corridor mouth |
| **Waffle batter and syrup** | The closed breakfast area: residue on the waffle irons and a syrup spot | Batter crust on the irons; sticky footstep sound; a caption once |
| **Microwave popcorn** | Someone in the business center or a room nearby. A classic hotel-night smell | A caption, an empty popcorn bag in the bin |
| **Outside air** | Cold, diesel, wet asphalt when the doors open | The door's air whoosh plus a caption the first time |

**Rule for captions:** no more than one smell line per zone per visit, and only on first entry. Smell in fiction
works because it's rare. A constant stream reads as the game talking at you.

---

## 17. People's use

- **Where guests walk:** desire lines, not aisles. Door → desk on the diagonal (the existing traffic decal), desk →
  elevator, elevator → coffee → back to the elevator, and a shortcut **between** the column and the brochure rack
  that clips the carpet corner (the wear decals should cut that corner, not follow the carpet edge).
- **Where they sit:** the seat facing the TV, the end of the sectional nearest a power outlet, the communal stool
  closest to the outlet. Rarely the middle of anything.
- **What the night clerk actually does:** checks in late arrivals (the ID, the card on the terminal, encodes two
  keys, writes the room number on the sleeve, points to the elevator), answers internal calls (towels, a TV that
  won't turn on, a noisy neighbour), the audit at about 1-3 a.m. (prints reports, posts room charges, balances),
  wake-up calls, sells from the market, refills the coffee once, wipes the coffee bar, takes the trash, sits
  between tasks with a phone. Duties per [HospitalityNet](https://www.hospitalitynet.org/explainer/4113940.html), [Hotel Tech Report](https://hoteltechreport.com/news/night-auditor), [Workable](https://resources.workable.com/night-auditor-job-description).
  Build hooks for Cast's intent system: `encode_keys`, `answer_phone`, `print_reports`, `restock_coffee`,
  `wipe_counter`, `take_trash`.
- **Housekeeping and maintenance at night:** at limited-service hotels there is often **no** night housekeeper; the
  night auditor does the lobby. Where there is a night public-area attendant, they vacuum and mop late, after the
  traffic. So at 10-11 p.m. the vacuuming hasn't happened yet: crumbs and grit are at their worst. A wet-floor
  sign might come out around midnight. Maintenance shows up as **traces**: a step ladder folded behind the market,
  an access panel left ajar, a downlight trim hanging on its springs (pulled for a lamp change), a work order
  sticky note on the business-center printer.

---

## 18. How to build this for a browser that must run on mobile

All of this can be done without new heavy systems.
- **Decals:** extend `lived-in.js`'s pattern (one merged mesh per kind of mark over one canvas or atlas texture, with
  polygon offset). One atlas holds the stains, rings, scuffs, smudges, dust lines, puddle shapes and salt lines;
  each kind is one draw call.
- **Roughness variation is the cheapest realism.** Most "dirt" on real surfaces is a change in *sheen*, not colour:
  fingerprints, hand grease, touch-up flashing, traffic dulling, wet spills. One shared grunge roughness map,
  world-space UVs, at 512 px, breaks up every big surface.
- **Wall-floor dust line and cove base:** one extruded strip along every wall run, generated from the same wall list
  the colliders use. It is a few hundred triangles for the whole lobby, with a vertex-colour or texture gradient
  for the dust.
- **Small assets:** instanced (sugar grains, cove base, sprinkler plates, diffusers, cameras), under 1k triangles
  each, with the printed bits as SVG atlases (as REALISM.md says).
- **Liquids:** decals plus instanced droplets (§14), never a fluid sim.
- **Time:** a `lobbyState(hour)` that swaps which decals and props are visible (crumbs before the vacuum pass,
  vacuum stripes after, the wet-floor sign, the night-audit sign, the dimmer light scene). It is a set of toggles, not
  a simulation.
- **Restraint:** the REALISM rule holds: wear is faint and continuous; discrete dark blotches look like bugs. Every
  mark needs a cause from §1.

---

## 19. The 30 changes that most raise perceived realism per unit of effort (ranked)

Effort: S = under half a day, M = 1-2 days, L = more. Ranked by realism gained per effort, for a browser and mobile
target. "Where" uses our coordinates (lobby x -12..6.42, z -8.9..9.2, doors at z ≈ 9.2, x ≈ -2).

| # | What | Where | Why (source) | How | Effort / owner |
|---|---|---|---|---|---|
| 1 | **Ceiling services:** square supply diffusers with grey smudge halos, return grilles, visible sprinkler cover plates, dome cameras, one access panel | Whole lobby ceiling, about 1 diffuser per 20 m²; cameras over the desk, entry, market, elevator | The ceiling is 40 % of the entry view and blank. Smudging is universal ([Price](https://blog.priceindustries.com/what-is-smudging), [ACHR](https://www.achrnews.com/articles/121501-smudging-around-air-distribution-diffusers)) | 4 instanced small models plus one radial halo decal kind | M · Victor (models), Natasha (placement) |
| 2 | **Rubber cove base with a dust line** at every wall run, scuffed, darker in internal corners | All walls without millwork | The missing wall-floor junction is the most "CG" thing in the room. Mops stop short (§2) | Extruded strip from the wall list plus a gradient decal strip; seams at corners | S-M · Natasha |
| 3 | **Coffee bar disorder pack:** a sugar-grain field, torn packet halves, an open creamer cup with a drip, brown drip-tray film, drip trail on a server, a leaning cup stack, a lid on the counter and one on the floor, a damp napkin, sticks in the trash flap | Coffee station, x 1.8-5, z -8.6 | The user named it. A real 10 p.m. bar is layered use (§8) | Instanced grains plus 8 small props plus 3 decals | S-M · Victor (props), Natasha |
| 4 | **Spill behaviour** for cups, milk and creamer: puddle decal on hard floors, soak-in on carpet, droplets, steam, sounds | All liquid containers | The user named it. Puddle height 3-4 mm (derived, §2); carpet wicking ([Chem-Dry](https://chemdry.com/blog/carpet-cleaning-wicking)); slosh ([Mayer & Krechetnikov](https://link.aps.org/doi/10.1103/PhysRevE.85.046117)) | Decal atlas plus a `fill` value plus an impact hook; no fluid sim (§14) | M · God |
| 5 | **Roughness grunge on every big surface:** a fingerprint/hand-grease band on the pod edges, touch-up flashing on walls, sheen variation on LVT | Pods, walls, floor | Most real dirt is a sheen change (§18) | One 512 px world-space roughness map, multiplied in | S · Natasha |
| 6 | **Glass smudges:** palm prints at 0.9-1.3 m on the slider meeting edges, kids' prints low, wipe arcs; the same on the cooler doors and elevator stainless | Entry doors, market cooler, elevator | They show at night, against reflections (§5, §7, §12) | One smudge roughness/alpha texture shared by all glass and stainless | S · Natasha |
| 7 | **Entry soil gradient plus November salt tide-lines** past the mat; the mat off-square with a curled corner; grit in the door track | z 9 → 4.5 along the walk to the desk | 80 % of soil is tracked in on shoes ([CleanLink](https://www.cleanlink.com/hs/article/Floor-Care-Rolling-Out-The-Welcome-Mat--8939)); our mat is short | Two decal kinds plus a slight mat rotation and edge bend | S · Natasha |
| 8 | **Required notices:** the RSMo 419.010 notice at the desk, AUTOMATIC CAUTION DOOR decals, the elevator fire sign, door-glass decal clutter (hours, cards, no smoking, loyalty, AAA), "Please pay at front desk" in the market | Desk back wall, slider leaves, elevator call station, market | [RSMo 419.010](https://revisor.mo.gov/main/OneSection.aspx?section=419.010), [A156.10](https://idighardware.com/2017/10/decoded-new-requirements-for-pedestrian-automatic-door-operators-and-sensors-december-2017/), [IBC 3002.3](https://regulations.justia.com/states/massachusetts/780-cmr/chapter-30/section-3002/subsection-3002-3) | SVG sign atlas on planes (F.sign exists) | S · Natasha |
| 9 | **Fire extinguisher cabinets** (semi-recessed, US 10 lb ABC, inspection tag, sign above), and swap out the Korean model building-wide | x ≈ -4.93, z ≈ -5 and x ≈ 6.42, z ≈ 1.5 | ≤ 75 ft travel, top ≤ 5 ft, ≤ 4 in projection ([OSHA](https://www.osha.gov/etools/evacuation-plans-procedures/emergency-standards/portable-extinguishers/placement), [Access Board](https://www.access-board.gov/ada/guides/chapter-3-protruding-objects)) | One model, used everywhere | S · Victor |
| 10 | **Night light scene:** general cans to about 55 %, the desk brightest, cold cooler/vending light slabs on the floor, a red exit-sign bloom, TV glow driven by the picture | Whole lobby, at dusk/night | Real night lobbies dim; colour mix sells it (§4) | Intensity table per time of day; one point light by the TV sampling the screen's average colour | S-M · Natasha |
| 11 | **One imperfect lamp:** one can a different CCT; one cooler LED tube with a faint, slow wobble and a rare dropout | A grid can near the communal table; the market cooler | Mismatched replacements and cheap drivers are common ([DOE](https://www.energy.gov/sites/prod/files/2018/05/f51/lfi2018_miller_0.pdf)). Keep it to one or two, or it looks like a bug | Per-light colour override; a sine-and-noise intensity on one emissive | S · Natasha |
| 12 | **Ambient sound bed:** HVAC hiss, cooler/vending compressor cycles with relay clicks, ice-machine harvest every 15-40 min, elevator dings, the desk phone, TV murmur | Positional, per source | NC 35-40 ([Engineering Toolbox](https://www.engineeringtoolbox.com/nc-noise-criterion-d_725.html)); harvest cycle ([Orien manual](https://www.manualslib.com/manual/518940/Orien-Fs260im.html?page=14)) | Web Audio loops plus timers; sound.js already has ice(), ding(), hum() | M · God |
| 13 | **Front desk working clutter rebuild:** sticky notes on the bezel, key-card encoder plus blanks, written key sleeves, card terminal with a receipt curl, pen cup, coiled phone cord, the clerk's tumbler and cardigan, and after 1 a.m. the "Night Audit in Progress" sign | Dana's pod, x -7.65, z -3 | A real night desk (§6) | Rework `hotel-desk-items` with SVG print | M · Victor |
| 14 | **Upholstery soiling and slumped cushions:** darkened arm tops, seat fronts, headrest band; one compressed favourite seat; pillows out of line, one on the floor | Sectional, lounge chairs, west sofa | Care guides ([cleaning instructions](https://linda-taylor-7mt1.squarespace.com/cleaning-instructions)) | A darkening vertex-colour or AO pass in Blender; move pillows | S-M · Victor |
| 15 | **Stools and chairs left where people left them:** pulled out, turned to the TV, one by the wall; task chairs rolled away | Communal table, round table, business center | Eight stools in perfect pairs read as staged | Change the placement seeds; extend the existing settle | S · Natasha |
| 16 | **Wall wear:** chair-back scuffs at 0.75-0.9 m behind seating, cart marks at 0.2-0.4 m and 1.0 m, nail-hole patches, hand smudges by door pulls | West living room, communal-table wall, corridor mouths, back-office door | Each has a cause (§3) | Same decal system as the scuffs | S · Natasha |
| 17 | **Corner guards** (clear or stainless, 1.2 m) on outside corners | Corridor mouth (x 6.42, z ±1), market alcove corners | They exist because of carts, and they say "hotel" at once (§3) | One small instanced model | S · Victor |
| 18 | **Bins with contents:** liner folded over the rim, crumpled cups, a sticky note, a receipt; the coffee cabinet's flap with a cup half through | The three lobby bins and the waste cabinet | Bins are the most-used objects in a lobby | Swap the inner fill; a few small props | S · Victor |
| 19 | **Market disorder:** missing front facings, one item in the wrong slot, one bag fallen, items at uneven depths; a fog ring on the cooler glass when opened; dust on the cooler top | Market alcove, x -4.7, z -5.6..-8.2 | Clerk-restocked stock never sits perfectly (§7) | A per-slot depth and gap mask in the shelf model; a fog decal on door open | S-M · Victor + God (fog) |
| 20 | **Sugar and grit underfoot:** crunch steps within 15 cm of grains or salt; sticky steps on the syrup spot | Coffee bar, entry, breakfast area | Small, multisensory, cheap (§15) | sound.step variants keyed by decal zones | S · God |
| 21 | **Breakfast area closed but used:** smudged sneeze guards, half-full cereal dispensers, batter crust on the waffle irons, a syrup spot, one chair out | Breakfast bar, x -4..-0.5, z -8.5 | At night it stays visible, not hidden (we set `visible=false`) | Show a closed-state variant of the model instead of hiding it | M · Victor + Natasha |
| 22 | **TV muted with captions** at night, a remote on the sectional arm, dust on the TV's top edge | Great room TV, x 6.36, z 6.4 | Common at night; the caption box is instantly recognisable | A caption strip over the channel texture (tvs.js) | S · God |
| 23 | **Carpet shading and furniture dents:** lighter crushed lanes cutting the corner by the column, dimples where furniture stood before being nudged, one off-shade replacement tile | Great room and west seating carpet | Loop-pile behaviour (§2) | Carpet decals; the dimples as small darker squares under moved feet | S · Natasha |
| 24 | **Crumbs and lost things under and in furniture:** a lid, coins and lint under the sectional; crumbs in the seat seam; a hair tie | Sectional, communal table floor | Rewards crouching (G1); never cleaned (§1) | Instanced crumb decals plus 4 tiny props | S · Victor |
| 25 | **Elevator lobby details:** tactile jamb plates with the star, fingerprints on the stainless at the seam, cart dings, sill grit, a worn up button | Elevator at x ≈ 7.75 | ADA 407 ([Access Board](https://www.access-board.gov/ada/guides/chapter-4-elevators-and-platform-lifts/)) | Small plates plus decals | S · Victor + Natasha |
| 26 | **Business center left-behinds:** a boarding pass in the printer tray, "log out" sticker, shiny keycaps, cable spaghetti and a power strip with a dust bunny under the desk | x 6.1, z -3 | The most common things left in hotel business centers (§11) | 4-5 small props and an SVG | S · Victor |
| 27 | **Dust on top surfaces above 1.8 m:** vending and cooler tops, pendant tops, frame tops, TV tops, plant leaves | All tall fixtures | Out of wiping reach (§1) | A top-facing dust term (world-normal-up mask times a grey tint) in one shared shader chunk | S · Natasha |
| 28 | **Night-shift traces:** a wet-floor sign and a yellow mop bucket by the corridor mouth after about 11 p.m.; a folded step ladder behind the market; a downlight trim hanging on its springs | Corridor mouth, market rear | Night PA and maintenance show up as traces (§17) | 3 small models, time-gated | S · Victor + Natasha |
| 29 | **Accessible counter section** at 36 in on one pod | The closed pod, x -9.9 | ADA §904.4 ([Access Board](https://www.access-board.gov/ada/chapter/ch09/)) | A lowered section in the pod model | S · Victor |
| 30 | **Smell captions and their visual partners:** stale coffee, chlorine at the pool door, floor cleaner near the wet sign; one line per zone per visit | Coffee bar, pool door, corridor mouth | CDC on chloramines ([CDC](https://www.cdc.gov/healthy-swimming/toolkit/chloramines-and-pool-operation.html)) | game.say on first zone entry; fog on the pool door glass | S · God |

### If only five things get done this round
1, 2, 3 + 4 (the coffee bar and spills together, since the user named them), 5 + 6 (one shared grime/sheen
texture covers pods, walls, glass and stainless), and 8 + 9 (paper and extinguishers: cheap, and
anyone who has worked in a hotel looks for them).
