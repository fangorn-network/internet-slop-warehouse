// CC0. Planar movement with momentum; inject input, bounds and box obstacles.
import * as THREE from 'three';
export function attach(object, { input=()=>({x:0,z:0}), speed=7, acceleration=7, drag=3, boost=1.6, radius=.55,
    bounds=[-40,40,-40,40], obstacles=[], onImpact=()=>{}, onMove=()=>{},
}={}) {
    if (![speed,acceleration,drag,boost,radius].every(n=>Number.isFinite(n)&&n>=0)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[0]>=bounds[1]||bounds[2]>=bounds[3]) throw new RangeError('Invalid drive options');
    const velocity=new THREE.Vector3(); let dead=false;
    const blocked=(x,z)=>obstacles.some(b=>x+radius>b.min.x&&x-radius<b.max.x&&z+radius>b.min.z&&z-radius<b.max.z);
    return { velocity,
        update(dt){
            if(dead||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);
            const raw=input(object)??{}, x=Number.isFinite(raw.x)?raw.x:0,z=Number.isFinite(raw.z)?raw.z:0,n=Math.max(1,Math.hypot(x,z)),moving=x!==0||z!==0;
            const factor=1-Math.exp(-(moving?acceleration:drag)*dt),top=speed*(raw.boost?boost:1);
            velocity.x+=(x/n*top-velocity.x)*factor;velocity.z+=(z/n*top-velocity.z)*factor;
            let hit=false;
            for(const axis of ['x','z']){
                const old=object.position[axis],next=old+velocity[axis]*dt;
                object.position[axis]=next;
                const i=axis==='x'?0:2;
                if(next<bounds[i]||next>bounds[i+1]||blocked(object.position.x,object.position.z)){
                    object.position[axis]=Math.max(bounds[i],Math.min(bounds[i+1],old));velocity[axis]*=-.18;hit=true;
                }
            }
            if(velocity.lengthSq()>.03){const angle=Math.atan2(velocity.x,velocity.z),delta=Math.atan2(Math.sin(angle-object.rotation.y),Math.cos(angle-object.rotation.y));object.rotation.y+=delta*(1-Math.exp(-9*dt));}
            if(hit)onImpact(object,velocity);onMove(object,velocity);
        },
        stop(){velocity.set(0,0,0);},dispose(){dead=true;velocity.set(0,0,0);},
    };
}
