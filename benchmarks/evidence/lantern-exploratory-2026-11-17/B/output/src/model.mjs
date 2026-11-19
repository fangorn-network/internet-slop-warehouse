import {attach} from './ability-clock.mjs';
export const SUPPLIES=[
 {id:'medicine',name:'Medicine',mark:'✚',color:'#ff9d98',x:-3,z:35,dest:{x:-24,z:0,name:'Clinic'}},
 {id:'grain',name:'Grain',mark:'◆',color:'#f5ce78',x:0,z:35,dest:{x:24,z:-15,name:'Mill'}},
 {id:'cells',name:'Power cells',mark:'ϟ',color:'#8fe4e4',x:3,z:35,dest:{x:0,z:-36,name:'Signal tower'}}
];
export const ROADS=[[-5,5,18,40],[-26.5,26.5,17.5,22.5],[-26.5,-21.5,-38.5,22.5],[21.5,26.5,-38.5,22.5],[-26.5,26.5,-38.5,-33.5],[-2.3,2.3,-36,20]];
export const CHECKPOINTS=[{x:0,z:31,name:'Depot'},{x:0,z:20,name:'South shelter'},{x:-24,z:0,name:'Clinic shelter'},{x:24,z:-15,name:'Mill shelter'},{x:0,z:-36,name:'North shelter'}];
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function walkable(x,z){return ROADS.some(([x0,x1,z0,z1])=>x>=x0+.32&&x<=x1-.32&&z>=z0+.32&&z<=z1-.32);}
export function hazards(t){return [{x:Math.sin(t*1.1)*2.7,z:4+Math.cos(t*.7)*2.5},{x:Math.sin(t*.83+2)*2.7,z:-19+Math.cos(t*.9)*3}];}
export class Run{
 constructor(onEvent=()=>{}){this.emit=onEvent;this.reset();}
 reset(){this.x=0;this.z=38;this.vx=0;this.vz=0;this.time=0;this.carried=null;this.delivered=new Set();this.recalls=0;this.checkpoint=CHECKPOINTS[0];this.shield=0;this.grace=0;this.finished=false;this.active=false;this.ability=attach(this,{abilities:{lantern:{cooldown:11,canUse:()=>this.active&&!this.finished}},onActivate:()=>{this.shield=2.8;this.emit('shield','Lantern raised — storm protection for 3 seconds.');},onReject:()=>this.emit('reject','Lantern recharging. Follow the cooldown ring.')});}
 activate(){return this.ability.activate('lantern');}
 get near(){if(this.carried)return SUPPLIES.find(s=>s.id===this.carried&&distance(this,s.dest)<3);return SUPPLIES.find(s=>!this.delivered.has(s.id)&&distance(this,s)<2);}
 interact(){if(!this.active||this.finished)return false;const s=this.near;if(!s){this.emit('reject',this.carried?'Bring this parcel to its matching destination.':'Pick up a parcel at the depot.');return false;}if(this.carried){this.delivered.add(s.id);this.carried=null;this.emit('deliver',`${s.dest.name} supplied. ${this.delivered.size}/3 delivered.`);if(this.delivered.size===3){this.finished=true;this.active=false;this.emit('finish','All three lights restored.');}}else{this.carried=s.id;this.emit('pickup',`${s.name} collected. Take it to the ${s.dest.name}.`);}return true;}
 update(dt,input={x:0,z:0}){if(!this.active||this.finished)return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.ability.update(dt);this.shield=Math.max(0,this.shield-dt);this.grace=Math.max(0,this.grace-dt);let {x=0,z=0}=input;const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}const speed=this.carried?2.2:2.75;const smoothing=1-Math.exp(-14*dt);this.vx+=(x*speed-this.vx)*smoothing;this.vz+=(z*speed-this.vz)*smoothing;const nx=this.x+this.vx*dt,nz=this.z+this.vz*dt;if(walkable(nx,this.z))this.x=nx;else this.vx=0;if(walkable(this.x,nz))this.z=nz;else this.vz=0;
 for(const c of CHECKPOINTS)if(distance(this,c)<2.2&&c!==this.checkpoint){this.checkpoint=c;this.emit('checkpoint',`${c.name} — safe checkpoint saved.`);}
 if(!this.shield&&!this.grace&&hazards(this.time).some(h=>distance(this,h)<1.55)){this.recalls++;this.x=this.checkpoint.x;this.z=this.checkpoint.z;this.vx=this.vz=0;this.grace=2.5;this.emit('recall','Storm recall! Parcel safe. Returned to '+this.checkpoint.name+'.');}
 }
}
export const formatTime=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
