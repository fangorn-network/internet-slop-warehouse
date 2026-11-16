import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from './session.js';
import {BUILDINGS,doorFor} from './building-layout.js';
const town=()=>createSession({colliders:[]});
test('movement is bounded, diagonal normalized, and blocked by walls',()=>{
 const s=createSession({colliders:[{x:2,z:30,w:1,d:8}]});for(let i=0;i<100;i++)s.update(.05,{solo:{x:1,z:0}});assert(s.state.players.solo.x<1.18);
 const x=s.state.players.solo.x;s.update(.05,{solo:{x:Infinity,z:0}});assert.equal(s.state.players.solo.x,x);
 const a=town();a.update(.05,{solo:{x:999,z:999}});assert(Math.abs(Math.hypot(a.state.players.solo.x+1,a.state.players.solo.z-30)-.125)<1e-8);
 a.update(NaN);assert(Number.isFinite(a.state.time));assert(a.blocked(NaN,0));
});
test('each door validates proximity, blocks when closed, and opens independently',()=>{
 const s=town();assert.equal(s.command('solo',{type:'door',buildingId:'diner'}).ok,false);
 for(const [i,b]of BUILDINGS.entries()){
  const d=doorFor(b);Object.assign(s.state.players.solo,{x:d.x,z:d.z+b.front*1.2});
  if(s.state.doors[i])assert(s.command('solo',{type:'door',buildingId:b.id}).ok);
  assert(s.blocked(d.x,d.z),b.id);const previous=[...s.state.doors];assert(s.command('solo',{type:'door',buildingId:b.id}).ok);assert(!s.blocked(d.x,d.z),b.id);
  assert.deepEqual(s.state.doors.filter((_,j)=>j!==i),previous.filter((_,j)=>j!==i));
 }
 assert.equal(s.command('solo',{type:'door',buildingId:'missing'}).ok,false);
});
test('doors cannot close through a player, including a guest',()=>{
 const s=town();s.addPlayer('guest');Object.assign(s.state.players.solo,{x:-15,z:18.2});Object.assign(s.state.players.guest,{x:-15,z:17});
 assert(!s.command('solo',{type:'door',buildingId:'diner'}).ok);assert(s.state.doors[0]);
 s.state.players.guest.z=19;assert(s.command('solo',{type:'door',buildingId:'diner'}).ok);
});
test('claims require being inside, resolve contention, and limit each visitor to one home',()=>{
 const s=town();s.addPlayer('guest');const b=BUILDINGS.find(b=>b.id==='house-1'),other=BUILDINGS.find(b=>b.id==='house-2');
 const claim=()=>s.command('solo',{type:'claim',buildingId:b.id});assert(!claim().ok);
 Object.assign(s.state.players.solo,{x:b.x,z:b.z});assert(claim().ok);assert.equal(s.state.claims[b.id],'solo');
 Object.assign(s.state.players.guest,{x:b.x,z:b.z});assert(!s.command('guest',{type:'claim',buildingId:b.id}).ok);
 Object.assign(s.state.players.solo,{x:other.x,z:other.z});assert(!s.command('solo',{type:'claim',buildingId:other.id}).ok);
 Object.assign(s.state.players.solo,{x:b.x,z:b.z});assert(claim().ok);assert.equal(s.state.claims[b.id],null);
 assert(s.command('guest',{type:'claim',buildingId:b.id}).ok);s.removePlayer('guest');assert.equal(s.state.claims[b.id],null);
 Object.assign(s.state.players.solo,{x:-15,z:12});assert(!s.command('solo',{type:'claim',buildingId:'diner'}).ok);
});
test('renaming for hosting and leaving a room preserve only the local visitor home',()=>{
 const s=town();Object.assign(s.state.players.solo,{x:-30,z:45});assert(s.command('solo',{type:'claim',buildingId:'house-1'}).ok);
 assert(s.renamePlayer('solo','host'));assert.equal(s.state.claims['house-1'],'host');s.addPlayer('guest');Object.assign(s.state.players.guest,{x:32,z:63});s.command('guest',{type:'claim',buildingId:'house-2'});
 s.continueSolo('host');assert.deepEqual(Object.keys(s.state.players),['solo']);assert.equal(s.state.claims['house-1'],'solo');assert.equal(s.state.claims['house-2'],null);assert(s.validateSnapshot(s.snapshot()));
});
test('snapshots reject invalid doors, malformed peers, orphaned or multiple claims',()=>{
 const s=town();assert(s.validateSnapshot(s.snapshot()));
 for(const mutate of [s=>s.players.solo.x=100000,s=>s.doors.pop(),s=>s.doors[1]='open',s=>s.claims['house-1']='absent',s=>s.claims.bad=null,s=>{s.claims['house-1']='solo';s.claims['house-2']='solo';}]){const bad=s.snapshot();mutate(bad);assert(!s.validateSnapshot(bad));assert.throws(()=>s.load(bad));}
 for(let i=0;i<6;i++)s.addPlayer('p'+i);assert.equal(Object.keys(s.state.players).length,4);s.addPlayer('__proto__');assert.equal(Object.keys(s.state.players).length,4);
 const save=s.snapshot();s.update(.05,{solo:{x:1}});s.load(save);assert.deepEqual(s.snapshot(),save);
});

test('a failed connection restores solo control without losing its existing home',()=>{
 const s=town();Object.assign(s.state.players.solo,{x:-30,z:45});s.command('solo',{type:'claim',buildingId:'house-1'});
 s.continueSolo('never-connected');assert.equal(s.state.claims['house-1'],'solo');assert(s.validateSnapshot(s.snapshot()));
 assert(s.renamePlayer('solo','failed-host'));s.continueSolo('failed-host');assert.equal(s.state.claims['house-1'],'solo');
 const x=s.state.players.solo.x;s.update(.05,{solo:{x:1}});assert(s.state.players.solo.x>x);
});
