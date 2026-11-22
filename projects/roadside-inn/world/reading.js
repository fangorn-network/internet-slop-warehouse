// SPDX-License-Identifier: CC0-1.0
// Reading by opening the thing in your hands, not a menu (L6). A newspaper is one sheet folded in half: E brings it up
// to read the front page, E again opens it (the front leaf turns over to the left: pages 2 and 3), E turns the other leaf
// over to the back page, E lowers it; Q steps back the same way. A brochure (L5: the rack's are now separate copies you
// can take) is a tri-fold: E brings up the cover, E unfolds it to the three inside panels, E turns it over to the
// outside (flap, back panel, cover), E lowers it.
// The open thing is held below your eyes, facing them, and follows your turning a moment late: look down or aside to
// read the rest of the page, as you would. It's drawn over the room (a held page never goes through a wall).
// Part of buildWorld (../world.js): main.js asks game.reading what E and Q do while you hold something readable.
import * as T from 'three';
import * as F from '../fixtures.js';
import { drawNewspaperPage, newspaperPages, newspaperText } from '../newspaper.js';

// The rack's covers (blender/labels.mjs draws the same eight on the rack's own printed copies), and what's inside each.
const BROCHURES = [
  { title: 'Onyx Caverns', sub: 'GUIDED TOURS DAILY', sky: '#1b1b1b', ground: '#000', ink: '#ffcf6b',
    inside: [['A mile under the Ozarks', 'Walk the lighted trail past the Onyx Curtain, the Bottomless Pool and the Cathedral Room, 300 feet down. It is 52° all year: bring a jacket.'],
      ['Tours', 'Every hour on the hour, 9 a.m. to 5 p.m., March through November. Weekends only in winter. Tours last 75 minutes. The trail is paved but has 212 steps.'],
      ['Admission', 'Adults $18 · Seniors $16 · Ages 5-12 $9 · Under 5 free. Gem panning and the gift shop are open without a tour ticket.']],
    back: ['Find us', 'I-44 Exit 127, then 14 miles south on Route V. Follow the blue cave signs. (417) 555-0148'], flap: ['$2 off', 'Show this brochure at the ticket window. One per adult admission. Not valid with other offers.'] },
  { title: 'Table Rock', sub: 'DINNER CRUISES', sky: '#64b5f6', ground: '#1565c0', ink: '#fff',
    inside: [['Supper on the lake', 'Three decks, a buffet of fried chicken, catfish and cobbler, and the sun going down over Table Rock Lake.'],
      ['Sailings', 'Dinner cruise nightly at 6 p.m., May to October. Sunday brunch at 11. Boarding begins 45 minutes before sailing.'],
      ['Live music', 'Gospel on Sundays, classic country the rest of the week. Private charters for reunions and weddings.']],
    back: ['Branson', '1.5 hours south on US-65. Free parking at the marina. Reservations recommended.'], flap: ['Kids eat free', 'Monday and Tuesday sailings, one child under 12 per paying adult.'] },
  { title: 'Route 66', sub: 'DRIVE-IN & MUSEUM', sky: '#ffb74d', ground: '#c8a165', ink: '#3b2414',
    inside: [['Get your kicks', 'Gas pumps, neon, a 1956 Bel Air and the original sign from the Munger Moss, all under one roof.'],
      ['Drive-in', 'Double features Friday and Saturday at dusk, May to September. $10 a carload. Tune your radio to 89.9.'],
      ['Museum hours', 'Tuesday to Saturday 10 to 5. Free admission; donations keep the lights on.']],
    back: ['On the old road', 'Exit 127, north outer road, 3 miles east. You are on the old alignment already.'], flap: ['Free root beer', 'With any museum gift shop purchase over $5.'] },
  { title: 'Big Spring', sub: 'FLOAT TRIPS · CANOES', sky: '#81d4fa', ground: '#2e7d32', ink: '#fff',
    inside: [['Float the Current', 'Clear, cold spring water, gravel bars and bluffs. Half-day and full-day floats on the Current and Jacks Fork rivers.'],
      ['Rentals', 'Canoe $55 a day · Kayak $40 · Raft (4-6) $120 · Tubes $20. Shuttle included. Life jackets required by law.'],
      ['Camping', 'Riverside sites with hot showers, $25 a night. Firewood sold on site only: don’t move firewood.']],
    back: ['Van Buren', '2 hours east on US-60. Open April to October, 7 a.m. to dusk.'], flap: ['Pack it out', 'No glass on the river. Coolers must float. Leave the gravel bars cleaner than you found them.'] },
  { title: 'Pioneer Village', sub: '1880s LIVING HISTORY', sky: '#ffe082', ground: '#8d6e4f', ink: '#3b2414',
    inside: [['Step back to 1880', 'A working blacksmith, a one-room school, the general store and a grist mill that still grinds cornmeal.'],
      ['Every day', 'Butter churning at 10, the schoolmarm’s lesson at 11, blacksmith demonstrations at 1 and 3.'],
      ['Seasons', 'Spring planting days in April, sorghum making in September, candlelight Christmas in December.']],
    back: ['Visit', 'Exit 127, then Route V south 6 miles. Wednesday to Sunday, 9 to 4. Adults $12, kids $6.'], flap: ['Bring this', 'For a free bag of stone-ground cornmeal from the mill.'] },
  { title: 'Silver Fork', sub: 'OUTLET SHOPPING', sky: '#ce93d8', ground: '#6a1b9a', ink: '#fff',
    inside: [['60 stores', 'Name brands at outlet prices: shoes, jeans, kitchenware, and the fudge shop by the fountain.'],
      ['Hours', 'Monday to Saturday 10 to 8, Sunday noon to 6. Food court open late Friday and Saturday.'],
      ['Tax-free weekend', 'The first weekend in August: school clothes and supplies, no sales tax.']],
    back: ['Getting there', 'I-44 Exit 100, 27 miles west. Tour buses welcome.'], flap: ['Coupon book', 'Show your hotel key card at Guest Services for a free coupon book.'] },
  { title: 'Glade Top', sub: 'SCENIC BYWAY', sky: '#ff8a65', ground: '#4e342e', ink: '#fff',
    inside: [['23 miles of ridge', 'Missouri’s only National Forest Scenic Byway runs the ridgetops of the Mark Twain National Forest.'],
      ['When to go', 'October for the smoke trees and maples. Spring for redbud and dogwood. The road is gravel: drive slow.'],
      ['Stop at', 'Caney Lookout, the 1930s CCC picnic shelter, and the flat glades where the roadrunners are.']],
    back: ['Start at', 'Ava, Missouri, then Route 125 south to the forest road. No gas on the byway: fill up first.'], flap: ['Leave no trace', 'Stay on the road shoulder. Glades are fragile. Fires only in the fire rings.'] },
  { title: 'Heartland', sub: 'REWARDS', sky: '#13264a', ground: '#1a6fb0', ink: '#fff',
    inside: [['Every tenth night free', 'Earn a stamp each night at any Heartland Inn. Ten stamps and the next one is on us.'],
      ['Members get', 'Late check-out on request, a free hot breakfast to go, and Wi-Fi that works in the parking lot.'],
      ['Join today', 'Ask at the front desk. It takes two minutes and a phone number.']],
    back: ['Heartland Inn Express', 'Exit 127 · Harlow Springs, MO · (417) 555-0127. 24-hour front desk.'], flap: ['Your stamps', '☐ ☐ ☐ ☐ ☐  ☐ ☐ ☐ ☐ ☐'] },
];
const PANEL = { w: 0.093, h: 0.2, px: [384, 826] };   // a letter sheet folded in thirds: 3.7 × 8.5 in (a little trimmed)

