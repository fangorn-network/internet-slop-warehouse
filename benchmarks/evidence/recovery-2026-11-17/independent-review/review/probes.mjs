import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const results=[];
for(const label of ['Larch','Willow']){
 const handlers={},frames=[],nodes=new Map();let audioCount=0,failAudio=false;
 const el=id=>({id,dataset:{},hidden:false,textContent:id,classList:{toggle(){},add(){},remove(){}},setAttribute(){},focus(){},setPointerCapture(){},querySelector(){return {textContent:''}},addEventListener(n,fn){this[n]=fn}});
 const dirs=['up','down','left','right'].map(d=>Object.assign(el(d),{dataset:{dir:d}}));
 const inventory=['seed','water','flower','sun'].map(d=>Object.assign(el(d),{dataset:{id:d,item:d}}));
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const node=s=>{if(!nodes.has(s))nodes.set(s,el(s));return nodes.get(s)};node('canvas').getContext=node('#scene').getContext=()=>ctx;
 globalThis.document={hidden:false,querySelector:node,querySelectorAll:s=>s==='[data-dir]'||s==='.touch button'?dirs:s.includes('inventory')||s==='[data-item]'?inventory:[],addEventListener(n,f){handlers[n]=f}};
 globalThis.window={addEventListener(n,f){handlers[n]=f},AudioContext:class{constructor(){audioCount++;if(failAudio)throw Error('audio unavailable')}state='running';currentTime=0;destination={};createOscillator(){return {frequency:{},connect(){},start(){},stop(){}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this}}}}};
 globalThis.requestAnimationFrame=f=>frames.push(f);
 const entry=label==='Larch'?'game.mjs':'app.mjs';let source=await fs.readFile(`${label}/${entry}`,'utf8');source=source.replace(label==='Larch'?"'./core.mjs'":"'./game.mjs'",JSON.stringify(new URL(`../${label}/${label==='Larch'?'core.mjs':'game.mjs'}`,import.meta.url).href));source+='\nexport const probe=()=>({keys:[...'+(label==='Larch'?'keys':'held')+'],touch:[...touch]});';await fs.writeFile(`review/${label}-instrumented.mjs`,source);const mod=await import(`./${label}-instrumented.mjs`);
 assert.equal(audioCount,0);frames.shift()(16);assert.equal(audioCount,0);
 const key=k=>({key:k,target:{tagName:'BODY'},preventDefault(){}});
 handlers.keydown(key('ArrowRight'));handlers.keydown(key('d'));handlers.keyup(key('d'));const alias=mod.probe().keys.includes('right');assert.equal(alias,false);
 handlers.blur();handlers.keydown(key('w'));document.hidden=true;handlers.visibilitychange();assert.deepEqual(mod.probe(),{keys:[],touch:[]});document.hidden=false;
 const b=dirs[0],ev=id=>({pointerId:id,preventDefault(){}});b.pointerdown(ev(1));b.pointerdown(ev(2));b.pointerup(ev(1));const second=mod.probe().touch.includes('up');assert.equal(second,false);
 b.pointerdown(ev(3));b.pointercancel(ev(3));assert.deepEqual(mod.probe().touch,[]);
 node('#restart').onclick();assert.deepEqual(mod.probe(),{keys:[],touch:[]});assert.equal(node('#count').textContent,'0 / 3 found');
 // Independent fresh import with an unavailable audio implementation.
 failAudio=true;let audioFailure=false;try{node('#sound').onclick({currentTarget:node('#sound')})}catch{audioFailure=true}
 // Existing audio above means this is not a constructor failure probe; source evidence reported separately.
 results.push({label,noAudioBeforeGesture:true,blurVisibilityAndCancelClear:true,restartClearsInputAndProgress:true,aliasReleaseDropsHeldDirection:!alias,firstPointerReleaseDropsSecondPointer:!second});
}
await fs.writeFile('review/probe-results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
