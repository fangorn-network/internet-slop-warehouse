// Original CC0 models for the Weird Worlds catalog batch. No image textures or external inputs.
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdirSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}};
const dir=new URL('./originals/',import.meta.url);mkdirSync(dir,{recursive:true});
const mat=(color,metalness=.3,roughness=.4)=>new T.MeshStandardMaterial({color,metalness,roughness});
const teal=mat(0x367a72),cream=mat(0xd6d9b8),dark=mat(0x202e32,.6),gold=mat(0xd7a96a,.7),glow=new T.MeshStandardMaterial({color:0xa9efcd,emissive:0x5cc8a2,emissiveIntensity:2});
function add(g,geo,material,p=[0,0,0],s=[1,1,1],name=''){const m=new T.Mesh(geo,material);m.position.set(...p);m.scale.set(...s);m.name=name;g.add(m);return m;}
const box=(g,m,p,s,name)=>add(g,new T.BoxGeometry(1,1,1),m,p,s,name);
const ball=(g,m,p,s,name)=>add(g,new T.SphereGeometry(1,20,12),m,p,s,name);
const models=[];
{
 const g=new T.Group();g.name='Courier_skiff';
 ball(g,teal,[0,.35,0],[1.05,.38,2.05],'Hull');box(g,cream,[0,.58,-.1],[1.5,.13,2.8],'Deck');
 ball(g,dark,[0,.83,.35],[.62,.5,.9],'Canopy');box(g,gold,[0,.9,1.85],[.9,.12,.12],'Bow_rail');
 for(const x of [-1,1]){ball(g,dark,[x,.4,-1.25],[.35,.35,.75],'Engine_pod');const ring=add(g,new T.TorusGeometry(.29,.06,8,20),glow,[x,.4,-1.9]);}
 box(g,glow,[0,.69,1.32],[.75,.04,.1],'Headlight');box(g,gold,[0,1.35,-.75],[.06,1.3,.06],'Antenna');ball(g,glow,[0,2,-.75],[.12,.12,.12],'Signal');
 models.push({id:'courier-skiff',title:'Electric courier skiff',group:g,description:'An original teal electric skiff with cream deck, canopy, two engine pods, antenna and glowing headlight. Approximately 2.7 wide by 4.1 long; forward is +Z. Feet at y=0. A compact player vehicle for flooded worlds.',tags:['vehicle','boat','skiff','courier','sci-fi']});
}
{
 const g=new T.Group();g.name='Magnetic_salvage_tug';
 ball(g,gold,[0,.5,0],[.9,.52,1.15],'Body');box(g,dark,[0,.7,.1],[1.3,.6,1.35],'Cab');box(g,glow,[0,.9,.8],[.95,.12,.04],'Eyes');
 for(const x of [-1,1]){const r=add(g,new T.TorusGeometry(.4,.14,10,20),dark,[x,.3,-.35]);r.rotation.x=Math.PI/2;box(g,cream,[x,.2,1.2],[.16,.18,1.8],'Fork');}
 box(g,gold,[0,.2,2],[2,.16,.18],'Magnet_bar');box(g,glow,[0,.2,2.12],[1.6,.1,.08],'Magnet_light');
 models.push({id:'magnetic-salvage-tug',title:'Magnetic salvage tug',group:g,description:'An original amber hover tug with light bar eyes, ring thrusters and a front magnetic fork. Forward is +Z; roughly 2.8 wide and 3.6 long. Texture-free materials. A player or friendly industrial NPC.',tags:['vehicle','drone','forklift','magnet','industrial']});
}
{
 const g=new T.Group();g.name='Resonator_crystal';
 add(g,new T.CylinderGeometry(.65,.9,.3,16),gold,[0,.15,0],undefined,'Base');
 const crystal=add(g,new T.OctahedronGeometry(.7,0),new T.MeshStandardMaterial({color:0xb5ddd9,metalness:.5,roughness:.18,emissive:0x305c63,emissiveIntensity:.5}),[0,1.1,0],[1,1.5,1],'Crystal');
 const ring=add(g,new T.TorusGeometry(.85,.035,8,40),gold,[0,1,0]);ring.rotation.x=Math.PI/2;
 models.push({id:'resonator-crystal',title:'Resonator crystal',group:g,description:'An original octahedral crystal suspended above a brass pedestal, circled by a thin ring. About 2.2 units tall. Named Crystal mesh can be recolored for matching puzzles; no external textures.',tags:['crystal','puzzle','resonator','artifact','sculpture']});
}
{
 const g=new T.Group();g.name='Signal_buoy';
 add(g,new T.CylinderGeometry(.65,.8,.3,20),teal,[0,.15,0],undefined,'Float');add(g,new T.CylinderGeometry(.05,.1,1.8,10),gold,[0,1.15,0],undefined,'Mast');
 ball(g,glow,[0,2.1,0],[.22,.3,.22],'Beacon');const ring=add(g,new T.TorusGeometry(.42,.045,8,32),cream,[0,2.1,0]);ring.rotation.x=Math.PI/2;
 models.push({id:'signal-buoy',title:'Marsh signal buoy',group:g,description:'An original teal-and-brass buoy with a luminous beacon and ring guard. About 2.4 units tall, base centered at the origin. Ideal for checkpoints, navigation markers and delivery destinations.',tags:['buoy','beacon','checkpoint','light','water']});
}
{
 const g=new T.Group();g.name='Garden_caretaker';
 ball(g,dark,[0,.28,0],[.3,.28,.3],'Wheel');add(g,new T.CapsuleGeometry(.32,.55,6,12),cream,[0,.95,0],undefined,'Body');
 ball(g,cream,[0,1.5,0],[.38,.33,.36],'Head');box(g,dark,[0,1.52,.31],[.5,.15,.12],'Visor');
 for(const x of [-.13,.13])ball(g,glow,[x,1.53,.39],[.055,.04,.025],'Eye');
 const scarf=add(g,new T.TorusGeometry(.31,.05,8,24),teal,[0,1.27,0]);scarf.rotation.x=Math.PI/2;
 for(const x of [-.45,.45])ball(g,gold,[x,.95,.1],[.12,.3,.12],'Arm');
 models.push({id:'garden-caretaker',title:'Porcelain garden caretaker',group:g,description:'An original small porcelain-and-brass caretaker robot with a single spherical wheel, teal collar, visor and two emissive eyes. About 1.85 units tall, forward +Z. Texture-free; suitable for small exploration and puzzle worlds.',tags:['robot','character','caretaker','garden','player']});
}
const entries=[],provenance=[];
for(const m of models){
 m.group.updateMatrixWorld(true);const bytes=Buffer.from(await new GLTFExporter().parseAsync(m.group,{binary:true}));writeFileSync(new URL(m.id+'.glb',dir),bytes);
 entries.push({id:m.id,file:'originals/'+m.id+'.glb',type:'asset',mime:'model/gltf-binary',title:m.title,description:m.description,tags:['model','gltf','original',...m.tags],author:'the internet slop warehouse',license:'CC0-1.0'});
 let triangles=0;m.group.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 provenance.push({id:m.id,creator:'the internet slop warehouse',license:'CC0-1.0',source:'parts/make-world-assets.js',process:'Original procedural geometry, original material palette; GLTFExporter 0.170.0; no external art inputs.',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,triangles});
 console.log(m.id,bytes.length,triangles);
}
writeFileSync(new URL('parts.json',dir),JSON.stringify(entries,null,2)+'\n');writeFileSync(new URL('provenance.json',dir),JSON.stringify(provenance,null,2)+'\n');
