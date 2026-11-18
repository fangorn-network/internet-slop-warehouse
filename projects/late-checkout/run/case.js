// SPDX-License-Identifier: CC0-1.0
// One night, generated from a seed. Pure data: no three.js, so node can check thousands of seeds for solvability.
//
// The case is written first (who, what, when), then torn into pieces, then each piece is hidden behind a puzzle that
// is built backwards from its answer, so every night is solvable by construction:
//   the note → room 113 → piece 1 → its back says where piece 2 is → … → the whole page says where your keys are.
// Puzzle kinds: hidden (a riddle), code (a lock whose digits are split across two clues), window (only there for a
// quarter of every hour), vend (it comes out with one particular snack), knock (one particular door opens a crack).
import { rng } from './rng.js';
import { SPOTS, DOORS } from './spots.js';
import { at, format } from './clock.js';

export const SUSPECTS = [
  { id: 'dana', name: 'Dana', role: 'the night clerk', model: 'rb-sophia-formal', keeps: 'the desk' },
  { id: 'ruth', name: 'Ruth', role: 'the housekeeper', model: 'rb-emma-casual', keeps: 'her cart' },
  { id: 'earl', name: 'Earl', role: 'the trucker who never leaves the pantry', model: 'rb-marcus-formal', keeps: 'his cab' },
  { id: 'harlan', name: 'Mr. Harlan', role: 'the manager nobody has met', model: null, keeps: 'the office' },
  { id: 'lyle', name: 'Lyle', role: 'the man by the pool', model: 'rb-andre-casual', keeps: 'the water' },
];
const FIRST = ['Laura', 'Teresa', 'Annie', 'Maddy', 'Josie', 'Donna', 'Carrie', 'Ronette', 'Judy', 'Sarah'];
const LAST = ['Pulaski', 'Marsh', 'Delacroix', 'Hollis', 'Renner', 'Abernathy', 'Voss', 'Whitlock', 'Calder', 'Sorensen'];
const DOCS = [
  'From the night ledger of the Heartland Inn, which the management denies keeping',
  'A statement to the Phelps County sheriff, taken down by a deputy who later forgot taking it',
  'A letter written in the hand of a guest who never posted it',
  'The insurance file on room 113, which the insurance company also cannot find',
];
const SNACKS = { 'Potato chips': 'a dollar seventy-five, and salt', 'Pretzels': 'a dollar fifty, tied in knots', 'Candy bar': 'a dollar and a quarter, and sweet', 'Peanut butter crackers': 'one dollar, two halves stuck together', 'Trail mix': 'two dollars, for a walk you will not take', 'Spearmint gum': 'one dollar, to hide your breath' };
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const PAST = { 0: 'on the hour', 15: 'at a quarter past', 30: 'at half past', 45: 'at a quarter to' };

const CRIMES = [
  (v, c, d) => [
    `On the night of ${d}, ${v} signed the register in a hand so careful it seemed she wanted to be remembered, took the key to room 113, and was never seen to leave, though for years the maids swore the bed in 113 was warm every morning.`,
    `The only one awake that night was ${c.name}, ${c.role}, who told the sheriff there had been no such guest, and said it so many times that the register itself began to doubt its ink.`,
    'By dawn the carpet had been taken up, the walls painted the colour of weak tea, and the brass numbers pried off the door and dropped into the ice machine, where some say they still rattle.',
    'Her car stayed in the lot through a whole winter, gathering snow like a patient animal, and her keys were never found, because they were put where nobody would think to look for anything of hers.',
  ],
  (v, c, d) => [
    `At eleven-forty on ${d}, on the ramp of exit 127, a woman walking toward the lights of the Heartland was struck by a car that did not slow, did not stop and, the only witness said, did not have its headlights on.`,
    `She was ${v}, a guest in room 113, who had gone out for cigarettes she did not smoke and told the clerk she would be right back.`,
    `The car came into the lot four minutes later with its grille folded like a hand. It belonged to ${c.name}, ${c.role}, who parked it under the canopy, went inside, and washed for a very long time.`,
    'Every guest who saw the dent that night was offered another night free of charge, and then another, and not one of them has yet found the morning they were waiting for.',
  ],
  (v, c, d) => [
    `On ${d} a fire began in room 113 in the hour when even the interstate sleeps, and it burned so quietly that the guests on either side dreamed only of summer.`,
    `The guest inside was ${v}. The door had been locked from the corridor side, and the smoke alarm had been emptied of its battery, which was found later in the pocket of a uniform.`,
    `The policy on the room had been taken out three weeks before, in the name of ${c.name}, ${c.role}, who wept at the inquest with such conviction that the clerk of the court wept too.`,
    'That winter men paid in cash renumbered the first floor, and 113 stopped existing on every plan, every key and every tongue, except at night.',
  ],
];

