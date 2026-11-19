// Executes actual inline browser sources against minimal DOM/canvas fakes.
// This checks handler/state wiring only, never rendering or native browser behavior.
'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),M=require('./mission.cjs');
class Element{constructor(){this.textContent='';this.value='';this.dataset={};this.handlers={};this.classList={add(){},remove(){}};}addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}emit(type,event={}){for(const fn of this.handlers[type]||[])fn({target:this,preventDefault(){},...event});}setPointerCapture(){}replaceChildren(...children){this.children=children;}}
class Button extends Element{}class Textarea extends Element{}class Input extends Element{}
const ids=['goal','objective','progress','inventory','gate-status','status','activate','follow','pause','restart','export','load'];
const elements=Object.fromEntries(ids.map(id=>['#'+id,new Button()]));elements['#save']=new Textarea();const canvas=new Element();canvas.width=1000;canvas.height=700;canvas.getContext=()=>new Proxy({},{get:()=>()=>{},set:()=>true});elements.canvas=canvas;
const directions=['up','left','down','right'].map(dir=>{const b=new Button();b.dataset.dir=dir;return b;}),windowEvents={};let scheduled,now=0;
const context=vm.createContext({console,Buffer,HTMLInputElement:Input,HTMLTextAreaElement:Textarea,HTMLButtonElement:Button,document:{hidden:false,querySelector:s=>elements[s],querySelectorAll:()=>directions,createElement:()=>new Element(),addEventListener:(type,fn)=>{windowEvents[type]=fn;}},performance:{now:()=>now},requestAnimationFrame:fn=>{scheduled=fn;},addEventListener:(type,fn)=>{windowEvents[type]=fn;}});
for(const file of ['vendor/relay-core-2.0.0.cjs','mission.cjs','app.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),context,{filename:file});
const click=id=>elements['#'+id].onclick(),frame=ms=>{now+=ms;scheduled(now);},key=(code,type='keydown',target=canvas)=>windowEvents[type]({code,target,repeat:false,preventDefault(){}}),snapshot=()=>{click('export');return M.load(elements['#save'].value).state;};
frame(0);let state=snapshot();assert.equal(state.player.x,1.5);
key('KeyD');frame(100);assert.ok(snapshot().player.x>1.8,'actual key handler moves');click('pause');state=snapshot();frame(200);assert.equal(snapshot().player.x,state.player.x,'pause stops player');click('pause');frame(100);assert.equal(snapshot().player.x,state.player.x,'pause clears held input');
directions[3].emit('pointerdown',{pointerId:7});frame(100);assert.ok(snapshot().player.x>state.player.x,'touch wiring moves');directions[3].emit('pointercancel',{pointerId:7});state=snapshot();frame(100);assert.equal(snapshot().player.x,state.player.x,'cancel clears touch');
windowEvents.blur();key('KeyD');frame(100);assert.equal(snapshot().player.x,state.player.x,'blur pauses');click('pause');frame(100);assert.equal(snapshot().player.x,state.player.x,'resume stays still');
click('restart');assert.equal(snapshot().player.x,1.5,'restart before victory');
state=M.fresh();state.player={...M.components[0]};elements['#save'].value=M.save(state);click('load');key('KeyE');assert.deepEqual(snapshot().collected,['north'],'E wiring recovers component');
state=snapshot();elements['#save'].value='corrupted';click('load');assert.match(elements['#status'].textContent,/Current expedition unchanged/);assert.equal(M.save(snapshot()),M.save(state),'rejected UI load preserves current state');
key('KeyD','keydown',elements['#save']);frame(100);assert.equal(snapshot().player.x,state.player.x,'text entry does not steer');
state=M.fresh();state.player={...M.R.extraction};state.signals=['north','east','south'];state.collected=[...state.signals];state.completed=true;state.surveyor={...M.R.extraction,mode:'extracted',rescued:true};elements['#save'].value=M.save(state);click('load');frame(100);assert.ok(snapshot().completed,'victory load stays complete');click('restart');assert.equal(snapshot().completed,false,'restart after victory');assert.equal(snapshot().surveyor.rescued,false,'restart clears escort');
console.log('PASS actual source handler simulation: keyboard, touch/cancel, pause/resume, blur, restart before/after victory, E recovery, export/load and rejected-load preservation. Native browser controls/rendering NOT VERIFIED.');
