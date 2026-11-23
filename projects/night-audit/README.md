# Night Audit (Heartland scene)

3:13 AM in room 212. Someone knocks. Through the peephole a shape stands in the hall that the light doesn't land on. Step out and your door locks behind you, the key card blinks red, and the elevator never comes. Stair A goes down further than the building does: generated remixes of the hotel's corridors, a new set every night (`?seed=N` replays one). The lobby is playing music. Follow it down. TVs in the halls talk over it, so turn them off.

This revises the warehouse's standalone `parts/night-audit.html` (where you followed a ringing phone) into a scene on the hotel's stage.

```sh
python3 -m http.server 8080            # from the repository root
# http://localhost:8080/projects/night-audit/                 a new night
# http://localhost:8080/projects/night-audit/?seed=1234       that night again
# http://localhost:8080/projects/night-audit/?scenes=checkin,audit   check in with Dana first
node projects/night-audit/maze.test.mjs   # 9000 floors: connected, exit far, door walls closed, deterministic
node projects/night-audit/check.mjs       # plays a night in Chrome → artifacts/night-audit/
node projects/night-audit/package.mjs     # → artifacts/night-audit/night-audit.html, assets.parts.json, release.parts.json
```

## What's down there

- **It.** Whatever was at your door comes down the stairs after you, 38, 26 and then 16 seconds after you reach each floor. You hear the stair door, then one heavy foot and one that drags, and breathing too deep for its chest. All of it reaches you by walking distance, round corners. It searches near you, slowly.
  - **Hearing:** running carries seven cells, walking two or three, crouching (C) nothing. Opening doors and switching TVs carry four.
  - **Sight:** it sees down a straight hall and then runs, a little slower than you can.
  - **When it's near:** downlights stutter, the music sags like a slowed tape, the picture drains, and your heart comes up.
  - **If it catches you:** you're back at that floor's stair door, and it comes down again.
- **Guest rooms.** Three or four per floor, off the outer halls. Their doors really open, close, and lock from inside. Each has a made or unmade king bed, nightstands, a TV credenza, and either a lamp left on or a TV showing snow. Shut in a room, you're hidden. It can come and stand outside: three slow knocks, like the first ones. If the door's unlocked, it opens it, slowly.
- **The building's sound.** A room tone of air handlers, mains hum and a ballast whine. Every 7–18 s there's something far off, from a real cell in the halls: a door pulled shut, a cart wheel squealing, an ice machine dropping a load, a phone ringing twice, a cough behind a door, three knocks, a TV changing channels. The halls fade to black 20 m off.
- **The hall upstairs.** Nine seconds after the lockout, it's at the far end of the hall, walking toward you. Get close, or go for the stairs, and the lights stutter and it's gone.

## Pieces

- `audit.js`: the scene `{ acts: { night, below, lobby }, start: 'night', install }` plus `prebuild()`, which must run before the player exists because physics reads colliders once. It starts in bed in 212 and ends at the desk, so a coordinator can put any intro before it.
- `maze.js`: `generate()` is pure (seed → grid). It carves halls that prefer long straight runs and adds a few loops. `buildFloor()` turns a grid into merged meshes (walls, carpet, ceiling, downlights, door plates on one atlas, instanced doors), colliders, light anchors and interactions. Floors sit 40 m apart under the hotel, each with its own culling zone that sees nothing else.
- `creature.js`: the hunter, a state machine on the cell graph (away, search, hunt, chase, door, look, caught).
- `air.js`: path-routed voices, placed one-shots, beds, and offline-rendered room tone, breath and heartbeat. Each sound's loudness and muffling come from the walking distance, not the straight line, and its panner sits two cells toward the source, so the music comes round corners. `muzak()` is a generated placeholder lounge loop.

## Escalation

| Floor | Sign | Halls | Doors | Dead ends | TVs |
|---|---|---|---|---|---|
| 1 | 2 | corridor carpet | 2xx numbers out of order | ice machine, vending, carts | 3 |
| 2 | 2 | lilac-cast carpet | all 212 | beds, credenzas, PTACs | 5 |
| 3 | B | lobby carpet, a third of the lights out | 108, 107… then below 100 | lounge chairs, sectional, breakfast bar | 7 |

## Sound sources

- TVs (public domain, via the Internet Archive). Each clip is 150 s, mono, 40 kbps, loudness-normalised (`ffmpeg -ss S -t 150 … loudnorm=I=-18`):
  - `tv-hoteland.mp3`: *Hotel and Restaurant Workers*, Prelinger Archives (archive.org/details/Hoteland), from 120 s.
  - `tv-duck.mp3`: *Duck and Cover* (1951), Federal Civil Defense Administration, Prelinger (archive.org/details/DuckandC1951), from 200 s.
  - `tv-arctic.mp3`: Universal Newsreel, *Arctic Sentinels* (1956-04-09) (archive.org/details/1956-04-09_Arctic_Sentinels), from 20 s.
- Lobby music: `lobby-music.mp3` (204 s, mono, 48 kbps) is three excerpts of 식료품groceries, *인터넷 쇼핑 (Ascension)* (mallsoft, 2017): "Add To Cart" from 40 s, "Continue Shopping" from 15 s and "Quick-Start Guide" from 30 s, 70 s each, crossfaded over 3 s and loudness-normalised. Source: archive.org/details/ascension-raw-flac, CC0, published by the artist. If it doesn't load, `air.js` `muzak()` generates a placeholder.
- Where the music comes from: it always plays from a fixed point in the world. In the real hotel that's the lobby's ceiling speaker (`SPEAKER`), muffled while you're outside the lobby. On the generated floors it's the stair door down, heard by walking distance and arriving from the next corner toward that door. It's never attached to the player.
