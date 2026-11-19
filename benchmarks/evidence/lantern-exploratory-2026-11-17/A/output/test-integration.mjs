// CPU/DOM harness only. Exercises the actual scene and input wiring using real
// Three.js geometry/material classes, with a renderer stub (NO browser/WebGL).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from './vendor/three.module.min.js';
import * as core from './core.mjs';
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const game=fs.readFileSync(new URL('./game.mjs',import.meta.url),'utf8');
const root=new URL('./',import.meta.url);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'HTML IDs unique');
for(const [,id]of game.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(id)||['delivery-','map-'].some(p=>id.startsWith(p)),`missing UI id ${id}`);
for(const [,file]of html.matchAll(/(?:src|href)="([^"#]+)"/g)){assert.ok(!/^(https?:)?\/\//.test(file));assert.ok(fs.existsSync(new URL(file,root)),`missing ${file}`);}
for(const [,file]of game.matchAll(/from ['"]([^'"]+)['"]/g)){assert.ok(file.startsWith('./'));assert.ok(fs.existsSync(new URL(file,root)));}
assert.ok(!/https?:\/\//.test(game.replace('http://www.w3.org/2000/svg','')),'runtime must have no network URLs');
let nextFrame=null, now=0, drawCalls=0, stored=null;
const ctx=new Proxy({}, {get:(t,k)=>t[k]??(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
class Element{constructor(id=''){this.id=id;this.style={};this.attrs={};this.children=[];this.events={};this.tagName='DIV';this.textContent='';this.classList={values:new Set(),add:(v)=>this.classList.values.add(v),remove:(v)=>this.classList.values.delete(v),toggle:(v,on)=>on===true?this.classList.values.add(v):on===false?this.classList.values.delete(v):this.classList.values.has(v)?this.classList.values.delete(v):this.classList.values.add(v)};}append(v){this.children.push(v);}setAttribute(k,v){this.attrs[k]=v;if(k==='id'){this.id=v;elements.set(v,this);}}addEventListener(type,fn){(this.events[type]??=[]).push(fn);}fire(type,e={}){for(const fn of this.events[type]??[])fn({preventDefault(){},target:this,...e});}querySelector(){return this.child??=new Element();}getContext(){return ctx;}getBoundingClientRect(){return {left:0,top:0,width:112,height:112};}setPointerCapture(){}blur(){} }
Object.defineProperty(Element.prototype,'id',{get(){return this._id},set(v){this._id=v;if(typeof elements!=='undefined')elements.set(v,this);}});
const elements=new Map();for(const id of ids)elements.set(id,new Element(id));

const document=new Element();document.getElementById=id=>elements.get(id);document.createElement=()=>new Element();document.createElementNS=()=>new Element();document.activeElement={blur(){}};document.hidden=false;
const window=new Element();
class Renderer{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(scene,camera){assert.ok(scene.isScene);assert.ok(camera.isPerspectiveCamera);drawCalls++;}}
const source=game.replace(/^import .*;\n/gm,'');
const exposed=`;return {snapshot:()=>structuredClone(state),setState:s=>{state=s},scene:()=>scene,player:()=>player,begin,resetRun,pause,render,syncUI,doInteract,useLantern};`;
const factory=new Function('THREE','core','document','window','localStorage','matchMedia','requestAnimationFrame','innerWidth','innerHeight','devicePixelRatio',`const {${Object.keys(core).join(',')}}=core;\n${source}\n${exposed}`);
const app=factory({...THREE,WebGLRenderer:Renderer},core,document,window,{getItem:()=>stored,setItem:(k,v)=>{stored=v}},()=>({matches:false}),fn=>{nextFrame=fn},1280,800,1);
assert.ok(nextFrame,'scene starts requestAnimationFrame');
assert.ok(app.scene().children.length>300,'actual authored scene built');
function frames(n){for(let i=0;i<n;i++){now+=1000/60;const fn=nextFrame;nextFrame=null;fn(now);assert.ok(nextFrame,'frame scheduling survives');}}
const key=(code,type='keydown',extra={})=>document.fire(type,{code,repeat:false,target:{tagName:'BODY'},...extra});
frames(2);elements.get('start').fire('click');assert.equal(app.snapshot().phase,'playing');
key('KeyW');frames(35);key('KeyW','keyup');assert.ok(app.snapshot().player.z<34);assert.ok(app.player().position.z<34);
key('KeyE');assert.equal(app.snapshot().carry,'power','keyboard pickup calls real simulation');
key('Space');assert.ok(app.snapshot().protection>0);const remaining=app.snapshot().cooldown;key('Space', 'keydown',{repeat:true});assert.equal(app.snapshot().cooldown,remaining,'held key cannot reactivate');
key('KeyP');assert.equal(app.snapshot().phase,'paused');const frozen=app.snapshot().time;frames(10);assert.equal(app.snapshot().time,frozen);elements.get('resume').fire('click');assert.equal(app.snapshot().phase,'playing');frames(10);assert.equal(app.snapshot().player.z,app.player().position.z,'resume clears held keys');
key('KeyW');window.fire('blur');assert.equal(app.snapshot().phase,'paused');elements.get('resume').fire('click');const z=app.snapshot().player.z;frames(15);assert.equal(app.snapshot().player.z,z,'blur clears keyboard');
const stick=elements.get('stick');stick.fire('pointerdown',{pointerId:1,clientX:56,clientY:15});frames(15);assert.ok(app.snapshot().player.z<z,'touch stick moves');window.fire('pointercancel');const canceled=app.snapshot().player.z;frames(15);assert.equal(app.snapshot().player.z,canceled,'pointer cancellation clears touch');
document.hidden=true;document.fire('visibilitychange');assert.equal(app.snapshot().phase,'paused');document.hidden=false;document.fire('visibilitychange');elements.get('resume').fire('click');
elements.get('mute').fire('click');key('KeyW');frames(2);key('KeyW','keyup');assert.equal(app.snapshot().phase,'playing','missing WebAudio does not stop gameplay');
// Drive finish/reset through actual UI methods. Core path traversal is tested separately.
let state=app.snapshot();for(const item of core.SUPPLIES){state.player={...item.pickup};state.carry=null;state.phase='playing';app.setState(state);app.doInteract();state=app.snapshot();state.player={...item.target};app.setState(state);app.doInteract();state=app.snapshot();}
frames(1);assert.equal(app.snapshot().phase,'finished');assert.ok(elements.get('finish-time').textContent);assert.ok(stored,'finish persists best safely');
elements.get('again').fire('click');frames(1);state=app.snapshot();assert.equal(state.phase,'playing');assert.ok(Math.abs(state.time-1/60)<1e-10);assert.equal(state.recalls,0);assert.equal(state.carry,null);assert.deepEqual(state.delivered,[]);assert.equal(state.cooldown,0);assert.equal(state.protection,0);
key('KeyR');assert.equal(app.snapshot().time,0);assert.equal(app.snapshot().player.z,35);
assert.ok(drawCalls>100);console.log(`PASS static dependencies, HTML IDs, real Three.js scene construction, ${drawCalls} CPU-renderer-stub frames, keyboard/touch interaction, held-key rejection, pause, blur, pointer cancellation, page visibility, audio failure, finish, restart.`);
console.log('LIMIT: this does not create WebGL, lay out CSS, dispatch real browser input, or verify actual play.');
