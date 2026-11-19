import {attach} from './vendor/collect.mjs';
export const W=960,H=640;
export const relics=[{name:'Sun seed',x:165,y:150,color:'#ffd077',glyph:'✦'},{name:'Tide glass',x:790,y:165,color:'#86e8e0',glyph:'◆'},{name:'Moon dial',x:680,y:510,color:'#d5b7ff',glyph:'☾'}];
export const obstacles=[{x:285,y:100,w:80,h:220},{x:440,y:350,w:150,h:70},{x:145,y:400,w:125,h:65},{x:680,y:270,w:150,h:60}];
export function createGame(onCollect=()=>{},onOpen=()=>{}){
 const player={position:{x:95,y:0,z:535}}, items=relics.map((r,i)=>({...r,id:i,position:{x:r.x,y:.8,z:r.y},rotation:{y:0},taken:false}));
 const state={player,items,won:false,open:false,count:0,time:0};
 const pickups=attach(player,{items,radius:30,bob:0,spin:0,onCollect(item){item.taken=true;state.count++;onCollect(item);},onAll(){state.open=true;onOpen();}});
 function blocked(x,y){return x<30||x>W-30||y<35||y>H-30||obstacles.some(o=>x>o.x-15&&x<o.x+o.w+15&&y>o.y-15&&y<o.y+o.h+15);}
 state.step=(dx,dy,dt)=>{if(state.won)return;dt=Math.min(.04,Math.max(0,dt));state.time+=dt;const norm=Math.hypot(dx,dy)||1, speed=185*dt;let x=player.position.x+dx/norm*speed,y=player.position.z+dy/norm*speed;if(!blocked(x,player.position.z))player.position.x=x;if(!blocked(player.position.x,y))player.position.z=y;pickups.update(dt);if(state.open&&Math.hypot(player.position.x-880,player.position.z-80)<38)state.won=true;};
 state.blocked=blocked;return state;
}
