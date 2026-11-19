import {attach} from './vendor/collect.mjs';
export const WIDTH=1000, HEIGHT=650;
export const obstacles=[{x:205,y:160,w:120,h:100},{x:205,y:390,w:120,h:100},{x:470,y:250,w:110,h:150},{x:700,y:130,w:120,h:110},{x:700,y:410,w:120,h:110}];
export const relics=[{id:'seed',name:'Sun seed',x:120,y:135,color:'#ffd57a'},{id:'water',name:'Moon water',x:535,y:125,color:'#8be0ef'},{id:'flower',name:'Glass bloom',x:880,y:490,color:'#efa9cd'}];
export const exit={x:925,y:310};
export function createGame(onEvent=()=>{}){
 const player={position:{x:90,y:0,z:325}}, found=new Set(); let won=false,elapsed=0;
 const items=relics.map(r=>({...r,position:{x:r.x,y:.8,z:r.y},rotation:{y:0}}));
 const pickups=attach(player,{items,radius:30,bob:0,spin:1.8,onCollect:item=>{found.add(item.id);onEvent('collect',item)},onAll:()=>onEvent('unlock')});
 function valid(x,y){const r=14;return x>=40+r&&x<=960-r&&y>=60+r&&y<=590-r&&!obstacles.some(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h);}
 return {player,items,found,get won(){return won},get elapsed(){return elapsed},get unlocked(){return found.size===3},
 update(dt,dx=0,dy=0){if(won)return;dt=Math.max(0,Math.min(.05,dt));elapsed+=dt;const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len}const distance=180*dt;
 if(valid(player.position.x+dx*distance,player.position.z))player.position.x+=dx*distance;
 if(valid(player.position.x,player.position.z+dy*distance))player.position.z+=dy*distance;
 pickups.update(dt);if(found.size===3&&Math.hypot(player.position.x-exit.x,player.position.z-exit.y)<32){won=true;onEvent('win')}
 },dispose(){pickups.dispose()}};
}
