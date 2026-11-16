// CC0. A damped, sub-stepped 3D tether for magnetic carrying and physics-like hauling.
import * as THREE from 'three';
export function attach(object,{target=()=>null,stiffness=32,damping=10,maxDistance=15,tolerance=.12,onBreak=()=>{},onSettle=()=>{}}={}){
    if(![stiffness,damping,maxDistance,tolerance].every(n=>Number.isFinite(n)&&n>0))throw new RangeError('Invalid tether');
    const velocity=new THREE.Vector3(),force=new THREE.Vector3();let dead=false,settled=false,broken=false,active=false;
    return {velocity,get active(){return active;},
        update(dt){
            if(dead||!Number.isFinite(dt)||dt<=0)return;
            const point=target(object);active=!!point&&!broken;
            if(!point){broken=false;active=false;settled=false;velocity.set(0,0,0);return;}
            if(broken)return;
            if(![point.x,point.y,point.z].every(Number.isFinite))return;
            if(object.position.distanceTo(point)>maxDistance){broken=true;active=false;velocity.set(0,0,0);onBreak(object);return;}
            let remaining=Math.min(dt,.1);
            while(remaining>1e-8){const step=Math.min(remaining,1/120);force.subVectors(point,object.position).multiplyScalar(stiffness).addScaledVector(velocity,-damping);velocity.addScaledVector(force,step);object.position.addScaledVector(velocity,step);remaining-=step;}
            const now=object.position.distanceTo(point)<tolerance&&velocity.length()<tolerance;
            if(now&&!settled)onSettle(object);settled=now;
        },
        release(){broken=true;active=false;velocity.set(0,0,0);},dispose(){dead=true;active=false;velocity.set(0,0,0);},
    };
}
