// CC0. Deterministic phase clock, suitable for days/nights, rounds, waves and cooldown stages.
export function attach(object, { phases = [{ name:'day', duration:60 }, { name:'night', duration:45 }], cycles = Infinity,
    onPhase = () => {}, onCycle = () => {}, onComplete = () => {},
} = {}) {
    phases = phases.map(p=>({ ...p }));
    if (!phases.length || phases.some(p=>!p.name||!Number.isFinite(p.duration)||p.duration<=0) || !(cycles===Infinity || Number.isSafeInteger(cycles)&&cycles>0)) throw new RangeError('Invalid phases or cycles');
    let index=0, cycle=1, elapsed=0, complete=false, disposed=false;
    const state = () => ({ name:phases[index].name, index, cycle, elapsed, remaining:Math.max(0,phases[index].duration-elapsed), progress:elapsed/phases[index].duration, complete });
    return {
        get state() { return state(); },
        update(dt) {
            if (disposed||complete||!Number.isFinite(dt)||dt<=0) return;
            let transitions=0;
            while (dt>0 && !complete && !disposed) {
                const step=Math.min(dt,phases[index].duration-elapsed); elapsed+=step; dt-=step;
                if (elapsed>=phases[index].duration) {
                    if (index===phases.length-1) {
                        onCycle(cycle,object);
                        if (cycle>=cycles) { complete=true; onComplete(object); break; }
                        cycle++; index=0;
                    } else index++;
                    elapsed=0; onPhase(state(),object);
                    if (++transitions>10000) throw new RangeError('Too many phase transitions in one update');
                }
            }
        },
        dispose() { disposed=true; },
    };
}
