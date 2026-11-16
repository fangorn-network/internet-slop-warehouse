// SPDX-License-Identifier: CC0-1.0
// Dedupe rewards by stable event ID: retries and shared discoveries cannot double-award.
export function attach(object,{initial=0,entries=[],onChange=()=>{}}={}){
 if(!Number.isSafeInteger(initial)||initial<0)throw Error('Invalid score');let score=initial,dead=false;const claimed=new Set(entries);
 return{get value(){return score;},get entries(){return[...claimed];},award(id,points=1){if(dead||typeof id!=='string'||!id||id.length>180||claimed.has(id)||!Number.isSafeInteger(points)||points<0||!Number.isSafeInteger(score+points))return false;claimed.add(id);score+=points;onChange(score,{id,points},object);return true;},snapshot(){return{value:score,entries:[...claimed]};},update(){},dispose(){dead=true;}};
}
