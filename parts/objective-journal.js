// CC0. A serializable dependency graph of objectives, completed from facts or explicit events.
export function attach(object,{objectives=[],completed=[],onComplete=()=>{},onAll=()=>{}}={}){
 const definitions=new Map(),done=new Set(completed);for(const o of objectives){if(!o.id||definitions.has(o.id))throw Error('Duplicate objective');definitions.set(o.id,{...o,requires:[...(o.requires??[])]});}
 for(const o of definitions.values())for(const id of o.requires)if(!definitions.has(id))throw Error('Unknown prerequisite '+id);
 const visited=new Set(),visiting=new Set();function visit(id){if(visiting.has(id))throw Error('Cyclic objectives');if(visited.has(id))return;visiting.add(id);definitions.get(id).requires.forEach(visit);visiting.delete(id);visited.add(id);}definitions.forEach((_,id)=>visit(id));
 for(const id of done)if(!definitions.has(id))throw Error('Unknown completed objective');for(const id of done)if(definitions.get(id).requires.some(k=>!done.has(k)))throw Error('Completed objective lacks prerequisite');
 let dead=false,all=definitions.size>0&&done.size===definitions.size;
 const active=id=>definitions.has(id)&&!done.has(id)&&definitions.get(id).requires.every(k=>done.has(k));
 function complete(id){if(dead||!active(id))return false;done.add(id);onComplete({...definitions.get(id)},object);if(!all&&done.size===definitions.size){all=true;onAll(object);}return true;}
 return{complete,get completed(){return[...done];},get all(){return all;},get active(){return[...definitions.values()].filter(o=>active(o.id)).map(o=>({...o,requires:[...o.requires]}));},update(facts={}){if(dead)return;for(let i=0;i<definitions.size;i++){let changed=false;for(const o of definitions.values())if(active(o.id)&&o.fact&&Object.hasOwn(facts,o.fact)&&facts[o.fact]){complete(o.id);changed=true;}if(!changed)break;}},dispose(){dead=true;}};
}
