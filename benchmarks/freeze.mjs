import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const [input, destination] = process.argv.slice(2);
if (!input || !destination) throw new Error('Usage: node benchmarks/freeze.mjs VIEW.json NEW_FIXTURE_DIRECTORY');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = await readFile(input), view = JSON.parse(bytes);
if (!view.root || !view.stitch || !Array.isArray(view.records)) throw new Error('Expected a warehouse view with root, stitch and records');
const keys = view.records.map(r => `${r.publisher}/${r.repo}/${r.id}`);
if (new Set(keys).size !== keys.length) throw new Error('Duplicate record identity');
const out = resolve(destination);
await mkdir(dirname(out), {recursive:true});
await mkdir(out); // refuse to overwrite or merge with any existing fixture
await mkdir(join(out, 'docs'));
await writeFile(join(out, 'view.json'), bytes);
const docs = ['README.md', 'part.js', 'node_modules/@fangorn-network/westmarch/src/gemma.js', 'node_modules/@fangorn-network/westmarch/src/embed.js'];
const files = [{path: 'view.json', sha256: hash(bytes), bytes: bytes.length}];
for (const [i, path] of docs.entries()) {
  const target = `docs/${i}-${path.split('/').at(-1)}`;
  await copyFile(path, join(out, target));
  const b = await readFile(join(out, target));
  files.push({path: target, origin: path, sha256: hash(b), bytes: b.length});
}
const source = r => ({publisher:r.publisher, repo:r.repo, id:r.id, recordCid:r.cid, type:r.type, src:r.payload?.src, url:r.payload?.src ? `${view.gateway.replace(/\/$/,'')}/ipfs/${r.payload.src}` : null});
const manifest = {
  format: 'warehouse-benchmark-fixture-v1', capturedAt: new Date().toISOString(),
  root: view.root, stitch: view.stitch, gateway: view.gateway, records: view.records.length,
  counts: Object.fromEntries([...new Set(view.records.map(r=>r.type))].map(t=>[t,view.records.filter(r=>r.type===t).length])),
  checkoutCommit: process.env.BENCH_CHECKOUT_COMMIT ?? null,
  node:process.version, files, sources:view.records.map(source),
  integrity: {view:'SHA-256 of captured bytes; registry/stitch not independently verified', source:'Version-pinned references; materialize before scored runs', complete:false},
};
await writeFile(join(out,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({fixture:out,root:view.root,records:view.records.length,viewBytes:(await stat(join(out,'view.json'))).size,complete:false}));
