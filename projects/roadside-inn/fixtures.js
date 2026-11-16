// SPDX-License-Identifier: CC0-1.0
// Original procedural hotel fixtures: meters, Y up, origin at floor center, front faces +Z unless noted.
import * as T from 'three';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial({ color, roughness: 0.7, ...opts }));
  return mats.get(key);
}
export const glow = (color, intensity = 1.5) => mat('#000000', { emissive: color, emissiveIntensity: intensity, roughness: 1 });
export const glass = () => mat('#a8c0c8', { roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false });

export function box(w, h, d, material, x = 0, y = 0, z = 0, parent) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  parent?.add(m);
  return m;
}
export function cyl(rt, rb, h, material, x = 0, y = 0, z = 0, parent, seg = 20) {
  const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  parent?.add(m);
  return m;
}

// Canvas texture for signs, screens and labels. draw(ctx, w, h) paints it.
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  t.redraw = (fn = draw) => { fn(c.getContext('2d'), w, h); t.needsUpdate = true; };
  t.redraw();
  return t;
}
export function sign(text, { w = 1, h = 0.3, bg = '#1d2a3a', fg = '#ffffff', font = 'bold 64px system-ui, sans-serif', emissive = 0 } = {}) {
  const px = 512, py = Math.round(px * h / w);
  const t = canvasTexture(px, py, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const lines = String(text).split('\n');
    let size = parseInt(font.match(/(\d+)px/)[1]);
    const fit = () => { g.font = font.replace(/\d+px/, size + 'px'); return Math.max(...lines.map(l => g.measureText(l).width)) <= W * 0.9 && size * lines.length * 1.15 <= H * 0.92; };
    while (size > 8 && !fit()) size -= 2;
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((line, i) => g.fillText(line, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.15));
  });
  // polygonOffset keeps flat signs from z-fighting with the wall they're mounted on.
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: t, roughness: 0.5, emissive: emissive ? '#ffffff' : '#000000', emissiveMap: emissive ? t : null, emissiveIntensity: emissive, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.name = `Sign: ${String(text).split('\n')[0]}`;
  // A physical plaque sits behind the printed face; the face is never coplanar with its backing.
  const backing = new T.Mesh(new T.BoxGeometry(w + 0.012, h + 0.012, 0.012), mat('#353a40', { roughness: 0.65 }));
  backing.position.z = -0.009; m.add(backing);
  return m;
}

// Textured materials the world supplies (walnut veneer) for the remaining procedural pieces.
export const skin = {};

export function flatTV(width = 1.25) {
  const group = new T.Group(), h = width * 0.5625;
  box(width + 0.03, h + 0.03, 0.05, mat('#111111', { roughness: 0.3 }), 0, -h / 2 - 0.015, 0, group);
  const screen = new T.Mesh(new T.PlaneGeometry(width, h), new T.MeshStandardMaterial({ color: '#050607', roughness: 0.15, metalness: 0.2 }));
  screen.position.set(0, 0, 0.027);
  group.add(screen);
  return { group, screen };
}

// Window: frame, glass, sheer and two drapes. Width w, height h, sill at y=0. Returns {group, drapes}.
export function hotelWindow(w, h, { drapes = true, drapeColor = '#6f7d8c' } = {}) {
  const group = new T.Group(), frame = mat('#3b3f44', { metalness: 0.5, roughness: 0.4 });
  box(w, 0.05, 0.12, frame, 0, 0, 0, group);
  box(w, 0.05, 0.12, frame, 0, h - 0.05, 0, group);
  for (const x of [-w / 2 + 0.025, w / 2 - 0.025, 0]) box(0.05, h, 0.12, frame, x, 0, 0, group);
  const pane = new T.Mesh(new T.PlaneGeometry(w, h), glass());
  pane.position.y = h / 2;
  group.add(pane);
  const out = { group, drapes: [] };
  if (drapes) {
    for (const side of [-1, 1]) {
      const d = new T.Mesh(new T.PlaneGeometry(0.6, h + 0.5, 12, 1), mat(drapeColor, { roughness: 1, side: T.DoubleSide }));
      const p = d.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 30) * 0.035);
      d.geometry.computeVertexNormals();
      d.geometry.translate(-side * 0.3, 0, 0);       // pivot on the outer edge
      d.position.set(side * (w / 2 + 0.35), h / 2 + 0.1, 0.11);
      d.castShadow = true;
      group.add(d);
      out.drapes.push(d);
    }
    box(w + 1.4, 0.12, 0.2, mat('#e8e6e0'), 0, h + 0.33, 0.1, group);   // valance
  }
  return out;
}

// Elevator call/indicator panel on a wall (front +Z).
export function callPanel() {
  const g = new T.Group();
  box(0.12, 0.25, 0.02, mat('#c9ccd0', { metalness: 1, roughness: 0.2 }), 0, 1.0, 0, g);
  const up = cyl(0.022, 0.022, 0.015, glow('#ffffff', 0.1), 0, 1.12, 0.012, g, 16);
  up.rotation.x = Math.PI / 2;
  g.userData.button = up;
  return g;
}

export function poleSign(name) {
  const g = new T.Group();
  for (const x of [-1.2, 1.2]) box(0.5, 13, 0.5, mat('#2d3136', { metalness: 0.4 }), x, 0, 0, g);
  const face = sign(name, { w: 5.2, h: 3.0, bg: '#0f5aa8', fg: '#ffffff', font: 'bold 92px Georgia, serif', emissive: 1.4 });
  face.position.set(0, 14.4, 0.32);
  const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.32;
  box(5.4, 3.2, 0.6, mat('#1d2329'), 0, 12.8, 0, g);
  g.add(face, back);
  const vacancy = sign('VACANCY · FREE BREAKFAST · POOL', { w: 5.2, h: 0.7, bg: '#111111', fg: '#ffb347', font: 'bold 44px system-ui, sans-serif', emissive: 1.2 });
  vacancy.position.set(0, 11.6, 0.32);
  const vback = vacancy.clone(); vback.rotation.y = Math.PI; vback.position.z = -0.32;
  box(5.4, 0.8, 0.6, mat('#1d2329'), 0, 11.2, 0, g);
  g.add(vacancy, vback);
  return g;
}

// Hotel trash/recycling receptacle: wood-veneer cabinet with a satin steel top (indoor), or charcoal steel with a dome lid (outdoor).
export function trashReceptacle(outdoor = false) {
  const g = new T.Group();
  if (outdoor) {
    const steel = mat('#2f3236', { metalness: 0.6, roughness: 0.45 });
    cyl(0.3, 0.3, 0.85, steel, 0, 0, 0, g, 24);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; box(0.03, 0.75, 0.012, mat('#3b3f44', { metalness: 0.6 }), Math.cos(a) * 0.305, 0.05, Math.sin(a) * 0.305, g).rotation.y = -a; }
    const lid = new T.Mesh(new T.SphereGeometry(0.31, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel); lid.position.y = 0.85; lid.scale.y = 0.45; lid.castShadow = true; g.add(lid);
    box(0.22, 0.12, 0.05, mat('#111'), 0, 0.93, 0.27, g);
  } else {
    box(0.42, 0.78, 0.42, mat('#7a5a40', { roughness: 0.55 }), 0, 0, 0, g);
    box(0.44, 0.04, 0.44, mat('#c9ced2', { metalness: 0.9, roughness: 0.3 }), 0, 0.78, 0, g);
    box(0.26, 0.012, 0.12, mat('#111'), 0, 0.82, 0, g);
  }
  return g;
}
