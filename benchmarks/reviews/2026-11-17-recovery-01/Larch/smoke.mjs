// Simulated DOM/Canvas integration; not a browser compatibility test.
import assert from 'node:assert/strict';
const handlers={},frames=[];let audioCreations=0;
function element(id){return {id,hidden:false,dataset:{},textContent:'',classList:{toggle(){},add(){},remove(){}},setAttribute(){},addEventListener(name,fn){this[name]=fn},querySelector(){return {textContent:''}},focus(){},setPointerCapture(){}}}
const ids=['scene','sound','restart','message','count','welcome','victory','finish','start','again'];const nodes=Object.fromEntries(ids.map(id=>['#'+id,element(id)]));
const gradient={addColorStop(){}};let draws=0;const ctx=new Proxy({createRadialGradient:()=>gradient},{get(target,key){if(key in target)return target[key];return ()=>{draws++}},set(target,key,value){target[key]=value;return true}});nodes['#scene'].getContext=()=>ctx;
const inventory=['seed','water','flower'].map(id=>{const el=element(id);el.dataset.id=id;return el});const buttons=['up','left','down','right'].map(id=>{const el=element(id);el.dataset.dir=id;return el});
globalThis.document={hidden:false,querySelector:s=>{assert(nodes[s],`Missing selector ${s}`);return nodes[s]},querySelectorAll:s=>s==='#inventory li'?inventory:s==='[data-dir]'?buttons:[],addEventListener(name,fn){handlers[name]=fn}};
globalThis.window={addEventListener(name,fn){handlers[name]=fn},AudioContext:class{constructor(){audioCreations++}state='running';currentTime=0;destination={};createOscillator(){return {frequency:{},connect(){},start(){},stop(){}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}}};
globalThis.requestAnimationFrame=fn=>frames.push(fn);
await import('./game.mjs');assert.equal(audioCreations,0);frames.shift()(16);assert(draws>200);assert.equal(nodes['#count'].textContent,'0 / 3 found');
nodes['#start'].onclick();assert.equal(audioCreations,1);assert.equal(nodes['#welcome'].hidden,true);
handlers.keydown({key:'ArrowRight',target:{tagName:'BODY'},preventDefault(){}});frames.shift()(32);handlers.keyup({key:'ArrowRight'});
buttons[0].pointerdown({preventDefault(){},pointerId:1});buttons[0].pointerup();handlers.blur();
nodes['#restart'].onclick();assert.equal(nodes['#count'].textContent,'0 / 3 found');assert.equal(nodes['#victory'].hidden,true);frames.shift()(48);
console.log('PASS mocked DOM/Canvas integration: initial frame, gesture-gated audio, start, keyboard, pointer capture/release, blur and restart. Actual browser not run.');
