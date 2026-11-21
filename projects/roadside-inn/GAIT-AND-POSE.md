# Gait and pose: a working study for believable people (Cast, 2026-11-21)

Why this exists: after the 2026-11-20 pass the residents still read as "possessed dolls, on fentanyl but forced to
act normal"; the sofa guest "shifts around all wily, never looks at me or anything in particular". This is the
study the fix is built from: what real bodies do standing, sitting, walking and looking, as numbers and rules, and
a diagnosis of the current motion against them. The rules are implemented in `body.js` (data + logic, no hotel
knowledge, CC0) and applied to the Rocketbox rigs by `people.js`.

Numbers are textbook/literature values rounded to what a game can use. Where a figure comes from memory of a standard
reference rather than a source re-read today, it says "(textbook)". Every tunable lives in `STUDY` in `body.js`.

## 1. The one finding that matters most

Real people at rest are **still**. Stillness is punctuated by **discrete, motivated** events: a gaze shift to
something, a weight shift from one leg to the other, a posture change in the seat. Between those events the only
motion is physiological and tiny: breathing (a few mm at the shoulders), postural sway (millimetres), blinks.

Our people did the opposite: everything moved a little all the time, for no reason, and nothing they looked at was
a thing. That is what "doll-like" means here. Measured on the build of 2026-11-20 (scratch probe, 20 s of simulated
time, no player nearby):

| Person | Head moving (> 5 deg/s), share of time | Mean head angular speed | Hips excursion |
|---|---|---|---|
| Sofa guest (seated) | 41 % | 6.9 deg/s | 2.0 cm |
| Nurse on the stool (seated) | 69 % | 10.1 deg/s | 2.2 cm |
| Rep at the PC (seated) | 38 % | 6.7 deg/s | 2.0 cm |
| Dana (standing) | 62 % | 8.5 deg/s | 2.6 cm |

A person watching TV or a screen has the head still for well over 80 % of the time; the head moves in short bursts
(gaze shifts of 0.2-0.6 s), then stops on the next thing.

## 2. Diagnosis: why the current motion reads as doll-like

1. **A standing idle clip played under a seated pose.** The seated pose was layered over the Rocketbox `Idle` clip
   (11.7-15.5 s mocap of someone *standing*: hips rotate 6-11 deg, neck 8-9 deg, head 7-16 deg over the loop). The
   sit pose bends the thighs from the hips, so the standing weight shift rocked the whole seated torso and the IK
   dragged the hands and feet after it: the "wily shifting". A seated person has no standing weight shift.
2. **Continuous noise in place of events.** The standing weight shift was a sine (period 7-11 s, +-2 deg); plus the
   clip's own loop. A metronome on top of a loop: nothing ever settles and nothing is ever *decided*.
3. **No gaze targets, so no attention.** Sitters looked at one fixed point (or at the player inside 3 m), with the
   head easing continuously toward it like a turret. No fixations, no saccades, no eyes (the rig has eye bones; they
   were never used), no looking away, no reason to look anywhere. The clip's baked head movement fought the look-at.
4. **Slow-motion walking.** The walk clip was time-scaled by speed / clip speed, which keeps stride length fixed and
   puts all of a speed change into cadence. At 0.6 m/s the deck guest stepped at ~50 steps/min: slow motion. Real
   people shorten the stride *and* slow the cadence together (walk ratio, section 4).
5. **Posture without weight.** Standing people stood square on both legs with a hip roll that didn't move the
   pelvis over a foot; no contrapposto, nothing loaded.

## 3. Standing (idle)

- **Contrapposto is the default, not symmetrical stance.** Weight mostly on one leg: the pelvis shifts 2-5 cm over
  the stance foot, the pelvis drops on the free side (Trendelenburg-like, a few degrees), the free knee unlocks and
  the free heel may lift slightly; shoulders tilt opposite to the pelvis; the head stays over the stance foot and
  level. (Classical canon; Polykleitos' Doryphoros. The firefighters' photo below shows it in 7 of 10 people.)
