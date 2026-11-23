# The Heartland

How many nights can you last at the Heartland Inn Express? This project is the coordinator. It strings the hotel's minigames into one run, and each minigame stays a scene you can also play and publish on its own.

```sh
python3 -m http.server 8080      # repository root
# http://localhost:8080/projects/heartland/          a run
# http://localhost:8080/projects/night-audit/        the night by itself
# http://localhost:8080/projects/caves/              the morning by itself
node projects/heartland/check.mjs                    # a run in Chrome → artifacts/heartland/
```

## A run

| Phase | Scene | What happens |
|---|---|---|
| arrival | `catherine/intro.js` | Dusk, your car, check in with Dana, find 212, lie down. |
| night | `night-audit/` | Locked out at 3 AM, down the stairs that keep going, something following; back to Dana. |
| morning | `caves/` | Drive to Onyx Caverns (the only place the wagon can go), pay at the honour box, take the tour, bring back a piece of onyx. |
| evening | here | Back at the Heartland at dusk. Another night is $59. |

After that it's night, then morning, then evening, then night again, until the run ends.

- **Money** pays for the room ($59 a night, charged when you lie down) and tickets (the caves: $14). It comes from the bills people left on nightstands in the guest rooms down below. You start with $150.
- **Nerve** starts at 100. It finds you: −25. Taking the onyx: −5. A night's sleep: +12.
- **Permadeath.** Out of nerve, it keeps you ("Kept"). Can't pay at bedtime ("Checked out"). The run is over.
- **Memories** are kept across runs, in the browser. Each is a thing you learned the hard way, for example "Lock the room door. It knocks, but it won't come in." They're listed when you check in again.
- **Harder each night:** it comes down the stairs sooner (×0.8 per night).

## How it's built

- `boot.js` is the shared engine start for every Heartland game: the hotel, the stage, the reel of scenes, the camera, input, interaction and the frame loop. Each game's `main.js` is a few lines naming its scenes.
- Scenes keep the stage's contract, `{ acts, start, install }`, and call `ctx.next(outcome)` when they're done. They read `ctx.run` if it's there:
  - `spend(n)`, `hurt(n)`, `day`;
  - `game.money(n)` for cash found.
- `prebuild(ctx0, { seed })` builds what must exist before physics starts.
- The coordinator replaces `ctx.next` with its schedule (`main.js`).

## Next

- **Floors rebuilt every night.** `physics.js` needs to take colliders after it starts. Then each night can draw fresh floors and other night cards, and the floors stop being built up front.
- **More cards.** Day: reptile farm, mystery spot, wax museum (the brochure rack as the menu). Night: more minigames beside Night Audit. The morning's choice comes from the rack, drawn per run.
- **Modifiers:** the day leaks into the night. The onyx in your pocket shows up on the TVs; souvenirs change what knocks.
- **Memories that do something:** a remembered fact unlocks a line, an item, a shortcut.
