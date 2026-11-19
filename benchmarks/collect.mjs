// Preserve original run evidence; do not infer missing measurements or acceptance.
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const [runRoot,evidenceRoot]=process.argv.slice(2);
if(!runRoot||!evidenceRoot)throw new Error('Usage: node benchmarks/collect.mjs RUN_ROOT NEW_EVIDENCE_ROOT');
const source=resolve(runRoot), dest=resolve(evidenceRoot);
await mkdir(dest); // refuse to overwrite previous evidence
const hashes=[];
async function copyTree(from,to,relative){
 await mkdir(to,{recursive:true});
 for(const entry of await readdir(from,{withFileTypes:true})){
   if(['node_modules','.git','.npm-cache','chrome-profile'].includes(entry.name)||entry.isSymbolicLink())continue;
   const input=join(from,entry.name), output=join(to,entry.name), path=join(relative,entry.name);
   if(entry.isDirectory())await copyTree(input,output,path);
   else if(entry.isFile()){
     await copyFile(input,output);const bytes=await readFile(output);
     hashes.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
   }
 }
}
const results=[];
for(const condition of ['A','B','C']){
 const dir=join(source,condition), out=join(dest,condition);await mkdir(out);
 const result=JSON.parse(await readFile(join(dir,'result.json')));
 if(result.status==='not-started'||result.status==='running')throw new Error(`${condition} not finalized`);
 for(const name of ['TASK.md','ACCESS.md','RUN-LOG.md','result.json','adapter-metrics.jsonl']){
   try{await copyFile(join(dir,name),join(out,name));const bytes=await readFile(join(out,name));hashes.push({path:`${condition}/${name}`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
   catch(e){if(e.code!=='ENOENT')throw e;}
 }
 await copyTree(join(dir,'output'),join(out,'output'),`${condition}/output`);
 const metrics=result.metrics??{},counts={};let unstructuredAcceptanceFields=0;
 for(const check of Object.values(result.acceptance??{})){
   if(check&&typeof check==='object'&&typeof check.status==='string')counts[check.status]=(counts[check.status]??0)+1;
   else unstructuredAcceptanceFields++;
 }
 let adapter=null;
 try{
   const events=(await readFile(join(dir,'adapter-metrics.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
   const requests=events.filter(e=>e.event==='request');
   adapter={setupProcesses:events.filter(e=>e.event==='setup').length,searchCalls:requests.filter(e=>e.tool==='search').length,getCalls:requests.filter(e=>e.tool==='get').length,responseBytes:requests.reduce((n,e)=>n+(e.responseBytes??0),0),failedRequests:requests.filter(e=>e.failed).length};
 }catch(e){if(e.code!=='ENOENT')throw e;}
 results.push({condition:result.condition,status:result.status,metrics,acceptanceStatusCounts:counts,unstructuredAcceptanceFields,adapter,deviations:result.deviations??[]});
}
await writeFile(join(dest,'summary.json'),JSON.stringify({collectedAt:new Date().toISOString(),scope:'Instrumentation pilot; one run per condition; inspect C label for search mode; acceptance is builder-reported pending independent review; unavailable cost measurements stay null',results,files:hashes},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
