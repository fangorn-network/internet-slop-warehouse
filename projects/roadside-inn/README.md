# Heartland Inn Express

A first-person walk through a generic interstate hotel off I-44 in Missouri, modeled on chain hotels like Holiday Inn Express (see `game-ideas/hotel/`). The focus is realism and immersion, not gameplay.

```sh
python3 -m http.server 8080          # from the repository root
# open http://localhost:8080/projects/roadside-inn/
```

Controls:

- **Desktop:** WASD to move, mouse to look (click to capture it), E to interact, Shift to walk faster, T to toggle day and dusk, M to mute.
- **Phones:** left thumb joystick to move, drag on the right half of the screen to look, and the E button to interact.

It starts at dusk.

## What's in it

- **Arrival.** You start in the parking lot beside your car. There's a porte-cochère, a stone entrance tower and motion-sensor sliding doors.
- **Lobby.** Dana works the front desk. Check in to get the key card for room 212. The lobby also has a seating area, a desk bell, a brochure rack and a luggage cart.
- **The Pantry.** A coffee station (pour a coffee, take a cookie), a snack vending machine and a drinks machine. You have $7.25 to spend.
- **Lounge.** A wall TV with four channels: Doppler weather, local news, hotel info, and a ballgame.
- **Pool wing.** Taller ceiling, an animated pool and hot tub, rails, chaises, a rules sign, depth markers and an attendant on rounds. The door takes your key card.
- **Gym.** Visible through a glass wall: treadmills, a bike, dumbbells, mirrors and a TV. The door is locked.
- **Getting upstairs.** A working two-floor elevator (call buttons, car panel, doors that won't close on you, ding) and a switchback stair.
- **Floor 2.** The corridor has a housekeeper with her cart, an ice machine and locked guest rooms you can knock on.
- **Room 212.** The door opens with the key card and closes itself. Inside:
  - king bed, nightstand lamps (switchable), TV, desk and armchair
  - a PTAC unit under the window, and drapes that open and close
  - a closet with an ice bucket (fill it at the ice machine)
  - a bathroom with vanity, lit mirror, toilet and textured glass shower enclosure, plus a light switch
  - a micro-fridge and microwave
  - lie down on the bed to end the night, then sleep until morning: daylight, and a hot breakfast bar in the lobby (waffle maker, eggs and sausage, juice).
- **Outside.** The parking lot has LED light poles, bollards, a hydrant, a dumpster corral and parked 1990s cars (instanced, with varied paint). Beyond it are a frontage road with utility poles, sagging lines and street lights, the interstate with guard rails and moving cars and semis, the hotel's pole sign, a truck stop, a billboard, tree lines and a distant water tower.

## Files

`world.js` builds the floor plan, both floors and the outside, and handles colliders, walkable surfaces (stairs, elevator) and interactions. `fixtures.js` holds the original procedural models: beds, vending, elevator, gym equipment, bathroom fixtures and signage. `assets.js` loads warehouse parts. `main.js` runs movement, the interaction picker, the check-in script, vending and the HUD. `sound.js` plays Kenney footsteps plus synthesized ambience and effects.

`check.mjs` runs a headless smoke test (install its browser driver with `npm install --prefix projects/roadside-inn/.validation playwright-core`). It takes screenshots, then plays a scripted session: check in, ride the elevator up, open 212 with the key, lie down, and climb the stairs. It fails on any console error. Artifacts go to `artifacts/roadside-inn/`.

```sh
node projects/roadside-inn/check.mjs          # screenshots + flow
node projects/roadside-inn/check.mjs flow     # flow only
node projects/roadside-inn/check.mjs physics  # shove an armchair, pick up and throw the wet floor sign
```

## Physics

[physics.js](physics.js) runs the hotel on the warehouse's `physics-world` part (Rapier). The player is a capsule character: it slides along walls, climbs the stairs and kerbs, and rides the elevator floor (a `platform` body that follows the car). The world's boxes and floors become colliders. Doors and the elevator doors switch on and off with the same `on()` callbacks the old walker used.

Props that `world.js` tags with `loose()` are dynamic: the lounge, breakfast and pool chairs, the luggage cart, plants, the ottoman and side tables, the pillows, the wet floor sign and the cones. Walking into them shoves them. Small ones get a "Pick up" prompt, and E or a click throws what you're carrying. A loose prop that starts inside a hand-placed box (the pillows on the bench, whose box covers the backrest) stays put as a fixed body instead of being fired out of it. It moves once its box is replaced by one shaped from the model. Room 212's furniture stays static: its clearance pass measures every prop.

If Rapier can't load (offline, a blocked CDN), the game logs `physics off` and walks the old way, with boxes and floor heights. Late Checkout and Slopov II read `world.js` without physics and are unaffected; `loose()` only tags props.

## Assets and licenses

- Poly Haven (CC0): furniture, plants, lamps, lobby/carpet/stone/lawn textures, and both skies (farm field for day, industrial sunset for dusk). This is in `ingestion/polyhaven/batches/hotel/`, with provenance and Khronos validation (0 errors).
- Grab3D (CC0, procedurally modeled, no AI-generated geometry or textures): cars, semi truck, dumpster, utility pole, street light, vending machine, hydrant, cone, bollard and guard rail. This is in `ingestion/grab3d/batches/hotel/`, with each model's LICENSE and manifest, SHA-256 and validation (0 errors). The ingester is `node ingestion/grab3d/ingest.mjs <batch>`.
- Already in the warehouse:
  - Microsoft Rocketbox human staff and guests, converted by Avatar Studio (MIT); notices in `licenses/`
  - Kenney footsteps (CC0)
  - Poly Haven asphalt and tile, plus sofa 02 and the extinguisher, from Maira's Dream
  - the municipal water tower (original CC0).
- Building, fixtures, signage and code: original, CC0-1.0. Three.js is MIT.

## Publishing

- **Batch 1** (30 parts): published. Receipts are in `assets-1.parts.receipts.json`.
- **Batch 2** (16 parts: Grab3D and the dusk sky): `node publish-batch.js projects/roadside-inn/assets-2.parts.json --network baseSepolia`
- **The game:** run `node projects/roadside-inn/package.mjs`, which writes `artifacts/roadside-inn/heartland-inn.html` and `release.parts.json`, pinning every part from the publish receipts and listing any that are still unpublished. Then run `node publish-batch.js projects/roadside-inn/release.parts.json --network baseSepolia`.

## Mobile rendering and residents

Touch devices default to a 30 fps battery profile, pixel ratio capped at 1, four local lights, no realtime shadow map and an environment-reflected bathroom mirror. Distant furniture is culled in this profile, with a wider outdoor range and bounds allowance for large props. Hidden tabs skip simulation and rendering; menus render at 10 fps. `?quality=high` enables desktop effects; `?quality=low` additionally halves resolution. Hardware temperature and battery savings still require physical-device measurement.

Residents use four textured, rigged human models from Microsoft Rocketbox / Avatar Studio (MIT), with their authored Idle, Walk, Wave and Talk clips. Unused clothing and facial morphs are removed and textures capped at 1K. Grab3D supplies the imported textured shower enclosure, treadmills and exercise bike (CC0). Source URLs, hashes and preparation notes are in `assets-provenance.json`; MIT notices are also embedded in the character GLBs and the packaged page.

The elevator shaft has an actual opening in its ground-floor slab. Bedroom furniture is checked against measured wall clearances, the desk and TV cabinet have separate footprints, and artwork and signs have explicit surface clearance. The orange desk lamp has a working light switch. `node projects/roadside-inn/check.mjs repairs` checks the lamp, elevator, human poses and fixture bounds and saves screenshots.

For software-rendered CI, `INN_FLOW_NO_CAPTURES=1 node projects/roadside-inn/check.mjs flow` checks interactions without captures. The `repairs` audit uses normal rendering; flow and phone control checks isolate the headless GPU and audio device. Results persist as `artifacts/roadside-inn/check-<mode>.json`.
