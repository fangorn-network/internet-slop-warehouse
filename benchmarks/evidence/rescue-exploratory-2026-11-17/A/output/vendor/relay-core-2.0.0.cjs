/* Original neutral benchmark fixture, CC0-1.0. No warehouse source used. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RescueRelay=factory();})(globalThis,function(){
  'use strict';
  const width=20,height=14,radius=.22,speed=3.5;
  const walls=[{x:6,y:2,w:2,h:5},{x:11,y:7,w:4,h:2},{x:3,y:9,w:4,h:2}];
  const signals=[{id:'north',x:4.5,y:3.5},{id:'east',x:15.5,y:3.5},{id:'south',x:17.5,y:11.5}];
  const start={x:1.5,y:1.5},extraction={x:1.5,y:12.5};
  const clone=x=>JSON.parse(JSON.stringify(x));
  function blocked(x,y){return !Number.isFinite(x)||!Number.isFinite(y)||x-radius<1||y-radius<1||x+radius>width-1||y+radius>height-1||walls.some(w=>x+radius>w.x&&x-radius<w.x+w.w&&y+radius>w.y&&y-radius<w.y+w.h);}
  function fresh(){return {schema:1,player:clone(start),signals:[],completed:false};}
  function validate(s){
    if(!s||s.schema!==1||!s.player||blocked(s.player.x,s.player.y)||!Array.isArray(s.signals)||typeof s.completed!=='boolean')return false;
    if(s.signals.some(id=>!signals.some(t=>t.id===id))||new Set(s.signals).size!==s.signals.length)return false;
    if(s.completed&&(s.signals.length!==3||Math.hypot(s.player.x-extraction.x,s.player.y-extraction.y)>.7))return false;
    return true;
  }
  function checkFinish(s){if(s.signals.length===3&&Math.hypot(s.player.x-extraction.x,s.player.y-extraction.y)<.7)s.completed=true;}
  function advance(s,input,elapsedSeconds){
    if(s.completed)return {distance:0,clamped:false};
    input=input||{};const dx=Number.isFinite(input.x)?input.x:0,dy=Number.isFinite(input.y)?input.y:0;
    const requested=Math.max(0,Number.isFinite(elapsedSeconds)?elapsedSeconds:0),dt=Math.min(.25,requested);
    const n=Math.hypot(dx,dy),before={...s.player};
    if(n){const steps=Math.ceil(dt/.025)||1,step=dt/steps;for(let i=0;i<steps&&!s.completed;i++){
      const nx=s.player.x+dx/n*speed*step,ny=s.player.y+dy/n*speed*step;
      if(!blocked(nx,s.player.y))s.player.x=nx;if(!blocked(s.player.x,ny))s.player.y=ny;checkFinish(s);
    }}
    return {distance:Math.hypot(s.player.x-before.x,s.player.y-before.y),clamped:requested>.25};
  }
  function activateSignal(s,id){const t=signals.find(t=>t.id===id);if(!t||s.signals.includes(id)||Math.hypot(s.player.x-t.x,s.player.y-t.y)>.9)return false;s.signals.push(id);checkFinish(s);return true;}
  function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
  const encode=s=>typeof Buffer!=='undefined'?Buffer.from(s,'utf8').toString('base64url'):btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const decode=s=>typeof Buffer!=='undefined'?Buffer.from(s,'base64url').toString('utf8'):atob(s.replace(/-/g,'+').replace(/_/g,'/'));
  function save(s){if(!validate(s))throw new Error('Invalid state');const payload=JSON.stringify({schema:1,player:{x:s.player.x,y:s.player.y},signals:[...s.signals].sort(),completed:s.completed});return 'RR1.'+encode(payload)+'.'+checksum(payload);}
  function load(text){
    if(typeof text!=='string'||text.length>4096||!/^RR1\.[A-Za-z0-9_-]+\.[a-f0-9]{8}$/.test(text.trim()))throw new Error('Invalid save envelope');
    const parts=text.trim().split('.'),payload=decode(parts[1]);if(checksum(payload)!==parts[2])throw new Error('Save checksum mismatch');
    const s=JSON.parse(payload);if(!validate(s))throw new Error('Invalid saved state');return {schema:1,player:{x:s.player.x,y:s.player.y},signals:[...s.signals],completed:s.completed};
  }
  return {version:'2.0.0',width,height,walls,signals,start,extraction,speed,radius,fresh,blocked,validate,advance,activateSignal,save,load};
});
