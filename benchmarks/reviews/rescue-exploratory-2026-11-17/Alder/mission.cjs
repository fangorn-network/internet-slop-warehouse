/* Rescue Relay expedition extension 1.0.0. CC0-1.0. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/relay-core-2.0.0.cjs'));else root.Mission=factory(root.RescueRelay);})(globalThis,function(R){
'use strict';
const ids=R.signals.map(t=>t.id),gate={x:7,y:9,w:4,h:.6},surveyorStart={x:17.5,y:1.5};
const components=[{id:'north',name:'Copper coil',x:2.5,y:6.5},{id:'east',name:'Prism lens',x:10.5,y:2.5},{id:'south',name:'Power cell',x:17.5,y:8.5}];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),copy=x=>JSON.parse(JSON.stringify(x));
function fresh(){return {schema:2,player:copy(R.start),signals:[],collected:[],surveyor:{...surveyorStart,mode:'stranded',rescued:false},completed:false,legacyCompleted:false};}
function gateClosed(s){return !s.signals.includes('north');}
function blocked(s,x,y){return R.blocked(x,y)||(gateClosed(s)&&x+R.radius>gate.x&&x-R.radius<gate.x+gate.w&&y+R.radius>gate.y&&y-R.radius<gate.y+gate.h);}
function line(s,a,b){const n=Math.ceil(dist(a,b)/.08);for(let i=1;i<=n;i++){const t=i/n;if(blocked(s,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;}
// Exact v2 movement interface. Empty dependency objectives let this mission own its later escort finish.
function walk(s,input,dt){const temp={player:{...s.player},signals:[],completed:false};const result=R.advance(temp,input,dt);if(!blocked(s,temp.player.x,temp.player.y)||blocked(s,s.player.x,s.player.y)){s.player=temp.player;}else{ // slide along the new obstruction; dependency already handles original walls
 const horizontal={player:{...s.player},signals:[],completed:false};R.advance(horizontal,{x:input.x,y:0},dt*Math.abs(input.x)/Math.max(1,Math.hypot(input.x,input.y)));if(!blocked(s,horizontal.player.x,horizontal.player.y))s.player=horizontal.player;
 const vertical={player:{...s.player},signals:[],completed:false};R.advance(vertical,{x:0,y:input.y},dt*Math.abs(input.y)/Math.max(1,Math.hypot(input.x,input.y)));if(!blocked(s,vertical.player.x,vertical.player.y))s.player=vertical.player;
 }return result;}
function route(s,from,to){
 if(line(s,from,to))return [copy(to)];
 const nodes=[];for(let y=1.5;y<=12.5;y+=.5)for(let x=1.5;x<=18.5;x+=.5)if(!blocked(s,x,y))nodes.push({x,y});
 const closest=p=>nodes.map((n,i)=>({i,d:dist(p,n)})).sort((a,b)=>a.d-b.d).find(v=>line(s,p,nodes[v.i]))?.i;
 const start=closest(from),end=closest(to);if(start===undefined||end===undefined)return [];
 const map=new Map(nodes.map((n,i)=>[n.x+','+n.y,i])),queue=[start],prev=new Map([[start,null]]);
 for(let q=0;q<queue.length&&!prev.has(end);q++){const i=queue[q],n=nodes[i];for(const [dx,dy] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const j=map.get((n.x+dx)+','+(n.y+dy));if(j!==undefined&&!prev.has(j)&&line(s,n,nodes[j])){prev.set(j,i);queue.push(j);}}}
 if(!prev.has(end))return [];let path=[copy(to)];for(let i=end;i!==null;i=prev.get(i))path.push(nodes[i]);path.reverse();for(let i=path.length-1;i>=0;i--)if(line(s,from,path[i]))return path.slice(i);return []; 
}
function advance(s,input,elapsed){
 if(s.completed)return {distance:0,clamped:false};const before=copy(s.player),requested=Math.max(0,Number.isFinite(elapsed)?elapsed:0),dt=Math.min(.25,requested),steps=Math.ceil(dt/.025)||1;
 input={x:Number.isFinite(input?.x)?input.x:0,y:Number.isFinite(input?.y)?input.y:0};
 for(let i=0;i<steps;i++)walk(s,input,dt/steps);
 const npc=s.surveyor;if(npc.mode==='following'&&dist(npc,s.player)>.72){const path=route(s,npc,s.player);let budget=2.9*dt;for(const p of path){const d=dist(npc,p);if(d<.001)continue;const move=Math.min(budget,d);const next={x:npc.x+(p.x-npc.x)*move/d,y:npc.y+(p.y-npc.y)*move/d};if(line(s,npc,next)){npc.x=next.x;npc.y=next.y;}budget-=move;if(budget<=0||dist(npc,s.player)<=.72)break;}}
 if(npc.rescued&&dist(s.player,R.extraction)<.7&&dist(npc,R.extraction)<1.2){s.completed=true;npc.mode='extracted';}
 return {distance:dist(before,s.player),clamped:requested>.25};
}
function interact(s){
 if(s.completed)return 'Rescue complete. Both of you are home.';
 const item=components.find(c=>!s.collected.includes(c.id)&&dist(s.player,c)<.9);
 if(item){s.collected.push(item.id);return 'Recovered '+item.name+'. Bring it to the '+item.id+' tower.';}
 const t=R.signals.find(t=>dist(s.player,t)<.9);
 if(t){if(s.signals.includes(t.id))return 'The '+t.id+' tower is already repaired.';const c=components.find(c=>c.id===t.id);if(!s.collected.includes(t.id))return 'Missing '+c.name+'. Find its diamond marker on the map.';s.signals.push(t.id);return 'Repaired '+t.id+' tower. '+(t.id==='north'?'Flood barrier drained; central passage open. ':'')+(s.signals.length===3?'Surveyor located in the northeast! Approach and press E.':(3-s.signals.length)+' towers remain.');}
 if(dist(s.player,s.surveyor)<1.1){if(s.signals.length<3)return 'Surveyor cannot leave until all three towers restore the rescue signal.';if(!s.surveyor.rescued){s.surveyor.rescued=true;s.surveyor.mode='following';return 'Surveyor: I have your signal. Lead me to southwest extraction. F tells me to wait or follow.';}return toggle(s);}
 if(dist(s.player,R.extraction)<1)return s.signals.length<3?'Extraction awaits three restored towers and the surveyor.':s.surveyor.rescued?'Bring the surveyor onto this pad with you.':'Signal restored. Locate the surveyor in the northeast.';
 return 'Approach a diamond to recover a component, a tower to repair, or the surveyor to rescue.';
}
function toggle(s){if(s.completed)return 'Rescue complete.';if(!s.surveyor.rescued)return 'First restore all towers, then approach the surveyor and press E.';s.surveyor.mode=s.surveyor.mode==='following'?'waiting':'following';return s.surveyor.mode==='following'?'Surveyor following. Lead them to southwest extraction.':'Surveyor waiting here. Press F / Follow when ready; the radio works across the map.';}
function validate(s){
 if(!s||s.schema!==2||!s.player||R.blocked(s.player.x,s.player.y)||!Array.isArray(s.signals)||!Array.isArray(s.collected)||typeof s.completed!=='boolean'||typeof s.legacyCompleted!=='boolean')return false;
 for(const a of [s.signals,s.collected])if(a.some(id=>!ids.includes(id))||new Set(a).size!==a.length)return false;
 if(s.signals.some(id=>!s.collected.includes(id)))return false;
 const n=s.surveyor;if(!n||R.blocked(n.x,n.y)||typeof n.rescued!=='boolean'||!['stranded','waiting','following','extracted'].includes(n.mode))return false;
 if(!n.rescued&&(n.mode!=='stranded'||dist(n,surveyorStart)>.00001))return false;
 if(n.rescued&&(s.signals.length!==3||n.mode==='stranded'))return false;
 if(s.completed!==(n.mode==='extracted'))return false;
 if(s.completed&&(dist(s.player,R.extraction)>=.7||dist(n,R.extraction)>=1.2))return false;
 if(s.legacyCompleted&&s.signals.length!==3)return false;
 return true;
}
function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
const encode=s=>typeof Buffer!=='undefined'?Buffer.from(s,'utf8').toString('base64url'):btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=s=>typeof Buffer!=='undefined'?Buffer.from(s,'base64url').toString('utf8'):atob(s.replace(/-/g,'+').replace(/_/g,'/'));
function save(s){if(!validate(s))throw new Error('Invalid mission state');const clean=copy(s);clean.signals.sort();clean.collected.sort();const payload=JSON.stringify(clean);return 'RR2.'+encode(payload)+'.'+checksum(payload);}
function load(text){
 if(typeof text!=='string'||text.length>8192)throw new Error('Invalid save envelope');text=text.trim();
 if(text.startsWith('RR1.')){const old=R.load(text),s=fresh();s.player=copy(old.player);s.signals=[...old.signals];s.collected=[...old.signals];s.legacyCompleted=old.completed;return {state:s,message:'V1 expedition preserved: '+s.signals.length+' towers repaired; their components stay consumed. '+(old.completed?'Your original expedition remains recorded as complete. ':'')+'New objective: restore remaining towers, then escort the surveyor. A flooded central shortcut opens with north tower; if loaded inside it, walk out.'};}
 if(!/^RR2\.[A-Za-z0-9_-]+\.[a-f0-9]{8}$/.test(text))throw new Error('Invalid save envelope');const p=text.split('.'),payload=decode(p[1]);if(checksum(payload)!==p[2])throw new Error('Save checksum mismatch');const s=JSON.parse(payload);if(!validate(s))throw new Error('Invalid mission state');return {state:copy(s),message:'Expedition restored. Inventory, repairs and surveyor position preserved.'};
}
return {version:'1.0.0',dependencyVersion:R.version,R,components,gate,surveyorStart,fresh,blocked,line,route,advance,interact,toggle,validate,save,load,gateClosed,dist};
});
