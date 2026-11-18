// SPDX-License-Identifier: CC0-1.0
// Act two: you wake in 212 in the dark. The lamps are off; the only light is the lot through the window and the
// hallway, a bright line under the door. Someone knocks. Through the peephole there is a figure. Open the door and
// there is nobody, only a note: meet me in room 113. (The ground floor ends at 108.)
import * as T from 'three';

const DOOR_X = 12.9;   // centre of 212's door (R.x0 + 0.9); the door plane is z = 1, the corridor is z < 1

// Built once at load, hidden, so nothing compiles mid-scene.
export function prepareNight(ctx) {
  const { scene, world, lib, FLOOR2: y, renderer } = ctx;
  const n = ctx.night = { state: 'off', knockIn: 0, wake: 0, peeked: false };
  const isNight = () => ctx.director?.name === 'night';

  // The figure: a resident model, dark as a cut-out against the hall light. Facing the door.
  const figure = lib.person('rb-emma-casual');
  figure.root.traverse(m => { if (m.isMesh) { m.material.color.set('#0d0d10'); m.material.roughness = 1; m.castShadow = false; } });
  figure.root.position.set(DOOR_X + 0.1, y, -0.35); figure.root.visible = false;
  scene.add(figure.root);
  n.figure = figure;

  // The line of hallway light under the door, with two shadows in it while someone stands there.
  const gap = document.createElement('canvas'); gap.width = 256; gap.height = 8;
  const gapTex = new T.CanvasTexture(gap); gapTex.colorSpace = T.SRGBColorSpace;
  const drawGap = feet => {
    const g = gap.getContext('2d');
    g.fillStyle = '#fff1d2'; g.fillRect(0, 0, 256, 8);
    if (feet) { g.fillStyle = '#1a140c'; g.fillRect(96, 0, 22, 8); g.fillRect(140, 0, 22, 8); }
    gapTex.needsUpdate = true;
  };
  const strip = new T.Mesh(new T.PlaneGeometry(0.9, 0.014), new T.MeshBasicMaterial({ map: gapTex, toneMapped: false }));
  strip.position.set(DOOR_X, y + 0.007, 1.035); strip.visible = false; scene.add(strip);
  // Its spill on the carpet: a soft wedge of warm light fanning into the dark room.
  const spill = document.createElement('canvas'); spill.width = 128; spill.height = 64;
  { const g = spill.getContext('2d'), grad = g.createRadialGradient(64, 0, 2, 64, 0, 64);
    grad.addColorStop(0, 'rgba(255,236,200,0.55)'); grad.addColorStop(1, 'rgba(255,236,200,0)'); g.fillStyle = grad; g.fillRect(0, 0, 128, 64); }
  const spillMesh = new T.Mesh(new T.PlaneGeometry(1.3, 0.65), new T.MeshBasicMaterial({ map: new T.CanvasTexture(spill), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  spillMesh.rotation.x = -Math.PI / 2; spillMesh.position.set(DOOR_X, y + 0.004, 1.36); spillMesh.visible = false; scene.add(spillMesh);
  n.drawGap = drawGap; n.strip = strip; n.spill = spillMesh;

  // Sodium light from the lot through 212's window (outdoor, so it reaches in whatever cell you stand in).
  n.windowLight = { pos: new T.Vector3(14.25, y + 1.9, 10.4), color: new T.Color('#ffb46b'), intensity: 0, distance: 8, outdoor: true };
  world.lightAnchors.push(n.windowLight);

  // The note, on the corridor carpet just outside the door.
  const paper = document.createElement('canvas'); paper.width = 128; paper.height = 160;
  { const g = paper.getContext('2d'); g.fillStyle = '#f6f2e6'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#1d4f8f'; g.fillRect(0, 0, 128, 14);
    g.strokeStyle = '#2b2b33'; g.lineWidth = 2; g.beginPath(); for (const ly of [52, 76, 100]) { g.moveTo(16, ly); g.bezierCurveTo(40, ly - 6, 80, ly + 5, 108, ly - 2); } g.stroke(); }
  const note = new T.Mesh(new T.PlaneGeometry(0.15, 0.19), new T.MeshStandardMaterial({ map: new T.CanvasTexture(paper), roughness: 0.9 }));
  note.material.map.colorSpace = T.SRGBColorSpace;
  note.rotation.set(-Math.PI / 2, 0, 0.35); note.position.set(DOOR_X - 0.1, y + 0.012, 0.45); note.visible = false; scene.add(note);
  n.note = note;

  world.interact.push(
    { pos: new T.Vector3(DOOR_X, y + 1.55, 1.15), r: 0.9, when: p => isNight() && p.z > 1 && world.room.angle < 0.1, label: () => 'Look through the peephole', use: () => peep(ctx) },
    { pos: new T.Vector3(DOOR_X - 0.1, y + 0.3, 0.45), r: 1.2, when: () => isNight() && note.visible, label: () => 'Pick up the note', use: () => readNote(ctx) },
  );
  void renderer;
}

function peep(ctx) {
  const { fx, FLOOR2: y, night: n } = ctx;
  ctx.sound.synth.burst(0.05, 0.05, 2000);   // the cover of the viewer sliding aside
  fx.set({ peep: 1 }, 0.35);
  const leave = () => {
    if (!ctx.view) return;
    ctx.view = null; fx.set({ peep: 0 }, 0.3);
    // Look away and whoever it was is gone. The knocking stops.
    if (n.state === 'knocking') { n.state = 'gone'; n.figure.root.visible = false; n.drawGap(false); n.knockIn = Infinity; }
  };
  ctx.view = { pos: new T.Vector3(DOOR_X, y + 1.55, 0.93), yaw: 0, pitch: -0.04, fov: 118, label: 'Step back', onUse: leave, onMove: leave };
  if (n.state === 'knocking') { n.peeked = true; setTimeout(() => ctx.say('Hall light. Patterned carpet. Someone standing too close to the door.', 4), 600); }
  else ctx.say('The hallway, bent round the lens. Empty.', 3);
}

function readNote(ctx) {
  const { night: n } = ctx;
  n.note.visible = false; n.state = 'note';
  ctx.game.give('note');
  ctx.openPanel(`<div class="note"><div class="note-head">Heartland Inn Express · Exit 127</div>
    <p class="hand">meet me in room 113</p></div>
    <button id="closePanel">Fold it up</button>`);
  ctx.tasks.done('note');
  // The door swings shut behind you, and the card that opened it no longer knows you.
  const room = ctx.world.room;
  room.open = false; room.timer = 0;
  if (ctx.game.has('key card')) { ctx.game.take('key card'); ctx.game.give('key card (dead)'); ctx.run.keyDead = true; }
  setTimeout(() => { ctx.sound.thud(); ctx.say('Behind you, your door swings shut. Click.', 3.5); }, 400);
  ctx.tasks.add('rekey', 'Your key card stopped working. See the front desk');
  ctx.tasks.add('113', 'Find room 113');
}

export const night = {
  fadeIn: 1.5,
  enter(ctx) {
    const { world, fx, FLOOR2: y, night: n } = ctx;
    ctx.applyLook('night');
    const room = world.room;
    room.setLamps(false); room.setBath(false); room.setDesk(false); room.drapes = 1; room.open = false; room.timer = 0;
    // Nobody is on rounds tonight.
    for (const w of world.walkers) { w.say0 ??= w.say; w.say = null; w.p.root.visible = false; if (w.cart) w.cart.visible = false; }
    // Dana is at the desk all night. She does not leave it.
    if (world.clerk) world.clerk.root.visible = true;
    if (ctx.run) { ctx.run.clock.now = Math.max(ctx.run.clock.now, ctx.wakeAt ?? 0); ctx.run.beginNight(); }
    n.figure.root.visible = true; n.figure.play('Idle');
    n.drawGap(true); n.strip.visible = n.spill.visible = true;
    n.windowLight.intensity = 2.6;
    // The upstairs hall burns all night, harder and colder than at check-in.
    n.hall ??= world.lightAnchors.filter(a => a.pos.y > y + 2 && Math.abs(a.pos.z) < 0.5 && !a.outdoor).map(a => [a, a.intensity, a.color.clone()]);
    for (const [a, i] of n.hall) { a.intensity = i * 1.7; a.color.set('#f2f6ff'); }
    n.note.visible = false; n.state = 'knocking'; n.knockIn = 5.5; n.wake = 0; n.peeked = false; n.knocked = false;
    ctx.teleport(14.0, y, 5.0, 0.27, -0.05);
    fx.snap({ lids: 1, dream: ctx.run ? ctx.run.dreamLevel() : 0.9, peep: 0 });
    ctx.tasks.clear();
  },
  update(dt, ctx) {
    const { world, fx, night: n, FLOOR2: y } = ctx;
    n.figure.update(dt);
    // Waking: eyes open, close, open.
    n.wake += dt;
    if (n.wake > 0.6 && n.wake - dt <= 0.6) fx.set({ lids: 0.35 }, 1.6);
    if (n.wake > 2.4 && n.wake - dt <= 2.4) fx.set({ lids: 0.8 }, 0.25);
    if (n.wake > 2.8 && n.wake - dt <= 2.8) { fx.set({ lids: 0 }, 1.8); ctx.say('3:13 AM. The PTAC is silent. You don’t remember turning the lamps off.', 5); }
    if ((n.knockIn -= dt) <= 0 && n.state === 'knocking') {
      ctx.sfx.knock([DOOR_X, y + 1.3, 0.85]);   // from the door, not from everywhere
      n.knockIn = 6 + Math.random() * 3;
      if (!n.knocked) { n.knocked = true; setTimeout(() => ctx.tasks.add('door', 'Someone is at the door'), 1200); }
    }
    // The curtains still matter: shut, the lot only leaks round their edges.
    n.windowLight.intensity = world.room.drapes > 0.5 ? 2.6 : 0.5;
    const open = world.room.angle > 0.25;
    n.strip.visible = n.spill.visible = !open;
    if (open && (n.state === 'knocking' || n.state === 'gone')) {
      n.state = 'empty'; n.figure.root.visible = false; n.knockIn = Infinity;
      n.note.visible = true;
      ctx.say(n.peeked ? 'Nobody. The hallway hums.' : 'Nobody. Nobody at all. The hallway hums.', 3.5);
      ctx.tasks.done('door'); ctx.tasks.add('note', 'Something on the carpet outside');
    }
  },
  exit(ctx) {
    const n = ctx.night;
    n.figure.root.visible = false; n.strip.visible = n.spill.visible = n.note.visible = false;
    n.windowLight.intensity = 0; n.state = 'off'; ctx.view = null;
    for (const [a, i, c] of n.hall ?? []) { a.intensity = i; a.color.copy(c); }
  },
};
