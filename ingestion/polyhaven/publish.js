// Publish only this reviewed batch. Refuse to overwrite unrelated existing IDs.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { me } from '../../me.js';
import { REPO, preparePart, commitParts } from '../../part.js';
const root = new URL('./', import.meta.url);
const parts = JSON.parse(await readFile(new URL('parts.json', root)));
const provenance = JSON.parse(await readFile(new URL('provenance.json', root)));
const { fangorn, network } = me();
if (network === 'sandbox') throw Error('Set NETWORK explicitly for public publication');
const publisher = fangorn.getAddress();
const records = [];
for (const part of parts) {
  const bytes = await readFile(new URL(`../../parts/${part.file}`, root));
  const expected = provenance.find(p => p.id === part.id)?.output.sha256;
  if (!expected || createHash('sha256').update(bytes).digest('hex') !== expected) throw Error(`${part.id}: provenance mismatch`);
  const { file, ...labels } = part;
  const record = await preparePart(fangorn, { ...labels, bytes });
  const now = await fangorn.engine.readRecord(publisher, REPO, part.id);
  if (now) {
    if (now.payload.src !== record.payload.src || now.payload.license !== 'CC0-1.0') throw Error(`${part.id}: existing content differs; refusing overwrite`);
    console.log(`${part.id}: already published`);
  } else records.push(record);
}
let txHash;
if (records.length) ({ txHash } = await commitParts(fangorn, records));
const receipts = [];
for (const part of parts) {
  const record = await fangorn.engine.readRecord(publisher, REPO, part.id);
  if (!record) throw Error(`${part.id}: missing on read-back`);
  receipts.push({ id:part.id, network, publisher, repo:REPO, cid:record.cid, src:record.payload.src, ...(txHash && { txHash }), verifiedAt:new Date().toISOString() });
}
await writeFile(new URL('receipts.json', root), JSON.stringify(receipts,null,2)+'\n');
console.log(JSON.stringify({ published:records.map(r=>r.id), txHash, verified:receipts.length }));
process.exit(0);
