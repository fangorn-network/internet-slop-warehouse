// SPDX-License-Identifier: CC0-1.0
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {attach as gridNavigation} from './vendor/grid-navigation.js';
import {catalog,shelves,racks} from './stock.js';
export function buildWorld(scene,library){
const obstacles=[],occluders=[],staticRoots=[],targets=new Map(),stockMeshes=[],doors=[],cats=[],shoppers=[],cashiers=[],itemEntries=new Map();const materials=new Map();
const material=c=>{if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.78}));return materials.get(c);};
const root=new T.Group();scene.add(root);
function box(c,x,y,z,w,h,d,solid=false){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=y<4;root.add(m);staticRoots.push(m);if(solid){obstacles.push({x,z,w,d});occluders.push(m);}return m;}
function prop(kind,x,z,y=0,rotation=0,scale=1){const g=library.makeDisplay(kind);g.position.set(x,y,z);g.rotation.y=rotation;g.scale.multiplyScalar(scale);root.add(g);staticRoots.push(g);return g;}
function label(text,x,y,z,width=3,color='#315870',rotation=0){const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#f6f1df';ctx.font='600 43px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,65,730);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width>5?.72:width/6),new T.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);m.rotation.y=rotation;root.add(m);const back=m.clone();back.rotation.y+=Math.PI;back.position.add(new T.Vector3(-Math.sin(rotation)*.015,0,-Math.cos(rotation)*.015));root.add(back);return m;}
// Used tile, blue department stripe, real fixtures. Keep the bright, ordinary retail mood.
const floor=box('#d5d3c6',0,-.12,0,30,.24,26);const tile=document.createElement('canvas');tile.width=tile.height=256;const tc=tile.getContext('2d');tc.fillStyle='#cecec3';tc.fillRect(0,0,256,256);for(let i=0;i<7000;i++){const a=Math.random();tc.fillStyle=a>.5?'#c1c2b7':'#d5d5cb';tc.fillRect(Math.random()*256,Math.random()*256,1,1);}tc.strokeStyle='#a4a99e';tc.lineWidth=1;tc.strokeRect(.5,.5,255,255);const tex=new T.CanvasTexture(tile);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(30,26);floor.material=new T.MeshStandardMaterial({map:tex,color:'#eeede6',roughness:.64});
box('#555b59',0,-.14,33,42,.25,40);for(let x=-15;x<=15;x+=2)box('#cfceb6',x,.01,14,.04,.02,2);
for(const x of [-15,15]){box('#e4e4d9',x,2.3,0,.25,4.6,26,true);box('#3b6684',x,3.05,0,.28,.75,26);box('#8b8f82',x,.12,0,.29,.24,26);}
box('#e4e4d9',0,2.3,-13,30,4.6,.25,true);box('#3b6684',0,3.05,-12.83,30,.75,.04);box('#d7d9d0',0,4.65,0,30,.12,26);
for(let x=-13;x<15;x+=3)box('#b5bcb2',x,4.52,0,.025,.035,26);for(let z=-12;z<13;z+=3)box('#b5bcb2',0,4.52,z,30,.035,.025);
for(let x=-11;x<=13;x+=6)for(let z=-10;z<=10;z+=5){prop('fluorescent',x,z,4.28);const glow=box('#fffde7',x,4.27,z,1.45,.015,.18);glow.material=new T.MeshBasicMaterial({color:'#e9f4e1'});}
label('GOOD FINDS. QUESTIONABLE HISTORIES.',0,3.1,-12.75,13,'#3b6684');
// Front glazing and independent sliding leaves.
const glass=new T.MeshStandardMaterial({color:'#a6c4c5',transparent:true,opacity:.15,roughness:.12});
for(const x of [-9,9]){const m=box('#aacac4',x,1.6,13,12,3.2,.08);m.material=glass;obstacles.push({x,z:13,w:12,d:.1});}
box('#d6d1c1',0,3.9,13,30,1.4,.25);label('SECOND CHANCES',0,3.95,13.18,9,'#315870');label('THRIFT & OTHERWISE',0,3.42,13.18,5,'#315870');
for(const s of [-1,1]){const d=new T.Group();d.position.set(s*1.4,0,13);const pane=new T.Mesh(new T.BoxGeometry(2.75,3.2,.07),glass);pane.position.y=1.65;d.add(pane);for(const x of [-1.38,1.38]){const frame=new T.Mesh(new T.BoxGeometry(.045,3.3,.1),material('#9aada7'));frame.position.set(x,1.65,0);d.add(frame);}root.add(d);doors.push({root:d,side:s});}
label('EXIT',0,3,12.8,1,'#3f7356',Math.PI);
// Emergency door is always usable; its outside passage is represented by a transition.
box('#768f7c',13.3,1.15,-12.78,1.9,2.3,.08);label('EXIT',13.3,2.6,-12.7,1,'#3f7356');targets.set('rear-exit',{id:'rear-exit',type:'rear-exit',name:'Rear exit',position:new T.Vector3(13.3,1.2,-12),radius:2});
for(const x of [-7,7]){box('#99907a',x,.48,9.8,3.6,.96,1.1,true);box('#d9d3c5',x,1,9.8,3.8,.08,1.2);prop('register',x,9.8,1.04,Math.PI);label(x<0?'01 · OPEN':'02 · CLOSED',x,2.7,9.8,2.7,'#315870');const npc=library.character('cashier');npc.root.position.set(x,0,10.9);npc.root.rotation.y=Math.PI;root.add(npc.root);cashiers.push(npc);}
targets.set('checkout',{id:'checkout',type:'checkout',name:'Joan · register 01',position:new T.Vector3(-7,1.45,8.9),radius:2.1});
// Every display is stock, not a painted backdrop. Real wooden shelving mixed with reused fixtures.
for(const s of shelves){const g=prop(s.section==='media'?'bookshelf':'shelf',s.x,s.z);obstacles.push({x:s.x,z:s.z,w:2.7,d:.78});g.traverse(n=>{if(n.isMesh)occluders.push(n);});label(({media:'BOOKS & MEDIA',home:'HOME & KITCHEN',electrics:'ELECTRONICS',hardware:'HARDWARE'})[s.section],s.x,2.7,s.z,2.8);}
for(const r of racks){prop(r.round?'round-rack':'rack',r.x,r.z);obstacles.push({x:r.x,z:r.z,w:r.round?2.25:2.7,d:r.round?2.25:1.0});label(r.section.toUpperCase(),r.x,2.65,r.z,2.85);}
for(const [x,z,h] of [[-11,2.7,1.62],[-6.4,3.95,1.58],[-11,5.5,1.4]]){box('#9da59e',x-.4,h/2,z,.035,h,.035);box('#9da59e',x,h,z,.88,.035,.035);}
box('#9b8d70',-14,.6,-5,1.2,1.2,3.4,true);label('SHOES · ALL SIZES',-13.7,2.5,-5,3,'#315870',Math.PI/2);
prop('sofa',.1,-9,0,Math.PI);obstacles.push({x:.1,z:-9,w:2.6,d:1.2});prop('armchair',2.7,-10.5,0,-.5);obstacles.push({x:2.7,z:-10.5,w:1,d:1});prop('table',.2,-6.7);obstacles.push({x:.2,z:-6.7,w:1.4,d:.8});prop('cabinet',-13.7,-10.9,0,Math.PI/2);label('FURNITURE',.1,2.7,-10.8,3);
function surfaces(kind){const model=library.prototype(kind);model.updateMatrixWorld(true);const areas=new Map();model.traverse(n=>{if(!n.isMesh)return;const pos=n.geometry.attributes.position,idx=n.geometry.index;for(let k=0;k<(idx?idx.count:pos.count);k+=3){const pts=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,idx?idx.getX(k+j):k+j).applyMatrix4(n.matrixWorld));const lo=Math.min(...pts.map(v=>v.y)),hi=Math.max(...pts.map(v=>v.y));if(hi-lo>.012)continue;const a=pts[1].clone().sub(pts[0]),b=pts[2].clone().sub(pts[0]),area=Math.abs(a.x*b.z-a.z*b.x)/2,y=Math.round((lo+hi)*50)/100;areas.set(y,(areas.get(y)??0)+area);}});return [...areas].sort((a,b)=>b[1]-a[1]).slice(0,18);}
const shelfSurfaceInfo={shelf:surfaces('shelf'),bookshelf:surfaces('bookshelf')};
// Merchandise instances: one identity per physical piece, shared draw calls per model/material.
const grouped=new Map();for(const item of catalog){const scanned=['desk-lamp','vase','pot','kettle','boombox'].includes(item.kind);const key=item.kind+':'+(scanned?0:item.variant);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(item);}
for(const list of grouped.values()){const first=list[0],prototype=library.displayPrototype(first.kind,first.variant);prototype.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(prototype);const transforms=list.map(item=>new T.Matrix4().compose(new T.Vector3(item.x,item.y,item.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),item.rotation??0),new T.Vector3().setScalar(item.scale??1)));
list.forEach((item,index)=>{const b=bounds.clone().applyMatrix4(transforms[index]);targets.set(item.id,{...item,type:'item',position:b.getCenter(new T.Vector3()),bounds:b,radius:2.35});itemEntries.set(item.id,[]);});
prototype.traverse(node=>{if(!node.isMesh)return;const mesh=new T.InstancedMesh(node.geometry,node.material,list.length);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=['desk-lamp','boombox','kettle','pot'].includes(first.kind);mesh.receiveShadow=true;mesh.userData.stock=list.map(i=>i.id);list.forEach((item,index)=>{const matrix=transforms[index].clone().multiply(node.matrixWorld);mesh.setMatrixAt(index,matrix);itemEntries.get(item.id).push({mesh,index,matrix});});mesh.computeBoundingSphere();root.add(mesh);stockMeshes.push(mesh);});}
function setVisible(id,visible){for(const e of itemEntries.get(id)??[]){e.mesh.setMatrixAt(e.index,visible?e.matrix:new T.Matrix4().makeScale(0,0,0));e.mesh.instanceMatrix.needsUpdate=true;}const t=targets.get(id);if(t)t.hidden=!visible;}
box('#8c8f83',9,1.8,-8.04,.05,.035,.25);
// Little paper tags: shared geometry, physical marks on every piece rather than floating signs.
const tagGeo=new T.PlaneGeometry(.045,.065),tags=new T.InstancedMesh(tagGeo,new T.MeshStandardMaterial({color:'#e5d9b8',side:T.DoubleSide}),catalog.length);const tagMatrices=new Map();catalog.forEach((item,i)=>{const t=targets.get(item.id),m=new T.Matrix4().makeTranslation(t.position.x,t.position.y,t.bounds.max.z+.012);tags.setMatrixAt(i,m);tagMatrices.set(item.id,{index:i,matrix:m});});tags.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(tags);
const baseSetVisible=setVisible;function visibleItem(id,visible){baseSetVisible(id,visible);const t=tagMatrices.get(id);if(t){tags.setMatrixAt(t.index,visible?t.matrix:new T.Matrix4().makeScale(0,0,0));tags.instanceMatrix.needsUpdate=true;}}
// Manager's office and real animated bodies.
box('#7c857d',-.1,1.2,-11.95,4.5,2.4,.1,true);label('MANAGER',-.1,2.7,-11.8,3,'#685e61');const manager=library.character('manager');manager.root.position.set(1.5,0,-5);root.add(manager.root);
const routes=[[[3,7],[3,2],[3,-6],[3,2]], [[-3,7],[-3,1],[-3,-3],[-3,1]], [[-13,6],[-13,1],[-13,-2],[-13,1]], [[11.2,6],[10.5,4],[6.2,4],[10.5,4]]];
for(let i=0;i<6;i++){const npc=library.character(i%3===0?'cashier':'civilian',i);const path=routes[i%routes.length];npc.root.position.set(path[0][0],0,path[0][1]);root.add(npc.root);shoppers.push({...npc,path,waypoint:1,pause:1+i,react:0,voiceCooldown:0});}
const extinguisher=library.make('extinguisher');root.add(extinguisher);const extinguisherTarget={id:'extinguisher',name:'Fire extinguisher',type:'extinguisher',position:new T.Vector3(),mesh:extinguisher,radius:1.8};targets.set('extinguisher',extinguisherTarget);
const extinguisherSpots=[[-14.35,8.2],[14.25,7.1],[-14.2,-1.8],[14.2,-6.1],[-4,-11.45],[6.6,-11.45],[3.7,6.8],[1.7,-11.4]];
for(let i=0;i<8;i++){const cat=library.make('cat');cat.position.set(-10+i*2,0,18);cat.visible=false;root.add(cat);cats.push(cat);}
// Parking lot.
for(const side of [-1,1])for(let j=0;j<5;j++){const x=side*9,z=20+j*5;box('#d8d0aa',x,.005,z,6,.015,.09);if(j<4||side<0){prop('car',x,z+2.2,0,side*Math.PI/2);obstacles.push({x,z:z+2.2,w:4.2,d:2.05});}}
const car=prop('car',4,46,0,Math.PI);obstacles.push({x:4,z:46,w:2,d:4});targets.set('car',{id:'car',name:'Your car',type:'car',position:new T.Vector3(2.45,1.2,46),radius:2.1});
for(const x of [-18,18]){box('#b9bbae',x,.1,32,1,.2,38);for(const z of [18,32,47]){box('#6c7e63',x,.3,z,2.8,.5,3.8);box('#71644f',x,2,z,.23,3,.23);const crown=new T.Mesh(new T.IcosahedronGeometry(1.8,1),material('#70835b'));crown.position.set(x,4,z);root.add(crown);staticRoots.push(crown);}}
function staticBlocked(x,z,r=.23){return obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);}
function blocked(x,z,doorOpen=1,people=true){if(x<-17||x>17||z<-12.5||z>51)return true;if(z<13&&Math.abs(x)>14.55)return true;if(Math.abs(z-13)<.4&&(Math.abs(x)>2.5||doorOpen<.78))return true;if(staticBlocked(x,z))return true;return people&&(shoppers.some(n=>Math.hypot(n.root.position.x-x,n.root.position.z-z)<.48)||Math.hypot(manager.root.position.x-x,manager.root.position.z-z)<.5);}
function visible(a,b){const d=Math.hypot(a.x-b.x,a.z-b.z),steps=Math.ceil(d*4);for(let i=1;i<steps;i++){const x=a.x+(b.x-a.x)*i/steps,z=a.z+(b.z-a.z)*i/steps;if(staticBlocked(x,z,0))return false;}return true;}
// A* for the manager uses the same fixture collision layout as the player.
const cell=.5,origin=[-15,-13],rows=[];for(let iz=0;iz<132;iz++){let row='';for(let ix=0;ix<60;ix++){const x=origin[0]+(ix+.5)*cell,z=origin[1]+(iz+.5)*cell;row+=blocked(x,z,1,false)?'#':'.';}rows.push(row);}const navigation=gridNavigation(null,{rows,origin,cellSize:cell});
const ray=new T.Raycaster(),v=new T.Vector2();ray.far=2.5;
function pick(camera){camera.updateMatrixWorld();root.updateMatrixWorld(true);ray.setFromCamera(v,camera);const hits=ray.intersectObjects([...stockMeshes,...occluders],false);for(const h of hits){if(h.object.userData.stock){const id=h.object.userData.stock[h.instanceId],t=targets.get(id);if(t&&!t.hidden)return t;}else break;}
// Small aim assistance for wire hangers, handles and thin spines: aim through a hole should still work.
const forward=new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion),block=hits.find(h=>!h.object.userData.stock)?.distance??Infinity;let assisted=null,best=.008;const delta=new T.Vector3();
for(const t of targets.values()){if(t.type!=='item'||t.hidden)continue;delta.copy(t.position).sub(camera.position);const d=delta.length();if(d>2.4||d>block+.08||d<.1)continue;const dot=forward.dot(delta.multiplyScalar(1/d)),score=(1-dot)*5+d*.001;if(dot>.9985&&score<best){best=score;assisted=t;}}if(assisted)return assisted;
// Larger interactions are spatial and aim-checked, never an arbitrary nearest object in a dense shelf.
for(const t of targets.values()){if(t.type==='item'||t.hidden)continue;const delta=t.position.clone().sub(camera.position),d=delta.length();if(d<t.radius&&forward.dot(delta.normalize())>.45)return t;}return null;}
function reset(seed,level){catalog.forEach(i=>visibleItem(i.id,true));const index=((seed*1664525+level*1013904223)>>>0)%extinguisherSpots.length;const [x,z]=extinguisherSpots[index];extinguisher.position.set(x,.72,z);extinguisher.rotation.y=x<0?Math.PI/2:x>10?-Math.PI/2:0;extinguisher.visible=true;extinguisherTarget.hidden=false;extinguisherTarget.position.set(x,1.08,z);cats.forEach((c,i)=>{c.visible=false;c.position.set(-2+i,0,17+i*2);});manager.root.position.set(1.5,0,-5);shoppers.forEach((n,i)=>{n.root.position.set(n.path[0][0],0,n.path[0][1]);n.waypoint=1;n.pause=1+i;n.react=0;});}
// Merge the simple architecture; instance repeated scanned fixtures with shared materials and UVs.
root.updateMatrixWorld(true);const simple=new Map(),scanned=new Map(),remove=[];
for(const r of staticRoots){r.traverse(n=>{if(!n.isMesh||n.material.transparent||Array.isArray(n.material))return;if(n.material.map){const key=n.geometry.uuid+':'+n.material.uuid;if(!scanned.has(key))scanned.set(key,{geometry:n.geometry,material:n.material,matrices:[]});scanned.get(key).matrices.push(n.matrixWorld.clone());remove.push(n);}else{const copy=n.geometry.clone().applyMatrix4(n.matrixWorld),geo=copy.index?copy.toNonIndexed():copy;if(copy!==geo)copy.dispose();if(!simple.has(n.material))simple.set(n.material,[]);simple.get(n.material).push(geo);remove.push(n);}});}
// Occluders retain low-cost invisible collision geometry after the visible fixtures are batched.
for(const n of remove){if(occluders.includes(n)){n.visible=false;n.layers.set(2);}else n.removeFromParent();}
for(const [mat,geos] of simple){const merged=mergeGeometries(geos);if(!merged)throw Error('Invalid architecture batch');const m=new T.Mesh(merged,mat);m.receiveShadow=true;m.castShadow=false;root.add(m);geos.forEach(g=>g.dispose());}
for(const {geometry,material,matrices} of scanned.values()){const m=new T.InstancedMesh(geometry,material,matrices.length);matrices.forEach((a,i)=>m.setMatrixAt(i,a));m.castShadow=true;m.receiveShadow=true;root.add(m);}
ray.layers.enable(2);reset(1,1);
return{root,targets,stockMeshes,catalog,cats,manager,shoppers,cashiers,doors,car,extinguisher,extinguisherTarget,navigation,obstacles,blocked,visible,pick,setVisible:visibleItem,reset,makeItem:item=>library.make(item.kind,item.variant),stats:{items:catalog.length,shelves:shelves.length,shelfSurfaceInfo}};
}
