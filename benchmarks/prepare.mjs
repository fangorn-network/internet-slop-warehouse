import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
const [fixturePath,outputPath]=process.argv.slice(2);
if(!fixturePath||!outputPath)throw new Error('Usage: node benchmarks/prepare.mjs FIXTURE NEW_OUTPUT_DIRECTORY');
const fixture=resolve(fixturePath), out=resolve(outputPath);
const manifest=JSON.parse(await readFile(join(fixture,'manifest.json')));
await mkdir(dirname(out),{recursive:true});
await mkdir(out); // never overwrite an existing run
const brief='Build a browser-playable scavenger scene with keyboard and touch controls. The player collects three distinct objects and opens an exit after collecting all three. Include visible progress, a restart action, and sound that starts only after a user gesture. Serve the result as static files. Provide dependency and license information. Creative style is unrestricted. Deliver a working artifact, launch instructions, and a list of reused sources and modifications.';
const checks=['desktop-load','mobile-load','keyboard-movement','touch-movement','all-objects-reachable','collect-once','exit-locked-before-three','exit-opens-after-three','restart-restores-state','audio-user-gesture','dependencies-reachable','license-and-source-information'];
for(const condition of ['A','B','C']){
  const dir=join(out,condition); await mkdir(dir);await mkdir(join(dir,'output'));
  await writeFile(join(dir,'TASK.md'),`# Scavenger v1\n\n${brief}\n\nTime limit: 60 minutes. Model/spending configuration must be set consistently before starting. Keep implementation and an append-only run log in output/. Update the existing result.json at this condition's root, preserving its common schema; do not replace it with a different output/result.json schema. Record actual metrics or null. Do not publish publicly. Report all reused sources.\n`);
  const access=condition==='A'?'Use normal tools, public sources, packages, and assets. Do not access the Internet Slop Warehouse or its mirrors.':condition==='B'?'Use normal tools plus the supplied frozen warehouse catalog/files with ordinary file and text search.':'Use normal tools plus a search/get interface backed exclusively by the frozen warehouse fixture. The frozen search service is not configured yet: do not start a scored run.';
  await writeFile(join(dir,'ACCESS.md'),access+'\n');
  if(condition==='B')await cp(fixture,join(dir,'inventory'),{recursive:true});
  await writeFile(join(dir,'result.json'),JSON.stringify({runId:null,taskId:'scavenger-v1',condition,status:'not-started',fixtureRoot:manifest.root,budget:{elapsedMinutes:60,modelUsd:null,tokenCap:null},metrics:{setupSeconds:null,elapsedSeconds:null,humanInterventionMinutes:null,inputTokens:null,cachedInputTokens:null,outputTokens:null,modelCostUsd:null,externalToolCostUsd:null,searchCalls:null,retrievalCalls:null,retrievedBytes:null,repairAttempts:null},reuse:[],acceptance:Object.fromEntries(checks.map(k=>[k,{status:'not-evaluated',evidence:null}])),deviations:[]},null,2)+'\n');
}
await writeFile(join(out,'STATUS.md'),`# Preparation only\n\nFixture root: ${manifest.root}\n\nNo scored runs. Source materialization may be partial; inspect materialization.json. C needs a frozen search/get service. Model, cost caps, independent builder execution, and browser evaluator must be configured before scoring. Workspace separation is organizational, not a filesystem security boundary. Use isolated execution roots for fresh builders; do not expose this parent directory or the warehouse checkout to A.\n`);
console.log(out);
