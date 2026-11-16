// CC0. Occupancy with enter/leave events and one aggregate puzzle-solved transition.
export function attach(object,{zones=[],actors=()=>[],accept=()=>true,onEnter=()=>{},onLeave=()=>{},onChange=()=>{},onComplete=()=>{}}={}){
    if(!zones.length||zones.some(z=>!z.position||!Number.isFinite(z.radius)||z.radius<=0))throw new RangeError('Invalid zones');
    let state=zones.map(()=>new Set()),complete=false,dead=false;
    return {get occupied(){return state.map(s=>s.size>0);},get complete(){return complete;},
        update(){
            if(dead)return;const candidates=[...actors(object)];let changed=false;
            const next=zones.map((zone,i)=>{
                const inside=new Set(candidates.filter(a=>accept(a,zone,i)&&Math.hypot(a.position.x-zone.position.x,a.position.z-zone.position.z)<=zone.radius));
                for(const a of state[i])if(!inside.has(a)){changed=true;onLeave(a,zone,i);}
                for(const a of inside)if(!state[i].has(a)){changed=true;onEnter(a,zone,i);}
                return inside;
            });state=next;const now=state.every(s=>s.size>0);
            if(changed)onChange(state.map(s=>s.size>0),object);
            if(now&&!complete){complete=true;onComplete(object);}else if(!now)complete=false;
        },
        dispose(){dead=true;state=zones.map(()=>new Set());complete=false;},
    };
}
