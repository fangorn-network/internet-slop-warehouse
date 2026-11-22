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
};

/** Model part id → kind. A model not listed is just a model (put() places it, nothing more). */
export const KIND_OF = {
  'hotel-table-lamp': 'table-lamp',
  'hotel-floor-lamp': 'floor-lamp',
  'ph-desk-lamp-arm-01': 'desk-lamp',
  'hotel-waste-bin': 'bin',
};

export const kindOf = id => KINDS[KIND_OF[id]] ?? null;
