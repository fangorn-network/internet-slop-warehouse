import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,relics,W,H} from './game.mjs';
let collected=0,opened=0;const g=createGame(()=>collected++,()=>opened++);
assert.equal(g.open,false);
g.player.position.x=880;g.player.position.z=80;g.step(0,0,.02);assert.equal(g.won,false);
// BFS over the actual collision predicate; traverse the returned route using actual movement.
function route(game,tx,ty){let sx=Math.round(game.player.position.x/5),sy=Math.round(game.player.position.z/5), goal=[Math.round(tx/5),Math.round(ty/5)],queue=[[sx,sy]],seen=new Map([[`${sx},${sy}`,null]]),end;
 for(let n=0;n<queue.length;n++){const [x,y]=queue[n];if(Math.hypot(x-goal[0],y-goal[1])<2){end=[x,y];break;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){let a=x+dx,b=y+dy,k=`${a},${b}`;if(!seen.has(k)&&!game.blocked(a*5,b*5)){seen.set(k,[x,y]);queue.push([a,b]);}}}
 assert.ok(end,'reachable target');let path=[];while(end){path.push(end);end=seen.get(end.join(','));}return path.reverse();}
g.player.position.x=95;g.player.position.z=535;
for(const r of relics){for(const [x,y]of route(g,r.x,r.y)){for(let i=0;i<8;i++){const dx=x*5-g.player.position.x,dy=y*5-g.player.position.z;if(Math.hypot(dx,dy)<.1)break;g.step(dx,dy,Math.min(.02,Math.hypot(dx,dy)/185));}}assert.ok(g.items.find(i=>i.name===r.name).taken);const count=g.count;for(let i=0;i<10;i++)g.step(0,0,.02);assert.equal(g.count,count);}
assert.equal(collected,3);assert.equal(opened,1);assert.equal(g.open,true);
for(const [x,y]of route(g,880,80)){for(let i=0;i<8&&!g.won;i++){let dx=x*5-g.player.position.x,dy=y*5-g.player.position.z;if(Math.hypot(dx,dy)<.1)break;g.step(dx,dy,Math.min(.02,Math.hypot(dx,dy)/185));}}assert.equal(g.won,true);
let fresh=createGame();assert.equal(fresh.count,0);assert.equal(fresh.open,false);assert.equal(fresh.won,false);assert.ok(fresh.items.every(i=>!i.taken));assert.equal(fresh.player.position.x,95);
let diagonal=createGame();let x=diagonal.player.position.x,y=diagonal.player.position.z;diagonal.step(1,-1,.04);assert.ok(Math.abs(Math.hypot(diagonal.player.position.x-x,diagonal.player.position.z-y)-7.4)<.001);
console.log('PASS: actual-step BFS routes reach three distinct relics and gate; locked exit, collect-once, all callback once, victory, reset state, normalized movement.');
// Execute the browser adapter against instrumented DOM/Canvas/WebAudio substitutes.
class Element{constructor(){this.listeners={};this.classList={add(){},remove(){}};this.dataset={};this.hidden=false;}addEventListener(n,f){this.listeners[n]=f;}setAttribute(){}setPointerCapture(){}focus(){} }
const elements=new Map();for(const id of ['world','sound','inventory','status','victory','welcome','finish','start','again','restart'])elements.set('#'+id,new Element());
const gradient={addColorStop(){}};const ctx=new Proxy({createRadialGradient(){return gradient;}},{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true;}});elements.get('#world').getContext=()=>ctx;
const pad=[[0,-1],[-1,0],[0,1],[1,0]].map(d=>{let e=new Element();e.dataset.d=d.join(',');return e;});
const win={listeners:{},addEventListener(n,f){this.listeners[n]=f;}};let contexts=0,starts=0;win.AudioContext=class{constructor(){contexts++;this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}createOscillator(){return {type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return {connect(){}}},start(){starts++;},stop(){}};}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){return this;}};}};
globalThis.window=win;globalThis.document={hidden:false,querySelector:s=>elements.get(s),querySelectorAll:s=>s==='[data-d]'?pad:[],addEventListener(){}};let frame;globalThis.requestAnimationFrame=f=>{frame=f;};await import('./app.mjs');frame(0);assert.equal(contexts,0);assert.equal(starts,0);elements.get('#start').onclick();assert.equal(contexts,1);assert.equal(starts,0);elements.get('#sound').onclick();assert.equal(starts,1);assert.equal(elements.get('#sound').textContent,'Sound on');let prevented=false;win.listeners.keydown({key:'ArrowRight',preventDefault(){prevented=true;}});assert.equal(prevented,true);frame(16);win.listeners.keyup({key:'ArrowRight'});pad[0].listeners.pointerdown({pointerId:1,preventDefault(){}});frame(32);pad[0].listeners.pointercancel({pointerId:1});win.listeners.blur();elements.get('#restart').onclick();assert.match(elements.get('#status').textContent,/0 \/ 3/);frame(48);
const html=fs.readFileSync(new URL('index.html',import.meta.url),'utf8');for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){assert.ok(fs.existsSync(new URL(m[1],import.meta.url)),m[1]);}assert.match(html,/name="viewport"/);assert.match(fs.readFileSync(new URL('style.css',import.meta.url),'utf8'),/@media\(max-width:640px\)/);
console.log('PASS: instrumented DOM adapter startup/render, keyboard prevention, pointer cancellation, restart UI, no initial AudioContext, gesture creates audio, sound toggle plays; all HTML dependencies local. These substitutes do not establish browser compatibility.');
