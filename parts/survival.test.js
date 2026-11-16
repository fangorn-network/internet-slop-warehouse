import { test, expect } from 'vitest';
import { attach as health } from './health.js';
import { attach as inventory } from './resource-inventory.js';
import { attach as interaction } from './proximity-interaction.js';
import { attach as phases } from './phase-cycle.js';

test('health prevents stacked contact damage, dies once and requires explicit revival',()=>{
    let deaths=0;
    const hp=health({}, {max:20,invulnerability:1,modifyDamage:n=>n/2,onDeath:()=>deaths++});
    expect(hp.damage(20)).toBe(10); expect(hp.damage(20)).toBe(0);
    hp.update(1); expect(hp.damage(50)).toBe(10); expect(deaths).toBe(1);
    hp.update(2); hp.damage(10); expect(hp.heal(20)).toBe(0); expect(deaths).toBe(1);
    expect(hp.revive(10)).toBe(true); expect(hp.value).toBe(10);
    hp.dispose(); hp.update(2); expect(hp.damage(20)).toBe(0);
});
test('inventory trades are atomic, weighted, bounded and immune to special object keys',()=>{
    const bag=inventory({}, {capacity:4,initial:{scrap:3},weights:{fuel:2}});
    expect(bag.transact({scrap:-4,fuel:1})).toBe(false); expect(bag.items).toEqual({scrap:3});
    expect(bag.transact({scrap:-2,fuel:1})).toBe(true); expect(bag.load).toBe(3);
    expect(bag.transact({fuel:1})).toBe(false); expect(bag.count('fuel')).toBe(1);
    expect(bag.transact({scrap:0.5})).toBe(false);
    expect(bag.count('__proto__')).toBe(0);
    bag.dispose(); expect(bag.transact({scrap:-1})).toBe(false);
});
test('interaction rechecks removed/ineligible targets on activation and honors cooldown',()=>{
    const self={position:{x:0,y:0}}, a={position:{x:1,y:0}}, b={position:{x:2,y:0}}, targets=[a,b];
    let used=null;
    const h=interaction(self,{targets,radius:3,onInteract:t=>used=t});
    h.update(0); expect(h.focus).toBe(a);
    targets.shift(); expect(h.interact()).toBe(true); expect(used).toBe(b);
    expect(h.interact()).toBe(false); h.update(1); expect(h.interact()).toBe(true);
    self.position.x=10; expect(h.interact()).toBe(false); h.dispose(); expect(h.focus).toBe(null);
});
test('phase clocks preserve overshoot, emit ordered events and finish exactly once',()=>{
    const events=[];
    const h=phases({}, {phases:[{name:'day',duration:2},{name:'night',duration:1}],cycles:2,onPhase:s=>events.push(s.name+s.cycle),onCycle:n=>events.push(n),onComplete:()=>events.push('done')});
    h.update(3.5); expect(h.state).toMatchObject({name:'day',cycle:2,elapsed:0.5});
    h.update(10); h.update(10);
    expect(events).toEqual(['night1',1,'day2','night2',2,'done']); expect(h.state.complete).toBe(true);
    expect(()=>phases({}, {phases:[{name:'bad',duration:0}]})).toThrow();
});
