// SPDX-License-Identifier: CC0-1.0
// Act one: dusk, the lot, your car. Everything is normal. It is also where every death sends you back to.
const AGAIN = [
  'The doors are just past the canopy. Your bag is light; the night is warm.',
  'Your car, ticking as it cools. You don’t remember parking it.',
  'Dusk again. The pole sign hums on, the way it did last time.',
  'The same seven hours behind you. The same exit. The same sign.',
];

export const arrival = {
  fadeIn: 2.2,
  enter(ctx) {
    const { world, fx } = ctx;
    ctx.applyLook('dusk');
    ctx.reset();
    const s = world.spawn;
    ctx.teleport(s.x, 0, s.z, s.yaw, 0);
    const room = world.room;
    room.setLamps(true); room.setBath(true); room.setDesk(true); room.drapes = 1; room.open = false; room.timer = 0;
    for (const w of world.walkers) { w.p.root.visible = true; if (w.cart) w.cart.visible = true; w.say = w.say0 ?? w.say; }
    if (world.clerk) world.clerk.root.visible = true;
    fx.snap({ dream: ctx.deaths ? 0.12 : 0, lids: 0, peep: 0, flash: 0 });
    ctx.tasks.clear();
    ctx.tasks.add('checkin', 'Check in at the front desk');
    ctx.say(AGAIN[Math.min(ctx.deaths, AGAIN.length - 1)], 5);
  },
};
