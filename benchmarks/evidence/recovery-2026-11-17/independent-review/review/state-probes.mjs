import assert from 'node:assert/strict';
import {createGame as larch,relics} from '../Larch/core.mjs';
import {createGame as willow,step,ITEMS} from '../Willow/game.mjs';
for(const label of ['Larch','Willow']){
 const isL=label==='Larch',items=isL?relics:ITEMS;
 for(let mask=0;mask<8;mask++){
  const g=isL?larch():willow(),set=(x,y)=>{if(isL){g.player.position.x=x;g.player.position.z=y}else{g.x=x;g.y=y}},tick=()=>isL?g.update(0):step(g,{},0);
  for(let i=0;i<3;i++)if(mask&(1<<i)){set(items[i].x,items[i].y);tick();tick()}
  assert.equal(isL?g.found.size:g.collected.length,[0,1,2].filter(i=>mask&(1<<i)).length);
  set(isL?925:450,isL?310:60);tick();assert.equal(g.won,mask===7);
 }
 const g=isL?larch():willow();const route=isL?[[90,90],[880,90],[880,490],[880,90],[535,90],[535,125],[535,90],[120,90],[120,135],[120,90],[880,90],[880,310],[925,310]]:[[450,465],[450,300],[100,300],[100,150],[140,150],[100,150],[100,300],[800,300],[800,150],[745,150],[800,150],[800,300],[450,300],[450,70]];
 for(const [x,y]of route){for(let i=0;i<20000;i++){const px=isL?g.player.position.x:g.x,py=isL?g.player.position.z:g.y,dx=x-px,dy=y-py;if(g.won||Math.hypot(dx,dy)<2)break;if(isL)g.update(1/120,Math.abs(dx)<1?0:Math.sign(dx),Math.abs(dy)<1?0:Math.sign(dy));else step(g,{right:dx>1,left:dx< -1,down:dy>1,up:dy< -1},1/120);if(i===19999)assert.fail(`${label} blocked at ${px},${py}`)}}
 assert.equal(g.won,true);console.log(`PASS ${label}: all 8 inventory subsets gate correctly; repeated pickups deduplicate; independent walking route wins`);
}
