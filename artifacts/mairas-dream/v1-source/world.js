// SPDX-License-Identifier: CC0-1.0
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makePiece} from './prop-kit.js';
import {catalog} from './rules.js';
export function buildWorld(scene){
const obstacles=[],targets=[],items=new Map(),doors=[],cats=[],shoppers=[];const palette=['#9a695e','#75896c','#607b8d','#c1a165','#ab8d9b','#dfd5b8'];const mats=new Map();
const material=c=>{if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.8}));return mats.get(c);};
function box(c,x,y,z,w,h,d,solid=false){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=h<4;scene.add(m);if(solid)obstacles.push({x,z,w,d});return m;}
function prop(kind,x,z,y=0,variant=0,rot=0){const g=makePiece(kind,variant);g.position.set(x,y,z);g.rotation.y=rot;scene.add(g);return g;}
function label(text,x,y,z,width=3,color='#395d56',size=52,rotation=0){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1024,256);ctx.fillStyle='#f6efdb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${size}px Arial`;ctx.fillText(text,512,128,960);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:tex,side:T.FrontSide}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);const back=m.clone();back.rotation.y+=Math.PI;back.position.x-=Math.sin(rotation)*.015;back.position.z-=Math.cos(rotation)*.015;scene.add(back);return m;}
// 30 × 26 meter store; front at +13, parking extends to +51.
box('#dedbca',0,-.15,0,30,.3,26);box('#616e68',0,-.16,33,42,.25,40);
for(let x=-15;x<=15;x+=2)box('#c9c9b8',x,.003,0,.013,.008,26);
for(let z=-13;z<=13;z+=2)box('#c9c9b8',0,.004,z,30,.008,.013);
box('#e5dfce',-15,2.3,0,.25,4.6,26,true);box('#e5dfce',15,2.3,0,.25,4.6,26,true);
box('#e5dfce',-1.5,2.3,-13,27,.0+4.6,.25,true);box('#e5dfce',14.5,2.3,-13,1,4.6,.25,true);
box('#799085',0,3.2,-12.82,30,.65,.03);box('#ddd6c3',0,4.65,0,30,.15,26);
for(let x=-12;x<=12;x+=6)for(let z=-10;z<=10;z+=5){box('#fff4ce',x,4.54,z,1.8,.04,.65);const panel=new T.MeshBasicMaterial({color:'#fff4da'});const m=box('#fff4da',x,4.5,z,1.65,.015,.54);m.material=panel;}
for(let x=-15;x<=15;x+=3)box('#c1c4b6',x,4.53,0,.025,.04,26);
for(let z=-13;z<=13;z+=3)box('#c1c4b6',0,4.52,z,30,.04,.025);
// Front glass and sliding doors. Collision is controlled independently by door openness.
const glass=new T.MeshStandardMaterial({color:'#b4d3cc',transparent:true,opacity:.21,roughness:.15});
for(const x of [-9.1,9.1]){const m=box('#92b8b0',x,1.7,13,11.8,3.4,.09);m.material=glass;obstacles.push({x,z:13,w:11.8,d:.1});}
box('#ded7be',0,3.95,13,30,1.3,.25);label('SECOND CHANCES',0,3.9,13.17,9,'#365e52',64);label('THRIFT & OTHERWISE',0,3.35,13.17,6,'#365e52',43);
for(const s of [-1,1]){const d=new T.Group();d.position.set(s*1.4,0,13);const pane=new T.Mesh(new T.BoxGeometry(2.75,3.25,.08),glass);pane.position.y=1.65;d.add(pane);for(const x of [-1.37,1.37]){const frame=new T.Mesh(new T.BoxGeometry(.05,3.3,.12),material('#7c9387'));frame.position.set(x,1.65,0);d.add(frame);}scene.add(d);doors.push({root:d,side:s});}
box('#384f45',0,3.1,12.8,.18,.09,.12);label('EXIT',0,2.95,12.8,1.1,'#426c4c',65,Math.PI);
// Separate rear side-hinged exit; interactable, never locked.
box('#6d8273',13,1.15,-13,1.9,2.3,.12);label('EXIT',13,2.65,-12.8,1,'#426c4c',65);targets.push({id:'rear-exit',position:new T.Vector3(13,1,-12.4),type:'rear-exit',name:'Rear emergency exit'});
label('GOOD FINDS. QUESTIONABLE HISTORIES.',0,3.25,-12.6,11,'#799085',53);
// Checkout at the front.
for(const x of [-7,7]){box('#ac9b79',x,.5,9.7,3.4,1,1.1,true);box('#e4dbc5',x,1.04,9.7,3.55,.1,1.2);prop('register',x,9.7,1.1,0,Math.PI);prop('cashier',x,10.8,0,0,Math.PI);label(x<0?'01 · OPEN':'02 · PLEASE USE 01',x,2.8,9.7,2.8,'#426b5d',50,Math.PI);}
targets.push({id:'checkout',position:new T.Vector3(-7,1,8.65),type:'checkout',name:'Checkout · register 01'});
// Clothing: separate casual/formal tops, bottoms, children, intimates and shared shoe wall.
for(const [x,z,title,round] of [[-10,5,'MEN’S · BOTTOMS',false],[-10,0,'MEN’S · TOPS',false],[-4,4,'WOMEN’S · TOPS',false],[-4,-1,'WOMEN’S · BOTTOMS',false],[2,4,'CHILDREN',true],[2,-1,'SOCKS & BASICS',true]]){
prop(round?'round-rack':'rack',x,z);obstacles.push({x,z,w:round?2.35:2.9,d:round?2.35:1.1});label(title,x,2.55,z,3,'#657b67',46);
const n=round?16:12;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const p=prop(title.includes('BOTTOMS')?'trousers':'shirt',x+(round?Math.sin(a):(-1.15+i*.21)),z+(round?Math.cos(a):0),round?.55:.57,i,round?a:Math.PI/2);if(title==='CHILDREN')p.scale.setScalar(.72);}
}
// Shelves are double-sided; rows leave a continuous wide central aisle.
for(const [x,z,title] of [[-10,-9,'BOOKS & MEDIA'],[-6,-9,'BOOKS & MEDIA'],[7,-8,'ELECTRONICS'],[11,-8,'HARDWARE'],[11,-2,'HOUSEWARES'],[7,-2,'LAMPS & ODDITIES']]){
prop('shelf',x,z);obstacles.push({x,z,w:2.6,d:.85});label(title,x,2.45,z,3.2,'#9a7b4f',46);
for(let tier=0;tier<3;tier++)for(let i=0;i<7;i++){const kind=title.includes('BOOKS')?'book':title==='ELECTRONICS'?(i%3===0?'radio':'lamp'):title==='HARDWARE'?'hammer':title==='HOUSEWARES'?(i%2?'mug':'plate'):'lamp';const p=prop(kind,x-1+i*.33,z+.23,.73+tier*.54,i);p.scale.setScalar(kind==='lamp'||kind==='radio'?.43:kind==='hammer'?.65:.8);}
}
// Furniture corner, shoes and a media bargain bin.
prop('sofa',1,-9);obstacles.push({x:1,z:-9,w:2.6,d:1.25});label('FURNITURE',1,2.5,-10,3,'#9a7b4f',48,Math.PI);
box('#a68c66',-13.8,.6,-5,1.5,1.2,3,true);label('ALL-GENDER SHOES',-13.6,2.5,-5,3,'#657b67',42,Math.PI/2);
for(let i=0;i<16;i++)box(palette[i%6],-13.8+(i%2)*.35,.9+Math.floor(i/8)*.4,-6+(i%8)*.28,.35,.15,.2);
box('#d6c5a3',-2,.5,-8,1.5,1,1.1,true);for(let i=0;i<16;i++)prop('book',-2.5+i*.065,-8,.87,i,Math.PI/2);
// Small end displays support the individually tagged clothing and hanger.
for(const [x,z,h] of [[-10,2,1.57],[-4,3,1.62],[-10,6,1.37]]){box('#a5aca8',x-.36,h/2,z,.035,h,.035);box('#a5aca8',x,h,z,.8,.035,.035);box('#858e8a',x-.36,.04,z,.4,.08,.35);}
// Selectable merchandise is physically on the ends/front of fixtures, each with a paper tag.
for(const item of catalog){const displayZ=item.z+(['hammer','mug','plate','lamp','radio','book'].includes(item.id)?.55:0);const mesh=prop(item.kind,item.x,displayZ,item.y,2);items.set(item.id,mesh);const target={...item,position:new T.Vector3(item.x,item.y+.2,displayZ),type:'item',mesh};targets.push(target);label('$'+(item.price/100).toFixed(2),item.x,item.y+.35,displayZ+.2,.36,'#dfd0a5',60);}
// Manager office behind the back aisle.
box('#a99c84',-1,1.25,-11.8,4.4,2.5,.15,true);label('MANAGER · PLEASE DON’T',-1,2.7,-11.65,3.9,'#665c57',44);const manager=prop('manager',0,-6.3,0,0,Math.PI);
for(const [x,z]of [[-13,10.8],[13,-10.5]]){const mesh=prop('extinguisher',x,z,.8);label('FIRE',x,2.2,z,.75,'#a44133',72,Math.PI);targets.push({id:`ext-${x}`,position:new T.Vector3(x,1.1,z),type:'extinguisher',name:'Wall-mounted extinguisher',mesh});}
for(let i=0;i<5;i++){const x=[-7,-1,4,9,-12][i],z=[-4,6,-5,4,7][i];const root=prop('shopper',x,z,0,i,Math.PI);shoppers.push({root,origin:new T.Vector3(x,0,z),time:i*1.7});}
// Parking lot: striping, islands, curb, and the player's car at the far end.
for(const s of [-1,1])for(let j=0;j<5;j++){const x=s*9,z=20+j*5;box('#e5d6a2',x,.003,z,6,.014,.09);if(j!==4||s!==1){prop('car',x,z+2.2,0,j%2,s*Math.PI/2);obstacles.push({x,z:z+2.2,w:4.2,d:2.05});}}
const car=prop('car',4,46,0,0,Math.PI);obstacles.push({x:4,z:46,w:2,d:4});targets.push({id:'car',position:new T.Vector3(2.5,1,46),type:'car',name:'Your car · finally'});label('YOUR CAR',4,2.6,46,2.5,'#426b5d',60,Math.PI);
for(const x of [-18,18]){box('#c9c5ac',x,.12,32,1,.25,38,true);for(const z of [18,32,47]){box('#5e7360',x,.4,z,2.8,.5,4);const trunk=box('#877557',x,2,z,.3,3,.3);const crown=new T.Mesh(new T.IcosahedronGeometry(2,1),material('#7f9164'));crown.position.set(x,4,z);scene.add(crown);}}
for(let i=0;i<4;i++)cats.push(prop('cat',-3+i*2,17+i));
function blocked(x,z,doorOpen){if(x<-17||x>17||z<-12.5||z>51)return true;if(z<13&&Math.abs(x)>14.55)return true;if(Math.abs(z-13)<.42&&(Math.abs(x)>2.5||doorOpen<.75))return true;return obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.27&&Math.abs(z-o.z)<o.d/2+.27);}
function visible(a,b){const dx=b.x-a.x,dz=b.z-a.z,steps=Math.ceil(Math.hypot(dx,dz)*3);for(let i=1;i<steps;i++){const x=a.x+dx*i/steps,z=a.z+dz*i/steps;if(obstacles.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2))return false;}return true;}
// Batch static geometry by shared material; interactive/dynamic roots retain their identities.
const dynamic=new Set([...items.values(),...doors.map(d=>d.root),...cats,...shoppers.map(s=>s.root),manager,...targets.filter(t=>t.mesh).map(t=>t.mesh)]);
scene.updateMatrixWorld(true);const batches=new Map(),old=[];
for(const root of [...scene.children]){if(dynamic.has(root))continue;root.traverse(node=>{if(!node.isMesh||node.material.map||Array.isArray(node.material))return;const copy=node.geometry.clone().applyMatrix4(node.matrixWorld);const geometry=copy.index?copy.toNonIndexed():copy;if(geometry!==copy)copy.dispose();if(!batches.has(node.material))batches.set(node.material,[]);batches.get(node.material).push(geometry);old.push(node);});}
for(const node of old)node.removeFromParent();
for(const [material,geometries] of batches){const merged=mergeGeometries(geometries);if(!merged)throw Error('Static geometry batch failed');const mesh=new T.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);geometries.forEach(g=>g.dispose());}
return{targets,items,doors,cats,shoppers,manager,car,blocked,visible,box,label};
}
