// SPDX-License-Identifier: CC0-1.0
// Hiding places in the existing hotel, each with the words a riddle can use for it. Riddles are always true; they are
// just never plain. `lock`: the spot can hold a code lock (a safe, a staff door, a keypad). Positions are world space.
import { FLOOR2 as Y } from '../../roadside-inn/world.js';

const R = { x0: 12, x1: 16.5 };
export const SPOTS = {
  'ice-machine': { pos: [7.5, Y + 0.5, 3.1], search: 'Reach under the ice machine', where: 'second floor, by the elevator',
    riddles: ['Upstairs, across from the lift, there is a machine that turns water into stone all night long, and under it, in the dark where the drips go, something has been waiting longer than the ice.', 'Look beneath the loud white box on the second floor, the one that groans like a ship, where nobody has swept since the hotel was built.'] },
  'luggage-cart': { pos: [0.4, 0.9, -6.5], search: 'Check the luggage cart', where: 'lobby',
    riddles: ['Look on the brass cart that carries other people’s lives up and down the halls and never once has carried its own.', 'Where the bags wait by the desk to be taken up, and some of them have been waiting for years.'] },
  'coffee': { pos: [3.4, 1.05, -8.6], search: 'Look behind the coffee urns', where: 'the pantry',
    riddles: ['Behind the urns in the pantry, where the coffee has been kept warm so long that it remembers every guest who ever poured it.', 'Bold, regular and decaf stand in a row like three old sisters. Look behind all three.'] },
  'desk-bell': { pos: [-9.0, 1.05, -2.75], search: 'Look under the desk bell', where: 'the front desk',
    riddles: ['Under the little bell on the front desk, the one you ring when nobody comes, which is always.', 'Lift the bell that summons the clerk. It has been keeping a secret under its skirt.'] },
  'lounge-chair': { pos: [-6.6, 0.5, 3.6], search: 'Feel under the cushion', where: 'the lobby seating',
    riddles: ['In the chair by the dark window where someone sat every night of one long winter, under the cushion still shaped like them.', 'Somebody waited by the lobby window until the waiting wore through the cushion. Feel under it.'] },
  'lifebuoy': { pos: [-18.5, 1.5, -8.6], search: 'Check behind the life ring', where: 'the pool',
    riddles: ['Behind the white ring on the pool wall, the one they throw to the drowning, which has never once been thrown.', 'Where the water is, there is a ring for saving people. Look at what it has been hiding instead.'] },
  'wet-floor': { pos: [-15.4, 0.4, -4], search: 'Look under the wet floor sign', where: 'the pool deck',
    riddles: ['Under the yellow sign by the pool that has warned of the same wet floor every day for eleven years.', 'CAUTION, it says, standing on the tiles as patiently as a heron, and it is standing on something.'] },
  'stair-landing': { pos: [10.75, 1.9, -7.5], search: 'Search the stair landing', where: 'the stairs',
    riddles: ['Halfway between the first floor and the second, where the stairs turn back on themselves and nobody ever stops.', 'Take the stairs. Where they change their mind, stop, and look down.'] },
  'extinguisher': { pos: [24, Y + 1.2, -0.9], search: 'Check behind the fire extinguisher', where: 'the far end of the second floor',
    riddles: ['At the far east end of the second floor, behind the red bottle that has been waiting all its life for a fire.', 'Break the glass in case of fire, says the cabinet at the end of the upstairs hall. Look behind it in case of anything else.'] },
  'nightstand': { pos: [R.x1 - 0.3, Y + 0.55, 5.05], search: 'Open the nightstand drawer', where: 'your room',
    riddles: ['In the drawer beside your own bed, under the Bible that nobody in this hotel has ever opened.', 'Beside the bed there is a drawer, and in the drawer a book, and under the book what you came for.'] },
  'under-bed': { pos: [R.x1 - 1.4, Y + 0.25, 6.6], search: 'Look under the bed', where: 'your room',
    riddles: ['In the place children check before they let themselves sleep, under your own bed.', 'Lie down if you want to. It has been under you the whole time.'] },
  'mirror': { pos: [15.0, Y + 1.5, 1.45], search: 'Look behind the mirror', where: 'your bathroom',
    riddles: ['Behind your own face, in the bathroom, where the glass has been watching you since you checked in.', 'Wash your hands, and then look behind the one looking back.'] },
  'freezer': { pos: [R.x0 + 0.6, Y + 0.75, 3.75], search: 'Check the freezer compartment', where: 'your room',
    riddles: ['In the coldest corner of the little refrigerator in your room, where the frost grows in the shape of a fern.', 'Above the fridge in your room there is a smaller winter. Open it.'] },
  'closet-safe': { pos: [R.x0 + 0.5, Y + 1.25, 2.95], search: 'In-room safe', where: 'your closet', lock: true,
    riddles: ['The steel box in your closet that you never set, because someone else set it a long time ago.', 'Hotels give every guest a safe. Somebody used yours before you were born.'] },
  'linen': { pos: [9.9, Y + 1.2, 0.75], search: 'Linen closet keypad', where: 'second floor', lock: true,
    riddles: ['The door upstairs marked LINEN, where the clean sheets are folded like letters nobody sends, behind four numbers.', 'Where the sheets are kept, upstairs, a keypad has been asking the same question for years.'] },
  'staff-door': { pos: [9.3, 1.2, 0.75], search: 'Staff door keypad', where: 'first floor', lock: true,
    riddles: ['The door on the first floor marked STAFF ONLY. You are not staff. Not yet.', 'Behind the door they tell every guest not to open, down the first-floor hall by the stairs.'] },
  'gym-door': { pos: [17.3, 1.2, -0.7], search: 'Gym door keypad', where: 'by the gym', lock: true,
    riddles: ['Behind the glass where the treadmills run all night with no one on them, there is a lock with a number.', 'The gym is closed at night, but it has never been empty. Its door wants four numbers.'] },
  'dumpster': { pos: [23, 1.3, -24.6], search: 'Search the dumpster', where: 'behind the hotel',
    riddles: ['Out back, in the green box where the hotel throws away what it does not want found, under the night’s trash.', 'Behind the building the dumpsters wait like cattle in a pen. Look in them.'] },
  'pole-sign': { pos: [34, 0.8, 44.4], search: 'Check the base of the pole sign', where: 'by the frontage road',
    riddles: ['At the foot of the tall sign that says HEARTLAND to the whole interstate, all night, to no one.', 'HEARTLAND, it says, very high up, humming. Look very low.'] },
  'register': { pos: [-64.2, 1.1, 115.3], search: 'Look behind the register', where: 'the travel stop',
    riddles: ['Across the interstate, behind the till in the travel stop, where nobody has stood for as long as the radio has been playing.', 'In the store across the road the radio plays a song you know. The till is in front of it. Look behind the till.'] },
  'newspaper-box': { pos: [-72, 0.9, 113.2], search: 'Open the newspaper box', where: 'the travel stop',
    riddles: ['Inside the newspaper box by the travel stop door, among yesterday’s news, which here has been yesterday’s news for thirty years.', 'The Joplin Globe in the box across the road has carried the same date since before you were born. Look inside it.'] },
  'ice-chest': { pos: [-75.8, 0.9, 113.4], search: 'Look in the ice chest', where: 'the travel stop',
    riddles: ['Not the machine upstairs, but the other ice, in the white chest outside the store across the road.', 'Across the interstate, by the door of the travel stop, there is a chest of ice that never melts. Open it.'] },
  'middle-pump': { pos: [-70, 1.0, 103.5], search: 'Check the middle pump', where: 'the travel stop',
    riddles: ['At the middle pump under the canopy across the road, where gas still costs what it cost when your father was young.', 'Three pumps across the road. Not the left one, not the right one.'] },
};

// Guest-room doors you can knock on: number → the spot just outside it.
export const DOORS = [];
[12, 16.5, 21, 25.5].forEach((x, i) => DOORS.push({ n: 102 + i * 2, pos: [x + 0.9, 1.2, 0.8] }));
[18, 22, 26].forEach((x, i) => DOORS.push({ n: 103 + i * 2, pos: [x + 0.9, 1.2, -0.8] }));
[-12, -7.5, -3, 1.5].forEach((x, i) => DOORS.push({ n: 202 + i * 2, pos: [x + 0.9, Y + 1.2, 0.8] }));
[16.5, 21, 25.5].forEach((x, i) => DOORS.push({ n: 214 + i * 2, pos: [x + 0.9, Y + 1.2, 0.8] }));
[-12, -7.5, -3, 1.5, 12, 16.5, 21, 25.5].forEach((x, i) => DOORS.push({ n: 201 + i * 2, pos: [x + 0.9, Y + 1.2, -0.8] }));
