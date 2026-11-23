// Every generated floor is connected, its exit is a dead end far from the start with a closed wall for the stair door,
// and the same seed gives the same floor.   node projects/night-audit/maze.test.mjs
import { generate, distances } from './maze.js';
let n = 0;
for (let seed = 1; seed <= 3000; seed++) for (const [w, h] of [[8, 6], [9, 7], [10, 7]]) {
  const m = generate({ w, h, seed, loops: 0.1 }), d = distances(m, m.start);
  if ([...d].some(x => x < 0)) throw Error(`seed ${seed}: unreachable cells`);
  if (m.exitSide === undefined || m.open[m.exit] & (1 << m.exitSide)) throw Error(`seed ${seed}: no wall for the exit door`);
  if (d[m.exit] < (w + h) / 2) throw Error(`seed ${seed}: exit only ${d[m.exit]} steps away`);
  if (m.open[m.start] & (1 << 3)) throw Error(`seed ${seed}: start door wall is open`);
  if (JSON.stringify([...generate({ w, h, seed, loops: 0.1 }).open]) !== JSON.stringify([...m.open])) throw Error('not deterministic');
  n++;
}
console.log(`${n} floors ok`);
