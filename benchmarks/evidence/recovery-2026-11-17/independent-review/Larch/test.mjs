import assert from 'node:assert/strict';
import {createGame} from './core.mjs';
import {attach} from './vendor/collect.mjs';
const results=[];
function test(name,fn){fn();results.push(name);console.log('PASS',name)}
function walk(g,x,y){for(let i=0;i<10000;i++){const p=g.player.position,dx=x-p.x,dy=y-p.z;if(g.won||Math.hypot(dx,dy)<1.6)return;g.update(1/120,Math.abs(dx)<.6?0:Math.sign(dx),Math.abs(dy)<.6?0:Math.sign(dy))}assert.fail(`Blocked en route to ${x},${y}`)}
test('Exit stays locked before collecting all three',()=>{const g=createGame();g.player.position.x=925;g.player.position.z=310;g.update(.01);assert.equal(g.won,false);assert.equal(g.unlocked,false)});
test('Collection deduplicates and emits one event per object',()=>{const events=[],g=createGame((type,item)=>events.push([type,item?.id]));g.player.position.x=120;g.player.position.z=135;for(let i=0;i<60;i++)g.update(1/60);assert.deepEqual([...g.found],['seed']);assert.equal(events.filter(x=>x[0]==='collect').length,1)});
test('Planters and perimeter block walking',()=>{const g=createGame();g.player.position.x=180;g.player.position.z=200;for(let i=0;i<100;i++)g.update(1/60,1,0);assert(g.player.position.x<=191);g.player.position.x=90;g.player.position.z=325;for(let i=0;i<100;i++)g.update(1/60,-1,0);assert(g.player.position.x>=54)});
test('Diagonal movement has the same total speed',()=>{const a=createGame(),b=createGame();a.update(.05,1,0);b.update(.05,1,1);assert(Math.abs(Math.hypot(b.player.position.x-90,b.player.position.z-325)-(a.player.position.x-90))<1e-8)});
test('Large deltas are clamped to prevent wall tunnelling',()=>{const g=createGame();g.update(999,1,0);assert.equal(g.player.position.x,99)});
test('Complete route collects three distinct objects and wins at exit',()=>{const events=[],g=createGame(t=>events.push(t));for(const [x,y] of [[120,325],[120,135],[120,100],[535,100],[535,125],[535,100],[880,100],[880,490],[880,325],[925,310]])walk(g,x,y);assert.equal(g.found.size,3);assert.equal(g.unlocked,true);assert.equal(g.won,true);assert.equal(events.filter(t=>t==='unlock').length,1);assert.equal(events.filter(t=>t==='win').length,1);const old=g.elapsed;g.update(.05,1,0);assert.equal(g.elapsed,old)});
test('New game resets inventory, exit, elapsed time and player',()=>{const g=createGame();assert.equal(g.found.size,0);assert.equal(g.elapsed,0);assert.equal(g.won,false);assert.deepEqual(g.player.position,{x:90,y:0,z:325})});
test('Reused collector disposal stops collection',()=>{let n=0;const p={position:{x:0,y:0,z:0}},item={position:{x:0,y:.8,z:0},rotation:{y:0}};const col=attach(p,{items:[item],bob:0,onCollect:()=>n++});col.dispose();col.update(.1);assert.equal(n,0)});
console.log(JSON.stringify({passed:results.length,failed:0,type:'Node simulation; no browser execution'}));