- **Weight shifts are discrete and quick.** Duarte & Zatsiorsky (1999) analysed 30+ min of unconstrained standing
  and found three patterns in the centre of pressure: *shifting* (fast step-like moves between regions),
  *fidgeting* (fast large excursions that return) and *drifting* (slow continuous). Shifts were seconds-long events
  separated by minutes (AP shift interval 316 +- 292 s; amplitude 17 +- 15 mm). Rule: hold a stance, then shift
  in ~0.8-1.4 s with a minimum-jerk profile. A game sees a person for a minute or two, so the hold is compressed to
  a lognormal with median 22 s (8-90 s); a knob, documented as a compression.
- **Postural sway is millimetres.** Quiet stance: centre of mass moves in the 0-0.5 Hz band, with faster small
  corrections at 0.5-5 Hz; centre-of-pressure excursions are about the size of a dime. Rule: an inverted-pendulum
  sway of the body about the ankles of <= 6 mm at 0.1-0.35 Hz (two incommensurate sines). It must be invisible as
  motion and visible only as "not frozen".
- **Breathing.** Adults at rest breathe 12-16 times a minute, with breath-to-breath variability (CV ~10-20 %)
  (textbook). Visible as a 2-4 mm rise of the shoulders and ~0.5 deg of thoracic extension on the in-breath; more
  visible seated and slumped. Inhale ~40 % of the cycle, exhale ~60 %.

## 4. Walking

Reference: Perry & Burnfield, *Gait Analysis* (textbook); Inman, *Human Walking*; Murray et al. 1964/1967.

- **Cycle.** One stride = two steps. Stance 60 %, swing 40 %; double support ~10 % at each end of stance.
- **Speed, cadence and stride go together.** Self-selected speed 1.2-1.4 m/s, cadence 100-120 steps/min, step
  0.65-0.75 m. The *walk ratio* (step length / cadence) is nearly constant across speeds for a person:
  ~0.0064 m/(steps/min) for adults (Sekiya & Nagasaki 1998). So `v = WR * C^2 / 60`, i.e.
  `C = sqrt(60 v / WR)` and `L = 60 v / C`. At 0.6 m/s: 75 steps/min and 0.48 m steps (not 50 steps/min of 0.66 m).
  Implementation: play the clip at `C(v) / C_clip` and scale the legs' (and arms') swing about the standing pose by
  `L(v) / L_clip`; then foot speed against the hips = v and the feet don't skate.
- **Pelvis.** Transverse rotation ~ +-4-5 deg, obliquity (drop on the swing side) ~ +-4-5 deg, tilt ~ +-2 deg; the
  centre of mass rises and falls ~4-5 cm twice per stride and moves ~4 cm side to side once per stride (textbook).
  The authored mocap walk already contains these; the job is not to break them.
- **Thorax counter-rotates against the pelvis** more as speed rises (in phase at slow speed, out of phase at fast),
  driven by the legs' angular momentum; arm swing grows with speed and declines with age, mediated by speed
  (Mirelman 2015, via Fang & Jiang 2020). Rule: arm swing amplitude scales with step length (same factor as legs).
- **Head stabilisation.** The head's pitch is held within a few degrees through the stride despite the vertical bob
  (Pozzo, Berthoz & Lefort 1990, textbook): never add bob or nod to a walker's head.
- **Gaze steers.** Walkers look where they are going: the head turns toward a new heading a few hundred ms before
  the body does (Grasso et al. 1996/98, textbook). Rule: while walking, the gaze task is a point on the route ~3.5 m
  ahead; this makes the head lead every corner for free.
- **Starts and stops** take a step or two (kept from 2026-11-20: 1.2 m/s^2 up, 1.6 down).

## 5. Sitting

- **Hips on the seat** (the 2026-11-20 rules stand: hip joints ~9 cm over the surface less cushion give; thighs
  along the seat; feet on the floor or a rail; hands resting on something).
- **Seated people don't sway like standing people.** The pelvis is supported; the only continuous motion is
  breathing. No standing idle under a seated pose, ever.
