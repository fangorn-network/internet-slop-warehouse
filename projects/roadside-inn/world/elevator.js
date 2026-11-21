// SPDX-License-Identifier: CC0-1.0
// The two-floor elevator: car, doors, call buttons and panel.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';
import { FLOOR2 } from '../world.js';

export function buildElevator(ctx) {
  const {
    scene, lib, game, interact, updaters, lightAnchors, add, solid, floorAt, slab,
    ELEV,
  } = ctx;
  // ---------- elevator ----------
  const elevator = elevatorCar();
  function elevatorCar() {
    const car = new T.Group(), steel = F.mat('#b8bec4', { metalness: 0.9, roughness: 0.25 });
    const cabin = lib.model('hotel-elevator-car', { origin: true }); cabin.name = 'Elevator cabin'; car.add(cabin);             // Blender car interior (door side +Z)
    const display = F.canvasTexture(64, 64, (g, w, h) => { g.fillStyle = '#100'; g.fillRect(0, 0, w, h); });
    const disp = new T.Mesh(new T.PlaneGeometry(0.12, 0.12), new T.MeshBasicMaterial({ map: display })); disp.position.set(1.09, 1.6, 1.3); disp.rotation.y = -Math.PI / 2; car.add(disp);
    // The panel (car frame, on the +x wall facing in): the model's three buttons are 1, 2 and alarm; door open and close
    // go below them. Each lights amber when pressed: a floor while the car is called there, open and close for a moment.
    const lit = (mesh, colour = '#ffb04a') => {
      mesh.material = mesh.material.clone(); mesh.material.emissive = new T.Color(colour); mesh.material.emissiveIntensity = 0;
      const f = on => { f.on = on; mesh.material.emissiveIntensity = on ? 1.6 : 0.05; }; f(false); return f;
    };
    const node = n => cabin.getObjectByName(n), buttonMesh = n => { let m = null; node(n)?.traverse(o => { if (o.isMesh) m ??= o; }); return m; };
    const plate = (text, y, z) => { const p = F.sign(text, { w: 0.03, h: 0.022, bg: '#2a2e33', fg: '#e8e8e8', font: 'bold 300px system-ui, sans-serif' }); p.position.set(1.087, y, z); p.rotation.y = -Math.PI / 2; car.add(p); };
    const carButtons = { 1: { y: 1.1, light: lit(buttonMesh('button1')) }, 2: { y: 1.2, light: lit(buttonMesh('button2')) } };
    plate('1', 1.1, 1.3); plate('2', 1.2, 1.3);
    for (const [k, z, text] of [['open', 1.21, '◀▶'], ['close', 1.29, '▶◀']]) {
      const b = F.cyl(0.016, 0.016, 0.008, F.mat('#b8bec4', { metalness: 0.9, roughness: 0.25 }), 1.086, 0.942, z, car, 20); b.rotation.z = Math.PI / 2; b.name = `button_${k}`;
      carButtons[k] = { y: 0.95, z, light: lit(b) }; plate(text, 0.92, z);
    }
    car.position.set(7.75, 0, -2.75);
    scene.add(car);
    const carLight = { pos: new T.Vector3(7.75, 2.2, -2.75), color: new T.Color('#fff4e0'), intensity: 5, distance: 4 };
    lightAnchors.push(carLight);
    // Hall doors on each floor (two leaves) and a pair of car doors riding with the car.
    const leafMat = F.mat('#aeb4ba', { metalness: 0.9, roughness: 0.28 });
    const hall = [0, FLOOR2].map(y => [0, 1].map(i => { const l = F.box(0.6, 2.2, 0.04, leafMat, 0, 0, 0); l.position.set(ELEV.x0 + 0.3 + i * 0.6, y + 1.1, -0.96); scene.add(l); return l; }));
    const carDoors = [0, 1].map(i => { const l = F.box(0.6, 2.2, 0.03, leafMat, 0, 0, 0); l.position.set(-0.3 + i * 0.6, 1.1, 1.6); car.add(l); return l; });
    const callLights = [];
    for (const y of [0, FLOOR2]) {
      // Brushed-steel frame around the opening: two jambs and a header (the doorway itself stays clear).
      const steelFrame = F.mat('#7f868d', { metalness: 0.9, roughness: 0.3 });
      for (const x of [ELEV.x0 - 0.075, ELEV.x1 + 0.075]) F.box(0.15, 2.3, 0.06, steelFrame, x, y, -0.9, scene);
      F.box(1.5, 0.15, 0.06, steelFrame, 7.75, y + 2.2, -0.9, scene);
      const ind = F.sign(y ? '▲▼ 2' : '▲▼ 1', { w: 0.3, h: 0.12, bg: '#111', fg: '#ff9a3c', font: 'bold 80px system-ui, sans-serif', emissive: 1 }); ind.position.set(7.75, y + 2.42, -0.86); scene.add(ind);
      const cp = F.callPanel(); add(cp, 8.75, y, -0.89);
      callLights.push(lit(cp.userData.button));   // its own material: F.glow's is shared by both floors
    }
    // Thresholds bridge the car/hall joint without overlapping either finished floor.
    for (const y of [0, FLOOR2]) slab(ELEV.x0, ELEV.x1, -1.15, -1.005, y + 0.012, steel, 0.012);
    const state = { y: 0, target: 0, doors: 0, open: false, timer: 0, moving: false, floor: 0, queue: null, pressed: { open: 0, close: 0 } };
    floorAt(6.65, 8.85, -4.4, -1, () => state.y, 'elevator');
    // Doorway blockers: hall door on each floor when shut, car door whenever shut.
    for (const f of [0, 1]) solid(ELEV.x0, ELEV.x1, f * FLOOR2, f * FLOOR2 + 2.2, -1.05, -0.9, () => !(state.floor === f && !state.moving && state.doors > 0.8));
    // calls.car / calls.hall: floors whose button is lit (pressed in the car, or at that floor's hall), until the car gets there
    const calls = { car: new Set(), hall: new Set() };
    const call = (f, from) => {
      if (!state.moving && state.floor === f) { state.open = true; state.timer = Math.max(state.timer, 4); game.sound.ding(); return; }
      calls[from].add(f);
      if (state.moving && state.target === f * FLOOR2) return;   // on its way already
      state.queue = f; if (!state.moving) state.open = false;   // moving the other way: it comes back once its doors have opened and closed
    };
    for (const f of [0, 1]) interact.push({ pos: new T.Vector3(7.95, f * FLOOR2 + 1.3, -0.85), r: 1.9, when: p => p.z > -0.95, label: () => 'Call elevator', use: () => { game.sound.click(); call(f, 'hall'); } });
    // In the car: one target per button, on the button (precise: they're 8-10 cm apart, and the nearest-looked-at wins).
    const inCar = p => p.z < -1.1 && p.x > ELEV.x0 - 0.2 && p.x < ELEV.x1 + 0.2, at = (b, z = 1.25) => new T.Vector3(car.position.x + 1.086, b.y, car.position.z + z);
    for (const f of [1, 0]) interact.push({ pos: at(carButtons[f + 1]), r: 2.2, precise: true, when: inCar, dynamicY: () => state.y + carButtons[f + 1].y, label: () => `Press ${f + 1}`, use: () => { game.sound.click(); call(f, 'car'); } });
    interact.push({ pos: at(carButtons.open, carButtons.open.z), r: 2.2, precise: true, when: inCar, dynamicY: () => state.y + 0.95, label: () => 'Open doors', use: () => {
      game.sound.click(); state.pressed.open = 0.6;
      if (!state.moving && state.queue === null) { state.open = true; state.timer = Math.max(state.timer, 4); }   // moving, it does nothing: doors don't open between floors
    } });
    interact.push({ pos: at(carButtons.close, carButtons.close.z), r: 2.2, precise: true, when: inCar, dynamicY: () => state.y + 0.95, label: () => 'Close doors', use: () => {
      game.sound.click(); state.pressed.close = 0.6;
      if (state.open && !state.moving) { state.timer = 0; state.closeNow = true; }   // closes now, with you inside, unless someone stands in the doorway (the safety edge)
    } });
    updaters.push((dt, t, player) => {
      const target = state.open ? 1 : 0;
      state.doors += Math.sign(target - state.doors) * Math.min(Math.abs(target - state.doors), dt * 1.2);
      // Don't close on someone standing in the doorway.
      const inDoorway = Math.abs(player.y - state.floor * FLOOR2) < 1 && player.x > ELEV.x0 - 0.1 && player.x < ELEV.x1 + 0.1 && player.z > -1.4 && player.z < -0.6;
      // Dwell by presence, not a clock: someone in the doorway, or in the car with nowhere called, holds the doors open
      // (close shuts them on a car-rider, never on the doorway); they close 2 s after the entrance is clear. Before, a
      // fixed 4 s meant a slow walker (or a loaded test machine) arrived upstairs to closed doors.
      const here = !state.moving && Math.abs(player.y - state.floor * FLOOR2) < 1 && player.x > ELEV.x0 - 0.1 && player.x < ELEV.x1 + 0.1;
      const inCar = here && player.z < -1.05 && player.z > -4.4;
      if (state.open && !state.moving) {
        if (inDoorway || (inCar && !state.closeNow && state.queue === null)) state.timer = Math.max(state.timer, 2);
        state.timer -= dt; if (state.timer < 0 && !inDoorway) { state.open = false; state.closeNow = false; }
      } else if (!state.moving && state.doors > 0.02 && inDoorway) { state.open = true; state.timer = 2; }   // the safety edge: closing on someone, it reopens
      if (state.queue !== null && state.doors <= 0.001 && !state.moving) { state.moving = true; state.target = state.queue * FLOOR2; state.queue = null; game.sound.hum(true); }
      if (state.moving) {
        state.y += Math.sign(state.target - state.y) * Math.min(Math.abs(state.target - state.y), 1.0 * dt);
        if (Math.abs(state.y - state.target) < 1e-4) { state.y = state.target; state.moving = false; state.floor = state.target ? 1 : 0; calls.car.delete(state.floor); calls.hall.delete(state.floor); state.open = true; state.timer = 4; game.sound.hum(false); game.sound.ding(); }
      }
      car.position.y = state.y; carLight.pos.y = state.y + 2.2;
      const slide = state.doors * 0.58;
      carDoors[0].position.x = -0.3 - slide; carDoors[1].position.x = 0.3 + slide;
      hall.forEach((pair, f) => { const s = f === state.floor && !state.moving ? slide : 0; pair[0].position.x = ELEV.x0 + 0.3 - s; pair[1].position.x = ELEV.x0 + 0.9 + s; });
      const at2 = state.y > FLOOR2 / 2 ? 2 : 1;
      for (const f of [0, 1]) { carButtons[f + 1].light(calls.car.has(f)); callLights[f](calls.hall.has(f)); }
      for (const k of ['open', 'close']) { carButtons[k].light(state.pressed[k] > 0); state.pressed[k] -= dt; }
      if (display.shown !== at2) display.shown = at2, display.redraw((g, w, h) => { g.fillStyle = '#120404'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7a2a'; g.font = 'bold 44px monospace'; g.textAlign = 'center'; g.fillText(String(at2), w / 2, 50); });
    });
    state.lights = () => ({ car: { 1: carButtons[1].light.on, 2: carButtons[2].light.on, open: carButtons.open.light.on, close: carButtons.close.light.on }, call: callLights.map(l => l.on) });
    return state;
  }
  Object.assign(ctx, { elevator });
}
