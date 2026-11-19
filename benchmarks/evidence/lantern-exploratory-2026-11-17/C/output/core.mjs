// Original Lantern Courier simulation. No rendering or browser dependencies.
export const SUPPLIES = [
  {id:'medicine', name:'Medicine', mark:'+', color:0x72e0c6, css:'#72e0c6', destination:'Clinic', x:-31,z:-40, pickupX:-2.2,pickupZ:14},
  {id:'food', name:'Bread', mark:'◇', color:0xfac778, css:'#fac778', destination:'Hearth', x:0,z:-72,pickupX:0,pickupZ:14},
  {id:'battery', name:'Batteries', mark:'ϟ', color:0xbba1ff, css:'#bba1ff', destination:'Beacon', x:31,z:-40,pickupX:2.2,pickupZ:14}
];
// Each rectangle is an authored walkable causeway. The union is the collision map.
export const ROADS=[
 {x:0,z:2,w:7,d:36}, {x:0,z:14,w:13,d:10},
 {x:0,z:-14,w:55,d:7}, {x:-24,z:-39,w:7,d:57}, {x:24,z:-39,w:7,d:57},
 {x:0,z:-64,w:55,d:7}, {x:0,z:-69,w:8,d:14},
 {x:-28,z:-40,w:15,d:8}, {x:28,z:-40,w:15,d:8},
 {x:0,z:-39,w:4.5,d:50,shortcut:true}
];
export const CHECKPOINTS=[{x:0,z:11,name:'Depot'},{x:0,z:-10,name:'Crossroads'},{x:-24,z:-15,name:'West gate'},{x:24,z:-15,name:'East gate'},{x:-24,z:-63,name:'West turn'},{x:24,z:-63,name:'East turn'},...SUPPLIES.map(s=>({x:s.x,z:s.z,name:s.destination}))];
export const SPEED=3.15, SHIELD_DURATION=3.2, COOLDOWN=10;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function walkable(x,z,r=.4){return ROADS.some(q=>Math.abs(x-q.x)<=q.w/2-r&&Math.abs(z-q.z)<=q.d/2-r)}
export function storms(t){return [{x:Math.sin(t*.8)*1.15,z:-39+Math.sin(t*.24)*17,r:2.25},{x:24+Math.sin(t*.65)*.65,z:-39+Math.sin(t*.29+1.6)*17,r:2.25}];}
export class Game {
 constructor(){this.reset()}
 reset(){this.x=0;this.z=18;this.vx=0;this.vz=0;this.time=0;this.carried=null;this.delivered=[];this.recalls=0;this.shield=0;this.cooldown=0;this.immunity=0;this.checkpoint={...CHECKPOINTS[0]};this.state='ready';this.events=[];this.lastCheckpoint='Depot'}
 emit(type,text){this.events.push({type,text})}
 start(){if(this.state==='ready')this.state='playing'}
 pause(){if(this.state==='playing'){this.state='paused';this.vx=this.vz=0}}
 resume(){if(this.state==='paused')this.state='playing'}
 activate(){if(this.state!=='playing')return false;if(this.cooldown>0){this.emit('unavailable',`Lantern recharging · ${Math.ceil(this.cooldown)}s`);return false}this.shield=SHIELD_DURATION;this.cooldown=COOLDOWN;this.emit('shield','Lantern lit · storm protection for 3 seconds');return true}
 nearby(){
  const dest=SUPPLIES.find(s=>distance(this,s)<3.2);
  if(dest)return {kind:'destination',s:dest};
  if(distance(this,{x:0,z:14})<5.3){let available=SUPPLIES.filter(s=>!this.delivered.includes(s.id));if(available.length)return {kind:'pickup',s:available.reduce((a,b)=>Math.abs(this.x-b.pickupX)<Math.abs(this.x-a.pickupX)?b:a)}}
  return null;
 }
 interact(){if(this.state!=='playing')return false;let n=this.nearby();if(!n){this.emit('info','Move closer to a parcel or a destination');return false}
  if(n.kind==='pickup'){if(this.carried){this.emit('info','Hands full · deliver your parcel first');return false}this.carried=n.s.id;this.emit('pickup',`${n.s.name} collected · follow the ${n.s.destination} marker`);return true}
  if(this.delivered.includes(n.s.id)){this.emit('info',`${n.s.destination} is supplied`);return false}
  if(this.carried!==n.s.id){this.emit('info',`${n.s.destination} needs ${n.s.name.toLowerCase()} from the depot`);return false}
  this.delivered.push(n.s.id);this.carried=null;this.checkpoint={x:n.s.x,z:n.s.z,name:n.s.destination};this.emit('delivery',`${n.s.destination} supplied · ${this.delivered.length} of 3`);
  if(this.delivered.length===3){this.state='finished';this.vx=this.vz=0;this.emit('finish','Every light is home. Settlement supplied.')};return true;
 }
 step(dt,input={x:0,z:0}){if(this.state!=='playing')return;dt=Math.max(0,Math.min(.1,dt));let steps=Math.ceil(dt/.02)||1;for(let i=0;i<steps;i++)this.tick(dt/steps,input)}
 tick(dt,input){this.time+=dt;this.shield=Math.max(0,this.shield-dt);this.cooldown=Math.max(0,this.cooldown-dt);this.immunity=Math.max(0,this.immunity-dt);
  let mag=Math.hypot(input.x,input.z), scale=mag>1?1/mag:1;let blend=1-Math.exp(-dt*14);this.vx+=(input.x*scale*SPEED-this.vx)*blend;this.vz+=(input.z*scale*SPEED-this.vz)*blend;
  let nx=this.x+this.vx*dt,nz=this.z+this.vz*dt;if(walkable(nx,this.z))this.x=nx;else this.vx=0;if(walkable(this.x,nz))this.z=nz;else this.vz=0;
  for(let c of CHECKPOINTS)if(distance(this,c)<2&&this.checkpoint.name!==c.name){this.checkpoint={...c};this.emit('checkpoint',`${c.name} · safe checkpoint`)}
  if(!this.shield&&!this.immunity&&storms(this.time).some(h=>distance(this,h)<h.r+.4)){this.recalls++;this.x=this.checkpoint.x;this.z=this.checkpoint.z;this.vx=this.vz=0;this.immunity=2.8;this.emit('recall',`Storm recall → ${this.checkpoint.name}. Your parcel is safe.`)}
 }
 action(){if(this.state==='finished')return 'All three lights restored';const n=this.nearby();if(n?.kind==='destination'){if(this.delivered.includes(n.s.id))return `${n.s.destination} supplied · return to the depot`;return this.carried===n.s.id?`Deliver ${n.s.name.toLowerCase()} to ${n.s.destination}`:`${n.s.destination} needs ${n.s.name.toLowerCase()}`}
 if(this.carried){let s=SUPPLIES.find(s=>s.id===this.carried);return `Take ${s.name.toLowerCase()} to the ${s.destination}`}
 if(n?.kind==='pickup')return `Collect ${n.s.name.toLowerCase()} for the ${n.s.destination}`;return 'Return to the depot for your next parcel'}
}
