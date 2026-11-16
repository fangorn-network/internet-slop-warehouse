import { test,expect } from 'vitest';
import * as T from 'three';
import { attach as drive } from './inertial-drive.js';
import { attach as course } from './checkpoint-course.js';
import { attach as spring } from './spring-tether.js';
import { attach as zones } from './trigger-zones.js';
import { attach as marsh } from './world-lantern-marsh.js';
import { attach as yard } from './world-lunar-yard.js';
import { attach as garden } from './world-resonance-garden.js';
import { attach as motes } from './ambient-motes.js';

test('inertial drive brakes, respects obstacles and bounds, and stops after disposal',()=>{
 const o=new T.Object3D();let input={x:1,z:0};const obstacle=new T.Box3(new T.Vector3(2,-1,-3),new T.Vector3(3,3,3));let impacts=0;
 const d=drive(o,{input:()=>input,speed:6,obstacles:[obstacle],bounds:[-5,5,-5,5],onImpact:()=>impacts++});
 for(let i=0;i<120;i++)d.update(1/60);expect(o.position.x).toBeLessThan(1.5);expect(impacts).toBeGreaterThan(0);
 input={x:0,z:1};for(let i=0;i<180;i++)d.update(1/60);expect(o.position.z).toBeLessThanOrEqual(5);
 input={x:0,z:0};for(let i=0;i<180;i++)d.update(1/60);expect(d.velocity.length()).toBeLessThan(.01);
 d.dispose();const p=o.position.clone();input={x:-1,z:0};d.update(.05);expect(o.position.equals(p)).toBe(true);
});
test('checkpoint courses catch swept crossings, require order, and finish once',()=>{
 const o=new T.Object3D();o.position.x=-3;let done=0;const got=[];
 const h=course(o,{points:[new T.Vector3(),new T.Vector3(5,0,0)],radius:.5,onCheckpoint:i=>got.push(i),onComplete:()=>done++});
 o.position.x=3;h.update();expect(h.index).toBe(1);o.position.x=5;h.update();h.update();expect(got).toEqual([0,1]);expect(done).toBe(1);expect(h.complete).toBe(true);
 h.reset();expect(h.complete).toBe(false);expect(h.index).toBe(0);
});
test('spring tether converges without teleporting and breaks once until released',()=>{
 const o=new T.Object3D();let point=new T.Vector3(3,2,1),breaks=0;const h=spring(o,{target:()=>point,maxDistance:8,onBreak:()=>breaks++});
 h.update(.016);expect(o.position.length()).toBeLessThan(.1);
 for(let i=0;i<600;i++)h.update(1/60);expect(o.position.distanceTo(point)).toBeLessThan(.01);
 point=new T.Vector3(40,0,0);h.update(.1);h.update(.1);expect(breaks).toBe(1);expect(h.active).toBe(false);
 point=null;h.update(.01);point=o.position.clone().add(new T.Vector3(1,0,0));h.update(.01);expect(h.active).toBe(true);
});
test('trigger zones filter actors and emit occupancy edges and aggregate completion',()=>{
 const a={position:{x:0,z:0},color:0},b={position:{x:5,z:0},color:1};let actors=[a],completed=0,enters=0,leaves=0;
 const h=zones({}, {zones:[{position:{x:0,z:0},radius:1,color:0},{position:{x:5,z:0},radius:1,color:1}],actors:()=>actors,accept:(a,z)=>a.color===z.color,onComplete:()=>completed++,onEnter:()=>enters++,onLeave:()=>leaves++});
 h.update();expect(h.occupied).toEqual([true,false]);actors=[a,b];h.update();h.update();expect(completed).toBe(1);expect(enters).toBe(2);
 actors=[b];h.update();expect(leaves).toBe(1);expect(h.complete).toBe(false);h.dispose();expect(h.occupied).toEqual([false,false]);
});
test('all three reusable worlds expose gameplay landmarks and release scene ownership',()=>{
 for(const build of [marsh,yard,garden]){
  const scene=new T.Scene(),background=new T.Color(0x123456);scene.background=background;const h=build(scene);expect(h.spawn.isVector3).toBe(true);expect(h.bounds.length).toBe(4);expect(scene.children.length).toBeGreaterThan(0);h.update(.05);h.dispose();expect(scene.children).toHaveLength(0);expect(scene.background).toBe(background);
 }
 const scene=new T.Scene();const field=motes(scene,{count:20,seed:3});const original=field.points.geometry.attributes.position.array.slice();field.update(.2);expect([...field.points.geometry.attributes.position.array]).not.toEqual([...original]);field.dispose();expect(scene.children).toHaveLength(0);
});
