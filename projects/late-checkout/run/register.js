// SPDX-License-Identifier: CC0-1.0
// The guest register: what this browser remembers between nights (how they ended, whom you exposed).
// A per-viewer convenience: when storage is unavailable the game plays the same, it just forgets.
const KEY = 'late-checkout-register';
export function register() {
  let nights = [];
  try { nights = JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { /* private window */ }
  return {
    nights: nights.length, drove: nights.filter(n => n.how === 'drove').length, staff: nights.filter(n => n.how === 'staff').length,
    culprits: [...new Set(nights.filter(n => n.how === 'drove').map(n => `${n.culprit} (${n.year})`))], list: nights,
  };
}
export function record(night) {
  try { const all = JSON.parse(localStorage.getItem(KEY) ?? '[]'); all.push(night); localStorage.setItem(KEY, JSON.stringify(all.slice(-200))); } catch { /* storage blocked */ }
}
