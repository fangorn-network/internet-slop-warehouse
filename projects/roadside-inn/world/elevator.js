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
    // Natasha (geometry/finish only, V5/V6/V3): the floor indicator hung on its own 17 cm above the panel, a black
    // square on the wall. It is the panel's top window now (a 6 cm display set in the faceplate, as on real car
    // operating panels); the side handrail stops 14 cm short of the panel instead of running through it; the ceiling is
    // satin stainless panels with dark reveals instead of untextured white paint.
    const disp = new T.Mesh(new T.PlaneGeometry(0.06, 0.06), new T.MeshBasicMaterial({ map: display, toneMapped: false })); disp.position.set(1.0885, 1.36, 1.25); disp.rotation.y = -Math.PI / 2; car.add(disp);
    { const rail = cabin.getObjectByName('rail001') ?? cabin.getObjectByName('rail.001'); if (rail) { rail.scale.y *= 2.4 / 2.8; rail.position.z -= 0.2; } }   // z -1.4..1.0, clear of the panel (z 1.14..1.36)
    { const copDisplay = cabin.getObjectByName('node_cop_display');   // Victor's car (V4) has the indicator in its panel: drive that face instead
      if (copDisplay?.isMesh) { copDisplay.material = new T.MeshBasicMaterial({ map: display, toneMapped: false }); display.flipY = false; disp.visible = false; } }
    { const old = cabin.getObjectByName('ceiling') ?? cabin.getObjectByName('charcoal'); let y0 = 2.384;
      if (old) { old.visible = false; old.updateWorldMatrix(true, false); y0 = new T.Box3().setFromObject(old).min.y - car.position.y; }   // Victor's flat charcoal ceiling: same plane, a real finish
      const tex = F.canvasTexture(512, 768, (g, w, h) => {   // 2.2 x 3.2 m: three panels across the depth, brushed along x
        g.fillStyle = '#9da3a8'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) { const y = Math.random() * h, c = 140 + Math.random() * 40 | 0; g.fillStyle = `rgba(${c},${c + 4},${c + 8},0.25)`; g.fillRect(0, y, w, 1); }
        g.fillStyle = '#2a2d31'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
        for (const k of [1, 2]) g.fillRect(0, h * k / 3 - 2, w, 4);
      });
      const ceil = new T.Mesh(new T.PlaneGeometry(2.2, 3.2), new T.MeshStandardMaterial({ map: tex, metalness: 0.85, roughness: 0.38 }));
      ceil.rotation.x = Math.PI / 2; ceil.position.y = y0; ceil.name = 'Elevator ceiling'; car.add(ceil); }
    // The panel (car frame, on the +x wall facing in). Every node named button<key> in the car model is a button
    // (V4): 1 and 2 the floors, open and close, alarm (or 0: the old model's third button), stop (emergency stop: the car
    // halts where it is until it's pulled out again), phone (the desk answers) and fire (the fire service key switch).
    // Each lights amber when pressed: a floor while the car is called there, the others for a moment; stop stays red.
    // Open and close are made here when the model hasn't got them.
    const lit = (mesh, colour = '#ffb04a') => {
      if (!mesh) { const f = on => { f.on = on; }; f(false); return f; }
      mesh.material = mesh.material.clone(); mesh.material.emissive = new T.Color(colour); mesh.material.emissiveIntensity = 0;
      const f = on => { f.on = on; mesh.material.emissiveIntensity = on ? 1.6 : 0.05; }; f(false); return f;
    };
    const firstMesh = o => { let m = null; o?.traverse(n => { if (n.isMesh) m ??= n; }); return m; };
    const KEYS = { 0: 'alarm', alarm: 'alarm', bell: 'alarm', 1: '1', 2: '2', floor1: '1', floor2: '2', open: 'open', dooropen: 'open', close: 'close', doorclose: 'close', stop: 'stop', emergencystop: 'stop', estop: 'stop', phone: 'phone', call: 'phone', fire: 'fire', firekey: 'fire', firefighter: 'fire', key: 'fire' };
    const carButtons = {};
    cabin.traverse(n => { const m = /^(?:button|btn)[_-]?([\w-]+?)(\.\d+)?$/i.exec(n.name); const k = m && KEYS[m[1].toLowerCase().replace(/[_-]/g, '')]; if (k && !carButtons[k]) carButtons[k] = { node: n, light: lit(firstMesh(n), k === 'stop' ? '#ff3020' : '#ffb04a') }; });
    const plate = (text, y, z) => { const p = F.sign(text, { w: 0.03, h: 0.022, bg: '#2a2e33', fg: '#e8e8e8', font: 'bold 300px system-ui, sans-serif' }); p.position.set(1.087, y, z); p.rotation.y = -Math.PI / 2; car.add(p); };
    if (cabin.getObjectByName('button1') && !cabin.getObjectByName('button_panel_v2')) { plate('1', 1.1, 1.3); plate('2', 1.2, 1.3); }   // the old model's buttons have no legends
    for (const [k, z, text] of [['open', 1.21, '◀▶'], ['close', 1.29, '▶◀']]) {
      if (carButtons[k]) continue;
      const b = F.cyl(0.016, 0.016, 0.008, F.mat('#b8bec4', { metalness: 0.9, roughness: 0.25 }), 1.086, 0.942, z, car, 20); b.rotation.z = Math.PI / 2; b.name = `button_${k}`;
      carButtons[k] = { node: b, light: lit(b) }; plate(text, 0.92, z);
    }
    car.position.set(7.75, 0, -2.75);
    scene.add(car);
    const carLight = { pos: new T.Vector3(7.75, 2.2, -2.75), color: new T.Color('#fff4e0'), intensity: 5, distance: 4 };
    lightAnchors.push(carLight);
    // Hall doors on each floor (two leaves) and a pair of car doors riding with the car.
    const leafMat = F.mat('#aeb4ba', { metalness: 0.9, roughness: 0.28 });
    // Two leaves meeting in the middle (V1): 8 mm apart, each with a black rubber astragal on its meeting edge, so the
    // centre seam reads as it does on a real centre-opening door (a single slab looked like one door that slid apart).
    const rubber = F.mat('#111', { roughness: 0.7 }), LEAF = 0.596, GAP = 0.004;
    const leaf = (d, i) => { const l = F.box(LEAF, 2.2, d, leafMat, 0, 0, 0); F.box(0.006, 2.2, d + 0.004, rubber, (i ? -1 : 1) * (LEAF / 2 - 0.003), 0, 0, l); return l; };
    const hall = [0, FLOOR2].map(y => [0, 1].map(i => { const l = leaf(0.04, i); l.position.set(ELEV.x0 + 0.3 + i * 0.6 + (i ? GAP - 0.002 : 0.002 - GAP), y + 1.1, -0.96); scene.add(l); return l; }));
    // The car model's own leaves when it has them (nodes door_l / door_r), else two made here.
    const glbDoors = ['door_l', 'door_r'].map(n => cabin.getObjectByName(n));
    const carDoors = glbDoors.every(Boolean) ? glbDoors : [0, 1].map(i => { const l = leaf(0.03, i); l.position.set(-0.3 + i * 0.6, 1.1, 1.6); car.add(l); return l; });
    const carHome = carDoors.map(l => l.position.x);
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
    const state = { y: 0, target: 0, doors: 0, open: false, timer: 0, moving: false, floor: 0, queue: null, stopped: false, pressed: { open: 0, close: 0, alarm: 0, phone: 0, fire: 0 } };
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
    const inCar = p => p.z < -1.1 && p.x > ELEV.x0 - 0.2 && p.x < ELEV.x1 + 0.2;
    car.updateMatrixWorld(true);
    const LABEL = { 1: 'Press 1', 2: 'Press 2', open: 'Open doors', close: 'Close doors', alarm: 'Press the alarm', stop: () => state.stopped ? 'Pull out the stop switch' : 'Push the stop switch', phone: 'Press the phone button', fire: 'Fire service key switch' };
    const PRESS = {
      1: () => call(0, 'car'), 2: () => call(1, 'car'),
      open: () => { state.pressed.open = 0.6; if (!state.moving && state.queue === null) { state.open = true; state.timer = Math.max(state.timer, 4); } },   // moving, it does nothing: doors don't open between floors
      close: () => { state.pressed.close = 0.6; if (state.open && !state.moving) { state.timer = 0; state.closeNow = true; } },   // closes now, with you inside, unless someone stands in the doorway (the safety edge)
      alarm: () => { state.pressed.alarm = 1.2; game.sound.beep(false); game.say('A bell rings somewhere in the shaft. After a while, nothing happens.'); },
      stop: () => { state.stopped = !state.stopped; if (state.moving) game.sound.hum(!state.stopped); game.say(state.stopped ? (state.moving ? 'The car lurches to a stop between floors.' : 'The car won’t go anywhere now.') : 'The car hums back to life.'); },
      phone: () => { state.pressed.phone = 2; game.say('A click, then Dana: “Front desk. Everything all right in there, hon?”'); },
      fire: () => { state.pressed.fire = 0.6; game.say('FIRE SERVICE. The key switch needs a firefighter’s key.'); },
    };
    for (const [k, b] of Object.entries(carButtons)) {
      const w = b.node.getWorldPosition(new T.Vector3()), localY = w.y - car.position.y, label = LABEL[k];
      interact.push({ pos: w, r: 2.2, precise: true, when: inCar, dynamicY: () => state.y + localY, label: () => typeof label === 'function' ? label() : label, use: () => { game.sound.click(); PRESS[k](); } });
    }
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
      if (state.queue !== null && state.doors <= 0.001 && !state.moving && !state.stopped) { state.moving = true; state.target = state.queue * FLOOR2; state.queue = null; game.sound.hum(true); }
      if (state.moving && !state.stopped) {
        state.y += Math.sign(state.target - state.y) * Math.min(Math.abs(state.target - state.y), 1.0 * dt);
        if (Math.abs(state.y - state.target) < 1e-4) { state.y = state.target; state.moving = false; state.floor = state.target ? 1 : 0; calls.car.delete(state.floor); calls.hall.delete(state.floor); state.open = true; state.timer = 4; game.sound.hum(false); game.sound.ding(); }
      }
      car.position.y = state.y; carLight.pos.y = state.y + 2.2;
      const slide = state.doors * 0.58;
      carDoors[0].position.x = carHome[0] - slide; carDoors[1].position.x = carHome[1] + slide;
      hall.forEach((pair, f) => { const s = f === state.floor && !state.moving ? slide : 0; pair[0].position.x = ELEV.x0 + 0.3 + 0.002 - GAP - s; pair[1].position.x = ELEV.x0 + 0.9 + GAP - 0.002 + s; });
      const at2 = state.y > FLOOR2 / 2 ? 2 : 1;
      for (const f of [0, 1]) { carButtons[f + 1]?.light(calls.car.has(f)); callLights[f](calls.hall.has(f)); }
      for (const k of Object.keys(state.pressed)) { carButtons[k]?.light(state.pressed[k] > 0); state.pressed[k] -= dt; }
      carButtons.stop?.light(state.stopped);
      if (display.shown !== at2) display.shown = at2, display.redraw((g, w, h) => { g.fillStyle = '#120404'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff7a2a'; g.font = 'bold 44px monospace'; g.textAlign = 'center'; g.fillText(String(at2), w / 2, 50); });
    });
    state.lights = () => ({ car: Object.fromEntries(Object.entries(carButtons).map(([k, b]) => [k, !!b.light.on])), call: callLights.map(l => l.on) });
    state.buttons = Object.keys(carButtons);
    return state;
  }
  Object.assign(ctx, { elevator });
}
