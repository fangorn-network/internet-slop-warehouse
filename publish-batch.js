#!/usr/bin/env node
// Publish a bounded, reviewable subset of parts; --local renders without network access.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { exportsOf, preparePart, commitParts, REPO, STORED } from './part.js';
const [manifest, ...args] = process.argv.slice(2);
const networkAt = args.indexOf('--network');
if (networkAt >= 0) {
    const network = args[networkAt + 1];
    if (!['baseSepolia', 'arbitrumSepolia'].includes(network)) throw Error('--network: baseSepolia or arbitrumSepolia');
    process.env.NETWORK = network;
    args.splice(networkAt, 2);
}
const [flag, output] = args;
if (!manifest || args.length > 2 || flag && flag !== '--local' || flag === '--local' && !output) throw Error('Usage: node publish-batch.js manifest.json [--network baseSepolia|arbitrumSepolia] [--local directory]');
const base = new URL('./parts/',import.meta.url).pathname;
const selected=JSON.parse(readFileSync(resolve(manifest)));
const all=JSON.parse(readFileSync(join(base,'parts.json')));
const ids=new Set();
for(const p of selected){
    if(ids.has(p.id))throw Error(`Duplicate ID: ${p.id}`);ids.add(p.id);
    const raw=readFileSync(join(base,p.file),'utf8');
    if(p.type==='logic'&&!(p.exports??[]).every(e=>exportsOf(raw).includes(e.name)))throw Error(`Invalid exports: ${p.id}`);
    for(const id of p.uses??[])if(!all.some(x=>x.id===id))throw Error(`Unknown dependency: ${id}`);
}
if(flag==='--local'){
    const needed=new Map();
    function visit(p){if(needed.has(p.id))return;needed.set(p.id,p);for(const id of p.uses??[])visit(selected.find(x=>x.id===id)??all.find(x=>x.id===id));}
    selected.forEach(visit);
    const urls=Object.fromEntries([...needed.values()].map(p=>[p.id,`parts/${p.file}${p.type==='asset'||p.type==='game'?'':'.json'}`]));
    for(const p of needed.values()){
        const path=join(output,'parts',p.file+(p.type==='asset'||p.type==='game'?'':'.json'));mkdirSync(dirname(path),{recursive:true});
        const raw=readFileSync(join(base,p.file));
        writeFileSync(path,p.type==='asset'?raw:p.type!=='game'?JSON.stringify({[STORED[p.type]]:raw.toString()}):raw.toString().replace('{/*PARTS*/}',JSON.stringify(urls)));
        if(p.type==='game')writeFileSync(join(output,p.file),raw.toString().replace('{/*PARTS*/}',JSON.stringify(urls)));
    }
    console.log(`Prepared ${needed.size} parts in ${resolve(output)}`);process.exit(0);
}
const { me }=await import('./me.js');
const { fangorn,network }=me();
if(network==='sandbox')throw Error('Set NETWORK explicitly for public publishing');
const address=fangorn.getAddress(),gateway=fangorn.getConfig().ipfsGateway;
const receipts=[];let todo=[...selected];const done=new Set();
while(todo.length){
    const ready=todo.filter(p=>(p.uses??[]).every(id=>!ids.has(id)||done.has(id)));
    if(!ready.length)throw Error('Cyclic dependencies');
    const records=[];
    for(const p of ready){
        const {file,...labels}=p;let content=readFileSync(join(base,file),'utf8');
        const urls={};for(const id of p.uses??[]){const r=await fangorn.engine.readRecord(address,REPO,id);if(!r)throw Error(`Unpublished dependency ${id}`);urls[id]=`${gateway}/ipfs/${r.payload.src}`;}
        if(p.type==='game')content=content.replace('{/*PARTS*/}',JSON.stringify(urls));
        const record=await preparePart(fangorn,{...labels,uses:(p.uses??[]).map(id=>({id})),...(p.type==='asset'?{bytes:readFileSync(join(base,file))}:{content})});
        const now=await fangorn.engine.readRecord(address,REPO,p.id);
        // measured alone doesn't republish: it's derived from the file, and a new file changes src anyway
        const same=(a,b)=>{const{measured:_,...x}=a,{measured:__,...y}=b;return JSON.stringify(x)===JSON.stringify(y);};
        if(now&&same(now.payload,record.payload))console.log(`${p.id}: unchanged`);
        else records.push(record);
    }
    let txHash;if(records.length)({txHash}=await commitParts(fangorn,records));
    for(const p of ready){const r=await fangorn.engine.readRecord(address,REPO,p.id);receipts.push({id:p.id,publisher:address,network,cid:r.cid,src:r.payload.src,url:`${gateway}/ipfs/${r.payload.src}`,...(txHash&&{txHash})});done.add(p.id);}
    console.log(JSON.stringify({verified:ready.map(p=>p.id),txHash}));
    writeFileSync(resolve(manifest).replace(/\.json$/,'.receipts.json'),JSON.stringify(receipts,null,2)+'\n');
    todo=todo.filter(p=>!done.has(p.id));
}
process.exit(0);
