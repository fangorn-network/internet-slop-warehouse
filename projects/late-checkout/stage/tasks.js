// SPDX-License-Identifier: CC0-1.0
// An on-screen task list with checkboxes. add() shows a task; done() ticks it, holds it a moment so you see the tick,
// then fades it out. Adding a task that already exists just updates its text (for counters like "pages 2 of 4").
//
//   const tasks = createTasks(document.getElementById('tasks'));
//   tasks.add('checkin', 'Check in at the front desk');
//   tasks.done('checkin');
export function createTasks(list, { hold = 2.2, fade = 0.6 } = {}) {
  const items = new Map();
  return {
    add(id, text) {
      const old = items.get(id);
      if (old) { if (!old.done) old.label.textContent = text; return; }
      const li = document.createElement('li'), box = document.createElement('span'), label = document.createElement('span');
      box.className = 'box'; box.setAttribute('aria-hidden', 'true'); label.textContent = text;
      li.append(box, label); li.dataset.task = id; list.append(li);
      requestAnimationFrame(() => li.classList.add('in'));
      items.set(id, { li, label, done: false });
    },
    done(id) {
      const it = items.get(id);
      if (!it || it.done) return false;
      it.done = true; it.li.classList.add('done');
      setTimeout(() => { it.li.classList.add('out'); setTimeout(() => it.li.remove(), fade * 1000); }, hold * 1000);
      return true;
    },
    has: id => items.has(id) && !items.get(id).done,
    clear() { for (const it of items.values()) it.li.remove(); items.clear(); },
  };
}
