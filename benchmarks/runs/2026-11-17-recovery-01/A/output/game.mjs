export const WORLD={width:900,height:600};
export const ITEMS=[{id:'seed',name:'Moon seed',x:140,y:150,color:'#dfc3ff'},{id:'water',name:'Rain bottle',x:745,y:150,color:'#72e6ed'},{id:'sun',name:'Sun stone',x:450,y:465,color:'#ffd477'}];
export const EXIT={x:420,y:28,w:60,h:52};
export const BLOCKS=[{x:235,y:140,w:100,h:75},{x:565,y:140,w:100,h:75},{x:235,y:350,w:100,h:75},{x:565,y:350,w:100,h:75}];
export function createGame(){return {x:450,y:300,collected:[],won:false,time:0};}
const overlaps=(x,y,r,b)=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h;
export function step(s,input,dt){
 if(s.won)return [];
 dt=Math.min(Math.max(dt,0),.05);s.time+=dt;
 const events=[];let dx=Number(!!input.right)-Number(!!input.left),dy=Number(!!input.down)-Number(!!input.up);const n=Math.hypot(dx,dy)||1;dx=dx/n*185*dt;dy=dy/n*185*dt;
 for(const axis of ['x','y']){let x=s.x+(axis==='x'?dx:0),y=s.y+(axis==='y'?dy:0);x=Math.max(28,Math.min(872,x));y=Math.max(48,Math.min(572,y));if(!BLOCKS.some(b=>overlaps(x,y,14,b))){s.x=x;s.y=y;}}
 for(const item of ITEMS)if(!s.collected.includes(item.id)&&Math.hypot(s.x-item.x,s.y-item.y)<37){s.collected.push(item.id);events.push({type:'collect',id:item.id});}
 if(s.collected.length===ITEMS.length&&overlaps(s.x,s.y,14,EXIT)){s.won=true;events.push({type:'win'});}
 return events;
}
