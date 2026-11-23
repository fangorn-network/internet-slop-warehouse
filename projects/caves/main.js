// SPDX-License-Identifier: CC0-1.0
// Onyx Caverns, by itself: a morning drive from the Heartland Inn to the caves (caves.js). ?seed=N fixes the cave.
import { boot } from '../heartland/boot.js';
import { caves, prebuild } from './caves.js';

let money = 120;
await boot({
  scenes: { caves }, fallback: 'caves', prebuilds: { cavesBuilt: prebuild }, hook: '__caves',
  extend: () => ({ run: { get money() { return money; }, spend: n => (money >= n ? (money -= n, true) : false), hurt: () => false } }),
  onEnd(ctx, { $, seed }) {
    $('tally').textContent = `You came back with a piece of onyx in your pocket and $${money} in your wallet. Cave ${seed}.`;
    $('again').href = `?seed=${seed}`; $('end').hidden = false;
  },
});
