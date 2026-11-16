// CC0. Ordered swept checkpoints: fast movement cannot tunnel through a gate.
import * as THREE from 'three';
export function attach(object,{points=[],radius=2,laps=1,onCheckpoint=()=>{},onLap=()=>{},onComplete=()=>{}}={}){
    if(!points.length||!Number.isFinite(radius)||radius<=0||!Number.isSafeInteger(laps)||laps<1)throw new RangeError('Invalid course');
    const previous=object.position.clone(),segment=new THREE.Vector3(),to=new THREE.Vector3();let index=0,lap=1,complete=false,dead=false;
    const position=p=>p.position??p;
    if(points.some(p=>![position(p).x,position(p).z].every(Number.isFinite)))throw new RangeError('Invalid checkpoint');
    return {get index(){return index;},get lap(){return lap;},get complete(){return complete;},get target(){return complete?null:points[index];},
        update(){
            if(dead||complete)return;
            const target=position(points[index]);segment.subVectors(object.position,previous).setY(0);to.subVectors(target,previous).setY(0);
            const t=segment.lengthSq()?Math.max(0,Math.min(1,to.dot(segment)/segment.lengthSq())):0;
            const dx=previous.x+segment.x*t-target.x,dz=previous.z+segment.z*t-target.z;
            if(dx*dx+dz*dz<=radius*radius){
                const passed=index;index++;onCheckpoint(passed,lap,object);
                if(index===points.length){onLap(lap,object);if(lap===laps){complete=true;onComplete(object);}else{lap++;index=0;}}
            }
            previous.copy(object.position);
        },
        reset(){if(dead)return;index=0;lap=1;complete=false;previous.copy(object.position);},dispose(){dead=true;},
    };
}
