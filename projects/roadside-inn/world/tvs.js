// SPDX-License-Identifier: CC0-1.0
// TVs with channels (they answer to a remote in your hand), plus the vending and coffee interactions.
// Part of buildWorld (../world.js): it gets the building's shared helpers, materials and earlier zones' results in ctx
// and adds what later code needs back onto it.
import * as T from 'three';
import * as F from '../fixtures.js';

export function buildTvs(ctx) {
  const {
    lib, game, interact, updaters, add, loose, lobbyTV, loungeTV, gymTV,
  } = ctx;
  // ---------- TVs with channels ----------
  function tvSet(screen, where, { interactive = true, channel = 0, on = !interactive } = {}) {
    const tex = F.canvasTexture(512, 288, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); });
    screen.material = new T.MeshBasicMaterial({ map: tex, color: '#000000', reflectivity: 0 });   // main.js gives every indoor material the room's envMap; a basic material multiplies by it (combine), which blacked out every screen
    const st = { on, channel, last: 0 };
    // Shared by every set: remixes add channels with game.tvChannels.push((g, w, h, t) => …).
    const channels = game.tvChannels ??= [weather, news, info, ballgame];
    if (on) screen.material.color.set('#ffffff');
    // The set has no buttons you'd find: it answers to its remote, in your hand, from across the room.
    // Aim at the screen itself: an anchor in front of it (as it had) sat behind you once you walked up to the set.
    screen.updateWorldMatrix(true, false);
    const remote = () => /remote/.test(game.holding?.() ?? ''), here = screen.getWorldPosition(new T.Vector3());
    if (interactive) interact.push({ pos: here, r: 6, when: p => remote() || p.pos.distanceTo(here) < 2.6,
      label: () => !remote() ? 'TV' : st.on ? (st.channel === channels.length - 1 ? 'Turn TV off' : 'Change channel') : 'Turn TV on',
      use: () => {
        if (!remote()) return game.say('No buttons you can find on the set. The remote is around here somewhere.');
        game.sound.click();
        if (!st.on) { st.on = true; st.channel = 0; } else if (st.channel < channels.length - 1) st.channel++; else st.on = false;
        screen.material.color.set(st.on ? '#ffffff' : '#000000');
        draw(performance.now() / 1000);
      } });
    function draw(t) { if (st.on) tex.redraw((g, w, h) => channels[st.channel](g, w, h, t)); }
    updaters.push((dt, t, player) => { if (st.on && t - st.last > 0.12 && player.pos.distanceTo(screen.getWorldPosition(new T.Vector3())) < 14) { st.last = t; draw(t); } });
    game.tvs.push({ st, where, screen, draw });
    return st;
  }
  function header(g, w, label, color) { g.fillStyle = color; g.fillRect(0, 0, w, 40); g.fillStyle = '#fff'; g.font = 'bold 24px system-ui'; g.textAlign = 'left'; g.fillText(label, 14, 28); }
  function ticker(g, w, h, t, text) { g.fillStyle = '#0b2545'; g.fillRect(0, h - 34, w, 34); g.fillStyle = '#fff'; g.font = '20px system-ui'; g.textAlign = 'left'; const x = w - ((t * 70) % (w + g.measureText(text).width)); g.fillText(text, x, h - 11); }
  function weather(g, w, h, t) {
    g.fillStyle = '#16324f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4c7a3d'; g.fillRect(20, 50, 300, 190);
    for (let i = 0; i < 6; i++) { g.strokeStyle = '#2d4a24'; g.beginPath(); g.moveTo(20, 60 + i * 30); g.lineTo(320, 70 + i * 28); g.stroke(); }
    const cx = 60 + (t * 8) % 300;
    for (const [dx, dy, r, c] of [[0, 0, 55, 'rgba(60,200,60,.65)'], [10, 5, 35, 'rgba(240,220,40,.75)'], [16, 8, 18, 'rgba(230,50,40,.85)']]) { g.fillStyle = c; g.beginPath(); g.arc(cx + dx, 140 + dy, r, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; g.font = 'bold 16px system-ui'; g.fillText('Springfield', 230, 120); g.fillText('Rolla', 120, 200); g.fillText('Joplin', 30, 100);
    g.font = 'bold 22px system-ui'; g.fillText('TONIGHT', 345, 80); g.font = 'bold 54px system-ui'; g.fillText('58°', 350, 140); g.font = '18px system-ui'; g.fillText('Scattered storms', 345, 170); g.fillText('after midnight', 345, 192);
    header(g, w, 'OZARKS FIRST WEATHER · LIVE DOPPLER', '#c1121f');
    ticker(g, w, h, t, 'Severe thunderstorm watch for Phelps, Pulaski and Laclede counties until 2 AM  ·  Wind gusts to 50 mph possible  ·  ');
  }
  function news(g, w, h, t) {
    g.fillStyle = '#20262e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9ad8e'; g.beginPath(); g.arc(256, 150, 46, 0, 7); g.fill();
    g.fillStyle = '#2b2d42'; g.fillRect(180, 195, 152, 70); g.fillStyle = '#3d5a80'; g.fillRect(0, 205, w, 4);
    g.fillStyle = '#d90429'; g.fillRect(0, 210, 210, 34); g.fillStyle = '#fff'; g.font = 'bold 20px system-ui'; g.textAlign = 'left'; g.fillText('BREAKING', 14, 234);
    g.fillStyle = '#edf2f4'; g.fillRect(210, 210, 302, 34); g.fillStyle = '#111'; g.fillText('I-44 resurfacing near exit 127', 222, 234);
    header(g, w, 'KY3 NEWS AT TEN', '#0b2545');
    ticker(g, w, h, t, 'County fair opens Saturday  ·  Gas $2.89 at the Route 66 Travel Stop  ·  High school football: Hornets 21, Tigers 17  ·  ');
  }
  function info(g, w, h, t) {
    g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h);
    header(g, w, 'HEARTLAND INN EXPRESS · GUEST INFORMATION', '#1d4f8f');
    g.fillStyle = '#1d3557'; g.font = 'bold 26px Georgia'; g.textAlign = 'left';
    const slides = [['Hot breakfast', '6:00 – 9:30 AM in the lobby', 'Waffles · eggs · biscuits & gravy'], ['Pool & hot tub', 'Open 6 AM – 10 PM', 'Towels by the pool door'], ['Check-out', '11:00 AM', 'Express check-out at the front desk'], ['Need anything?', 'Dial 0 for the front desk', 'We are here 24 hours']];
    const s = slides[Math.floor(t / 5) % slides.length];
    g.fillText(s[0], 30, 110); g.font = '22px system-ui'; g.fillText(s[1], 30, 150); g.fillText(s[2], 30, 185);
    g.fillStyle = '#1d4f8f'; g.fillRect(30, 220, (t % 5) / 5 * 450, 4);
  }
  function ballgame(g, w, h, t) {
    g.fillStyle = '#2f6b2f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b5835a'; g.beginPath(); g.moveTo(256, 90); g.lineTo(380, 190); g.lineTo(256, 280); g.lineTo(132, 190); g.fill();
    g.fillStyle = '#fff'; for (const [x, y] of [[256, 92], [378, 190], [134, 190], [256, 272]]) g.fillRect(x - 5, y - 5, 10, 10);
    const bx = 256 + Math.sin(t * 2) * 60, by = 200 - Math.abs(Math.sin(t * 2)) * 60; g.beginPath(); g.arc(bx, by, 4, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(10, 50, 170, 60); g.fillStyle = '#fff'; g.font = 'bold 18px system-ui'; g.textAlign = 'left';
    g.fillText('STL   3', 20, 74); g.fillText('KC    2', 20, 98); g.fillText('▲ 7th', 110, 86);
    header(g, w, 'BALLY SPORTS MIDWEST', '#11212d');
  }
  tvSet(loungeTV.screen, 'lounge', { on: true, channel: 1 });
  loose(add(lib.model('hotel-tv-remote', { origin: true }), 4.05, 0.421, 6.92, 0.7), { rest: true, shape: 'box' });   // on the round coffee table   // lobby TVs run the news at low volume
  tvSet(lobbyTV.screen, 'lobby', { interactive: false, channel: 0 });
  tvSet(gymTV.screen, 'gym', { interactive: false, channel: 3 });

  // ---------- vending and coffee ----------
  interact.push({ pos: new T.Vector3(5.4, 1.2, -6.6), r: 1.6, label: () => 'Vending machine', use: () => game.vend() });
  interact.push({ pos: new T.Vector3(5.5, 1.2, -5.4), r: 1.4, label: () => 'Cold drinks', use: () => game.vend('drinks') });
  interact.push({ pos: new T.Vector3(2.7, 1.1, -8.0), r: 1.6, label: () => game.has('coffee') ? 'Grab a cookie' : 'Pour a coffee',
    use: () => { if (!game.has('coffee')) { game.sound.pour(); game.give('coffee'); game.say('Decaf, regular, or “bold.” You pick bold. It is lukewarm.'); } else if (!game.has('cookie')) { game.give('cookie'); game.say('A plastic-wrapped chocolate chip cookie. Complimentary.'); } else game.say('Let’s not get greedy.'); } });
  Object.assign(ctx, { tvSet });
}
