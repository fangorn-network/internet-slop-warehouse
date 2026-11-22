// SPDX-License-Identifier: CC0-1.0
// Kinds: what each model *is*, so a lamp is a lamp wherever it stands. A placement says where (world/put.js:
// put(model, x, y, z, yaw)); the kind says everything else: whether it's solid, loose or carried, whether it has a cord,
// a switch and a light, whether it takes rubbish. Placing a second lamp gives it a cord because lamps have cords; nobody
// has to remember. Kept in this project on purpose: other games decide their own kinds (no warehouse-wide schema).
//
// A kind is a set of traits, each optional:
//   solid: true                  a collider from the model's bounding box (the player walks round it)
//   loose: { ...physics.js opts } it can be moved: rest (sits until disturbed), carry (two hands), density, shape
//   power: { cord, noun, glow }  a cord `cord` metres long with a plug (world/lamps.js pluggable): plugs into the free
//                                outlet nearest its `out` [x, z]; `glow` is its shade's emissive level when lit
//   switch: true                 a switch on the thing itself ("Turn the table lamp off"); lit = plugged in AND on
//   light: { y, color, intensity, distance }   a point light `y` m above its origin, following it, out when it's dark
//   bin: { noun, opening, depth } takes what you hold ("Throw away the cup"): anything smaller than `opening` m goes in
//   noun: 'word'                 what prompts call it
//
// Model hooks a kind reads (Victor names these nodes in Blender; see the brief template):
//   cord_exit       where the cord leaves a powered thing (else the back of its base)
//   bin_opening     the top of a bin's opening, centred (else the top of its bounding box)
//   open_* / take_* / socket_* / handle*   as world/handling.js describes
export const KINDS = {
  'table-lamp': { noun: 'table lamp', loose: { rest: true, density: 0.5 }, power: { cord: 2.4, glow: 0.45 }, switch: true,
    light: { y: 0.5, color: '#ffe0b5', intensity: 1.8, distance: 4.5 } },
  'floor-lamp': { noun: 'floor lamp', loose: { carry: true }, power: { cord: 2.6, glow: 0.6 }, switch: true,
    light: { y: 1.45, color: '#ffd2a0', intensity: 6, distance: 3.5 } },
  'desk-lamp': { noun: 'desk lamp', loose: { rest: true, density: 0.6 }, power: { cord: 1.8, glow: 0.6 }, switch: true,
    light: { y: 0.45, color: '#ffe0b0', intensity: 1.8, distance: 3.5 } },
  'bin': { noun: 'wastebasket', solid: true, bin: { opening: 0.3 } },
  'small-bin': { noun: 'wastebasket', solid: true, bin: { opening: 0.22 } },
  // Round 1 kinds (data only; the lead writes the traits in world/put.js). Hooks are the GLB node names in the briefs.
  // wallLamp: hardwired, no cord: a switch on its plate and a light at the head that follows the swing arm (arm_pivot).
  'wall-lamp': { noun: 'reading light', switch: true, wallLamp: { pivot: 'arm_pivot', reach: 0.35 },
    light: { y: 0.0, color: '#ffe0b5', intensity: 1.6, distance: 3.5 } },
  // drapes: panels slide along the track between open_drapes_* and closed; light leaks at the gaps (night slits).
  'drapes': { noun: 'curtains', drapes: { panels: 2, slit: 0.02 } },
  // towelBar: take_towel_* hands you a towel; holding one at the bar hangs it back.
  'towel-bar': { noun: 'towel bar', towelBar: { hooks: 'take_towel' } },
  // tpHolder: take_roll pulls a strip off the roll (it gets thinner); take_roll_spare takes the spare roll.
  'tp-holder': { noun: 'toilet paper', tpHolder: { hook: 'take_roll', spare: 'take_roll_spare' } },
  // cupStack: take_cup gives one empty paper cup per take; the stack shortens by one cup height (step 1 of the coffee).
  'cup-stack': { noun: 'paper cups', stack: { hook: 'take_cup', item: 'paper cup', count: 25 } },
  // dispenser: with an empty cup held at fill_point, holding E on the tap fills it from fill_spout in `seconds` (step 2).
  'dispenser': { noun: 'coffee dispenser', dispenser: { point: 'fill_point', spout: 'fill_spout', seconds: 8 } },
  // lidStack: take_lid gives a lid; holding a filled cup, E presses a lid onto it (step 3: a cup you can carry hot).
  'lid-stack': { noun: 'cup lids', stack: { hook: 'take_lid', item: 'cup lid', count: 30, fits: 'paper cup' } },
  // caddy: each take_<noun> node hands out one <noun> (sleeve, stirrer, sugar packet, creamer cup), endless.
  'caddy': { noun: 'condiments', stack: { hook: 'take_', count: Infinity } },
  // a hole in a counter top: the bin trait, opening from the bin_opening hook; the counter is the collider.
  'counter-bin': { noun: 'trash opening', bin: { opening: 0.2 } },
  // cart: push by the grab bar (grab hook); loose things set on the deck (deck node) ride along. Heavy, rolls.
  'luggage-cart': { noun: 'luggage cart', loose: { density: 0.35 }, cart: { grab: 'grab', deck: 'deck' } },
  // roll: the handle node slides up `extend` m while you pull it on its wheels (today hard-coded in world/handling.js).
  'roller-bag': { noun: 'carry-on', loose: { carry: true, shape: 'box', hold: 'roll', roll: { wheel: [0, 0.035, -0.095], handle: 1.0, extend: 0.42 } } },
};

/** Model part id → kind. A model not listed is just a model (put() places it, nothing more). */
export const KIND_OF = {
  'hotel-table-lamp': 'table-lamp',
  'hotel-floor-lamp': 'floor-lamp',
  'ph-desk-lamp-arm-01': 'desk-lamp',
  'hotel-waste-bin': 'bin',
  // Round 1 briefs (artifacts/roadside-inn/briefs/): mapped now, placed with put() once Victor's GLBs land.
  'hotel-room-wastebasket': 'small-bin',
  'hotel-swing-arm-sconce': 'wall-lamp',
  'hotel-blackout-drapes': 'drapes',
  'hotel-towel-bar-towels': 'towel-bar',
  'hotel-tp-holder': 'tp-holder',
  'hotel-cup-rack': 'cup-stack',
  'hotel-coffee-tower': 'dispenser',
  'hotel-hot-water-box': 'dispenser',
  'hotel-lid-bin': 'lid-stack',
  'hotel-condiment-riser': 'caddy',
  'hotel-stirrer-tumbler': 'caddy',
  'hotel-luggage-cart-brass': 'luggage-cart',
  // 'hotel-roller-bag': 'roller-bag',  // ponytail: map when handling.js places the bag with put(), else lint flags it
};

export const kindOf = id => KINDS[KIND_OF[id]] ?? null;
