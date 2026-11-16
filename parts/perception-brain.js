// CC0. Deterministic patrol/investigate/chase/search AI. Paths and visibility are supplied by the game.
export function attach(actor,{target=()=>null,canSee=()=>true,path=(a,b)=>[b],move=(a,p)=>Object.assign(a.position,p),patrol=[],speed=1.5,chaseSpeed=2.6,sight=10,memory=5,attackRange=1.4,attackEvery=1,onAttack=()=>{},onState=()=>{},initial=null}={}){
 if(![speed,chaseSpeed,sight,memory,attackRange,attackEvery].every(n=>Number.isFinite(n)&&n>0))throw Error('Invalid brain settings');
 let mode=initial?.mode??'patrol',interest=initial?.interest?{...initial.interest}:null,remember=initial?.remember??0,cooldown=initial?.cooldown??0,index=initial?.index??0,route=[],repath=0,dead=false;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);const change=m=>{if(mode!==m){const old=mode;mode=m;route=[];repath=0;onState(m,old,actor);}};
 return{get mode(){return mode;},hear({position,radius}){if(dead||!position||!Number.isFinite(radius)||radius<=0||distance(actor.position,position)>radius||mode==='chase')return false;interest={x:position.x,z:position.z};remember=memory;change('investigate');return true;},
 update(dt){if(dead||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);cooldown=Math.max(0,cooldown-dt);remember=Math.max(0,remember-dt);const t=target(actor);const visible=t&&distance(actor.position,t.position)<=sight&&canSee(actor,t);
  if(visible){interest={x:t.position.x,z:t.position.z};remember=memory;change('chase');}else if(mode==='chase')change('search');
  if(mode!=='patrol'&&remember<=0){change('patrol');interest=null;}
  if(visible&&distance(actor.position,t.position)<=attackRange){if(cooldown===0){cooldown=attackEvery;onAttack(actor,t);}return;}
  let goal=interest;
  if(mode==='patrol'&&patrol.length){goal=patrol[index%patrol.length];if(distance(actor.position,goal)<.25){index=(index+1)%patrol.length;goal=patrol[index];route=[];repath=0;}}
  if(!goal)return;if(mode==='investigate'&&distance(actor.position,goal)<.3){change('search');remember=Math.min(remember,2);}
  repath-=dt;if(repath<=0){route=path(actor.position,goal)??[];repath=.6;}
  while(route.length&&distance(actor.position,route[0])<.12)route.shift();if(!route.length)return;
  const p=route[0],dx=p.x-actor.position.x,dz=p.z-actor.position.z,d=Math.hypot(dx,dz),step=Math.min(d,(mode==='chase'?chaseSpeed:speed)*dt);if(d>0){actor.heading=Math.atan2(dx,dz);move(actor,{x:actor.position.x+dx/d*step,z:actor.position.z+dz/d*step});}
 },snapshot(){return{mode,interest:interest?{...interest}:null,remember,cooldown,index};},updateTarget(){route=[];repath=0;},dispose(){dead=true;route=[];}};
}
