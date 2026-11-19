const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=__dirname,read=p=>fs.readFileSync(path.join(dir,p),'utf8'),write=(p,s)=>fs.writeFileSync(path.join(dir,p),s);
const v1=read('v1/core.cjs');
const replacement=`  function advance(s,input,elapsedSeconds){
    if(s.completed)return {distance:0,clamped:false};
    input=input||{};const dx=Number.isFinite(input.x)?input.x:0,dy=Number.isFinite(input.y)?input.y:0;
    const requested=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0),dt=Math.min(.25,requested);
    const n=Math.hypot(dx,dy),before={...s.player};
    if(n){const steps=Math.ceil(dt/.025)||1,step=dt/steps;for(let i=0;i<steps&&!s.completed;i++){
      const nx=s.player.x+dx/n*speed*step,ny=s.player.y+dy/n*speed*step;
      if(!blocked(nx,s.player.y))s.player.x=nx;if(!blocked(s.player.x,ny))s.player.y=ny;checkFinish(s);
    }}
    return {distance:Math.hypot(s.player.x-before.x,s.player.y-before.y),clamped:requested>.25};
  }
`;
const start=v1.indexOf('  function move('),end=v1.indexOf('  function activateSignal(');
if(start<0||end<start)throw new Error('Movement boundary not found');
const v2=(v1.slice(0,start)+replacement+v1.slice(end)).replace("version:'1.0.0'","version:'2.0.0'").replace('validate,move,activateSignal','validate,advance,activateSignal');
write('v2-update/core.cjs',v2);
write('v1/index.html',read('v1/template.html').replace('__STYLE__',read('v1/style.css')).replace('__CORE__',v1).replace('__APP__',read('v1/app.js')));
const R=require('./v1/core.cjs');
function route(s,target){
 const initial=[Math.floor(s.player.x),Math.floor(s.player.y)],goal=[Math.floor(target.x),Math.floor(target.y)];
 const queue=[initial],parent=new Map([[initial.join(','),null]]);let end;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(p[0]===goal[0]&&p[1]===goal[1]){end=p;break;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dy],key=n.join(',');if(!parent.has(key)&&!R.blocked(n[0]+.5,n[1]+.5)){parent.set(key,p);queue.push(n);}}}
 if(!end)throw new Error('No route');const nodes=[];while(end){nodes.push(end);end=parent.get(end.join(','));}nodes.reverse();
 for(const node of nodes){const t={x:node[0]+.5,y:node[1]+.5};for(let guard=0;Math.hypot(s.player.x-t.x,s.player.y-t.y)>.001;guard++){
   if(s.completed)return;if(guard>100)throw new Error('Route stalled');const dx=t.x-s.player.x,dy=t.y-s.player.y;R.move(s,dx,dy,Math.min(.04,Math.hypot(dx,dy)/R.speed));
 }}
}
const initial=R.fresh(),partial=R.fresh(),complete=R.fresh();route(partial,R.signals[0]);R.activateSignal(partial,R.signals[0].id);
for(const t of R.signals){route(complete,t);R.activateSignal(complete,t.id);}route(complete,R.extraction);
if(!complete.completed)throw new Error('Completion fixture did not complete');
const cases={start:initial,partial,completed:complete};
for(const [id,state]of Object.entries(cases))write('saves/'+id+'.txt',R.save(state)+'\n');
write('saves/expectations.json',JSON.stringify({saveSchema:1,cases:Object.fromEntries(Object.entries(cases).map(([id,state])=>[id,R.load(R.save(state))]))},null,2)+'\n');
const files=[];
function walk(folder){for(const e of fs.readdirSync(path.join(dir,folder),{withFileTypes:true})){const p=path.join(folder,e.name);if(e.isDirectory())walk(p);else if(!['MANIFEST.json','TEST-RESULTS.txt'].includes(e.name)){const b=fs.readFileSync(path.join(dir,p));files.push({path:p,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});}}}
walk('');
write('MANIFEST.json',JSON.stringify({format:'rescue-relay-neutral-fixture-v1',license:'CC0-1.0',source:'Original benchmark fixture; no prior condition or warehouse source',versions:{starter:'1.0.0',update:'2.0.0',save:'RR1/schema1'},browserBaselineVerified:false,scoredRunReady:false,files:files.sort((a,b)=>a.path.localeCompare(b.path))},null,2)+'\n');
console.log('Built v1 standalone HTML, v2 update, three v1 saves and checksum manifest.');
