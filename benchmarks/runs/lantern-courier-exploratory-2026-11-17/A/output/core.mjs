// Original Lantern Courier simulation. Rendering and input are deliberately separate.
export const SUPPLIES = [
  {id:'medicine', name:'Medicine', symbol:'+', color:'#69cfff', destination:'Clinic', direction:'west', pickup:{x:-2.6,z:32}, target:{x:-26,z:-6}},
  {id:'power', name:'Power cells', symbol:'▣', color:'#ffb65c', destination:'Beacon', direction:'east', pickup:{x:0,z:32}, target:{x:26,z:-28}},
  {id:'seeds', name:'Seeds', symbol:'✦', color:'#a7e880', destination:'Glasshouse', direction:'north', pickup:{x:2.6,z:32}, target:{x:0,z:-48}}
];
export const ROADS = [
  {ax:0,az:32,bx:0,bz:25,w:4.6},
  {ax:-26,az:25,bx:26,bz:25,w:3.8},
  {ax:-26,az:25,bx:-26,bz:-48,w:3.8},
  {ax:26,az:25,bx:26,bz:-48,w:3.8},
  {ax:-26,az:-48,bx:26,bz:-48,w:3.8},
  {ax:0,az:25,bx:0,bz:-48,w:2.0}
];
export const PLAZAS = [{x:0,z:32,r:6}, ...SUPPLIES.map(s=>({...s.target,r:5.7}))];
export const CHECKPOINTS = [{x:0,z:32,name:'Supply dock'}, {x:-26,z:15,name:'West shelter'}, {x:26,z:15,name:'East shelter'}, {x:-26,z:-20,name:'West watch'}, {x:26,z:-39,name:'East watch'}, ...SUPPLIES.map(s=>({...s.target,name:s.destination}))];
export const SPEED=3.25, PROTECTION=3.0, COOLDOWN=11, PLAYER_RADIUS=.42;
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function segmentDistance(x,z,r){let dx=r.bx-r.ax,dz=r.bz-r.az;let t=Math.max(0,Math.min(1,((x-r.ax)*dx+(z-r.az)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-r.ax-dx*t,z-r.az-dz*t);}
export function isWalkable(x,z){return ROADS.some(r=>segmentDistance(x,z,r)<=r.w-PLAYER_RADIUS)||PLAZAS.some(p=>Math.hypot(x-p.x,z-p.z)<=p.r-PLAYER_RADIUS);}
export function hazardsAt(t){return [
  {x:Math.sin(t*.64)*4.6,z:-7+Math.sin(t*.31)*2.5,r:1.65,id:'bridge'},
  {x:-26+Math.sin(t*.53)*3.9,z:-32+Math.cos(t*.38)*4.5,r:1.65,id:'west'}
];}
export function createRun(){return {phase:'intro', player:{x:0,z:35},heading:0,carry:null,delivered:[],checkpoint:{...CHECKPOINTS[0]},time:0,recalls:0,cooldown:0,protection:0,grace:0,notice:'',noticeTime:0,lastCheckpoint:'Supply dock',distance:0};}
export function say(s,text,time=3){s.notice=text;s.noticeTime=time;}
export function start(s){if(s.phase==='intro')s.phase='playing';}
export function togglePause(s){if(s.phase==='playing')s.phase='paused';else if(s.phase==='paused')s.phase='playing';}
export function activateLantern(s){if(s.phase!=='playing')return false;if(s.cooldown>0){say(s,`Lantern recharging · ${Math.ceil(s.cooldown)}s`,1.5);return false;}s.protection=PROTECTION;s.cooldown=COOLDOWN;say(s,'Lantern shield · cross the storm now',2.4);return true;}
export function nearbyAction(s){if(s.carry){const item=SUPPLIES.find(i=>i.id===s.carry);if(dist(s.player,item.target)<3.6)return {kind:'deliver',item};return null;}const item=SUPPLIES.filter(i=>!s.delivered.includes(i.id)&&dist(s.player,i.pickup)<2.2).sort((a,b)=>dist(s.player,a.pickup)-dist(s.player,b.pickup))[0];return item?{kind:'pickup',item}:null;}
export function interact(s){if(s.phase!=='playing')return false;const action=nearbyAction(s);if(!action){if(s.carry){const wrong=SUPPLIES.find(i=>i.id!==s.carry&&dist(s.player,i.target)<4);say(s,wrong?`${wrong.destination} needs ${wrong.name.toLowerCase()}. Follow your parcel's color.`:'Follow the colored destination on your map.');}else say(s,'Collect a parcel from the supply dock.');return false;}if(action.kind==='pickup'){s.carry=action.item.id;say(s,`${action.item.name} aboard · ${action.item.destination} to the ${action.item.direction}`,3.5);}else{s.delivered.push(action.item.id);s.carry=null;s.checkpoint={...action.item.target,name:action.item.destination};s.lastCheckpoint=action.item.destination;say(s,`${action.item.destination} restored · delivery saved`,3.5);if(s.delivered.length===SUPPLIES.length)s.phase='finished';}return action.kind;}
export function tick(s,dt,input={x:0,z:0}){if(s.phase!=='playing')return {moved:0,recall:false,checkpoint:false};dt=Math.max(0,Math.min(.05,dt));s.time+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.protection=Math.max(0,s.protection-dt);s.grace=Math.max(0,s.grace-dt);s.noticeTime=Math.max(0,s.noticeTime-dt);
 const n=Math.hypot(input.x,input.z),factor=n>1?1/n:1;let dx=input.x*factor*SPEED*dt,dz=input.z*factor*SPEED*dt;const before={...s.player};
 // Slide along boundaries; small frame cap prevents tunneling across the canal.
 if(isWalkable(s.player.x+dx,s.player.z+dz)){s.player.x+=dx;s.player.z+=dz;}else{if(isWalkable(s.player.x+dx,s.player.z))s.player.x+=dx;if(isWalkable(s.player.x,s.player.z+dz))s.player.z+=dz;}
 const moved=dist(before,s.player);s.distance+=moved;if(moved>.0001)s.heading=Math.atan2(s.player.x-before.x,s.player.z-before.z);
 let checkpoint=false;for(const c of CHECKPOINTS){if(dist(s.player,c)<2.3&&s.lastCheckpoint!==c.name){s.checkpoint={...c};s.lastCheckpoint=c.name;checkpoint=true;say(s,`${c.name} · safe checkpoint`,2);}}
 if(s.protection<=0&&s.grace<=0&&hazardsAt(s.time).some(h=>dist(s.player,h)<h.r+PLAYER_RADIUS)){s.player={x:s.checkpoint.x,z:s.checkpoint.z};s.recalls++;s.grace=2.5;say(s,'Storm recall · parcel and deliveries safe',3);return {moved,recall:true,checkpoint};}
 return {moved,recall:false,checkpoint};}
export function guidance(s){const action=nearbyAction(s);if(action)return `${action.kind==='pickup'?'Collect':'Deliver'} ${action.item.name}`;if(s.carry){const item=SUPPLIES.find(i=>i.id===s.carry);return `${item.destination} · ${item.direction} · ${Math.round(dist(s.player,item.target))} m`;}if(s.delivered.length===3)return 'All three lights are back on';return dist(s.player,{x:0,z:32})<8?'Choose a parcel at the supply dock':'Return to the supply dock for another parcel';}
