import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';

const [directory,mode='text',offline] = process.argv.slice(2);
if (!directory || !['text','all'].includes(mode)) throw new Error('Usage: node benchmarks/materialize.mjs FIXTURE [text|all]');
const dir=resolve(directory), manifest=JSON.parse(await readFile(join(dir,'manifest.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(join(dir,'sources'),{recursive:true});
let prior=[];
try {prior=JSON.parse(await readFile(join(dir,'materialization.json'))).sources;} catch(e) {if(e.code!=='ENOENT')throw e;}
const cached=new Map(prior.map(s=>[s.src,s]));
const sources=[...new Map(manifest.sources.filter(s=>s.src && (mode==='all'||s.type!=='asset')).map(s=>[s.src,s])).values()];
let sessionBytes=0;
const results=[];
for(let start=0;start<sources.length;start+=4){
  const batch=await Promise.all(sources.slice(start,start+4).map(async s=>{
    if(!/^[a-zA-Z0-9]+$/.test(s.src))throw new Error('Unsafe CID path');
    const path=`sources/${s.src}`, old=cached.get(s.src);
    if(old?.status==='ok'){
      const bytes=await readFile(join(dir,path));
      if(hash(bytes)!==old.sha256)throw new Error(`Cached bytes changed: ${s.src}`);
      return old;
    }
    try{
      if(offline==='--offline'){
        const bytes=await readFile(join(dir,path));
        if(s.type!=='asset')JSON.parse(bytes.toString('utf8'));
        return {src:s.src,path,status:'ok',bytes:bytes.length,sha256:hash(bytes),retrievedAt:null,importedAt:new Date().toISOString()};
      }
      if(sessionBytes>=128*1024*1024)throw new Error('128 MiB session budget reached');
      const response=await fetch(s.url,{signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const chunks=[];let size=0;
      for await(const chunk of response.body){size+=chunk.length;if(size>16*1024*1024)throw new Error('16 MiB source limit');chunks.push(chunk);}
      const bytes=Buffer.concat(chunks); sessionBytes+=bytes.length;
      await writeFile(join(dir,path),bytes);
      return {src:s.src,path,status:'ok',bytes:bytes.length,sha256:hash(bytes),retrievedAt:new Date().toISOString()};
    }catch(e){return {src:s.src,status:'failed',error:e.message};}
  }));
  results.push(...batch);
  console.log(JSON.stringify({processed:results.length,total:sources.length,failed:results.filter(r=>r.status!=='ok').length,sessionBytes}));
}
const merged=new Map(prior.map(s=>[s.src,s]));for(const r of results)merged.set(r.src,r);
const all=[...merged.values()], needed=[...new Set(manifest.sources.filter(s=>s.src).map(s=>s.src))];
const complete=needed.every(cid=>merged.get(cid)?.status==='ok');
await writeFile(join(dir,'materialization.json'),JSON.stringify({mode,complete,checkedAt:new Date().toISOString(),integrity:'SHA-256 pins gateway response bytes; UnixFS/CID DAG verification not performed',sources:all},null,2)+'\n');
if(results.some(s=>s.status!=='ok'))process.exitCode=1;
