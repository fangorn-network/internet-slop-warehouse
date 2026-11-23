// SPDX-License-Identifier: CC0-1.0
// Before the dream: an ordinary evening at the Heartland, so you know the hall before it changes. Dusk, your car, check
// in with Dana, find 212, lie down. Nothing happens. (After late-checkout/acts/arrival.js and its check-in.)
// A scene: { acts, start, install(ctx) }. It ends when you fall asleep (ctx.next()), so whatever is spliced after it
// begins with you in bed in 212: a haunting, a quiet night, a morning.
function install(ctx) {
  const { game, world } = ctx;
  let checkedIn = false, busy = false;
  game.checkIn = clerk => {
    if (busy) return;
    clerk.root.lookAt(ctx.player.x, clerk.root.position.y, ctx.player.z);
    if (checkedIn) {
      const lines = ['“Ice machine’s on two, across from the elevator.”', '“Checkout’s at eleven.”', '“Quiet night. Holler if you need anything.”'];
      clerk.play('Wave'); setTimeout(() => clerk.play('Idle'), 1800);
      return game.say('Dana: ' + lines[Math.floor(Math.random() * lines.length)]);
    }
    busy = true;
    const script = [
      ['Wave', 'Dana: “Evening! Welcome to the Heartland Inn. Checking in?”'],
      ['Interact', 'Dana: “There you are. One king, non-smoking.”'],
      ['Interact', 'Dana: “You’re in 212, second floor. Elevator’s down the hall past the lounge, stairs right beside it.”'],
      ['Wave', 'Dana: “Here’s your key. Get some sleep. You look like you’ve been driving a long time.”'],
    ];
    script.forEach(([anim, text], i) => setTimeout(() => {
      clerk.play(anim); game.say(text, 3.6);
      if (i === script.length - 1) {
        game.give('key card'); game.sound.beep(true); checkedIn = true; ctx.goal('Find room 212, second floor');
        setTimeout(() => { clerk.play('Idle'); busy = false; }, 1500);
      }
    }, i * 3700));
  };
  game.vend = () => game.say('You pat your pockets. No change.');
  game.event = name => {
    if (name === 'room-open' && !game.has('room-found')) { game.give('room-found'); ctx.goal('Get some sleep'); }
    if (name === 'sleep') sleep(ctx);
    if (name === 'fire-plan') game.say('Exit by stair A. You are here: 212. The stairs are right beside your door.', 4);
  };
  void world;
}

async function sleep(ctx) {
  if (ctx.director.name !== 'arrival' || ctx.busy) return ctx.game.say('Not now.');
  ctx.busy = true; ctx.goal('');
  ctx.game.say('The PTAC rattles on. Somewhere down the hall, a door thuds shut. Out on I-62, a truck downshifts for the exit.', 5);
  ctx.fx.set({ lids: 1 }, 4);
  await new Promise(r => setTimeout(r, 4500));
  ctx.busy = false;
  await ctx.next({ fadeOut: 2.5 });
}

export const arrival = {
  fadeIn: 2.2,
  enter(ctx) {
    const { world, fx } = ctx;
    ctx.applyLook('dusk');
    const s = world.spawn;
    ctx.teleport(s.x, 0, s.z, s.yaw, 0);
    const room = world.room;
    room.setLamps(true); room.setBath(true); room.setDesk(true); room.drapes = 1; room.open = false; room.timer = 0;
    for (const w of world.walkers) { w.p.root.visible = true; if (w.cart) w.cart.visible = true; w.say = w.say0 ?? w.say; }
    if (world.clerk) world.clerk.root.visible = true;
    fx.snap({ dream: 0, lids: 0, peep: 0, flash: 0 });
    ctx.goal('Check in at the front desk');
    ctx.say('Seven hours on I-62. The pole sign just flickered on. Your bag is light.', 5);
  },
};

export const checkin = { acts: { arrival }, start: 'arrival', install };
