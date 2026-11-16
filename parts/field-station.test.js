import {test} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {attach as expedition} from './signal-trail.js';
import {moveDisk} from './trail-walker.js';
import {fitModel,attach as propKit} from './world-prop-kit.js';
const world=JSON.parse(readFileSync(new URL('./field-station/world.json',import.meta.url)));

test('the expedition requires supplies, proximity, the log and correct tuning before transmission',()=>{
 const actor={x:0,z:0},events=[],rules=expedition(actor,{sites:world.sites,frequency:world.frequency,onEvent:e=>events.push(e)});
 const at=id=>{const site=world.sites.find(s=>s.id===id);Object.assign(actor,{x:site.x,z:site.z});};
 at('radio');assert.equal(rules.use('radio').ok,false);assert.equal(rules.state.won,false);
 at('generator');assert.equal(rules.use('generator').ok,false);
 assert.equal(rules.use('fuel').ok,false);assert.deepEqual(rules.state.items,[]);
 at('fuel');assert.equal(rules.use('fuel').ok,true);assert.equal(rules.use('fuel').ok,false);
 at('generator');assert.equal(rules.use('generator').ok,false);
 at('fuse');assert.equal(rules.use('fuse').ok,true);
 at('generator');assert.equal(rules.use('generator').ok,true);assert(rules.state.power);
 at('radio');rules.tune(world.frequency);assert.equal(rules.use('radio').ok,false);
 at('log');rules.use('log');rules.tune(88);at('radio');assert.equal(rules.use('radio').ok,false);
 rules.tune(world.frequency);assert.equal(rules.signal,1);assert.equal(rules.use('radio').ok,true);assert(rules.state.won);
 rules.reset();assert.deepEqual(rules.state.items,[]);assert.equal(rules.state.power,false);assert.equal(rules.state.won,false);
 rules.tune(NaN);assert.equal(rules.state.frequency,88);rules.tune(100);assert.equal(rules.state.frequency,96);
 rules.dispose();assert.equal(rules.use('radio').ok,false);assert(events.length>8);
});

test('walking substeps cannot tunnel through props; diagonal movement slides and respects bounds',()=>{
 const opts={colliders:[{x:0,z:0,radius:1}],bounds:10,radius:.32};
 const p={x:-5,z:0};moveDisk(p,10,0,opts);assert(p.x<=-1.32&&p.x>-1.6);
 moveDisk(p,1,2,opts);assert(p.z>1.8);assert(Math.hypot(p.x,p.z)>=1.32);
 moveDisk(p,100,0,opts);assert(p.x<=9.68);
});

test('model wrappers normalize authored transforms without mutating the source',()=>{
 const source=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(2,4,1),new T.MeshStandardMaterial());mesh.position.set(4,7,2);source.add(mesh);
 const fitted=fitModel(source,2),box=new T.Box3().setFromObject(fitted),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 assert(Math.abs(size.y-2)<1e-6);assert(Math.abs(box.min.y)<1e-6);assert(Math.abs(center.x)<1e-6);assert(Math.abs(center.z)<1e-6);assert.equal(mesh.position.y,7);
});

test('new HDR and PBR maps match acquisition hashes and upstream byte counts',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../ingestion/polyhaven/batches/field-station/lighting.provenance.json',import.meta.url)));
 for(const p of provenance){const bytes=readFileSync(new URL('./'+p.file,import.meta.url));assert.equal(bytes.length,p.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);assert.equal(createHash('md5').update(bytes).digest('hex'),p.download.md5);}
});

test('registered procedural prototypes load and scatter without warehouse URLs',async()=>{
 const scene=new T.Scene(),kit=propKit(scene),source=new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshStandardMaterial());
 kit.register('local-tree',source);assert.equal(await kit.load('local-tree'),source);
 const batches=await kit.scatter('local-tree',[{x:1,z:2,height:4},{x:3,z:4,height:6}]);
 assert.equal(batches.length,1);assert.equal(batches[0].count,2);
 const matrix=new T.Matrix4();batches[0].getMatrixAt(0,matrix);const position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();matrix.decompose(position,rotation,scale);
 assert.equal(scale.y,2);assert.equal(position.x,1);kit.dispose();
});

test('open play removes the checklist and has reversible generator and optional radio toys',()=>{
 const actor={x:-3.8,z:4},rules=expedition(actor,{sites:world.sites,openPlay:true});
 assert(rules.use('generator').ok);assert(rules.state.power);rules.use('generator');assert.equal(rules.state.power,false);
 rules.use('generator');Object.assign(actor,{x:0,z:0});rules.tune(91.6);assert(rules.use('radio').ok);assert.equal(rules.state.won,false);assert.deepEqual(rules.state.items,[]);
});

test('stone toy hits targets along a simulated arc and stays bounded after repeated throws',async()=>{
 const {attach}=await import('./trail-playground.js');let hit=null;
 const toy=attach(null,{targets:[{id:'bell',x:0,y:1.4,z:-5,radius:.5}],onHit:e=>hit=e});
 toy.throwStone({x:0,y:1.6,z:0},{x:0,y:.13,z:-1});for(let i=0;i<100;i++)toy.update(.016);
 assert.equal(toy.hits,1);assert.equal(hit.target.id,'bell');
 for(let i=0;i<100;i++)toy.throwStone({x:2,y:1.6,z:0},{x:1,y:.5,z:0});assert(toy.stones.length<=16);
 for(let i=0;i<400;i++)toy.update(.016);assert.equal(toy.stones.length,0);toy.dispose();assert.equal(toy.throwStone({x:0,y:1,z:0},{x:0,y:0,z:1}),null);
});
