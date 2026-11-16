// CC0. Deterministic, renderer-free homestead rules. All peers submit intentions to one host.
export function attach(scenario,{modules,recipes=[],onEvent=()=>{}}={}){
 const clone=x=>JSON.parse(JSON.stringify(x)), S=clone(scenario), kinds=new Set(['wood','stone','ore','crystal','copper','axe','pick']);
 let state,bag,books=new Map(),dead=false;const cooldown=new Map();
 const land=(x,z)=>S.rows[z]?.[x]==='.', tile=p=>[Math.round(p.x),Math.round(p.z)];
 const structure=(x,z)=>state.structures.find(b=>b.x===x&&b.z===z);
 const walkable=(x,z)=>(land(x,z)||structure(x,z)?.kind==='bridge')&&structure(x,z)?.kind!=='wall';
 const near=(a,b,r=1.8)=>Math.hypot(a.x-b.x,a.z-b.z)<=r;
 function inventory(initial){bag?.dispose();books.forEach(b=>b.dispose());books.clear();bag=modules['resource-inventory'].attach(null,{capacity:10000,initial});}
 function reset(){state={age:0,inventory:{},players:{solo:{x:S.spawn[0],z:S.spawn[1],dx:0,dz:1}},remaining:Object.fromEntries(S.nodes.map(n=>[n.id,n.amount])),structures:[],restored:false};inventory(S.initial);cooldown.clear();}
 function player(id){return state.players[id];}
 function addPlayer(id){if(typeof id!=='string'||id.length>100)return false;if(!player(id)&&Object.keys(state.players).length<4)state.players[id]={x:S.spawn[0],z:S.spawn[1],dx:0,dz:1};return !!player(id);}
 function station(id){const a=player(id);return state.structures.find(b=>b.kind==='kiln'&&near(a,b,2.3))?.kind??(state.structures.some(b=>b.kind==='workbench'&&near(a,b,2.3))?'workbench':null);}
 function book(id){if(!books.has(id))books.set(id,modules['recipe-book'].attach(null,{recipes,inventory:bag,station:()=>station(id),allowed:r=>!['axe','pick'].includes(r.id)||!bag.count(r.id)}));return books.get(id);}
 function target(id){const a=player(id);return{x:Math.round(a.x)+a.dx,z:Math.round(a.z)+a.dz};}
 function nearest(id){const a=player(id);return S.nodes.filter(n=>state.remaining[n.id]>0&&near(a,n)).sort((a1,b)=>Math.hypot(a.x-a1.x,a.z-a1.z)-Math.hypot(a.x-b.x,a.z-b.z))[0];}
 const pay=cost=>bag.transact(Object.fromEntries(Object.entries(cost).map(([k,n])=>[k,-n])));
 function command(id,c){if(dead||!player(id)||!c||typeof c.type!=='string')return{ok:false,text:'Unknown action'};const a=player(id);let text='',ok=false;
  if(c.type==='gather'){
   const n=nearest(id);if(!n)text='Walk closer to a tree or mineral cluster.';
   else if(state.age<(cooldown.get(id)??0))text='A moment…';
   else{const amount=Math.min(state.remaining[n.id],bag.count(n.kind==='wood'?'axe':'pick')?2:1);ok=bag.transact({[n.kind]:amount});if(ok){state.remaining[n.id]-=amount;cooldown.set(id,state.age+.28);text='Gathered '+amount+' '+n.kind;}}
  }else if(c.type==='craft'){ok=book(id).craft(c.id);text=ok?'Crafted '+c.id:'Need materials, the right station, or a missing upgrade.';
  }else if(c.type==='build'){
   const b=S.builds.find(b=>b.id===c.id),t=target(id),old=structure(t.x,t.z);
   if(!b||!S.rows[t.z]?.[t.x]||old||S.nodes.some(n=>n.x===t.x&&n.z===t.z&&state.remaining[n.id]>0)||S.beacon[0]===t.x&&S.beacon[1]===t.z)text='That space is occupied.';
   else if(b.water===land(t.x,t.z))text=b.water?'Bridges go on water.':'Build this on dry ground.';
   else if(b.id==='wall'&&Object.values(state.players).some(p=>tile(p)[0]===t.x&&tile(p)[1]===t.z))text='Someone is standing there.';
   else if(!pay(b.cost))text='Need '+Object.entries(b.cost).map(([k,n])=>n+' '+k).join(', ');
   else{state.structures.push({...t,kind:b.id});ok=true;text='Built '+b.title;}
  }else if(c.type==='reclaim'){
   const t=target(id),b=structure(t.x,t.z);if(!b)text='Face a structure to reclaim it.';
   else if(b.kind==='bridge'&&Object.values(state.players).some(p=>tile(p)[0]===t.x&&tile(p)[1]===t.z))text='Step off the bridge first.';
   else{const spec=S.builds.find(s=>s.id===b.kind);bag.transact(spec.cost);state.structures.splice(state.structures.indexOf(b),1);ok=true;text='Reclaimed '+b.kind;}
  }else if(c.type==='beacon'){
   if(!near(a,{x:S.beacon[0],z:S.beacon[1]},2))text='The beacon waits on the far southeast island.';
   else if(state.restored)text='The beacon is shining. Keep building!';
   else if(!pay({crystal:3,copper:3,wood:8}))text='Beacon needs 3 crystal, 3 copper, 8 wood.';
   else{state.restored=true;ok=true;text='The mosslight is awake. These islands are home.';}
  }
  onEvent({id,ok,text});return{ok,text};
 }
 function update(dt,inputs={}){if(dead)return;dt=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));state.age+=dt;for(const[id,a]of Object.entries(state.players)){const input=inputs[id]??{},x=Number.isFinite(input.x)?Math.max(-1,Math.min(1,input.x)):0,z=Number.isFinite(input.z)?Math.max(-1,Math.min(1,input.z)):0,mag=Math.hypot(x,z);if(!mag)continue;if(Math.abs(x)>Math.abs(z)){a.dx=Math.sign(x);a.dz=0;}else{a.dx=0;a.dz=Math.sign(z);}const speed=3.4*dt/Math.max(1,mag);for(const axis of ['x','z']){const p={...a,[axis]:a[axis]+(axis==='x'?x:z)*speed};if(walkable(...tile(p)))a[axis]=p[axis];}}}
 function snapshot(){return clone({...state,inventory:bag.items});}
 function validateSnapshot(s){if(!s||!Number.isFinite(s.age)||s.age<0||typeof s.restored!=='boolean'||!s.players||!s.remaining||!s.inventory||!Array.isArray(s.structures)||s.structures.length>825)throw Error('Invalid homestead save');
  const ps=Object.entries(s.players);if(!ps.length||ps.length>4||ps.some(([id,a])=>id.length>100||!Number.isFinite(a.x)||!Number.isFinite(a.z)||a.x<0||a.x>=33||a.z<0||a.z>=25||![-1,0,1].includes(a.dx)||![-1,0,1].includes(a.dz)||Math.abs(a.dx)+Math.abs(a.dz)!==1))throw Error('Invalid players');
  if(Object.keys(s.remaining).length!==S.nodes.length||S.nodes.some(n=>!Number.isSafeInteger(s.remaining[n.id])||s.remaining[n.id]<0||s.remaining[n.id]>n.amount)||Object.entries(s.inventory).some(([k,n])=>!kinds.has(k)||!Number.isSafeInteger(n)||n<0||n>10000)||Object.values(s.inventory).reduce((a,b)=>a+b,0)>10000)throw Error('Invalid resources');
  const cells=new Set();for(const b of s.structures){const spec=S.builds.find(x=>x.id===b.kind),key=b.x+','+b.z;if(!spec||!Number.isInteger(b.x)||!Number.isInteger(b.z)||!S.rows[b.z]?.[b.x]||spec.water===land(b.x,b.z)||cells.has(key))throw Error('Invalid structure');cells.add(key);}return true;
 }
 function load(s){validateSnapshot(s);state=clone(s);inventory(s.inventory);cooldown.clear();}
 reset();return{get state(){return snapshot();},scenario:S,reset,addPlayer,removePlayer(id){delete state.players[id];books.get(id)?.dispose();books.delete(id);},target,nearest,walkable,command,recipes(id){return book(id).list();},update,snapshot,validateSnapshot,load,dispose(){dead=true;bag.dispose();books.forEach(b=>b.dispose());}};
}
