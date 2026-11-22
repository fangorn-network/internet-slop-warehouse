// SPDX-License-Identifier: CC0-1.0
// The local paper you can pick up in the lobby and read: it opens in your hands (world/reading.js), one sheet folded in
// half, four pages: the front (local news), inside the weather and the classifieds, and the back page. Invented: the
// town, the paper and everyone in it. It agrees with the rest of the inn: the storms the TV weather promises, the I-62
// work by exit 127, the fair, tonight's ballgame on channel 4.
const MASTHEAD = 'The Harlow Springs Courier-Ledger';
const EDITIONS = {
  today: {
    date: 'Thursday · 75¢ · Vol. 118, No. 211',
    pages: [
      ['Local', `
        <h3>Night lane closures on I-62 begin at Exit 127</h3>
        <p class="by">By Carol Pruitt, Courier-Ledger staff</p>
        <p>Eastbound I-62 drivers should expect one lane between mile markers 126 and 129 from 7 p.m. to 6 a.m. starting
        Monday, as crews mill and resurface the stretch past the Exit 127 interchange. The work is expected to run through
        the end of October, weather permitting.</p>
        <p>“We're asking truckers to watch for the merge well before the overpass,” said district engineer Dale Overbey.
        The ramps at 127 will stay open, but flaggers will hold traffic at the top of the eastbound ramp for short periods.</p>
        <p>Businesses at the exit say nights are when they notice it most. “Half our guests pull in after ten,” said a
        desk clerk at one of the hotels on the south outer road. “We'll leave the sign lit.”</p>
        <h3>Travel stop adds two diesel lanes</h3>
        <p>The Route 66 Travel Stop on the north outer road will add two high-flow diesel lanes and twelve truck parking
        spaces this winter, owners told the planning commission Tuesday. The commission approved the site plan 5-0.</p>
        <h3>Fair opens Saturday; pie judging moves indoors</h3>
        <p>The county fair opens Saturday at 9 a.m. at the fairgrounds on Route V. After last year's wasp incident, pie
        and preserves judging moves to the Floral Hall. Armband nights are Tuesday and Thursday.</p>`],
      ['Weather', `
        <h3>Storms after midnight, then a cooler weekend</h3>
        <table class="wx"><tr><th>Tonight</th><th>Friday</th><th>Saturday</th><th>Sunday</th></tr>
        <tr><td>⛈ 58°</td><td>🌦 71° / 52°</td><td>⛅ 68° / 47°</td><td>☀ 70° / 49°</td></tr>
        <tr><td>Scattered storms, gusts to 50 mph</td><td>Showers ending by noon</td><td>Breezy, fair weather for the fair</td><td>Sunny</td></tr></table>
        <p>A severe thunderstorm watch is in effect for Phelps, Pulaski and Laclede counties until 2 a.m. The main threat is
        damaging wind and small hail as a line of storms crosses the Ozarks between midnight and 3 a.m.</p>
        <h4>Almanac</h4>
        <p>Yesterday's high 84°, low 63°. Normal 79° / 57°. Rain yesterday: none. Month to date: 1.12 in.
        Sunrise 6:58 a.m. Sunset 7:21 p.m. Gasconade River at Jerome: 4.1 ft and steady.</p>
        <h4>On the road</h4>
        <p>I-62: one lane eastbound, MM 126-129, nights from Monday. Route V: fair traffic Saturday, expect delays at the
        fairgrounds entrance from 8 a.m.</p>`],
      ['Classifieds', `
        <div class="ads">
        <p><b>HELP WANTED.</b> Night auditor, hotel at Exit 127. Quiet nights, some math. Apply at the front desk.</p>
        <p><b>FOR SALE.</b> '96 Ford F-150, 212k, runs good, new tires. $2,400 obo. Leave message.</p>
        <p><b>LOST.</b> Brown heeler mix, answers to “Biscuit,” last seen by the truck wash. Reward.</p>
        <p><b>YARD SALE.</b> Sat 7-noon, 411 Pine. Baby clothes, recliner, canning jars, a whole lot of VHS.</p>
        <p><b>FIREWOOD.</b> Seasoned oak, split &amp; delivered. $90 a rick. You haul, $70.</p>
        <p><b>FOR RENT.</b> 2 bd mobile home on 3 acres, Route V. No pets. $575/mo + deposit.</p>
        <p><b>SERVICES.</b> Small engine repair. Mowers, chainsaws, tillers. Pick-up available. Ask for Ray.</p>
        <p><b>NOTICE.</b> The Harlow Springs Lions Club fish fry is moved to Friday the 22nd due to the fair.</p>
        <p><b>WANTED.</b> Old crocks and butter churns. Cash paid. Will come to you.</p>
        <p><b>HELP WANTED.</b> Breakfast attendant, 5:30-10 a.m. Must like waffles. Same hotel as above.</p>
        </div>`],
      ['Back page', `
        <h3>Tonight on TV</h3>
        <p><b>6:00</b> KY3 News · <b>6:30</b> Wheel of Fortune · <b>7:00</b> Cardinals at Royals (Bally Sports Midwest)
        · <b>10:00</b> KY3 News at Ten · <b>10:35</b> Late-night movie: “The Long Haul” (1958)</p>
        <h4>Heartland Inn Express · Exit 127</h4>
        <p>Hot breakfast 6 to 9:30. Indoor pool and hot tub. Truck and trailer parking. Free Wi-Fi. Ask about our
        Heartland Rewards: every tenth night free.</p>
        <h4>Harlow Springs Church Directory</h4>
        <p>First Methodist, 9 and 11 a.m. · Grace Baptist, 10:30 a.m. · St. Agnes Catholic, Sat 5 p.m., Sun 8:30 a.m. ·
        Cowboy Church at the sale barn, Thursday 7 p.m.</p>`],
    ],
  },
  yesterday: {
    date: 'Wednesday · 75¢ · Vol. 118, No. 210',
    pages: [
      ['Local', `
        <h3>Hornets edge Tigers 21-17 on late field goal</h3>
        <p class="by">By Jim Tackett, sports editor</p>
        <p>Junior kicker Luis Ortega's 31-yarder with 40 seconds left lifted the Harlow Springs Hornets past the visiting
        Tigers on Friday, the Hornets' first win over their neighbors in four seasons. Coach Bev Lindqvist called it “a
        team win, and a kicker win.”</p>
        <h3>Water tower repainting set for spring</h3>
        <p>The aldermen voted to repaint the water tower in the spring rather than this fall, after the low bid came in
        $18,000 over the estimate. The new paint will keep the town's name, “in letters you can read from the interstate,”
        the mayor said.</p>
        <h3>Library extends hours on Tuesdays</h3>
        <p>The Harlow Springs branch library will stay open until 8 p.m. on Tuesdays starting next week, with a new
        evening story time and the return of the seed library.</p>`],
      ['Weather', `
        <h3>Hot and dry, storms by Thursday night</h3>
        <table class="wx"><tr><th>Today</th><th>Thursday</th><th>Friday</th></tr>
        <tr><td>☀ 84° / 63°</td><td>⛅ 82° / 58°</td><td>🌦 71° / 52°</td></tr>
        <tr><td>Sunny and humid</td><td>Storms late</td><td>Showers early</td></tr></table>
        <h4>Almanac</h4>
        <p>Yesterday's high 85°, low 61°. Sunrise 6:57 a.m. Sunset 7:23 p.m. Burn ban remains in effect county-wide.</p>`],
      ['Classifieds', `
        <div class="ads">
        <p><b>FOR SALE.</b> Above-ground pool, 18 ft, you take down. Free.</p>
        <p><b>HELP WANTED.</b> CDL-A drivers, regional, home weekends. Call the dispatch office on the outer road.</p>
        <p><b>FOUND.</b> Set of keys with a bass-fishing keychain, at the fairgrounds gate. Claim at the Courier-Ledger.</p>
        <p><b>FOR SALE.</b> Upright piano, needs tuning, you move. $100.</p>
        <p><b>CHURCH SUPPER.</b> Sunday 5 p.m., First Methodist. Ham and beans, cornbread, pie. Donations welcome.</p>
        </div>`],
      ['Back page', `
        <h3>Tonight on TV</h3>
        <p><b>6:00</b> KY3 News · <b>7:00</b> Hornets Football Replay (Channel 12) · <b>8:00</b> Antiques on the Road ·
        <b>10:00</b> KY3 News at Ten</p>
        <h4>Gas prices</h4>
        <p>Route 66 Travel Stop $2.89 · Casey's on Route V $2.94 · Harlow Springs Co-op diesel $3.41.</p>
        <h4>Harlow Springs Church Directory</h4>
        <p>First Methodist, 9 and 11 a.m. · Grace Baptist, 10:30 a.m. · St. Agnes Catholic, Sat 5 p.m., Sun 8:30 a.m.</p>`],
    ],
  },
};

