/* Rescue Relay extension 2.1.0, CC0-1.0. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./dependency-2.0.0.cjs'),require('./navigation.cjs'));else root.Mission=factory(root.RescueRelay,root.GridNavigation);})(globalThis,function(R,N){
'use strict';
const version='2.1.0', gate={x:8,y:1,w:1,h:6}, surveyStart={x:17.5,y:2.5};
const components=[{id:'north',name:'Induction coil',x:3.5,y:6.5},{id:'east',name:'Prism lens',x:12.5,y:2.5},{id:'south',name:'Power cell',x:16.5,y:10.5}];
const near=(a,b,r=.9)=>Math.hypot(a.x-b.x,a.y-b.y)<=r,copy=x=>JSON.parse(JSON.stringify(x));
const inGate=p=>p.x+R.radius>gate.x&&p.x-R.radius<gate.x+gate.w&&p.y+R.radius>gate.y&&p.y-R.radius<gate.y+gate.h;
const blocked=(s,p)=>R.blocked(p.x,p.y)||(!s.signals.includes('north')&&!s.gateGrace&&inGate(p));
function fresh(){return {schema:2,player:copy(R.start),signals:[],collected:[],surveyor:{...surveyStart,mode:'stranded'},completed:false,legacyCompleted:false,gateGrace:false};}
function validate(s){
 if(!s||s.schema!==2||!s.player||!Array.isArray(s.signals)||!Array.isArray(s.collected)||typeof s.completed!=='boolean'||typeof s.legacyCompleted!=='boolean'||typeof s.gateGrace!=='boolean')return false;
 for(const a of [s.signals,s.collected])if(new Set(a).size!==a.length||a.some(id=>!components.some(c=>c.id===id)))return false;
 if(s.signals.some(id=>!s.collected.includes(id))||blocked(s,s.player))return false;
 if(s.gateGrace&&(s.signals.includes('north')||!inGate(s.player)))return false;
 const q=s.surveyor;if(!q||!['stranded','following','waiting','extracted'].includes(q.mode)||R.blocked(q.x,q.y)||(!s.signals.includes('north')&&inGate(q)))return false;
 if(q.mode!=='stranded'&&s.signals.length!==3)return false;
 if(q.mode==='stranded'&&(q.x!==surveyStart.x||q.y!==surveyStart.y))return false;
 if(s.completed!==(q.mode==='extracted')||s.completed&&(!near(s.player,R.extraction,.7)||!near(q,R.extraction,.8)))return false;
 if(s.legacyCompleted&&s.signals.length!==3)return false;
 return true;
}
function action(s){
 if(s.completed)return 'Surveyor safely extracted. Expedition complete.';
 const c=components.find(c=>near(s.player,c)&&!s.collected.includes(c.id));
 if(c){s.collected.push(c.id);return 'Recovered '+c.name+'. Bring it to the '+c.id+' tower.';}
 const t=R.signals.find(t=>near(s.player,t));
 if(t){if(s.signals.includes(t.id))return t.id+' tower is already repaired.';const part=components.find(c=>c.id===t.id);if(!s.collected.includes(t.id))return 'Needs '+part.name+'. Recover its marked crate first.';s.signals.push(t.id);if(t.id==='north')s.gateGrace=false;return 'Repaired '+t.id+' tower. '+(t.id==='north'?'Flood shutter raised: north passage open. ':'')+(s.signals.length===3?'Surveyor located northeast. Reach them and press E.':'Signal returning.');}
 if(near(s.player,s.surveyor,1.2)){if(s.signals.length<3)return 'Surveyor: Restore all three towers so we can coordinate extraction.';if(s.surveyor.mode==='stranded'){s.surveyor.mode='following';return 'Surveyor: I’m with you. Lead me to southwest extraction. F toggles wait/follow.';}return toggle(s);}
 if(near(s.player,R.extraction,1.2))return s.signals.length<3?'Extraction unavailable: restore all three towers.':s.surveyor.mode==='stranded'?'Locate the surveyor in the northeast first.':'Extraction ready. Bring the surveyor onto the pad.';
 return 'Approach a marked crate, tower, or surveyor and press E.';
}
function toggle(s){if(s.completed)return 'Rescue complete.';if(!['following','waiting'].includes(s.surveyor.mode))return 'Locate and contact the surveyor after all towers are repaired.';s.surveyor.mode=s.surveyor.mode==='following'?'waiting':'following';return s.surveyor.mode==='waiting'?'Surveyor waiting here. Press F to call them remotely.':'Surveyor following. Lead them to extraction.';}
const rows=Array.from({length:R.height},(_,y)=>Array.from({length:R.width},(_,x)=>R.blocked(x+.5,y+.5)?'#':'.').join(''));
const nav=N.attach(null,{rows,maxVisited:1000});
function path(s,a,b){for(let y=1;y<7;y++)nav.setBlocked(8,y,!s.signals.includes('north'));return nav.findPath({x:a.x,z:a.y},{x:b.x,z:b.y}).map(p=>({x:p.x,y:p.z}));}
function escort(s,dt){
 const q=s.surveyor;if(q.mode!=='following'||near(q,s.player,.65))return;
 // Keep an edge until its center is reached; never replan halfway across a corner.
 let route=routes.get(s);const goal=Math.floor(s.player.x)+','+Math.floor(s.player.y);
 if(!route||(!route.nodes.length)||route.goal!==goal&&near(q,route.nodes[0],.015)){route={goal,nodes:[{x:Math.floor(q.x)+.5,y:Math.floor(q.y)+.5},...path(s,q,s.player)]};routes.set(s,route);}
 if(!route.nodes.length)return;
 let budget=2.8*dt;
 while(budget>0&&route.nodes.length){const t=route.nodes[0],d=Math.hypot(t.x-q.x,t.y-q.y);if(d<.0001){route.nodes.shift();continue;}const step=Math.min(d,budget);const p={x:q.x+(t.x-q.x)/d*step,y:q.y+(t.y-q.y)/d*step};if(blocked({...s,gateGrace:false},p)){routes.delete(s);return;}q.x=p.x;q.y=p.y;budget-=step;if(step===d)route.nodes.shift();}
}
const routes=new WeakMap();
function advance(s,input,elapsed){if(s.completed)return {distance:0,clamped:false};const requested=Math.max(0,Number.isFinite(elapsed)?elapsed:0),dt=Math.min(.25,requested),steps=Math.ceil(dt/.025)||1,before={...s.player};
 for(let i=0;i<steps;i++){const old={...s.player},proxy={schema:1,player:s.player,signals:[],completed:false};R.advance(proxy,input,dt/steps);if(blocked(s,s.player)){const proposed={...s.player};s.player.x=old.x;if(blocked(s,s.player)){s.player.y=old.y;s.player.x=proposed.x;if(blocked(s,s.player))s.player.x=old.x;}}if(s.gateGrace&&!inGate(s.player))s.gateGrace=false;escort(s,dt/steps);
 if(s.signals.length===3&&s.surveyor.mode==='following'&&near(s.player,R.extraction,.7)&&near(s.surveyor,R.extraction,.8)){s.completed=true;s.surveyor.mode='extracted';}}
 return {distance:Math.hypot(s.player.x-before.x,s.player.y-before.y),clamped:requested>.25};}
function canonical(s){return {schema:2,player:{x:s.player.x,y:s.player.y},signals:[...s.signals].sort(),collected:[...s.collected].sort(),surveyor:{x:s.surveyor.x,y:s.surveyor.y,mode:s.surveyor.mode},completed:s.completed,legacyCompleted:s.legacyCompleted,gateGrace:s.gateGrace};}
function checksum(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');}
const encode=s=>typeof Buffer!=='undefined'?Buffer.from(s).toString('base64url'):btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=s=>typeof Buffer!=='undefined'?Buffer.from(s,'base64url').toString():atob(s.replace(/-/g,'+').replace(/_/g,'/'));
function save(s){if(!validate(s))throw Error('Invalid mission state');const p=JSON.stringify(canonical(s));return 'RR2.'+encode(p)+'.'+checksum(p);}
function load(text){if(typeof text!=='string')throw Error('Expected a save string');text=text.trim();if(text.startsWith('RR1.')){const old=R.load(text),s=fresh();s.player=old.player;s.signals=[...old.signals];s.collected=[...old.signals];s.legacyCompleted=old.completed;s.gateGrace=!s.signals.includes('north')&&inGate(s.player);return s;}
 if(text.length>8192||!/^RR2\.[A-Za-z0-9_-]+\.[a-f0-9]{8}$/.test(text))throw Error('Invalid save envelope');const parts=text.split('.'),p=decode(parts[1]);if(checksum(p)!==parts[2])throw Error('Checksum mismatch');const s=JSON.parse(p);if(!validate(s))throw Error('Inconsistent mission state');return canonical(s);}
return {version,R,gate,surveyStart,components,near,blocked,fresh,validate,action,toggle,advance,save,load,path};
});