// One brochure panel on a canvas: a cover (sky, ground, title) or a printed panel (header bar, heading, text).
function drawPanel(g, w, h, b, kind, text = null) {
  const wrap = (t, x, y, size, max, font = 'Georgia, serif', weight = '') => {
    g.font = `${weight} ${size}px ${font}`; let line = '';
    for (const word of t.split(' ')) { const next = line ? `${line} ${word}` : word; if (g.measureText(next).width > max && line) { g.fillText(line, x, y); y += size * 1.3; line = word; } else line = next; }
    if (line) g.fillText(line, x, y); return y + size * 1.3;
  };
  if (kind === 'cover') {
    g.fillStyle = b.sky; g.fillRect(0, 0, w, h); g.fillStyle = b.ground; g.fillRect(0, h * 0.62, w, h * 0.38);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(w * 0.72, h * 0.3, w * 0.16, 0, 7); g.fill();
    g.fillStyle = b.ink; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    wrap(b.title, w / 2, h * 0.2, 64, w - 40, 'Georgia, serif', '700');
    g.font = '600 26px system-ui, sans-serif'; g.fillText(b.sub, w / 2, h * 0.88, w - 30);
    return;
  }
  g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h);
  g.fillStyle = b.ground; g.fillRect(0, 0, w, 54);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '600 22px system-ui, sans-serif'; g.fillText(`${b.title} ${b.sub}`.toUpperCase(), w / 2, 36, w - 24);
  g.textAlign = 'left'; g.fillStyle = '#1d1d1b';
  const [head, body] = text;
  const y = wrap(head, 26, 120, 38, w - 52, 'Georgia, serif', '700');
  wrap(body, 26, y + 18, 28, w - 52);
}

