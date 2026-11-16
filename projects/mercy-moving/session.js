import {BUILDINGS,doorFor,contains} from './building-layout.js';
// Original CC0 host-authoritative simulation. Deck-local metres; claims last for
// this session only. A claim is a home marker, never a supernatural protection.
export function createSession(world){
 const buildings=world.buildings??BUILDINGS,doors=buildings.map(doorFor);
 const claimable=buildings.filter(b=>b.claimable),knownClaimIds=new Set(claimable.map(b=>b.id));
 const state={time:0,players:{solo:{x:-1,z:30,yaw:0,moving:false}},doors:doors.map(d=>d.open),claims:Object.fromEntries(claimable.map(b=>[b.id,null]))};
 const hasPlayer=id=>Object.hasOwn(state.players,id);
 const doorBlocked=(d,x,z)=>Math.abs(x-d.x)<d.w/2+.33&&Math.abs(z-d.z)<d.d/2+.33;
 function validateSnapshot(s){
  if(!s||!Number.isFinite(s.time)||s.time<0||!s.players||typeof s.players!=='object'||Array.isArray(s.players)||Object.keys(s.players).length>4||!Array.isArray(s.doors)||s.doors.length!==doors.length||!Array.from(s.doors).every(v=>typeof v==='boolean'))return false;
  if(!Object.entries(s.players).every(([id,p])=>validId(id)&&p&&[p.x,p.z,p.yaw].every(Number.isFinite)&&Math.abs(p.x)<=47&&Math.abs(p.z)<=77&&typeof p.moving==='boolean'))return false;
  if(!s.claims||typeof s.claims!=='object'||Array.isArray(s.claims)||Object.keys(s.claims).length!==claimable.length)return false;
  const owners=new Set();
  for(const [id,owner]of Object.entries(s.claims)){
   if(!knownClaimIds.has(id)||(owner!==null&&(!Object.hasOwn(s.players,owner)||typeof owner!=='string'||owners.has(owner))))return false;
   if(owner!==null)owners.add(owner);
  }
  return true;
 }
 function validId(id){return typeof id==='string'&&id.length>0&&id.length<=128&&!['__proto__','constructor','prototype'].includes(id);}
 function blocked(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>47||Math.abs(z)>77)return true;
  const radius=.33;
  if(world.colliders.some(b=>Math.abs(x-b.x)<b.w/2+radius&&Math.abs(z-b.z)<b.d/2+radius))return true;
  return doors.some((d,i)=>!state.doors[i]&&doorBlocked(d,x,z));
 }
 function releaseClaims(id){for(const key of Object.keys(state.claims))if(state.claims[key]===id)state.claims[key]=null;}
 function nearestDoor(p){let best=-1,distance=2.4;doors.forEach((d,i)=>{const n=Math.hypot(p.x-d.x,p.z-d.z);if(n<distance){distance=n;best=i;}});return best;}
 function command(id,c){
  if(!hasPlayer(id)||!c||typeof c!=='object')return{ok:false,text:'You are not connected to this town.'};
  const p=state.players[id];
  if(c.type==='door'){
   const index=c.buildingId!==undefined?doors.findIndex(d=>d.buildingId===c.buildingId):nearestDoor(p),d=doors[index];
   if(!d||Math.hypot(p.x-d.x,p.z-d.z)>=2.4)return{ok:false,text:'Get closer to the door.'};
   if(state.doors[index]&&Object.values(state.players).some(player=>doorBlocked(d,player.x,player.z)))return{ok:false,text:'Someone is in the doorway. Step clear before closing it.'};
   state.doors[index]=!state.doors[index];return{ok:true,text:`${d.name}: door ${state.doors[index]?'opened':'closed'}.`};
  }
  if(c.type==='claim'){
   const b=buildings.find(b=>b.id===c.buildingId);
   if(!b?.claimable||!contains(b,p,.6))return{ok:false,text:'Step inside a home before claiming it.'};
   const owner=state.claims[b.id];
   if(owner===id){state.claims[b.id]=null;return{ok:true,text:`You release ${b.name}. It is available again.`};}
   if(owner!==null)return{ok:false,text:'Another visitor has made this their home. You can still look around.'};
   const previous=claimable.find(b=>state.claims[b.id]===id);
   if(previous)return{ok:false,text:`You already claimed ${previous.name}. Release it there before choosing another home.`};
   state.claims[b.id]=id;return{ok:true,text:`${b.name} is your home for this visit.`};
  }
  return{ok:false,text:'Unknown town action.'};
 }
 return{state,validateSnapshot,nearestDoor,command,blocked,snapshot:()=>structuredClone(state),
  load(s){if(!validateSnapshot(s))throw Error('Invalid town snapshot');state.time=s.time;state.players=structuredClone(s.players);state.doors=[...s.doors];state.claims={...s.claims};},
  addPlayer(id){if(validId(id)&&!hasPlayer(id)&&Object.keys(state.players).length<4)state.players[id]={x:1,z:30,yaw:0,moving:false};},
  removePlayer(id){if(hasPlayer(id)){releaseClaims(id);delete state.players[id];}},
  renamePlayer(from,to){if(!hasPlayer(from)||!validId(to)||hasPlayer(to))return false;state.players[to]=state.players[from];delete state.players[from];for(const key of Object.keys(state.claims))if(state.claims[key]===from)state.claims[key]=to;return true;},
  continueSolo(id){const localId=hasPlayer(id)?id:hasPlayer('solo')?'solo':null;const p=state.players[localId]??Object.values(state.players)[0]??{x:-1,z:30,yaw:0};for(const key of Object.keys(state.claims))state.claims[key]=localId!==null&&state.claims[key]===localId?'solo':null;state.players={solo:{...p,moving:false}};},
  update(dt,inputs={}){
   dt=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;state.time+=dt;
   for(const [id,p]of Object.entries(state.players)){
    const i=inputs[id]??{};let x=Number.isFinite(i.x)?i.x:0,z=Number.isFinite(i.z)?i.z:0;const n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}
    const speed=2.5,ox=p.x,oz=p.z;
    if(!blocked(p.x+x*speed*dt,p.z))p.x+=x*speed*dt;if(!blocked(p.x,p.z+z*speed*dt))p.z+=z*speed*dt;
    p.moving=Math.hypot(p.x-ox,p.z-oz)>.0001;if(p.moving)p.yaw=Math.atan2(x,z);
   }
  }
 };
}
