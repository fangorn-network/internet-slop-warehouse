# After the Siren

A CC0 survival test for the internet slop warehouse. Original procedural 2D artwork and synthesized audio; the game uses five pinned warehouse modules and needs no storage, account, or external art downloads. A run lasts four minutes: three 45-second days and three 35-second nights.

## Play

- WASD or arrows: move. Shift: sprint at a stamina cost.
- E: activate the nearest eligible cache, door or lantern.
- Mouse: aim. Click or Space: swing the crowbar. Without mouse input, stand still to face a nearby enemy automatically.
- F: spend one medicine to restore up to 45 health.
- Escape or the Pause button: pause. Switching away also pauses the run.
- Touch devices get a movement pad and swing/use/heal buttons.

Search gold-marked caches. Spend scrap at the southern refuge door to restore 45 integrity, or fuel at the lantern to add 65 seconds of ward time. Enter the refuge through its southern opening. Enemies attack the door while you shelter inside; once it breaks, they can reach you. The ward slows nearby enemies and reduces damage to the door. Fuel burns only at night. Caches replenish at dawn. Survive the third night to win. Restart resets the entire run.

## Reusable logic

| Part | Contract | Typical reuse |
| --- | --- | --- |
| `health` | damage/heal/revive, damage modifier, grace period, change/death/revival hooks | Players, enemies, destructible doors, shields |
| `resource-inventory` | Capacity and weights, copied snapshots, atomic signed resource transactions | Crafting, repairs, fuel, ammo, trading |
| `proximity-interaction` | Nearest eligible target, explicit activation, cooldown, focus hooks | Searching, dialogue, doors, switches, contextual prompts |
| `phase-cycle` | Ordered phase transitions, preserved overshoot, finite or infinite cycles | Day/night, rounds, waves, turn stages |
| `touch-controls` (existing) | On-screen controls that emit keyboard events | Mobile input for keyboard-driven games |

All four new modules are engine-independent and follow `attach(object, opts) -> { update(dt), dispose(), ... }`. Time is in seconds. Call `update` only while playing. The phase clock exposes its initial state immediately and calls `onPhase` on subsequent transitions.

Example crafting transaction: `bag.transact({ scrap: -3, fuel: -1, torch: 1 })`. If the player cannot afford the full cost or the result exceeds capacity, nothing changes. Damage immunity is owned by the health module, so several enemies touching on the same frame cannot stack damage through the grace period.

## Build and publish

```sh
node publish-batch.js parts/after-the-siren.parts.json --local /tmp/after-the-siren
python3 -m http.server --directory /tmp/after-the-siren 8088
npm test
NETWORK=baseSepolia node publish-batch.js parts/after-the-siren.parts.json
```

The batch publisher commits mechanics before the game and fills the game's `PARTS` map with pinned storage URLs. Receipts are saved beside the manifest. The main seed manifest also includes these parts.

## Scope

This is a single-player mechanics study. Buildings other than the refuge are scenery with outdoor caches. Enemies use local obstacle avoidance rather than full navigation. There is no persistence, procedural loot economy, building editor, or multiplayer. The callback-driven modules are useful foundations for those features; network authority and replication are separate future work.

## Verification

`parts/survival.test.js` covers lethal damage, immunity, revival, inventory rollback and capacity, interaction eligibility and cooldown, and phase overshoot/completion. The existing test suite also passes.

For browser QA, install `playwright-core` in a temporary directory and run:

```sh
PLAYWRIGHT_MODULE=/tmp/warehouse-validation/node_modules/playwright-core/index.mjs node scripts/test-siren-browser.mjs /tmp/after-the-siren
```

The runner uses installed Chrome, serves the local build temporarily, checks real keyboard movement and cache collection, checks touch controls, and simulates both an unattended loss and a moving survivor's third-dawn victory. It minimizes the canvas during long simulations while continuing the actual game update loop. Screenshots and the structured QA report are saved in `artifacts/after-the-siren/`.
