// Read-only stdio interface. Lexical mode is a diagnostic, not production semantic search.
import {readFile,appendFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {localEmbedder,textOf} from '@fangorn-network/westmarch/embed';

const [fixturePath,mode='lexical',logPath]=process.argv.slice(2);
if(!fixturePath||!['lexical','semantic'].includes(mode))throw new Error('Usage: node benchmarks/frozen-mcp.mjs FIXTURE [lexical|semantic] [METRICS.jsonl]');
const fixture=resolve(fixturePath), bytes=await readFile(join(fixture,'view.json'));
const manifest=JSON.parse(await readFile(join(fixture,'manifest.json')));
const hash=b=>createHash('sha256').update(b).digest('hex');
if(hash(bytes)!==manifest.files.find(f=>f.path==='view.json').sha256)throw new Error('Fixture hash mismatch');
const view=JSON.parse(bytes), cache=JSON.parse(await readFile(join(fixture,'materialization.json')));
const bySource=new Map(cache.sources.filter(s=>s.status==='ok').map(s=>[s.src,s]));
const log=async event=>{if(logPath)await appendFile(resolve(logPath),JSON.stringify({at:new Date().toISOString(),...event})+'\n');};
const start=performance.now();
const texts=view.records.map(r=>textOf(r.payload));
if(mode==='semantic' && process.env.BENCH_MODEL_ROOT){
 const {env}=await import('@huggingface/transformers');
 env.localModelPath=resolve(process.env.BENCH_MODEL_ROOT)+'/';
 env.allowRemoteModels=false;
}
const embedder=mode==='semantic'?localEmbedder():null;
let vectors=null;
if(embedder){
 const key={viewSha256:hash(bytes),embedder:embedder.id,textExtractorSha256:hash(textOf.toString()),modelRevision:process.env.BENCH_MODEL_REVISION??null};
 const path=process.env.BENCH_VECTOR_CACHE&&resolve(process.env.BENCH_VECTOR_CACHE);
 vectors=[];
 if(path){
   try{
     const saved=JSON.parse(await readFile(path));
     if(JSON.stringify(saved.key)!==JSON.stringify(key))throw new Error('Vector cache identity mismatch');
     if(!Array.isArray(saved.vectors)||saved.vectors.length>texts.length||saved.vectors.some(v=>!Array.isArray(v)||v.length!==embedder.id.dim||v.some(x=>!Number.isFinite(x))))throw new Error('Invalid vector cache');
     vectors=saved.vectors;
   }catch(e){if(e.code!=='ENOENT')throw e;}
 }
 for(let i=vectors.length;i<texts.length;i+=20){
   vectors.push(...await embedder.embed(texts.slice(i,i+20)));
   if(path){
     await mkdir(dirname(path),{recursive:true});
     await writeFile(path+'.tmp',JSON.stringify({key,vectors})+'\n');
     await rename(path+'.tmp',path);
   }
   console.error(JSON.stringify({event:'embedding-progress',embedded:vectors.length,total:texts.length}));
 }
}
await log({event:'setup',mode,fixtureRoot:view.root,records:view.records.length,elapsedMs:performance.now()-start,embedder:embedder?.id??null});
const tokens=s=>String(s).toLowerCase().match(/[a-z0-9]+/g)??[];
const tools=[
 {name:'search',description:`Search the frozen warehouse (${mode} ranking).`,inputSchema:{type:'object',required:['query'],properties:{query:{type:'string'},type:{type:'string'},k:{type:'integer',minimum:1,maximum:30}}}},
 {name:'get',description:'Retrieve an exact record from the frozen warehouse and its saved source when available. Asset URLs remain version-pinned.',inputSchema:{type:'object',required:['publisher','id'],properties:{publisher:{type:'string'},id:{type:'string'}}}},
 {name:'repos',description:'List publishers and record counts in this frozen fixture.',inputSchema:{type:'object',properties:{}}}
];
async function call(name,args){
 if(name==='repos')return [...new Set(view.records.map(r=>r.publisher))].map(publisher=>({publisher,repo:'internet-slop-warehouse',count:view.records.filter(r=>r.publisher===publisher).length}));
 if(name==='search'){
   if(typeof args.query!=='string'||!args.query.trim())throw new Error('query required');
   const query=tokens(args.query), q=embedder?await embedder.query(args.query):null;
   const scored=view.records.map((r,i)=>{
     const words=new Set(tokens(texts[i]));
     const score=q?vectors[i].reduce((sum,v,j)=>sum+v*q[j],0):query.reduce((sum,t)=>sum+(words.has(t)?1:0),0);
     return {...r,score};
   }).filter(r=>(!args.type||r.type===args.type)&&(q||r.score>0));
   const k=Number.isInteger(args.k)?Math.max(1,Math.min(30,args.k)):10;
   return scored.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,k);
 }
 if(name==='get'){
   const record=view.records.find(r=>r.publisher.toLowerCase()===String(args.publisher).toLowerCase()&&r.id===args.id);
   if(!record)throw new Error('Record not in frozen fixture');
   const saved=bySource.get(record.payload?.src);
   const url=record.payload?.src?`${view.gateway}/ipfs/${record.payload.src}`:null;
   if(record.type==='asset')return {...record,url,sourceMaterialized:!!saved};
   if(!saved)throw new Error('Source not materialized; fixture incomplete');
   const bytes=await readFile(join(fixture,saved.path));
   if(hash(bytes)!==saved.sha256)throw new Error('Source hash mismatch');
   return {...record,file:JSON.parse(bytes)};
 }
 throw new Error('Unknown tool');
}
const lines=createInterface({input:process.stdin});
for await(const line of lines){
 let msg;try{msg=JSON.parse(line);}catch{process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON'}})+'\n');continue;}
 if(msg.id===undefined)continue;
 const t=performance.now();let result,error;
 try{
   if(msg.method==='initialize')result={protocolVersion:msg.params?.protocolVersion??'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'frozen-warehouse-benchmark',version:'0.1.0'},instructions:`Read-only frozen fixture ${view.root}. No publication. Ranking: ${mode}.`};
   else if(msg.method==='ping')result={};
   else if(msg.method==='tools/list')result={tools};
   else if(msg.method==='tools/call'){
     try{const value=await call(msg.params.name,msg.params.arguments??{});result={content:[{type:'text',text:JSON.stringify(value)}]};}
     catch(e){result={isError:true,content:[{type:'text',text:e.message}]};}
   }else error={code:-32601,message:'Unknown method'};
 }catch(e){error={code:-32603,message:e.message};}
 const answer={jsonrpc:'2.0',id:msg.id,...(error?{error}:{result})};
 await log({event:'request',method:msg.method,tool:msg.params?.name,arguments:msg.params?.arguments,elapsedMs:performance.now()-t,responseBytes:Buffer.byteLength(JSON.stringify(answer)),failed:!!error||!!result?.isError});
 process.stdout.write(JSON.stringify(answer)+'\n');
}
