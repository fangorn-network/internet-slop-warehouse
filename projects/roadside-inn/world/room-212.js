// SPDX-License-Identifier: CC0-1.0
// Room 212: the guest room you check into.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import { economy } from '../quality.js';
import * as F from '../fixtures.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { FLOOR2 } from '../world.js';

export function buildRoom212(ctx) {
  const {
    scene, lib, game, interact, updaters, lightAnchors, add, loose, solid, put, placeWindow,
    openableDoor, R, tvSet,
  } = ctx;
  // ---------- room 212 ----------
  const room = buildRoom();
  function buildRoom() {
    const y = FLOOR2;
    // Entry door from the corridor (hinge on the west side, opens into the room).
    const d = openableDoor('212');
    d.group.position.set(R.x0 + 0.9, y, 1); d.group.rotation.y = Math.PI; scene.add(d.group);
    const st = { angle: 0, open: false, timer: 0, lamps: true, bath: true, desk: true, drapes: 1, tv: null };
    st.lit = () => st.lamps || st.bath || st.desk;
    solid(R.x0 + 0.4, R.x0 + 1.4, y, y + 2.2, 0.92, 1.08, () => st.angle < 1.1);
    interact.push({ pos: new T.Vector3(R.x0 + 0.9, y + 1.1, 0.75), r: 1.3, when: p => p.z < 1, label: () => st.open ? 'Door' : game.has('key card') ? 'Tap key card' : 'Room 212',
      use: () => {
        if (st.open) { st.timer = 0; return; }
        if (!game.has('key card')) { d.led.material = F.glow('#ff3b30', 3); game.sound.beep(false); setTimeout(() => (d.led.material = F.glow('#ff3b30', 0)), 900); return game.say('The lock blinks red. You need a key card from the front desk.'); }
        d.led.material = F.glow('#34c759', 3); game.sound.beep(true); setTimeout(() => (d.led.material = F.glow('#ff3b30', 0)), 1500);
        st.open = true; st.timer = 7; game.event('room-open');
      } });
    interact.push({ pos: new T.Vector3(R.x0 + 0.9, y + 1.1, 1.5), r: 1.0, when: p => p.z > 1, label: () => st.open ? 'Close door' : 'Open door', use: () => { st.open = !st.open; st.timer = st.open ? 7 : 0; } });
    // The hall light under the shut door: a bright line along the gap and a faint fan on the carpet inside, the one
    // thing you see with the lights off and the drapes shut. Fades as the door opens (then the doorway spill takes over).
    const seam = new T.Group();
    {
      d.group.updateMatrixWorld(true); const lb = new T.Box3().setFromObject(d.leaf), w = lb.max.x - lb.min.x - 0.02, cx = (lb.min.x + lb.max.x) / 2, z = lb.max.z + 0.004;
      // the fan: bright at the gap, gone in 30 cm, and fading out at both ends (light spreads past the door's width)
      const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'), img = g.createImageData(64, 64);
      for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const v = j / 63, u = Math.abs(i / 63 - 0.5) * 2, a = (0.25 * Math.exp(-v * 4) + 0.75 * Math.exp(-v * 40)) * Math.max(0, 1 - u ** 4) ** 2; img.data.set([255, 232, 200, Math.round(a * 255)], (j * 64 + i) * 4); }
      g.putImageData(img, 0, 0);
      const mat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.4 });
      const fan = new T.Mesh(new T.PlaneGeometry(w + 0.25, 0.32), mat); fan.rotation.x = -Math.PI / 2; fan.position.set(cx, y + 0.016, z + 0.16); seam.add(fan);
      const line = new T.Mesh(new T.PlaneGeometry(w, 0.008), new T.MeshBasicMaterial({ color: '#ffe9c8', transparent: true, opacity: 0.9, depthWrite: false }));
      line.position.set(cx, y + 0.016, z); seam.add(line);   // the gap itself, 8 mm, on the door's face just above the carpet (top at y + 0.012)
      for (const m of [mat, line.material]) m.userData.noEnv = true;   // main.js tagInterior: an env map multiplies an unlit colour by dark reflections (it went black)
      scene.add(seam);
    }
    // Hall light through the open door: a spill just inside the doorway, as bright as the door is open.
    const spill = { pos: new T.Vector3(R.x0 + 0.9, y + 1.9, 1.5), color: new T.Color('#fff2dc'), intensity: 0, distance: 6 };
    lightAnchors.push(spill);
    updaters.push((dt, t, player) => {
      spill.intensity = 7 * Math.min(1, st.angle / 1.2);
      seam.visible = st.angle < 0.15;
      const inDoorway = Math.abs(player.y - y) < 1 && player.x > R.x0 + 0.3 && player.x < R.x0 + 1.5 && player.z > 0.5 && player.z < 2.2;
      if (st.open) { st.timer -= dt; if (st.timer < 0 && !inDoorway) { st.open = false; game.sound.thud(); } }
      const target = st.open ? 1.45 : 0;
      st.angle += Math.sign(target - st.angle) * Math.min(Math.abs(target - st.angle), dt * 2.2);
      d.leaf.rotation.y = st.angle;
    });

    // Back of the door: the fire evacuation plan every US hotel room has. Hangs on the leaf, so it swings with it.
    const plan = F.canvasTexture(512, 360, (g, w, h) => {
      g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b3141a'; g.fillRect(0, 0, w, 44); g.fillStyle = '#fff'; g.font = 'bold 26px system-ui'; g.textAlign = 'center'; g.fillText('FIRE EVACUATION PLAN · FLOOR 2', w / 2, 30);
      const X = x => 20 + (x + 12) / 42 * (w - 40), Z = z => 200 + z * 14;
      g.strokeStyle = '#1d3557'; g.lineWidth = 2;
      for (let x = -12; x < 30; x += 4.5) { g.strokeRect(X(x), Z(-9), X(x + 4.5) - X(x), Z(-1) - Z(-9)); g.strokeRect(X(x), Z(1), X(x + 4.5) - X(x), Z(9) - Z(1)); }
      g.fillStyle = '#dfe7ee'; g.fillRect(X(-12), Z(-1), X(30) - X(-12), Z(1) - Z(-1));
      g.fillStyle = '#2a9d8f'; g.fillRect(X(9.5), Z(-8.5), X(12) - X(9.5), Z(-1) - Z(-8.5)); g.fillStyle = '#9aa0a6'; g.fillRect(X(6.5), Z(-4.5), X(9) - X(6.5), Z(-1) - Z(-4.5));
      g.strokeStyle = '#2a9d8f'; g.lineWidth = 5; g.beginPath(); g.moveTo(X(12.9), Z(1)); g.lineTo(X(12.9), Z(0)); g.lineTo(X(11.4), Z(0)); g.lineTo(X(11.4), Z(-2)); g.stroke();
      g.fillStyle = '#b3141a'; g.beginPath(); g.arc(X(12.9), Z(3), 8, 0, 7); g.fill();
      g.fillStyle = '#1d3557'; g.font = 'bold 16px system-ui'; g.textAlign = 'left';
      g.fillText('● YOU ARE HERE — ROOM 212', 24, h - 40); g.fillStyle = '#2a9d8f'; g.fillText('━ EXIT ROUTE: STAIR A (DO NOT USE ELEVATOR)', 24, h - 16);
    });
    const planMesh = new T.Mesh(new T.PlaneGeometry(0.34, 0.24), new T.MeshStandardMaterial({ map: plan, roughness: 0.6 }));
    planMesh.position.set(0.5, 1.45, -0.026); planMesh.rotation.y = Math.PI; d.leaf.add(planMesh);
    st.leaf = d.leaf; st.plan = plan;   // remixes hang things on the door and redraw the plan
    interact.push({ pos: new T.Vector3(R.x0 + 0.4, y + 1.45, 1.12), r: 0.9, when: p => p.z > 1 && st.angle < 0.1, label: () => 'Read the fire evacuation plan', use: () => game.event('fire-plan') });
    // Do Not Disturb hanger on the corridor-side handle.
    const dnd = F.sign('PLEASE\nDO NOT\nDISTURB', { w: 0.1, h: 0.24, bg: '#b3141a', font: 'bold 60px system-ui, sans-serif' });
    dnd.position.set(0.88, 0.8, 0.07); dnd.visible = false; d.leaf.add(dnd);
    interact.push({ pos: new T.Vector3(R.x0 + 0.5, y + 1.0, 1.7), r: 0.9, when: p => p.z > 1, label: () => dnd.visible ? 'Take in the Do Not Disturb sign' : 'Hang Do Not Disturb sign',
      use: () => { dnd.visible = !dnd.visible; game.sound.click(); game.say(dnd.visible ? 'Sign out. Housekeeping will knock anyway, just softer.' : 'Sign back inside.'); } });

    // Bathroom: vanity, toilet, tub/shower.
    // Bathroom (x 13.9..16.5, z 1..4.1), entered from the hall at z 2.8..3.6. Re-laid (R17): the shower's door opened
    // south, straight onto the toilet. Now the shower stands in the far (NE) corner opening west toward the bathroom
    // door, the toilet moves to the SE corner (centre 0.45 m off the side wall, ADA 604.2) with the paper holder on that
    // wall, and the vanity slides west to make room. The towel bar hangs beside the shower door, the towel shelf under the sink.
    const VX = 14.75;
    const vanity = add(lib.model('hotel-vanity', { origin: true }), VX, y, 1.38); solid(VX - 0.7, VX + 0.7, y, y + 1, 1.05, 1.65);
    // A real mirror: the environment map would show a photo of some other hotel room. Rendered only while you're in 212.
    {
      const old = vanity.getObjectByName('mirror');
      old.updateWorldMatrix(true, false);
      const box = new T.Box3().setFromObject(old), size = box.getSize(new T.Vector3()), mid = box.getCenter(new T.Vector3());
      const mirror = economy ? new T.Mesh(new T.PlaneGeometry(size.x, size.y), new T.MeshStandardMaterial({ color: 0xb8bcbf, metalness: 1, roughness: 0.12 })) : new Reflector(new T.PlaneGeometry(size.x, size.y), { textureWidth: 768, textureHeight: Math.round(768 * size.y / size.x), color: 0xb8bcbf, clipBias: 0.003 });
      mirror.position.set(mid.x, mid.y, box.max.z + 0.002); mirror.userData.keep = true;   // toggled: never merged (assets.js)
      old.visible = false;
      scene.add(mirror);
      updaters.push((dt, t, player) => { mirror.visible = player.y > 2.5 && player.x > R.x0 && player.x < R.x1 && player.z > R.z0 && player.z < R.z1; });
    }
    add(lib.model('hotel-toilet', { origin: true, rotate: -Math.PI / 2 }), 16.15, y, 1.53); solid(15.72, 16.4, y, y + 0.8, 1.28, 1.78);
    const shower = add(lib.model('g3-shower-cabin', { height: 2.1, rotate: -Math.PI / 2 }), 15.9, y + 0.02, 3.55); shower.name = 'Textured shower enclosure';
    solid(15.43, 16.38, y, y + 2.1, 3.08, 4.02);
    // Victor's bathroom pieces (briefs/natasha-2026-11-21.md), placed once their GLBs are in assets.js.
    const fit = (id, x, yy, z, ry = 0) => { if (!lib.models.has(id)) return null; const o = add(lib.model(id, { origin: true }), x, yy, z, ry); o.userData.onWall = true; return o; };
    fit('hotel-towel-bar', 15.0, y + 1.2, 4.03, Math.PI);             // north wall, beside the shower door, bar at 48 in
    fit('hotel-towel-shelf', VX, y + 0.22, 1.07);                       // under the sink, on the back wall
    fit('hotel-toilet-paper', 15.67, y + 0.66, 1.07);                   // side wall, 8 in ahead of the bowl (ADA 604.7)
    fit('hotel-bath-amenities', 16.36, y + 1.25, 3.55, -Math.PI / 2);   // inside the shower, on its back wall
    const bathLight = { pos: new T.Vector3(15.2, y + 2.94, 2.5), color: new T.Color('#fff1e0'), intensity: 4.5, distance: 5 };   // just above the ceiling face, so it lights the room and not the ceiling (at 2.5 m it blew out the ceiling and tile)
    lightAnchors.push(bathLight);
    interact.push({ pos: new T.Vector3(13.95, y + 1.3, 2.4), r: 1.2, label: () => `Bathroom light ${st.bath ? 'off' : 'on'}`, use: () => { st.setBath(!st.bath); game.sound.click(); } });
    // Doorway spills (R9): light reaching the other cell through the bathroom doorway, which has no door.
    const bathSpill = { pos: new T.Vector3(13.7, y + 2.0, 3.2), color: new T.Color('#fff1e0'), intensity: 1.2, distance: 3.2 };   // bedroom side
    const bedSpill = { pos: new T.Vector3(14.1, y + 2.0, 3.2), color: new T.Color('#ffe2bd'), intensity: 0.5, distance: 2.4 };     // bathroom side
    lightAnchors.push(bathSpill, bedSpill);
    st.setBath = on => { st.bath = on; bathLight.intensity = on ? 4.5 : 0; bathSpill.intensity = on ? 1.2 : 0; };
    interact.push({ pos: new T.Vector3(VX, y + 1.0, 1.6), r: 1.0, label: () => 'Wash your hands', use: () => { game.sound.water(); game.say('Hot water takes a while, then arrives all at once.'); } });

    // Closet with luggage bench and the ice bucket.
    add(lib.model('hotel-closet', { origin: true, rotate: Math.PI / 2 }), R.x0 + 0.31, y, 2.7); solid(R.x0, R.x0 + 0.78, y, y + 2.03, 2.18, 3.22);
    const bucket = add(lib.model('hotel-ice-bucket', { origin: true }), R.x0 + 0.35, y + 0.492, 2.95);
    interact.push({ pos: new T.Vector3(R.x0 + 0.5, y + 0.8, 2.95), r: 1.0, label: () => bucket.visible ? 'Take ice bucket' : (game.has('ice bucket (full)') ? 'Put the ice bucket back' : 'Closet'),
      use: () => {
        if (bucket.visible) { bucket.visible = false; game.give('ice bucket'); return game.say('Ice bucket, with a fresh plastic liner.'); }
        if (game.has('ice bucket (full)')) { game.take('ice bucket (full)'); bucket.visible = true; game.say('A bucket of ice for… something. Achievement unlocked.'); }
      } });

    // Micro-fridge and microwave beside the closet.
    const mfModel = add(lib.model('hotel-microfridge', { origin: true, rotate: Math.PI / 2 }), R.x0 + 0.3, y, 3.75);
    const mf = { door: mfModel.getObjectByName('fridge_door') }; solid(R.x0, R.x0 + 0.71, y, y + 1.6, 3.42, 4.08);
    let fridgeOpen = false;
    interact.push({ pos: new T.Vector3(R.x0 + 0.6, y + 0.5, 3.75), r: 1.0, label: () => fridgeOpen ? 'Close the fridge' : 'Open the fridge',
      use: () => { fridgeOpen = !fridgeOpen; mf.door.rotation.y = fridgeOpen ? -1.6 : 0; game.sound.click(); if (fridgeOpen) game.say('Cold and empty, except for one ketchup packet from a previous guest.'); } });
    interact.push({ pos: new T.Vector3(R.x0 + 0.6, y + 1.05, 3.75), r: 0.8, label: () => game.has('coffee') ? 'Reheat your coffee' : 'Microwave',
      use: () => { game.sound.hum(true); setTimeout(() => { game.sound.hum(false); game.sound.beep(true); game.say(game.has('coffee') ? 'Thirty seconds. The lobby coffee is now hot and somehow worse.' : 'You run the microwave for ten seconds, empty. Old habit.'); }, 2500); } });

    // Bedroom: headboard wall (east), king bed, nightstands, lamps.
    add(lib.model('hotel-headboard', { origin: true, rotate: -Math.PI / 2 }), R.x1 - 0.03, y, 6.6);
    add(lib.model('hotel-king-bed', { rotate: -Math.PI / 2 }), R.x1 - 1.18, y, 6.6); solid(R.x1 - 2.52, R.x1 - 0.28, y, y + 0.7, 5.47, 7.73);
    // Bedside lamps are lamps (kinds.js): each has its cord to the outlet beside its nightstand and its own switch.
    const lamps = [];
    for (const z of [5.05, 8.15]) {
      add(lib.model('hotel-nightstand', { origin: true, rotate: -Math.PI / 2 }), R.x1 - 0.27, y, z); solid(R.x1 - 0.76, R.x1 - 0.28, y, y + 0.6, z - 0.27, z + 0.27);
      lamps.push(put('hotel-table-lamp', R.x1 - 0.36, y + 0.572, z, 0, { out: [R.x1 - 0.09, z < 6 ? 4.5 : 8.7], noun: 'bedside lamp' }).userData.thing.plug);
      if (z < 6) loose(add(lib.model('hotel-tv-remote', { origin: true }), R.x1 - 0.46, y + 0.573, z + 0.14, 1.9), { rest: true });   // by the bed
    }
    const roomLight = { pos: new T.Vector3(14.2, y + 2.94, 6.5), color: new T.Color('#ffe9d0'), intensity: 3.5, distance: 7 };   // just above the ceiling face: no hotspot
    lightAnchors.push(roomLight);
    // st.lamps: any bedside lamp or the ceiling light giving light (the lamps can be unplugged and carried off).
    const spillLight = () => { bedSpill.intensity = st.lamps || st.desk ? 0.5 : 0; };
    Object.defineProperty(st, 'lamps', { get: () => lamps.some(l => l.lit) || roomLight.intensity > 0, configurable: true });
    lamps.forEach(l => (l.onChange = spillLight));
    st.setLamps = on => { lamps.forEach(l => l.setOn(on)); roomLight.intensity = on ? 3.5 : 0; spillLight(); };
    st.parts = { lamps, roomLight, roomBright: 3.5, y };   // world/handling.js: the ceiling light's wall switch
    interact.push({ pos: new T.Vector3(R.x1 - 1.4, y + 0.6, 6.6), r: 1.6, label: () => 'Lie down', use: () => game.event('sleep') });
    // Credenza + TV on the west wall, desk by the window, armchair, PTAC, window with drapes.
    const credModel = add(lib.model('hotel-credenza-tv', { origin: true, rotate: Math.PI / 2 }), R.x0 + 0.33, y, 6.4);
    const cred = { screen: credModel.getObjectByName('tv_screen') };
    // Blender's cube UVs map only a rotated corner of the canvas onto the screen face; give it flat 0–1 UVs.
    {
      const g = cred.screen.geometry; g.computeBoundingBox();
      const { min, max } = g.boundingBox, p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - min.x) / (max.x - min.x), (p.getY(i) - min.y) / (max.y - min.y));
      uv.needsUpdate = true;
    } solid(R.x0, R.x0 + 0.55, y, y + 0.8, 5.2, 7.6);
    const desk = add(lib.model('hotel-desk', { origin: true, rotate: Math.PI / 2 }), R.x0 + 0.32, y, 8.27);
    desk.scale.z = 0.84; // leave a joint between the desk and TV cabinet, preserving desk height
    // The desk lamp is a lamp too: it stands loose on the desk, corded to the outlet above the desk; pick it up and move it.
    const deskLamp = put('ph-desk-lamp-arm-01', R.x0 + 0.35, y + 0.807, 8.0, 0, { model: { height: 0.6, rotate: Math.PI / 2 }, out: [R.x0 + 0.07, 8.55], on: desk });
    deskLamp.updateMatrixWorld(true);
    const lampBounds = new T.Box3().setFromObject(deskLamp);
    deskLamp.position.x += Math.max(0, R.x0 + 0.12 - lampBounds.min.x);
    const deskPlug = deskLamp.userData.thing.plug;
    deskPlug.onChange = spillLight;
    Object.defineProperty(st, 'desk', { get: () => deskPlug.lit, configurable: true });
    st.setDesk = on => deskPlug.setOn(on);
 solid(R.x0, R.x0 + 0.71, y, y + 0.81, 7.72, 8.83);
    add(lib.model('ph-modern-arm-chair-01', { height: 0.88 }), R.x0 + 1.15, y, 8.1, -Math.PI / 2);
    // One chair, at the desk: the accent chair by the far nightstand made two (R3).
    add(lib.model('hotel-ptac', { origin: true, rotate: Math.PI }), 14.25, y, 8.82); solid(13.7, 14.8, y, y + 0.6, 8.6, 9);
    const roomWindow = placeWindow(14.25, y + 0.75, 8.95, 1.6, 1.5, Math.PI);
    interact.push({ pos: new T.Vector3(14.25, y + 1.4, 8.6), r: 1.5, label: () => st.drapes > 0.5 ? 'Close curtains' : 'Open curtains', use: () => { st.drapes = st.drapes > 0.5 ? 0 : 1; game.sound.swish(); } });
    updaters.push(dt => roomWindow.drapes.forEach((dr, i) => { const s = dr.scale.x + (((st.drapes > 0.5) ? 1 : 2.7) - dr.scale.x) * Math.min(1, dt * 4); dr.scale.x = s; }));
    const roomTV = tvSet(cred.screen, 'room');
    st.tv = roomTV;
    // A little welcome card on the desk.
    const card = F.sign('Welcome!\nWi-Fi: HeartlandGuest\nPassword: route66', { w: 0.24, h: 0.16, bg: '#fbf8f1', fg: '#1d3557', font: '600 54px Georgia, serif' });
    card.rotation.set(-Math.PI / 2, 0, Math.PI / 2); card.position.set(R.x0 + 0.45, y + 0.828, 8.45); scene.add(card);
    // Check actual imported mesh bounds, rather than assuming the model's origin is its back edge.
    // Cabinets, the toilet, the headboard and the PTAC all protruded into structural walls.
    for (const prop of scene.children) {
      if (!prop.userData.hotelProp || prop.userData.onWall || prop.name === 'hotel-room-door' || prop.position.y < y || prop.position.x < R.x0 || prop.position.x > R.x1 || prop.position.z < R.z0 || prop.position.z > R.z1) continue;
      prop.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(prop);
      const bounds = { x0: R.x0 + 0.1, x1: R.x1 - 0.12, z0: R.z0 + 0.1, z1: R.z1 - 0.14 };
      if (['hotel-king-bed', 'hotel-nightstand', 'hotel-table-lamp'].includes(prop.name)) bounds.x1 = R.x1 - 0.30;
      prop.position.x += Math.max(0, bounds.x0 - box.min.x) - Math.max(0, box.max.x - bounds.x1);
      prop.position.z += Math.max(0, bounds.z0 - box.min.z) - Math.max(0, box.max.z - bounds.z1);
      if (box.min.y < y + 0.012 && box.min.y > y - 0.1) prop.position.y += y + 0.012 - box.min.y;
      prop.userData.clearanceBounds = bounds;
    }
    return st;
  }
  Object.assign(ctx, { room });
}
