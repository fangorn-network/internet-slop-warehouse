// Space diff: what the spec says is in a space vs what the scene has there.
//   node projects/roadside-inn/check.mjs lint          (writes the scene's props and zones)
//   node projects/roadside-inn/pipeline/diff.mjs <space> [lint.json]
// Matches each spec row by its model id if it names one, else by kind (kinds.js KIND_OF). Prints three lists:
// short (in the scene, fewer than the spec wants), no model (nothing in assets/ is this: a brief for Victor) and
// extra (in the scene, not in the spec: maybe wrong for this space).
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { KIND_OF } from '../kinds.js';

const inn = resolve(import.meta.dirname, '..'), space = process.argv[2];
if (!space) { console.error('usage: diff.mjs <space> [lint.json]'); process.exit(2); }
const spec = readFileSync(resolve(inn, 'specs', `${space}.md`), 'utf8');
const lint = JSON.parse(readFileSync(process.argv[3] ?? resolve(inn, '../../artifacts/roadside-inn/checkpoint/check-lint.json'), 'utf8')).lint;

const boxLine = /zone box[^:]*:\s*([-\d.\s]+)/.exec(spec);
const box = boxLine?.[1].trim().split(/\s+/).map(Number);
if (!box || box.length !== 6) { console.error('spec needs "zone box (...): x0 x1 y0 y1 z0 z1"'); process.exit(2); }
const inBox = ([x, y, z]) => x >= box[0] && x <= box[1] && y >= box[2] - 0.05 && y <= box[3] && z >= box[4] && z <= box[5];
const here = lint.props.filter(p => inBox(p.at));

// table rows under ## Inventory and ## Small things
const rows = [];
let cols = null;
for (const line of spec.split('\n')) {
  if (!line.startsWith('|')) { cols = null; continue; }
  const cells = line.split('|').slice(1, -1).map(c => c.trim());
  if (!cols) { cols = cells.map(c => c.toLowerCase()); continue; }
  if (cells.every(c => /^-+$/.test(c))) continue;
  const r = Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
  if (r.item) rows.push(r);
}

const used = new Set(), short = [], noModel = [];
const models = new Set(Object.keys(KIND_OF)), kinds = new Set(Object.values(KIND_OF));
for (const r of rows) {
  const want = parseInt(r.count) || 1, model = r.model?.replace(/`/g, ''), kind = r.kind?.replace(/`/g, '');
  const match = here.filter(p => !used.has(p) && (model ? p.name === model : kind && p.kind === kind));
  match.slice(0, want).forEach(p => used.add(p));
  const has = Math.min(want, match.length);
  const exists = model ? existsSync(resolve(inn, 'assets', `${model}.glb`)) : kinds.has(kind) || [...models].some(m => KIND_OF[m] === kind);
  if (!exists) noModel.push(`${r.item} (kind ${kind || '?'}${model ? `, model ${model} missing` : ''}) ×${want}`);
  else if (has < want) short.push(`${r.item}: ${has}/${want} (${model || kind})`);
}
const extra = {}; for (const p of here) if (!used.has(p)) extra[p.name] = (extra[p.name] ?? 0) + 1;

console.log(`${space}: ${rows.length} spec rows, ${here.length} models in the zone box: ${[...new Set(here.map(p => p.name))].join(', ')}`);
console.log(`\nSHORT (place more; models exist):\n${short.map(s => '  ' + s).join('\n') || '  -'}`);
console.log(`\nUNMATCHED (no model/kind mapping: part of a bigger model, built in code, or truly missing → brief):\n${noModel.map(s => '  ' + s).join('\n') || '  -'}`);
console.log(`\nEXTRA (in the scene, not in the spec; mostly structure and unmatched kinds):\n${Object.entries(extra).map(([k, n]) => `  ${k} ×${n}`).join('\n') || '  -'}`);