// Each page's text as blocks: headlines, bylines, paragraphs (a bold lead-in kept), weather table rows.
const strip = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const blocks = html => [...html.matchAll(/<(h3|h4|p|tr)([^>]*)>([\s\S]*?)<\/\1>/g)].map(([, tag, attr, inner]) => tag === 'tr'
  ? { tag, cells: [...inner.matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/g)].map(m => strip(m[1])) }
  : { tag: /by/.test(attr) ? 'by' : tag, lead: tag === 'p' ? strip(inner.match(/^\s*<b>([\s\S]*?)<\/b>/)?.[1] ?? '') : '', text: strip(inner) });
const edition = key => EDITIONS[key] ?? EDITIONS.today;
export const newspaperPages = key => edition(key).pages.length;
/** Page `i`'s words, plain (for checks and screen readers). */
export function newspaperText(key = 'today', i = 0) {
  const e = edition(key), [section, body] = e.pages[i];
  return [i === 0 ? MASTHEAD : '', e.date, section, strip(body.replace(/<\/(h3|h4|p|td|th)>/g, ' '))].filter(Boolean).join(' · ');
}
/**
 * Draw page `i` of edition `key` on a canvas context (w × h, a broadsheet page is 0.3 × 0.5 m): masthead on the front,
 * a folio line on the others, then the stories in two columns, set big enough to read in your hands on a laptop screen.
 */
