import {readFile} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
const directory=process.argv[2];if(!directory)throw new Error('Usage: node benchmarks/verify.mjs FIXTURE');
const dir=resolve(directory), manifest=JSON.parse(await readFile(join(dir,'manifest.json')));
const materialization=JSON.parse(await readFile(join(dir,'materialization.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
let checked=0;
for(const file of [...manifest.files,...materialization.sources.filter(s=>s.status==='ok')]){
 const path=resolve(dir,file.path);
 if(!path.startsWith(dir+sep))throw new Error('Unsafe fixture path');
 const bytes=await readFile(path);
 if(bytes.length!==file.bytes||hash(bytes)!==file.sha256)throw new Error(`Integrity mismatch: ${file.path}`);
 checked++;
}
const view=JSON.parse(await readFile(join(dir,'view.json')));
if(view.root!==manifest.root||view.records.length!==manifest.records)throw new Error('View and manifest disagree');
const saved=new Set(materialization.sources.filter(s=>s.status==='ok').map(s=>s.src));
const missing=manifest.sources.filter(s=>s.src&&!saved.has(s.src));
console.log(JSON.stringify({status:missing.length?'partial-fixture':'complete-fixture',checkedFiles:checked,records:manifest.records,missingSources:missing.length,independentCidVerification:false}));