- **Posture changes are rare, deliberate and grouped.** In-chair movement studies: posture shifts on the order of
  10-30 per hour in office sitting (the literature review of in-chair movements; a 60-worker study compared 10, 20
  and 30 shifts/h), increasing with time as discomfort builds. Relaxed sofa sitting watching TV is at the low end.
  Rule: a sitter holds a posture for minutes (median 2 min, lognormal) and changes posture when what they are doing
  changes (picks up the phone, settles back to the TV), in 1.5-2.5 s, minimum-jerk.
- **Reference postures** (photos, CC0/PD, see Sources): slumped on a sofa: pelvis rolled back and forward, head
  resting back or tipped, one hand up at the face or along the back; phone on a sofa: forearms resting on the thighs
  or the belly, hands together at lap height, head pitched down 30-45 deg; at a table: forearms on the top.

## 6. Gaze: eyes, head, attention

- **Fixations and saccades.** Gaze is a sequence of fixations (typ. 200-400 ms in scene viewing, much longer when
  watching something that moves, like TV) joined by saccades of 30-80 ms (textbook: Rayner 1998; main sequence).
- **Eye-head coordination.** For visual targets the eyes move first and the head follows 20-40 ms later; the head
  contributes little below ~20-25 deg and roughly linearly above (Freedman & Sparks; Guitton & Volle). For sounds the
  head starts first and contributes more. As the head arrives the eyes counter-rotate (VOR) and stay on target.
  Rule: eyes take up to +-25 deg, the head covers the remainder beyond ~10 deg and settles in ~0.3 s; the torso joins
  only beyond ~60 deg of head yaw; sound-driven turns lead with the head.
- **Blinks.** ~15-20/min at rest, down to ~5-8/min while watching a screen or reading; blinks accompany large gaze
  shifts (Evinger et al. 1994). Rule: base rate 17/min, 7/min on a screen task; 60 % chance of a blink with any gaze
  shift over 25 deg.
- **TV watching.** Adult looks at a TV are lognormal: many short looks, typical < 15 s, a few of many minutes; the
  longer a look lasts the less likely it ends in the next second ("attentional inertia", Anderson/Richards; Hawkins
  et al.). Viewers look away and back many times and time-share with other things (a phone, a paper). Rule: TV look
  durations lognormal, median 7 s, sigma 1.0; look-aways of 1-3 s to the phone, the room, nothing in particular.
- **Social gaze toward a passer-by.** People look more at a passer-by when they are far away than at close distance
  (Foulsham, Walker & Kingstone 2011), and avoid eye contact at close range by looking away or at the floor (civil
  inattention, Goffman). Rule: a glance (~1 s) when someone comes into ~7 m and in view; no staring as they pass
  inside ~2.5 m; but someone who **stops near you** (< 2.2 m for > 1.5 s), or makes a noise, gets looked at, and in
  an exchange the listener looks at the other ~60-75 % of the time in bouts of a few seconds (Argyle & Cook 1976,
  textbook).
- **A noise** (a thrown thing landing) is oriented to within ~0.15-0.3 s, head first, held ~2 s, often followed by a
  look at whoever caused it.

## 7. Rules as implemented (body.js `STUDY`)

| Behaviour | Rule | Value |
|---|---|---|
| Stillness | head moving > 5 deg/s, share of time, no events | target < 25 % (seated/standing) |
| Breathing | rate; shoulder/chest | 12-16/min, CV 12 %; 0.5 deg chest, 0.7 deg shoulder |
| Sway (standing) | about the ankles | <= 6 mm, 0.12 and 0.31 Hz |
| Weight shift (standing) | hold; transition | lognormal median 22 s (8-90); 0.8-1.4 s min-jerk |
| Contrapposto | held stances from the authored idle | weight-left / weight-right frames, >= 1.5 cm hips apart |
| Seated posture change | hold; transition | when the activity changes (minutes); 2 s min-jerk |
| Gaze split | eyes / head / torso | eyes <= 25 deg, head beyond 10 deg to 70 deg, torso beyond |
| Head dynamics | critically damped | omega 11 /s (~0.3 s settle); sound: head leads |
| Fixations | lognormal medians | TV 7 s, phone 6 s, screen 5 s, path 2 s, glance 1 s, away 1.6 s, noise 2.2 s |
| Social | notice / civil / engage | 7 m glance / 2.5 m avert when passing / 2.2 m and 1.5 s stopped: look, 65 % |
| Blinks | rate; with gaze shifts | 17/min (7 on a screen); 60 % on shifts > 25 deg |
| Walking | cadence, step | C = sqrt(60 v / 0.0064); L = 60 v / C; swing scaled by L / L_clip |
| Walking gaze | path ahead | 3.5 m along the route; glance at oncoming people > 4 m away |

