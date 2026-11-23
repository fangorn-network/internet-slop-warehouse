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

## Pieces

- `audit.js`: the scene `{ acts: { night, below, lobby }, start: 'night', install }` plus `prebuild()`, which must run before the player exists because physics reads colliders once. It starts in bed in 212 and ends at the desk, so a coordinator can put any intro before it.
- `maze.js`: `generate()` is pure (seed → grid). It carves halls that prefer long straight runs and adds a few loops. `buildFloor()` turns a grid into merged meshes (walls, carpet, ceiling, downlights, door plates on one atlas, instanced doors), colliders, light anchors and interactions. Floors sit 40 m apart under the hotel, each with its own culling zone that sees nothing else.
- `air.js`: path-routed voices. Each sound's loudness and muffling come from the walking distance, not the straight line, and its panner sits two cells toward the source, so the music comes round corners. `muzak()` is a generated placeholder lounge loop.

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