export function buildReading(ctx) {
  const { scene, game, updaters, loose } = ctx;
  // Paper, lit by the room like anything else (dim in a dark room), with a little of its own so print stays legible
  // in lamplight. Drawn last and over everything: held up to your face, a page never goes through a wall.
  const mat = map => new T.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.18, roughness: 1, transparent: true, depthTest: false, depthWrite: false });
  const plane = (w, h, map, back = false) => { const p = new T.Mesh(new T.PlaneGeometry(w, h), mat(map)); p.renderOrder = 999; if (back) { p.rotation.y = Math.PI; p.position.z = -0.0004; } return p; };

  // ---------- brochures in the rack ----------
  // The rack's printed copies stay (four more behind each); the front copy of each pocket is a real one you can take.
  const rack = scene.children.find(o => o.name === 'hotel-brochure-rack');
  const covers = BROCHURES.map(b => F.canvasTexture(...PANEL.px, (g, w, h) => drawPanel(g, w, h, b, 'cover')));
  const backs = BROCHURES.map(b => F.canvasTexture(...PANEL.px, (g, w, h) => drawPanel(g, w, h, b, 'panel', b.back)));
  const edge = F.mat('#f3efe6', { roughness: 0.9 });
  if (rack) {
    rack.updateMatrixWorld(true);
    BROCHURES.forEach((b, i) => {
      const t = Math.floor(i / 2), c = i % 2;   // four tiers of two pockets (blender/props.py brochure_rack)
      const o = new T.Group(); o.name = 'brochure';
      const sheet = new T.Mesh(new T.BoxGeometry(PANEL.w, PANEL.h, 0.003), [edge, edge, edge, edge, F.mat('#fff', { map: covers[i], roughness: 0.85 }), F.mat('#fff', { map: backs[i], roughness: 0.85 })]);
      { // two draw calls, not six: the 3 mm edges take the back's paper (cream), drawn with the back; the cover on its own
        const g = sheet.geometry, ix = g.index.array, re = [...ix.slice(0, 24), ...ix.slice(30, 36), ...ix.slice(24, 30)];
        g.setIndex(re); g.clearGroups(); g.addGroup(0, 30, 5); g.addGroup(30, 6, 4); }
      sheet.position.y = PANEL.h / 2; o.add(sheet);
      o.position.set(-0.075 + c * 0.15, 0.304 + t * 0.3, 0.0065); o.rotation.x = -14 * Math.PI / 180;
      rack.add(o); scene.attach(o);
      o.userData.read = { kind: 'brochure', i };
      loose(o, { rest: true, shape: 'box' });
    });
  }

  // Every newspaper in the building reads (its edition: userData.edition, else today's).
  scene.traverse(o => { if (o.name === 'hotel-newspaper' && o.userData.loose) o.userData.read = { kind: 'paper' }; });

  // ---------- the reader ----------
  const reader = new T.Group(); reader.name = 'Reading in hand'; reader.visible = false; scene.add(reader);
  const st = { o: null, kind: null, step: 0, parts: null, yaw: 0 };
  const paperTex = new Map();
  const pageTex = (edition, i) => { const k = `${edition}/${i}`; if (!paperTex.has(k)) paperTex.set(k, F.canvasTexture(1024, 1707, (g, w, h) => drawNewspaperPage(g, w, h, edition, i))); return paperTex.get(k); };
  const inside = new Map();
  const insideTex = (i, k) => { const key = `${i}/${k}`; if (!inside.has(key)) inside.set(key, F.canvasTexture(...PANEL.px, (g, w, h) => drawPanel(g, w, h, BROCHURES[i], 'panel', k === 3 ? BROCHURES[i].flap : BROCHURES[i].inside[k]))); return inside.get(key); };

  // A leaf: a hinge at x = 0 and a two-sided page out to +x (or -x).
  const leaf = (w, h, front, back, side = 1) => { const g = new T.Group(), f = plane(w, h, front), b = plane(w, h, back, true); f.position.x = b.position.x = side * w / 2; g.add(f, b); return g; };
  function build(o) {
    reader.clear();
    const r = o.userData.read;
    if (r.kind === 'paper') {   // leaf A: pages 1 and 2; leaf B: pages 3 and 4
      const e = o.userData.edition ?? 'today', n = newspaperPages(e), W = 0.3, H = 0.5;
      const A = leaf(W, H, pageTex(e, 0), pageTex(e, 1 % n)), B = leaf(W, H, pageTex(e, 2 % n), pageTex(e, 3 % n));
      const sheet = new T.Group(); sheet.add(A, B); reader.add(sheet);
      st.parts = { sheet, A, B, a: 0, b: 0, x: -W / 2 };
      st.steps = 3; st.dist = 0.38;
    } else {   // middle panel, the left panel (inside / cover) and the flap (inside / its outside)
      const i = r.i, W = PANEL.w, H = PANEL.h;
      const M = leaf(W, H, insideTex(i, 1), backs[i]), L = leaf(W, H, insideTex(i, 0), covers[i], -1), Rt = leaf(W, H, insideTex(i, 2), insideTex(i, 3));
      M.children.forEach(p => (p.position.x = 0)); L.position.x = -W / 2; Rt.position.x = W / 2;
      const sheet = new T.Group(); sheet.add(M, L, Rt); reader.add(sheet);
      st.parts = { sheet, L, Rt, l: Math.PI, r: Math.PI, turn: 0 };
      st.steps = 3; st.dist = 0.27;
    }
  }
  const hide = (o, off) => o.traverse(n => { if (n.isMesh) n.visible = !off; });
  function open(o) { st.o = o; st.kind = o.userData.read.kind; st.step = 0; build(o); hide(o, true); reader.visible = true; st.yaw = null; game.sound?.paper?.(); }
  function close() { if (st.o) hide(st.o, false); st.o = null; reader.visible = false; reader.clear(); }
  const readable = () => { const o = game.held?.(); return o?.userData.read ? o : null; };
  // Looking down at a table or the floor, E puts it down like anything else; looking ahead, E reads it.
  const lookingDown = () => { const c = game.camera?.(); return !!c && c.getWorldDirection(new T.Vector3()).y < -0.5; };

  // What you see at each step, as words (checks read these; so could a screen reader).
  function text() {
    if (!st.o) return '';
    if (st.kind === 'paper') { const e = st.o.userData.edition ?? 'today'; return [[0], [1, 2], [3]][st.step].map(i => newspaperText(e, i)).join(' | '); }
    const b = BROCHURES[st.o.userData.read.i];
    return [[b.title, b.sub], b.inside.flat(), [...b.flap, ...b.back, b.title]][st.step].join(' · ');
  }
  game.reading = {
    /** E: bring a readable thing up, or on to its next step (the last lowers it). True if it took the key. */
    use() { const o = readable(); if (!o || (st.o !== o && lookingDown())) return false; if (st.o !== o) open(o); else if (st.step < st.steps - 1) { st.step++; game.sound?.paper?.(); } else close(); return true; },
    /** Q: a step back (from the first, lower it). False when nothing is up, so Q throws as usual. */
    back() { if (!st.o) return false; if (st.step > 0) { st.step--; game.sound?.paper?.(); } else close(); return true; },
    /** The prompt line for what's in your hands, or null. */
    prompt() {
      const o = readable(); if (!o) return null;
      const what = o.userData.read.kind === 'paper' ? 'the paper' : 'the brochure';
      if (st.o !== o) return lookingDown() ? null : `<kbd>E</kbd>Read ${what} · <kbd>Q</kbd>Throw · look down to put it down`;
      const next = st.kind === 'paper' ? ['Open it', 'Turn to the back page', 'Fold it up'] : ['Unfold it', 'Turn it over', 'Fold it up'];
      return `<kbd>E</kbd>${next[st.step]} · <kbd>Q</kbd>${st.step ? 'Back' : 'Lower it'}`;
    },
    get state() { return { open: !!st.o, kind: st.kind, step: st.step, text: text() }; },
  };

  const eye = new T.Vector3(), fwd = new T.Vector3(), cam = { camera: null };
  updaters.push((dt, t, player) => {
    if (st.o && readable() !== st.o) close();   // put down or thrown
    if (!st.o) return;
    const camera = cam.camera ??= game.camera?.(); if (!camera) return;
    camera.getWorldPosition(eye); camera.getWorldDirection(fwd);
    // Follow the head's turning a moment late, outside a small dead zone: look aside to read across the spread.
    const yaw = Math.atan2(fwd.x, fwd.z);
    if (st.yaw === null) st.yaw = yaw;
    let d = Math.atan2(Math.sin(yaw - st.yaw), Math.cos(yaw - st.yaw));
    const dead = 0.3; if (Math.abs(d) > dead) st.yaw += (d - Math.sign(d) * dead);
    d = Math.atan2(Math.sin(yaw - st.yaw), Math.cos(yaw - st.yaw)); st.yaw += d * Math.min(1, dt * 1.5);
    reader.position.set(eye.x + Math.sin(st.yaw) * st.dist * 0.94, eye.y - st.dist * 0.34, eye.z + Math.cos(st.yaw) * st.dist * 0.94);
    reader.lookAt(eye);
    const P = st.parts, k = Math.min(1, dt * 7), ease = (v, to) => v + (to - v) * k;
    if (st.kind === 'paper') {
      P.a = ease(P.a, st.step >= 1 ? Math.PI : 0); P.b = ease(P.b, st.step >= 2 ? Math.PI : 0); P.x = ease(P.x, [-0.15, 0, 0.15][st.step]);
      P.A.rotation.y = -P.a; P.B.rotation.y = -P.b;
      P.A.position.z = 0.002 - 0.0015 * P.a / Math.PI; P.B.position.z = 0.001 + 0.0015 * P.b / Math.PI;   // the leaf turned last lies on top
      P.sheet.position.x = P.x;
    } else {
      // the cover opens, then the flap; folding, the flap goes in first
      if (st.step >= 1) { P.l = ease(P.l, 0); if (P.l < 1.2) P.r = ease(P.r, 0); } else { P.r = ease(P.r, Math.PI); if (P.r > 2.6) P.l = ease(P.l, Math.PI); }
      P.turn = ease(P.turn, st.step >= 2 ? Math.PI : 0);
      P.L.rotation.y = P.l; P.Rt.rotation.y = -P.r; P.sheet.rotation.y = P.turn;
      P.L.position.z = 0.002 * P.l / Math.PI; P.Rt.position.z = 0.001 * P.r / Math.PI;
    }
  });
  Object.assign(ctx, { readers: game.reading });
}
