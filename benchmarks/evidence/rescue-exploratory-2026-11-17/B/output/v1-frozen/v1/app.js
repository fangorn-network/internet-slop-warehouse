/* Original benchmark presentation, CC0-1.0. */
(()=>{
 const R=globalThis.RescueRelay,c=document.querySelector('canvas'),ctx=c.getContext('2d'),held=new Set(),pointers=new Map();
 let state=R.fresh(),paused=false,last=performance.now();
 const $=s=>document.querySelector(s),cell=40;
 function clear(){held.clear();pointers.clear();document.querySelectorAll('[data-dir]').forEach(b=>b.classList.remove('held'));}
 function status(text){$('#status').textContent=text;}
 function refresh(){
   $('#progress').textContent=state.signals.length+' / 3 signals active';
   $('#pause').textContent=paused?'Resume':'Pause';
   if(state.completed)status('Baseline expedition complete. Restart or export this completed save.');
 }
 function activate(){
   if(paused||state.completed)return;
   const t=R.signals.find(t=>Math.hypot(state.player.x-t.x,state.player.y-t.y)<=.9);
   status(t?(R.activateSignal(state,t.id)?'Activated '+t.id+' signal.':t.id+' signal is already active.'):'Move closer to a signal and press Activate.');refresh();
 }
 const keys={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;if(keys[e.code]){e.preventDefault();held.add(e.code);}if(e.code==='KeyE'&&!e.repeat){e.preventDefault();activate();}});
 addEventListener('keyup',e=>held.delete(e.code));addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 document.querySelectorAll('[data-dir]').forEach(b=>{
   b.addEventListener('pointerdown',e=>{e.preventDefault();pointers.set(e.pointerId,b.dataset.dir);b.setPointerCapture(e.pointerId);b.classList.add('held');});
   const release=e=>{pointers.delete(e.pointerId);if(![...pointers.values()].includes(b.dataset.dir))b.classList.remove('held');};
   ['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,release));
 });
 $('#activate').onclick=activate;
 $('#pause').onclick=()=>{paused=!paused;clear();refresh();};
 $('#restart').onclick=()=>{state=R.fresh();paused=false;clear();status('Activate three signals, then return to extraction.');refresh();};
 $('#export').onclick=()=>{$('#save').value=R.save(state);status('Save exported. Copy it to another page or device.');};
 $('#load').onclick=()=>{try{const next=R.load($('#save').value);state=next;paused=false;clear();status('Save loaded. Existing progress preserved.');refresh();}catch(e){status('Save rejected: '+e.message+'. Current expedition unchanged.');}};
 function draw(){
   ctx.fillStyle='#132728';ctx.fillRect(0,0,c.width,c.height);
   ctx.strokeStyle='#234142';ctx.lineWidth=1;for(let x=0;x<=R.width;x++){ctx.beginPath();ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,c.height);ctx.stroke();}for(let y=0;y<=R.height;y++){ctx.beginPath();ctx.moveTo(0,y*cell);ctx.lineTo(c.width,y*cell);ctx.stroke();}
   ctx.fillStyle='#385458';for(const w of R.walls)ctx.fillRect(w.x*cell,w.y*cell,w.w*cell,w.h*cell);
   ctx.font='14px system-ui';ctx.textAlign='center';
   for(const t of R.signals){const active=state.signals.includes(t.id);ctx.fillStyle=active?'#85dfa2':'#edbc68';ctx.beginPath();ctx.arc(t.x*cell,t.y*cell,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e4eeec';ctx.fillText(t.id.toUpperCase(),t.x*cell,t.y*cell-22);}
   ctx.strokeStyle=state.signals.length===3?'#85dfa2':'#83908e';ctx.lineWidth=3;ctx.strokeRect((R.extraction.x-.4)*cell,(R.extraction.y-.4)*cell,.8*cell,.8*cell);ctx.fillStyle='#e4eeec';ctx.textAlign='left';ctx.fillText('EXTRACTION',R.extraction.x*cell+24,R.extraction.y*cell+5);
   ctx.fillStyle='#a9d9ff';ctx.beginPath();ctx.arc(state.player.x*cell,state.player.y*cell,10,0,Math.PI*2);ctx.fill();
   if(paused||state.completed){ctx.fillStyle='#071414b8';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='26px system-ui';ctx.fillText(state.completed?'Expedition complete':'Paused',c.width/2,c.height/2);}
 }
 function frame(now){const dt=(now-last)/1000;last=now;const dirs=new Set([...held].map(k=>keys[k]).concat([...pointers.values()]));if(!paused){R.move(state,Number(dirs.has('right'))-Number(dirs.has('left')),Number(dirs.has('down'))-Number(dirs.has('up')),dt);refresh();}draw();requestAnimationFrame(frame);}
 refresh();requestAnimationFrame(frame);
})();
