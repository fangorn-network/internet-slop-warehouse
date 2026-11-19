import {createGame,obstacles,relics,exit} from './core.mjs';
const $=s=>document.querySelector(s),canvas=$('#scene'),c=canvas.getContext('2d');
let active=false,game,muted=true,audio,previous=0,clock=0;const keys=new Set(),touch=new Set();
function tone(frequency=440,duration=.15){if(muted||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.075,audio.currentTime+.015);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}
function unlockAudio(){if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(AC)try{audio=new AC()}catch{}}if(audio?.state==='suspended')audio.resume().catch(()=>{})}
function sound(){unlockAudio();muted=!muted;$('#sound').textContent=muted?'Sound off':'Sound on';$('#sound').setAttribute('aria-pressed',String(!muted));if(!muted)tone(523)}
function event(type,item){if(type==='collect'){tone([523,659,784][relics.findIndex(r=>r.id===item.id)]);$('#message').textContent=`${item.name} recovered. ${3-game.found.size} keepsake${game.found.size===2?'':'s'} remaining.`;sync()}if(type==='unlock'){$('#message').textContent='The eastern gate is open. Follow the golden light →';tone(1047,.5)}if(type==='win'){active=false;$('#finish').textContent=`You carried all three keepsakes safely home in ${Math.ceil(game.elapsed)} seconds.`;$('#victory').hidden=false;$('#again').focus();tone(784,.6)}}
function sync(){$('#count').textContent=`${game.found.size} / 3 found`;document.querySelectorAll('#inventory li').forEach(el=>{const found=game.found.has(el.dataset.id);el.classList.toggle('found',found);el.querySelector('span').textContent=found?'✓':'○'})}
function clear(){keys.clear();touch.clear();document.querySelectorAll('.held').forEach(el=>el.classList.remove('held'))}
function reset(){game?.dispose();clear();game=createGame(event);sync();$('#message').textContent='Gather three keepsakes. Wake the eastern gate.';$('#victory').hidden=true}
function start(){unlockAudio();$('#welcome').hidden=true;active=true;previous=performance.now();}
$('#start').onclick=()=>{sound();start()};$('#restart').onclick=()=>{reset();start()};$('#again').onclick=()=>{reset();start()};$('#sound').onclick=sound;
const controls={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
window.addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON'&&(e.key===' '||e.key==='Enter'))return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(controls[key]){e.preventDefault();keys.add(controls[key]);unlockAudio()}if(!e.repeat&&key==='r'){reset();start()}if(!e.repeat&&key==='m')sound()});window.addEventListener('keyup',e=>keys.delete(controls[e.key.length===1?e.key.toLowerCase():e.key]));window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
for(const button of document.querySelectorAll('[data-dir]')){button.addEventListener('pointerdown',e=>{e.preventDefault();unlockAudio();button.setPointerCapture(e.pointerId);touch.add(button.dataset.dir);button.classList.add('held')});const release=()=>{touch.delete(button.dataset.dir);button.classList.remove('held')};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release)}
function rect(x,y,w,h,fill,r=0){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill()}
function text(s,x,y,size=12,color='#b4c3a2',align='center'){c.font=`${size}px system-ui`;c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y)}
function leaf(x,y,angle,size,color){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=color;c.beginPath();c.ellipse(0,-size*.5,size*.28,size*.7,0,0,Math.PI*2);c.fill();c.restore()}
function draw(){const p=game.player.position,t=clock;
 c.fillStyle='#132e28';c.fillRect(0,0,1000,650);
 // Stone perimeter, tilework and warm glasshouse ribs.
 rect(26,45,948,560,'#61735a',22);rect(38,57,924,536,'#284a3d',16);
 c.strokeStyle='#8b9b6a18';c.lineWidth=1;for(let x=50;x<960;x+=45){c.beginPath();c.moveTo(x,60);c.lineTo(x,590);c.stroke()}for(let y=60;y<595;y+=45){c.beginPath();c.moveTo(40,y);c.lineTo(960,y);c.stroke()}
 rect(49,285,900,80,'#7f8460',20);rect(100,100,60,440,'#737f58',20);rect(355,100,60,440,'#737f58',20);rect(620,100,60,440,'#737f58',20);rect(850,100,60,440,'#737f58',20);rect(100,100,800,50,'#737f58',20);rect(100,495,800,45,'#737f58',20);
 c.strokeStyle='#c6c19822';c.setLineDash([3,15]);c.lineWidth=2;for(const y of [302,348]){c.beginPath();c.moveTo(65,y);c.lineTo(940,y);c.stroke()}c.setLineDash([]);
 for(const [i,o] of obstacles.entries()){
 rect(o.x+5,o.y+8,o.w,o.h,'#0a231e88',14);rect(o.x,o.y,o.w,o.h,'#a4a77b',12);rect(o.x+7,o.y+7,o.w-14,o.h-14,'#233b29',8);
 for(let j=0;j<12;j++){const x=o.x+18+(j%3)*31,y=o.y+20+Math.floor(j/3)*(o.h-30)/4;for(let a=0;a<5;a++)leaf(x,y,a*1.27+Math.sin(t*.8+j)*.08,15+(j%3)*3,['#547d48','#709059','#3c6543'][(j+i)%3]);if(j%4===i%4){c.fillStyle='#d7ba7e';c.beginPath();c.arc(x,y,3,0,7);c.fill()}}
 }
 // Central circular fountain.
 c.fillStyle='#a1a57a';c.beginPath();c.arc(525,325,43,0,7);c.fill();c.fillStyle='#365f58';c.beginPath();c.arc(525,325,33,0,7);c.fill();c.strokeStyle='#8fc5ac66';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.ellipse(525,325,9+((t*8+i*10)%25),5+((t*5+i*6)%16),0,0,7);c.stroke()}
 // The gate lights only when the collection is complete.
 const open=game.unlocked;rect(907,271,45,108,open?'#e1c579':'#354239',10);rect(914,278,31,94,open?'#c7d7a0':'#192f28',5);if(!open){c.strokeStyle='#71846b';c.lineWidth=3;for(let x=920;x<944;x+=8){c.beginPath();c.moveTo(x,279);c.lineTo(x,370);c.stroke()}}else{const g=c.createRadialGradient(931,325,5,931,325,95);g.addColorStop(0,'#ffdf8c55');g.addColorStop(1,'#ffdf8c00');c.fillStyle=g;c.fillRect(836,230,164,190);text('→',930,337,28,'#fff8c8')}
 text(open?'GATE OPEN':'GATE · 3 KEEPSAKES',893,254,10,open?'#ffdf8b':'#a9b89a');
 for(const item of game.items){if(game.found.has(item.id))continue;const x=item.x,y=item.y+Math.sin(t*2.5+item.x)*4;const glow=c.createRadialGradient(x,y,0,x,y,45);glow.addColorStop(0,item.color+'55');glow.addColorStop(1,item.color+'00');c.fillStyle=glow;c.fillRect(x-45,y-45,90,90);c.strokeStyle=item.color+'55';c.lineWidth=1;c.beginPath();c.ellipse(x,y+17,20,7,0,0,7);c.stroke();c.save();c.translate(x,y);c.fillStyle=item.color;
 if(item.id==='seed'){c.rotate(-.4);c.beginPath();c.ellipse(0,0,8,12,0,0,7);c.fill();c.strokeStyle='#805e34';c.beginPath();c.moveTo(0,-8);c.lineTo(0,8);c.stroke()}
 if(item.id==='water'){c.beginPath();c.moveTo(0,-16);c.bezierCurveTo(23,9,7,19,0,15);c.bezierCurveTo(-17,15,-14,1,0,-16);c.fill()}
 if(item.id==='flower'){for(let i=0;i<5;i++)leaf(0,0,i*1.256,14,item.color);c.fillStyle='#ffdf8a';c.beginPath();c.arc(0,0,4,0,7);c.fill()}
 c.restore();text(item.name.toUpperCase(),x,y+39,9,item.color);
 }
 // Explorer with satchel, hat and a soft ground shadow.
 c.fillStyle='#0b201c66';c.beginPath();c.ellipse(p.x,p.z+12,17,8,0,0,7);c.fill();rect(p.x-10,p.z-9,20,24,'#ddbc70',7);rect(p.x+6,p.z-2,7,14,'#a06c41',3);c.fillStyle='#e6d8ae';c.beginPath();c.arc(p.x,p.z-9,8,0,7);c.fill();c.fillStyle='#d1b46e';c.beginPath();c.ellipse(p.x,p.z-14,15,6,0,0,7);c.fill();rect(p.x-8,p.z-24,16,11,'#e4cd8a',4);
 // Glasshouse framing, drawn over the scene.
 c.strokeStyle='#bbc39125';c.lineWidth=3;for(const x of [60,350,650,940]){c.beginPath();c.moveTo(x,42);c.lineTo(x+20,5);c.lineTo(1000-x,5);c.stroke()}
 text('WEST GARDEN',130,626,10,'#8ba18a');text('THE LAST CONSERVATORY',500,626,10,'#8ba18a');text('EASTERN GATE',880,626,10,'#8ba18a');
}
function frame(now){const dt=previous?(now-previous)/1000:0;previous=now;clock+=Math.min(dt,.05);if(active&&!document.hidden){const down=d=>keys.has(d)||touch.has(d);game.update(dt,Number(down('right'))-Number(down('left')),Number(down('down'))-Number(down('up')))}draw();requestAnimationFrame(frame)}
reset();requestAnimationFrame(frame);
