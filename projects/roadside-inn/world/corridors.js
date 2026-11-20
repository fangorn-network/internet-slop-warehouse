// SPDX-License-Identifier: CC0-1.0
// Corridors on both floors: doors, ice machine, housekeeping.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';
import { FLOOR2, CEIL } from '../world.js';

export function buildCorridors(ctx) {
  const {
    scene, lib, game, interact, add, light, painting, instances, south2, north2,
  } = ctx;
  // ---------- corridors ----------
  // The Heartland series between guest-room doors on both floors, plus two in room 212.
  {
    let motif = 0;
    for (const x of [-12, -3, 16.5, 25.5]) painting(x + 3.2, FLOOR2 + 1.6, 0.895, Math.PI, 0.8, 0.6, motif++);
    for (const x of [-7.5, 1.5, 12, 21]) painting(x + 3.2, FLOOR2 + 1.6, -0.895, 0, 0.8, 0.6, motif++);
    for (const x of [16.5, 25.5]) painting(x + 3.2, 1.6, 0.895, Math.PI, 0.8, 0.6, motif++);
    for (const x of [18, 22]) painting(x + 2.7, 1.6, -0.895, 0, 0.8, 0.6, motif++);
    painting(15.2, FLOOR2 + 1.89, 4.205, 0, 1.45, 0.58, 4);   // on the bathroom wall facing the bed: above the headboard it overlapped it (B8)
    painting(12.105, FLOOR2 + 2.25, 6.4, Math.PI / 2, 1.05, 0.42, 0);      // above the TV, with clear space above its cabinet
    painting(13.81, FLOOR2 + 1.6, 1.9, -Math.PI / 2, 0.45, 0.6, 3);   // entry hall
  }
  // Anchors sit just above the ceiling face, where the downlights are: the ceiling faces away from them. 25 cm below it they burned a hotspot into it.
  for (const x of [10, 22]) light(x, CEIL + 0.01, 0, '#ffe7c7', 7, 8);
  for (const x of [-8, 2, 10, 20, 27]) light(x, FLOOR2 + CEIL + 0.01, 0, '#ffe7c7', 7, 8);
  for (const [x, y] of [[20, 0], [-4, FLOOR2], [24, FLOOR2]]) add(lib.model('ph-korean-fire-extinguisher-01', { height: 0.6 }), x, y + 0.9, -0.85);
  // Directory signs on the south corridor wall, read by someone stepping out of the elevator (facing +z:
  // their left is east, their right is west). Placed on clear wall between the linen/staff door and room 212/102.
  const directory = F.sign('← 209–218        201–208 →', { w: 1.3, h: 0.2, bg: '#24303f', font: 'bold 44px system-ui, sans-serif' });
  directory.position.set(11.2, FLOOR2 + 1.6, 0.895); directory.rotation.y = Math.PI; scene.add(directory);
  const directory1 = F.sign('← 101–108 · POOL        LOBBY →', { w: 1.3, h: 0.2, bg: '#24303f', font: 'bold 40px system-ui, sans-serif' });
  directory1.position.set(11.2, 1.6, 0.895); directory1.rotation.y = Math.PI; scene.add(directory1);
  const poolWay = F.sign('POOL · HOT TUB', { w: 0.9, h: 0.18, bg: '#24303f', font: 'bold 60px system-ui, sans-serif' });   // over the pool passage
  poolWay.position.set(12.75, 2.45, -0.89); scene.add(poolWay);
  // Guest room doors (locked) on both floors: one instanced Blender door model for all of them, plus a number plate each.
  const staticDoors = [];
  const doorAt = (number, x, y, side) => {
    const cx = x + 0.5, z = side > 0 ? 1 : -1, ry = side > 0 ? Math.PI : 0;
    staticDoors.push(new T.Matrix4().compose(new T.Vector3(cx, y, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ry), new T.Vector3(1, 1, 1)));
    const plate = F.sign(String(number), { w: 0.2, h: 0.12, bg: '#24303f', font: 'bold 150px system-ui, sans-serif' });
    plate.position.set(cx + (side > 0 ? -0.78 : 0.78), y + 1.5, z + (side > 0 ? -0.11 : 0.11)); plate.rotation.y = ry; scene.add(plate);
  };
  [12, 16.5, 21, 25.5].forEach((x, i) => doorAt(102 + i * 2, x + 0.4, 0, 1));
  [18, 22, 26].forEach((x, i) => doorAt(103 + i * 2, x + 0.4, 0, -1));
  doorAt('STAFF', 8.8, 0, 1);
  // West wing 202–208, east wing 212 (ours, built separately) through 218.
  south2.forEach((x, i) => { if (x !== 12) doorAt(i < 4 ? 202 + i * 2 : 212 + (i - 4) * 2, x + 0.4, FLOOR2, 1); });
  north2.forEach((x, i) => doorAt(201 + i * 2, x + 0.4, FLOOR2, -1));
  doorAt('LINEN', 9.4, FLOOR2, 1);
  instances('hotel-room-door', staticDoors);
  for (const [x, y, z] of [[9.3, 0, 1], [9.9, FLOOR2, 1]]) interact.push({ pos: new T.Vector3(x, y + 1.2, z - 0.2), r: 1.4, label: () => 'Staff door', use: () => game.say('Staff only. Locked.') });
  interact.push(...[12, 16.5, 21, 25.5].map(x => lockedDoor(x + 0.9, 0, 0.8)), ...[18, 22, 26].map(x => lockedDoor(x + 0.9, 0, -0.8)));
  interact.push(...south2.filter(x => x !== 12).map(x => lockedDoor(x + 0.9, FLOOR2, 0.8)), ...north2.map(x => lockedDoor(x + 0.9, FLOOR2, -0.8)));
  function lockedDoor(x, y, z) {
    return { pos: new T.Vector3(x, y + 1.2, z), r: 1.3, label: () => 'Knock', use: () => { game.sound.knock(); game.say(Math.random() < 0.3 ? 'A muffled TV goes quiet. Nobody answers.' : 'No answer. Not your room anyway.'); } };
  }

  // Ice alcove on floor 2.
  add(lib.model('hotel-ice-machine', { origin: true, rotate: Math.PI }), 7.5, FLOOR2, 3.6);
  light(7.5, FLOOR2 + 2.6, 2.5, '#f2f6ff', 6, 6);
  interact.push({ pos: new T.Vector3(7.5, FLOOR2 + 1, 3.1), r: 1.5, label: () => game.has('ice bucket') ? 'Fill ice bucket' : 'Ice machine',
    use: () => {
      if (game.has('ice bucket (full)')) return game.say('Your bucket is already full of ice.');
      if (!game.has('ice bucket')) return game.say('The ice machine rumbles. You need the ice bucket from your room.');
      game.sound.ice(); game.take('ice bucket'); game.give('ice bucket (full)'); game.say('Ice clatters into the bucket. Loudly. At this hour.');
    } });
}
