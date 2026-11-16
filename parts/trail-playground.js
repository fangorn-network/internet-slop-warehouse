// SPDX-License-Identifier: CC0-1.0
// Small renderer-free toy: arc stones into resonant targets, with bounded simulation and resources.
export function attach(object,{targets=[],heightAt=()=>0,gravity=9.8,speed=13,maxStones=16,onHit=()=>{},onThrow=()=>{}}={}){
 const stones=[];let serial=0,hits=0,dead=false;
 return{stones,get hits(){return hits;},throwStone(origin,direction){if(dead)return null;const n=Math.hypot(direction.x,direction.y,direction.z);if(!n)return null;const stone={id:++serial,x:origin.x,y:origin.y,z:origin.z,vx:direction.x/n*speed,vy:direction.y/n*speed,vz:direction.z/n*speed,age:0,done:false};stones.push(stone);if(stones.length>maxStones)stones.shift();onThrow(stone);return stone;},
 update(dt){if(dead)return;let remaining=Math.min(.15,Math.max(0,dt));while(remaining>0){const step=Math.min(.015,remaining);remaining-=step;for(const s of stones){if(s.done)continue;s.age+=step;s.vy-=gravity*step;s.x+=s.vx*step;s.y+=s.vy*step;s.z+=s.vz*step;
 const target=targets.find(t=>Math.hypot(s.x-t.x,s.y-t.y,s.z-t.z)<(t.radius??.35)+.08);if(target){s.done=true;hits++;onHit({target,stone:s,hits});continue;}const floor=heightAt(s.x,s.z)+.07;if(s.y<floor){s.y=floor;s.vy=Math.abs(s.vy)*.3;s.vx*=.55;s.vz*=.55;}if(s.age>5)s.done=true;}}
 for(let i=stones.length-1;i>=0;i--)if(stones[i].done)stones.splice(i,1);},reset(){stones.length=0;hits=0;},dispose(){dead=true;stones.length=0;}};
}