## 8. What it doesn't do yet

- Weight shifts don't re-plant the feet (no step-to-adjust); a fidget is a held-stance change only.
- No facial expression beyond blinks and the gaze; no mouth for speech.
- Arm swing uses the clip's pattern scaled, not speed-dependent phase (thorax/pelvis phase change at speed).
- Reactions (flinch, step away from a thrown chair) are W2: the noise orienting is their first stage.

## Sources

- Duarte M, Zatsiorsky VM (1999). Patterns of center of pressure migration during prolonged unconstrained standing.
  *Motor Control* 3:12-27. https://repositorio.usp.br/item/000995658 (abstract figures quoted above).
- Postural sway band and amplitude: "Universal and individual characteristics of postural sway during quiet standing
  in healthy young adults", https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4393163/ ; posturographic standards,
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10170532/
- In-chair movements, review: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12769933/ ; postural shifting frequency
  10/20/30 per hour in office workers (2023, via library record) ; CDC/NIOSH sitting studies
  https://stacks.cdc.gov/view/cdc/249447
- Attentional inertia and adult TV look durations: Richards & Anderson (2004),
  https://jerlab.sc.edu/wp-content/uploads/2018/07/ACDB2004.pdf ; "Attentional Inertia and Recognition Memory in
  Adult Television Viewing" (Communication Research 1993), https://scilit.net/publications/7e65a005c2b36c3e6d3925968df9f93c
- Social gaze in pedestrians: Foulsham, Walker & Kingstone (2011), as reported in
  https://link.springer.com/article/10.3758/s13414-022-02541-z (crowd navigation, civil inattention).
- Eye-head coordination: Freedman & Sparks, and reviews, e.g. https://pmc.ncbi.nlm.nih.gov/articles/PMC3191847 ;
  https://www.mbfys.ru.nl/~goossens/Papers/expbrainres_1997.pdf
- Pelvis-thorax coordination and arm swing: https://read.qxmd.com/read/17669652 ; Fang & Jiang (2020) PeerJ
  https://peerj.com/articles/9329
- Textbook figures: Perry J, Burnfield JM, *Gait Analysis: Normal and Pathological Function* (2nd ed. 2010); Inman
  VT et al., *Human Walking* (1981); Sekiya N, Nagasaki H (1998) walk ratio, *Gait & Posture* 7:95-101; Pozzo T,
  Berthoz A, Lefort L (1990) head stabilisation during locomotion, *Exp Brain Res* 82:97-106; Evinger C et al. (1994)
  eyelid movements and saccades, *Exp Brain Res* 100:337-344; Argyle M, Cook M, *Gaze and Mutual Gaze* (1976);
  Rayner K (1998) eye movements in reading and information processing, *Psych Bull* 124:372.
- Reference photos looked at (Wikimedia Commons): "Norfolk firefighters outside the entrance to County Hall" (CC BY
  2.0; standing groups, contrapposto); "ORA, older man ... sitting on a couch" (public domain; slumped sofa sitting,
  hand at face, gaze aside); "Person sitting indoors using a phone while resting on a sofa" (CC BY 2.0; forearms on
  thighs, hands together, head down). Not redistributed; looked at only.
- Motion: no new clips. Everything above is procedural on the Rocketbox rigs (MIT) and their four authored clips.
