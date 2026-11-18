# Late Checkout

A remix of [Heartland Inn Express](../roadside-inn/). For the first stretch it's the hotel sim: check in with Dana, find room 212, get ice. Then you fall asleep, and the hotel stops pretending.

At 3 AM someone knocks. Your car keys are gone. There's a door marked 113 at the end of the ground floor, which ends at 108. A notice on the back of your door tells you the rules: it never lies, but it speaks in riddles. Piece together the torn page that says who did what at the Heartland, find your keys, and drive away before six. Whoever is still here at six works here.

Every night is generated from a seed, so each playthrough has a different culprit, crime, hiding places, puzzles and hauntings.

```sh
python3 -m http.server 8080                        # from the repository root
# http://localhost:8080/projects/late-checkout/            a new night
# http://localhost:8080/projects/late-checkout/?seed=48213 that night again (share it)
# &pace=0.5                                                  faster clock (real seconds per game minute; default 2.5)
node projects/late-checkout/run/case.test.mjs      # 5000 seeds: every night is solvable and self-consistent
node projects/late-checkout/check.mjs              # plays a whole night in Chrome, screenshots → artifacts/late-checkout/
```

## A night

- **The clock** starts at 9:40 PM. One game minute is 2.5 real seconds, so a whole night is about 20 minutes. Time is the main resource:
  - each search costs 3 minutes;
  - each question to Dana costs 30;
  - getting hit on the interstate costs an hour;
  - sleeping costs whatever it costs.
- **The turn.** Lie down and close your eyes, or pass out at 12:30 AM regardless. You wake no earlier than 12:13, and the night begins: your keys are gone, Dana stands at the desk all night, and room 113 is there.
- **The page** is in four pieces:
  1. Room 113 hands over the first.
  2. The back of each piece says where the next one is.
  3. Once the page is whole, it says where your keys are.
- **The endings:** drive away, or stay on as the night clerk. Dana leaves in your car.
- **The guest register** (stored in this browser) remembers your nights, how they ended and whom you exposed.

## Since the first release

- **A task list** with checkboxes, top left. Completed tasks tick, linger, then fade.
- **The fire plan comes first.** You read the evacuation plan on the back of your door before you can sleep. At night someone has circled the stairs on it and pencilled in "113".
- **The notice** is a real sheet hung inside the door, under the fire plan. It's only there at night, and you read it from inside.
- **The lockout.** Pick up the note in the hall and the door swings shut behind you, and your key card no longer works. Dana re-keys it, which costs ten minutes.
- **The trail is a trail.** A piece exists only once the one before it is found, so nothing turns up in your freezer before the note.
- **Hauntings announce themselves.** The picture swells into the dream look, a low tone falls and a line names what's happening. The endless corridor happens behind a blink, and the lobby lights die bank by bank with a buzz.
- **Sound** (`stage/audio.js`, `sfx.js`):
  - **Machines, placed where they stand:** hums from the vending and ice machines, buzz from the pole sign and the travel-stop fluorescents, a radio across the road that slows and goes flat after the turn.
  - **Events in space:** knocks come from doors, the payphone rings from the payphone, TVs hiss where they stand.
  - **After the turn:** a night drone, footsteps overhead and distant doors.
  - **The last hour:** a heartbeat from 5 AM.
  - `check-audio.mjs` measures it.
- **Lighting:** light spills through the open door, reflection lighting relaxes as the door opens, and your eyes adapt in a dark room, so the hall glares. The upstairs hall burns harder at night.
- **Headlights and taillights** on the interstate after dusk: one draw call for all of them.
- **The travel stop's fixtures are real** (Grab3D, CC0; `assets-1.parts.json`): phone booth, pumps, grocery shelving and end caps, glass-door coolers, cash register, coffee machines, soda fountain, ice chest, newspaper box, trash cans.
- **The writing:** the document, the page headers, the notice, the riddles and the empty searches are rewritten in a magical-realist voice.
- **The clock** sits top centre, clear of the warehouse player's fullscreen buttons.

## What's generated (`run/`)

| | Pool | Per night |
|---|---|---|
| Culprit | Dana, Ruth the housekeeper, Earl the trucker, Mr. Harlan the manager nobody has met, Lyle by the pool | 1 |
| Crime | disappearance, hit-and-run on the exit ramp, fire in 113 (victim, date and document type vary) | 1 |
| Hiding spots | 23 real places in the hotel and the travel stop, each with honest riddles | up to 5 + the keys |
| Puzzles | hidden (a riddle), code lock (digits split between a pencilled scrap and channel 13), time window (only there for a quarter of every hour), vending (comes out with one snack), knock (one door, one number of knocks) | 3 of 5 |
| Hauntings | the corridor with no east end, the elevator to floor 3, a figure at the end of the hall, every TV going live on your car, the lobby going dark, the payphone ringing for you, your watch lying | 4 of 7, at random times |
| The notice | true statements about this night's rules and hauntings | 7–9 lines |

`case.js` is pure data, which is why `case.test.mjs` can check 5000 seeds for solvability. `run.js` binds a night to the hotel, `strange.js` runs the hauntings, `clock.js` keeps time, and `spots.js` is the catalog of hiding places.

## The framework (`stage/` and the shared loader)

The hotel already struggled on phones. Measured in headless Chrome at phone size, it downloaded **138 MB** before the first frame and held about **1.45 GB** of textures. Mobile Safari kills a tab at roughly 1–1.5 GB.

| Piece | Where | What it does |
|---|---|---|
| Texture budget | `roadside-inn/assets.js` `budget()` | Textures are capped by each model's real size; small props on phones drop their normal and roughness maps. Texture memory: **1450 → ~280 MB.** |
| Streaming | `loadLibrary(…, { stream: true })` | 29 decorative props load after the first frame, nearest first. Each compiles off to the side before appearing. Phones skip props more than 45 m away. |
| Light cells | `world.lightVisible` | A point light counts only in its own cell (room 212, or the rest of the building), unless the door is open. |
| Post pass | `stage/dream.js` | One pass for the dream look, fades, white flash, peephole fisheye and eyelids. Skipped when nothing is active. |
| Acts | `stage/director.js` | Named scenes; `go()` fades out, runs exit and enter, then fades in. |

Shared fixes (the original game gets them too):

- No hidden fill light, and reflection lighting dims with the room's switches.
- No sun through walls on phones.
- A real gym mirror.
- Loader paths resolve relative to the module.
- Lobby realism after reference lobby 1: polished beige porcelain floor with dark bands, warm walls, walnut desk, lime sectional, a downlight grid, a red coffee-bar panel, and no blue LEDs.

## Next

- **Sound pass.** Spatial knocks, a room tone that changes after the turn, the payphone ring placed in space, the radio at the travel stop.
- **More realism.** The rest of the lobby against the references, the pantry, and the corridors.
- **More of everything generated.** Puzzle kinds, hauntings, crimes, and a locket variant of the pieces.
- **Download size.** Publish 512 px variants of each part.
