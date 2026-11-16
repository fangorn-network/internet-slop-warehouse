// SPDX-License-Identifier: CC0-1.0
// Pure deterministic world data. No renderer, browser, or networking dependency.
export function rng(seed=1){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const DEFAULT_TILES=[
 {id:'pine',weight:6,neighbors:['pine','mixed']},
 {id:'mixed',weight:3,neighbors:['pine','mixed','maple','glade']},
 {id:'maple',weight:2,neighbors:['mixed','maple','glade']},
 {id:'glade',weight:1,neighbors:['mixed','maple','glade']}
];
// Weighted minimum-entropy collapse with queue-based constraint propagation and
// bounded deterministic restarts. Throws on unsatisfiable rules; never hides failure.
export function collapse({width=20,height=20,seed=1848,tiles=DEFAULT_TILES,fixed=[],maxRestarts=24}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>65536)throw Error('Invalid grid size');
 if(!tiles.length||new Set(tiles.map(t=>t.id)).size!==tiles.length||tiles.some(t=>!(t.weight>0)||!Array.isArray(t.neighbors)))throw Error('Invalid tiles');
 const allowed=tiles.map(a=>new Set(tiles.flatMap((b,i)=>a.neighbors.includes(b.id)&&b.neighbors.includes(a.id)?[i]:[])));
 for(const f of fixed)if(!Number.isInteger(f.x)||!Number.isInteger(f.z)||f.x<0||f.z<0||f.x>=width||f.z>=height||!tiles.some(t=>t.id===f.id))throw Error('Invalid fixed tile');
 const adjacent=i=>[i%width>0?i-1:-1,i%width<width-1?i+1:-1,i>=width?i-width:-1,i<width*(height-1)?i+width:-1].filter(n=>n>=0);
 for(let attempt=0;attempt<=maxRestarts;attempt++){
  const random=rng(seed+attempt*7919),cells=Array.from({length:width*height},()=>tiles.map((_,i)=>i));let bad=false;
  const propagate=queue=>{for(let q=0;q<queue.length&&!bad;q++){const i=queue[q];for(const j of adjacent(i)){const next=cells[j].filter(b=>cells[i].some(a=>allowed[a].has(b)));if(!next.length){bad=true;break;}if(next.length!==cells[j].length){cells[j]=next;queue.push(j);}}}};
  for(const f of fixed){const i=f.z*width+f.x,k=tiles.findIndex(t=>t.id===f.id);if(!cells[i].includes(k)){bad=true;break;}cells[i]=[k];propagate([i]);}
  // Propagate even initially singular tile sets (including a one-tile grammar).
  propagate(cells.map((_,i)=>i));
  while(!bad){let pick=-1,min=Infinity;
   for(let i=0;i<cells.length;i++)if(cells[i].length>1){const sum=cells[i].reduce((s,k)=>s+tiles[k].weight,0),entropy=Math.log(sum)-cells[i].reduce((s,k)=>s+tiles[k].weight*Math.log(tiles[k].weight),0)/sum+random()*1e-6;if(entropy<min){min=entropy;pick=i;}}
   if(pick<0)return{width,height,cells:cells.map(c=>tiles[c[0]].id),attempt};
   let r=random()*cells[pick].reduce((s,k)=>s+tiles[k].weight,0),choice=cells[pick].at(-1);for(const k of cells[pick]){r-=tiles[k].weight;if(r<=0){choice=k;break;}}cells[pick]=[choice];propagate([pick]);
  }
 }
 throw Error('Contradictory tile rules: restart budget exhausted');
}
export function trailX(z,seed=1848){const phase=(seed%97)*.013;return Math.sin(z*.027+phase)*13+Math.sin(z*.061+phase)*3;}
export function heightAt(x,z,seed=1848){const p=(seed%79)*.02;return Math.sin(x*.035+p)*1.7+Math.cos(z*.029)*1.5+Math.sin(x*.082+z*.044)*.5+Math.sin(x*.22-z*.13)*.09;}
export function generate({seed=1848,size=320,cellSize=16,density=1,tiles=DEFAULT_TILES,place,terrain=heightAt,path=trailX}={}){
 if(!Number.isFinite(size)||size<32||size>2048||!Number.isFinite(cellSize)||cellSize<4||!Number.isFinite(density)||density<0||density>5)throw Error('Invalid forest dimensions/density');
 const n=Math.ceil(size/cellSize),grid=collapse({width:n,height:n,seed,tiles}),random=rng(seed),trees=[];
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
  const biome=grid.cells[iz*n+ix],count=Math.floor((biome==='glade'?2:biome==='maple'?7:12)*density);
  for(let j=0;j<count;j++){const x=(ix+random())*size/n-size/2,z=(iz+random())*size/n-size/2;
   // Continuous path is carved AFTER collapse: no disconnected decorative paths.
   if(Math.abs(x-path(z,seed))<3.2||Math.hypot(x-25,z+65)<10)continue;
   const species=biome==='maple'?'maple':biome==='mixed'?(random()<.48?'maple':'pine'):'pine';
   const tree={x,z,y:terrain(x,z,seed),species,scale:.72+random()*.65,rotation:random()*Math.PI*2,variant:Math.floor(random()*4),biome};
   if(!place||place(tree,{random,grid})!==false)trees.push(tree);
  }
 }
 return{version:1,seed,size,cellSize,grid,trees,spawn:[path(size*.39,seed),terrain(path(size*.39,seed),size*.39,seed)+1.7,size*.39],landmarks:[{id:'erratic',name:'The glacial erratic',x:25,z:-65}],heightAt:(x,z)=>terrain(x,z,seed),trailX:z=>path(z,seed)};
}
export function attach(object,opts={}){const layout=generate(opts);opts.onReady?.(layout);return{layout,update(){},dispose(){}};}