export function drawNewspaperPage(g, w, h, key = 'today', i = 0) {
  const e = edition(key), [section, body] = e.pages[i], m = 46, gap = 34, col = (w - 2 * m - gap) / 2, ink = '#1c1b19';
  g.fillStyle = '#efe9da'; g.fillRect(0, 0, w, h);
  g.fillStyle = ink; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
  let top;
  if (i === 0) {
    g.font = '700 74px "Old English Text MT", UnifrakturMaguntia, Georgia, serif';
    g.fillText(MASTHEAD.replace(/^The /, ''), w / 2, m + 70, w - 2 * m);
    g.fillRect(m, m + 96, w - 2 * m, 4); g.fillRect(m, m + 104, w - 2 * m, 1.5);
    g.font = '22px system-ui, sans-serif'; g.fillText(`${e.date.toUpperCase()} · ${section.toUpperCase()}`, w / 2, m + 134);
    g.fillRect(m, m + 148, w - 2 * m, 1.5); top = m + 196;
  } else {
    g.font = '22px system-ui, sans-serif'; g.textAlign = i % 2 ? 'left' : 'right';
    g.fillText(`${i + 1}  ·  ${MASTHEAD.toUpperCase()}  ·  ${section.toUpperCase()}`, i % 2 ? m : w - m, m + 24);
    g.fillRect(m, m + 38, w - 2 * m, 2); top = m + 86;
  }
  g.textAlign = 'left';
  let c = 0, y = top;
  const x = () => m + c * (col + gap), room = lh => { if (y + lh <= h - m) return true; if (c === 1) return false; c = 1; y = top; return true; };
  const say = (text, font, lh, lead = '') => {
    const words = text.split(' '); let line = '', first = true;
    const out = l => { if (!room(lh)) return false; let px = x(); if (first && lead) { g.font = '700 ' + font; g.fillText(lead, px, y); px += g.measureText(lead + ' ').width; } g.font = font; g.fillText(first && lead ? l.slice(lead.length).trimStart() : l, px, y); y += lh; first = false; return true; };
    g.font = font;
    for (const word of words) { const next = line ? line + ' ' + word : word; if (g.measureText(next).width > col && line) { if (!out(line)) return; line = word; } else line = next; }
    if (line) out(line);
  };
  const rows = [];
  for (const b of blocks(body)) {
    if (b.tag === 'tr') { rows.push(b.cells); continue; }
    if (rows.length) { rows[0].forEach((day, k) => say(`${day}: ${rows.slice(1).map(r => r[k]).join(', ')}.`, '30px Georgia, serif', 38, `${day}:`)); rows.length = 0; y += 14; }
    if (b.tag === 'h3') { y += 12; say(b.text, '700 42px Georgia, serif', 48); y += 6; }
    else if (b.tag === 'h4') { y += 10; say(b.text.toUpperCase(), '700 28px Georgia, serif', 36); }
    else if (b.tag === 'by') say(b.text, 'italic 24px Georgia, serif', 32);
    else { say(b.text, '29px Georgia, serif', 37, b.lead); y += 10; }
  }
  if (rows.length) rows[0].forEach((day, k) => say(`${day}: ${rows.slice(1).map(r => r[k]).join(', ')}.`, '30px Georgia, serif', 38, `${day}:`));
  g.fillRect(m + col + gap / 2 - 0.75, top - 10, 1.5, h - m - top);   // column rule
}