export function generateNight(seed) {
  const r = rng(seed);
  const culprit = r.pick(SUSPECTS);
  const victim = `${r.pick(FIRST)} ${r.pick(LAST)}`;
  const year = r.int(1979, 1996), date = `${r.pick(['March', 'October', 'November', 'February'])} ${r.int(2, 28)}, ${year}`;
  const truth = r.pick(CRIMES)(victim, culprit, date);
  const pool = Object.keys(SPOTS);
  const keysSpot = r.take(pool.filter(s => !SPOTS[s].lock), 1)[0];
  pool.splice(pool.indexOf(keysSpot), 1);

  // Four torn pieces of one page. Piece 1 is handed over at room 113; pieces 2–4 each get a puzzle.
  const kinds = r.shuffle(['hidden', 'code', 'window', 'vend', 'knock']).slice(0, 3);
  const doors = r.shuffle(DOORS.filter(d => d.n !== 212));
  const pieces = [{ n: 1, text: truth[0], kind: 'given', spot: 'room-113' }];
  const notes = [];   // extra paper (half a code) hidden at other spots
  for (let i = 0; i < 3; i++) {
    const kind = kinds[i], piece = { n: i + 2, text: truth[i + 1], kind };
    if (kind === 'hidden') { piece.spot = takeOpen(); piece.clue = r.pick(SPOTS[piece.spot].riddles); }
    if (kind === 'window') {
      piece.spot = takeOpen(); piece.minute = r.pick([0, 15, 30, 45]);
      piece.clue = `${r.pick(SPOTS[piece.spot].riddles)} But it is only there ${PAST[piece.minute]}, for a quarter of an hour, every hour, the way some things are only true at certain times.`;
    }
    if (kind === 'code') {
      piece.spot = r.take(pool.filter(s => SPOTS[s].lock), 1)[0]; pool.splice(pool.indexOf(piece.spot), 1);
      piece.code = String(r.int(1000, 9999));
      const half = takeOpen();
      notes.push({ spot: half, text: `Heartland Inn notepaper, folded small. Two numbers in pencil, pressed so hard they came through the other side: ${piece.code.slice(0, 2)} __` });
      piece.channelWindow = r.pick([0, 15, 30, 45]);
      piece.clue = `${r.pick(SPOTS[piece.spot].riddles)} It will ask you for four numbers. The first two were written in pencil and left here: ${r.pick(SPOTS[half].riddles).replace(/\.$/, '').toLowerCase()}. The last two are spoken on channel 13 ${PAST[piece.channelWindow]}, by a voice that does not know it is being heard.`;
    }
    if (kind === 'vend') {
      const snack = r.pick(Object.keys(SNACKS));
      piece.spot = 'vending'; piece.snack = snack;
      piece.clue = `The snack machine in the pantry has been keeping something for you since before you were born. Pay for the one that costs ${SNACKS[snack]}.`;
    }
    if (kind === 'knock') {
      const d = doors.pop(); piece.spot = `door-${d.n}`; piece.door = d.n;
      const knocks = r.int(2, 4); piece.knocks = knocks;
      piece.clue = `Room ${spell(d.n)}. Knock ${WORDS[knocks]} times and then wait, and do not knock again, because whoever is inside is counting.`;
    }
    pieces.push(piece);
  }
  // Each piece's back points at the next one; the last back is blank and the whole page points at the keys.
  pieces.forEach((p, i) => { p.back = pieces[i + 1]?.clue ?? null; });
  const keysClue = `Your keys are where ${culprit.name} keeps the things that were never ${culprit.id === 'dana' || culprit.id === 'ruth' ? 'hers' : 'his'} to keep. ${r.pick(SPOTS[keysSpot].riddles)}`;

  const strange = pickStrange(r);
  const rules = [
    'Checkout is at six. Whoever is still in the building when the light reaches the pole sign will be given a vest, a name tag, and all the time in the world.',
    'Nothing you lost tonight is lost. It was taken by someone who has done this before, and it was written down, because this hotel forgets nothing it is told.',
    'The page that tells it has been torn in four. The first piece waits in a room that has not existed since the winter the first floor was renumbered.',
    'The woman at the desk answers every question truthfully, and every answer costs half an hour, which she keeps.',
    'The interstate takes an hour from anyone who crosses it without looking, and gives nothing back.',
    ...strange.filter(s => s.rule).map(s => s.rule),
  ];
  return { seed, culprit, victim, year, date, title: r.pick(DOCS), truth, pieces, notes, keysSpot, keysClue, strange, rules };

  function takeOpen() { const s = r.take(pool.filter(x => !SPOTS[x].lock), 1)[0]; pool.splice(pool.indexOf(s), 1); return s; }
}

// The strangeness: a few from the pool, at random times after midnight. `rule`: a true line for the card on the door.
const STRANGE = [
  r => { const t = at(r.int(0, 2), r.pick([10, 30, 50])); return { id: 'corridor-loop', at: t, until: t + 60, rule: `From ${format(t)}, and for one hour, the upstairs hallway will forget where it ends and begin again.` }; },
  r => { const t = at(r.int(1, 3), r.pick([0, 20, 40])); return { id: 'third-floor', at: t, until: t + 40, rule: 'The elevator will offer you a third floor. The building has two.' }; },
  r => { const t = at(r.int(0, 3), r.pick([5, 25, 45])); return { id: 'figure-hall', at: t, until: t + 25, floor: r.int(0, 1), rule: 'If someone is standing at the end of a hall, walk. Whatever you do, do not run to them.' }; },
  r => { const t = at(r.int(1, 4), r.pick([13, 33, 53])); return { id: 'tv-all', at: t, until: t + 12, rule: null }; },
  r => { const t = at(r.int(0, 4), r.pick([0, 30])); return { id: 'lobby-dark', at: t, until: t + 20, rule: null }; },
  r => { const t = at(r.int(1, 4), r.pick([7, 27, 47])); return { id: 'phone-ring', at: t, until: t + 6, rule: 'When the telephone across the road rings, it is ringing for you, and the call is free.' }; },
  r => { const t = at(r.int(2, 4), r.pick([0, 30])); return { id: 'watch-lies', at: t, until: t + 20, rule: `Between ${format(t)} and ${format(t + 20)} your watch will lie to you out of kindness. Channel 13 has no kindness, and keeps the true time.` }; },
];
function pickStrange(r) { return r.shuffle(STRANGE).slice(0, 4).map(f => f(r)).sort((a, b) => a.at - b.at); }

function spell(n) { return String(n).split('').map(d => WORDS[d]).join('-'); }
