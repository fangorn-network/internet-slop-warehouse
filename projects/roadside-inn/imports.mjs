// SPDX-License-Identifier: CC0-1.0
// What a packaged Heartland game (Heartland Inn, Late Checkout) imports from CDNs, at exact versions, and the warehouse
// parts it bundles from source. package.mjs scripts write this map into the game page and these credits into `uses`.
export const IMPORTMAP = `<script type="importmap">${JSON.stringify({ imports: {
  three: 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
  'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/',
  '@dimforge/rapier3d-compat': 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.21.0/dist/rapier.mjs',
} })}</script>`;
/** Left out of the bundle: the page's import map supplies them. */
export const external = id => id === 'three' || id.startsWith('three/') || id === '@dimforge/rapier3d-compat';
/** Parts bundled from source (player.js → physics.js → parts/physics-world.js), credited as publisher/id from their
 *  publish receipts: they're not in parts/parts.json, which publish-batch checks plain ids against. */
export const BUNDLED = ['physics-world'];
export const bundledCredits = (publishers) => BUNDLED.map(id => {
  if (!publishers[id]) throw Error(`${id} has no publish receipt: publish it first`);
  return `${publishers[id]}/${id}`;
});
