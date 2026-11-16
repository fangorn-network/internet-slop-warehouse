// CC0. A small data-driven survival simulation. Rendering, input devices and storage are adapters.
const clone=x=>JSON.parse(JSON.stringify(x));
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16);};
export function attach(scenario,{modules,recipes=[],onEvent=()=>{}}={}){
 const required=['seeded-random','grid-navigation','perception-brain','recipe-book','objective-journal','health','resource-inventory'];
 for(const id of required)if(typeof modules?.[id]?.attach!=='function')throw Error('Missing kit module: '+id);
 const spec=clone(scenario),make=(id,o,opts)=>modules[id].attach(o,opts),fingerprint=hash(JSON.stringify([spec,recipes]));
 if(!spec.id||spec.version!==1||!Array.isArray(spec.rows)||spec.rows.length<3||spec.rows.length>128||spec.rows.some(r=>typeof r!=='string'||r.length!==spec.rows[0].length||r.length>128||!/^[#.D]+$/.test(r))||!Array.isArray(spec.enemies)||spec.enemies.length>32)throw Error('Invalid scenario header or map');
 const nav=make('grid-navigation',spec,{rows:spec.rows,cellSize:spec.cellSize??2,origin:[-spec.rows[0].length*(spec.cellSize??2)/2,-spec.rows.length*(spec.cellSize??2)/2]});
 const entries=[...spec.doors,...spec.locations,...spec.enemies],ids=new Set();
 const validCell=c=>Array.isArray(c)&&c.length===2&&c.every(Number.isInteger)&&c[0]>=0&&c[1]>=0&&c[0]<nav.width&&c[1]<nav.height&&spec.rows[c[1]][c[0]]!=='#';
 for(const e of entries){if(!e.id||ids.has(e.id)||!validCell(e.cell))throw Error('Invalid or duplicate entity: '+e.id);ids.add(e.id);}
 if(!validCell(spec.start)||!spec.ward||!validCell(spec.ward.cell)||![spec.daySeconds,spec.nightSeconds].every(n=>Number.isFinite(n)&&n>0)||!Number.isFinite(spec.radioWait)||spec.radioWait<0)throw Error('Invalid scenario timing or spawn');
 for(let z=0;z<nav.height;z++)for(let x=0;x<nav.width;x++)if(spec.rows[z][x]==='D'&&!spec.doors.some(d=>d.cell[0]===x&&d.cell[1]===z))throw Error('Unconfigured door at '+x+','+z);
 for(const e of spec.enemies)if(!Array.isArray(e.patrol)||!e.patrol.length||e.patrol.some(c=>!validCell(c)))throw Error('Invalid patrol: '+e.id);
 const locations=spec.locations.map(e=>({...e,position:nav.world(...e.cell)})),ward=nav.world(...spec.ward.cell),basePosition=nav.world(...spec.start);
 let state,bag,hp,rng,journal,book,brains=[],enemyHealth=[],dead=false;
 const emit=(type,text,data={})=>onEvent({type,text,...data});
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const night=()=>state.age%(spec.daySeconds+spec.nightSeconds)>=spec.daySeconds;
 const sheltered=p=>state.wardFuel>0&&dist(p,ward)<spec.ward.radius;
 const affordable=cost=>Object.entries(cost??{}).every(([k,n])=>bag.count(k)>=n);
 const spend=cost=>bag.transact(Object.fromEntries(Object.entries(cost??{}).map(([k,n])=>[k,-n])));
 const doors=()=>state.doors.map((d,i)=>({...d,position:nav.world(...spec.doors[i].cell),cell:spec.doors[i].cell}));
 function move(actor,next,radius=.28){for(const axis of ['x','z']){const p={...actor.position,[axis]:next[axis]};if(actor!==state.player&&sheltered(p))continue;let clear=true;for(const dx of [-radius,radius])for(const dz of [-radius,radius]){const c=nav.cell({x:p.x+dx,z:p.z+dz});if(!nav.walkable(c.x,c.z))clear=false;}if(clear)actor.position[axis]=p[axis];}}
 function noise(position,radius){const event={position:{...position},radius:radius*(night()?1.4:1)};for(let i=0;i<brains.length;i++)if(!enemyHealth[i].dead)brains[i].hear(event);state.lastNoise={...position,ttl:1.5,radius};}
 function facts(){return{foundFuse:state.flags.foundFuse,radioPowered:state.flags.radioPowered,rescueReady:state.radioAt!==null&&state.age-state.radioAt>=spec.radioWait,escaped:state.flags.escaped};}
 function syncDoors(){state.doors.forEach((d,i)=>nav.setBlocked(...spec.doors[i].cell,!d.open));}
 function disposeSystems(){bag?.dispose();hp?.dispose();rng?.dispose();journal?.dispose();book?.dispose();brains.forEach(b=>b.dispose());enemyHealth.forEach(h=>h.dispose());}
 function hydrate(next){
  disposeSystems();state=clone(next);state.lastNoise=null;syncDoors();
  rng=make('seeded-random',state,{seed:spec.seed,state:state.random});
  bag=make('resource-inventory',state.player,{capacity:spec.capacity??24,initial:state.inventory,onReject:reason=>emit('reject',reason==='capacity'?'Pack full. Use supplies or deposit them at the shelter.':'Not enough supplies.')});
  hp=make('health',state.player,{initial:state.hp,invulnerability:.85,onChange:(value,delta)=>{if(delta<0)emit('hurt','A visitor caught you.');},onDeath:()=>emit('death','The town has another empty room.')});
  journal=make('objective-journal',state,{objectives:spec.objectives,completed:state.completed,onComplete:o=>emit('objective',o.title+' — complete.')});
  book=make('recipe-book',state,{recipes,inventory:bag,onCraft:r=>{noise(state.player.position,4);emit('craft','Crafted '+r.title+'.');},onReject:reason=>emit('reject',reason==='station'?'Use a workbench for this recipe.':'Cannot craft: '+reason+'.'),station:()=>locations.some(l=>l.type==='bench'&&dist(l.position,state.player.position)<3)?'workbench':null});
  enemyHealth=state.enemies.map(e=>make('health',e,{max:60,initial:e.hp,invulnerability:.15,onDeath:()=>{state.kills++;emit('kill','The visitor goes quiet.');}}));
  brains=state.enemies.map((e,i)=>make('perception-brain',e,{target:()=>hp.dead?null:state.player,patrol:spec.enemies[i].patrol.map(c=>nav.world(...c)),speed:1.15,chaseSpeed:2.55,sight:10,memory:7,initial:e.brain,canSee:(a,b)=>!sheltered(b.position)&&nav.lineOfSight(a.position,b.position),path:(a,b)=>{
   const direct=nav.findPath(a,b);if(direct.length)return direct;
   // Unreachable noise behind a shut door: approach its reachable side and work on it.
   const candidates=doors().filter(d=>!d.open).sort((x,y)=>dist(x.position,b)-dist(y.position,b));
   for(const d of candidates)for(const[dx,dz]of[[0,1],[0,-1],[1,0],[-1,0]]){const p=nav.world(d.cell[0]+dx,d.cell[1]+dz);const route=nav.findPath(a,p);if(route.length)return route;}return[];
  },move,onAttack:()=>hp.damage(15,e)}));
 }
 function fresh(){
  const random=make('seeded-random',spec,{seed:spec.seed}),loot={};for(const l of locations.filter(l=>l.type==='cache')){loot[l.id]={...l.loot};const extra=random.pick([{value:'scrap',weight:3},{value:'cloth',weight:2},{value:'food',weight:1}]);loot[l.id][extra]=(loot[l.id][extra]??0)+1;}
  const initial={version:1,scenario:spec.id,contentHash:fingerprint,age:0,random:random.state,hp:100,stamina:100,inventory:{...spec.initial},stash:{},player:{position:{...basePosition},heading:Math.PI},doors:spec.doors.map(d=>({id:d.id,open:false,locked:!!d.locked,hp:60})),looted:[],loot,enemies:spec.enemies.map(e=>({id:e.id,position:nav.world(...e.cell),heading:0,hp:60,brain:null})),flags:{foundFuse:false,radioPowered:false,escaped:false},radioAt:null,wardFuel:spec.ward.initialFuel,completed:[],kills:0,decoys:[],attackCooldown:0,footstep:0,radioNoise:0};random.dispose();return initial;
 }
 const resourceMap=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,n])=>!['__proto__','constructor','prototype'].includes(k)&&Number.isSafeInteger(n)&&n>=0&&n<=999);
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&validCell([nav.cell(p).x,nav.cell(p).z]);
 function validate(s){try{
  if(!s||s.version!==1||s.scenario!==spec.id||s.contentHash!==fingerprint||!Number.isFinite(s.age)||s.age<0||s.age>86400||!Number.isInteger(s.random)||s.random<0||s.random>4294967295||!Number.isFinite(s.hp)||s.hp<0||s.hp>100||!Number.isFinite(s.stamina)||s.stamina<0||s.stamina>100||!point(s.player?.position)||!Number.isFinite(s.player.heading)||!resourceMap(s.inventory)||!resourceMap(s.stash)||Object.values(s.inventory).reduce((a,b)=>a+b,0)>(spec.capacity??24))return false;
  if(!Array.isArray(s.doors)||s.doors.length!==spec.doors.length||s.doors.some((d,i)=>d.id!==spec.doors[i].id||typeof d.open!=='boolean'||typeof d.locked!=='boolean'||!Number.isFinite(d.hp)||d.hp<0||d.hp>180||d.hp===0&&!d.open))return false;
  if(!Array.isArray(s.enemies)||s.enemies.length!==spec.enemies.length||s.enemies.some((e,i)=>e.id!==spec.enemies[i].id||!point(e.position)||!Number.isFinite(e.heading)||!Number.isFinite(e.hp)||e.hp<0||e.hp>60||e.brain&&(!['patrol','investigate','chase','search'].includes(e.brain.mode)||e.brain.interest&&!point(e.brain.interest)||![e.brain.remember,e.brain.cooldown].every(n=>Number.isFinite(n)&&n>=0&&n<=30)||!Number.isInteger(e.brain.index)||e.brain.index<0||e.brain.index>=spec.enemies[i].patrol.length)))return false;
  const actorClear=p=>{const c=nav.cell(p),i=spec.doors.findIndex(d=>d.cell[0]===c.x&&d.cell[1]===c.z);return i<0||s.doors[i].open;};if(!actorClear(s.player.position)||s.enemies.some(e=>e.hp>0&&!actorClear(e.position)))return false;
  const caches=locations.filter(l=>l.type==='cache').map(l=>l.id);if(!s.loot||Object.keys(s.loot).length!==caches.length||caches.some(id=>!resourceMap(s.loot[id]))||!Array.isArray(s.looted)||new Set(s.looted).size!==s.looted.length||s.looted.some(id=>!caches.includes(id)))return false;
  if(!s.flags||['foundFuse','radioPowered','escaped'].some(k=>typeof s.flags[k]!=='boolean')||s.flags.radioPowered!==(s.radioAt!==null)||s.radioAt!==null&&(!Number.isFinite(s.radioAt)||s.radioAt<0||s.radioAt>s.age)||!Number.isFinite(s.wardFuel)||s.wardFuel<0||s.wardFuel>180||!Array.isArray(s.completed))return false;
  const done=new Set(s.completed);if(done.size!==s.completed.length||s.completed.some(id=>!spec.objectives.some(o=>o.id===id&&!(o.requires??[]).some(r=>!done.has(r)))))return false;
  if(!Array.isArray(s.decoys)||s.decoys.length>20||s.decoys.some(d=>!point(d.position)||!Number.isFinite(d.ttl)||d.ttl<0||d.ttl>12||!Number.isFinite(d.pulse)))return false;
  return['attackCooldown','footstep','radioNoise'].every(k=>Number.isFinite(s[k])&&s[k]>=0&&s[k]<=30)&&Number.isSafeInteger(s.kills)&&s.kills>=0;
 }catch{return false;}}
 hydrate(fresh());
 const api={navigation:nav,scenario:clone(spec),locations,
  get state(){return{age:state.age,hp:hp.value,stamina:state.stamina,inventory:bag.items,stash:clone(state.stash),player:clone(state.player),doors:doors(),enemies:state.enemies.map((e,i)=>({...clone(e),hp:enemyHealth[i].value,mode:brains[i].mode})),looted:[...state.looted],wardFuel:state.wardFuel,ward:{...ward,radius:spec.ward.radius},night:night(),radioPowered:state.flags.radioPowered,rescueReady:facts().rescueReady,radioRemaining:state.radioAt===null?spec.radioWait:Math.max(0,spec.radioWait-state.age+state.radioAt),escaped:state.flags.escaped,kills:state.kills,objectives:journal.active,completed:journal.completed,decoys:clone(state.decoys),lastNoise:state.lastNoise?clone(state.lastNoise):null};},
  snapshot(){const base=clone(state);delete base.lastNoise;return{...base,hp:hp.value,inventory:bag.items,random:rng.state,completed:journal.completed,enemies:state.enemies.map((e,i)=>({...clone(e),hp:enemyHealth[i].value,brain:brains[i].snapshot()}))};},
  validateSnapshot:validate,
  load(saved){if(dead||!validate(saved))throw Error('This save does not match the scenario or contains invalid state');hydrate(saved);emit('load','Run restored, including doors, loot and enemy memory.');},reset(){if(!dead){hydrate(fresh());emit('reset','A new run. Same town, same seed.');}},
  nearest(){const candidates=[...locations.filter(l=>l.type!=='cache'||!state.looted.includes(l.id)),...doors().map(d=>({...d,type:'door',title:d.locked?'Locked storeroom door':d.open?'Open door':'Closed door'}))];return candidates.filter(l=>dist(l.position,state.player.position)<2.7).sort((a,b)=>dist(a.position,state.player.position)-dist(b.position,state.player.position))[0]??null;},
  interact(id=api.nearest()?.id){if(dead||hp.dead||state.flags.escaped)return false;const doorIndex=spec.doors.findIndex(d=>d.id===id);
   if(doorIndex>=0){const d=state.doors[doorIndex],p=nav.world(...spec.doors[doorIndex].cell);if(dist(p,state.player.position)>=2.7)return false;if(!d.open){if(d.locked){if(bag.count('lockpick')>0){bag.transact({lockpick:-1});emit('door','Lock picked quietly.');}else{state.stamina=Math.max(0,state.stamina-25);noise(p,19);emit('door','You pry it open. The sound carries.');}d.locked=false;}d.open=true;}else{const cell=spec.doors[doorIndex].cell;if([state.player,...state.enemies.filter((e,i)=>!enemyHealth[i].dead)].some(e=>{const c=nav.cell(e.position);return c.x===cell[0]&&c.z===cell[1];})){emit('reject','The doorway is occupied.');return false;}d.open=false;d.hp=Math.max(20,d.hp);}syncDoors();return true;}
   const l=locations.find(l=>l.id===id);if(!l||dist(l.position,state.player.position)>=2.7)return false;
   if(l.type==='cache'){if(state.looted.includes(id))return false;if(!bag.transact(state.loot[id]))return false;state.looted.push(id);if(bag.count('fuse'))state.flags.foundFuse=true;noise(l.position,8);emit('loot',l.title+': '+Object.entries(state.loot[id]).map(([k,n])=>'+'+n+' '+k).join(', '));}
   else if(l.type==='radio'){if(state.flags.radioPowered){emit('radio',facts().rescueReady?'The south road is open.':'Rescue in '+Math.ceil(api.state.radioRemaining)+' seconds.');return true;}if(!affordable(l.cost)){emit('reject','Radio repair needs '+Object.entries(l.cost).map(([k,n])=>n+' '+k).join(', ')+'.');return false;}if(!spend(l.cost))return false;state.flags.radioPowered=true;state.radioAt=state.age;noise(l.position,22);emit('radio','Signal sent. Hold out, then reach the south road.');}
   else if(l.type==='ward'){if(state.wardFuel>140){emit('reject','The ward reservoir is full.');return false;}if(!bag.transact({fuel:-1}))return false;state.wardFuel=Math.min(180,state.wardFuel+45);emit('ward','Ward refuelled: +45 seconds.');}
   else if(l.type==='exit'){if(!facts().rescueReady){emit('reject',state.flags.radioPowered?'The road opens in '+Math.ceil(api.state.radioRemaining)+' seconds.':'Repair the radio before leaving.');return false;}state.flags.escaped=true;emit('victory','You found a way out. The town will keep the rest.');}
   else if(l.type==='stash'){const items=bag.items,delta=Object.fromEntries(Object.entries(items).filter(([k])=>k!=='medicine').map(([k,n])=>[k,-n]));if(!Object.values(delta).some(n=>n<0)){emit('stash','Nothing to deposit. Withdraw supplies from the pack menu.');return false;}if(!bag.transact(delta))return false;for(const[k,n]of Object.entries(delta))state.stash[k]=(state.stash[k]??0)-n;emit('stash','Supplies stored. Open the pack to withdraw them.');}
   else if(l.type==='bench'){emit('bench','Open your pack to craft.');return true;}
   journal.update(facts());return true;
  },
  craft(id){if(dead||hp.dead)return false;return book.craft(id);},recipes(){return book.list();},
  withdraw(key,count=1){if(dead||hp.dead||state.flags.escaped||!Number.isSafeInteger(count)||count<1||(state.stash[key]??0)<count||!locations.some(l=>l.type==='stash'&&dist(l.position,state.player.position)<3))return false;if(!bag.transact({[key]:count}))return false;state.stash[key]-=count;return true;},
  brace(){if(dead||hp.dead||state.flags.escaped)return false;const near=doors().filter(d=>!d.open&&dist(d.position,state.player.position)<2.7).sort((a,b)=>dist(a.position,state.player.position)-dist(b.position,state.player.position))[0];if(!near){emit('reject','Stand near a closed door to fit a brace.');return false;}if(!bag.transact({barricade:-1}))return false;state.doors.find(d=>d.id===near.id).hp=Math.min(180,near.hp+75);noise(near.position,5);emit('brace','Door braced. It will buy you time.');return true;},
  heal(){if(dead||hp.dead||state.flags.escaped)return false;if(hp.value>=100){emit('reject','You are already healthy.');return false;}if(!bag.transact({medicine:-1}))return false;hp.heal(40);emit('heal','Medicine restored 40 health.');return true;},
  decoy(){if(hp.dead||state.flags.escaped)return false;if(dead||!bag.count('decoy')){emit('reject','Craft a noise decoy first.');return false;}const p={...state.player.position,x:state.player.position.x+Math.sin(state.player.heading)*6,z:state.player.position.z+Math.cos(state.player.heading)*6},c=nav.cell(p);if(!nav.walkable(c.x,c.z)){emit('reject','Throw toward open ground.');return false;}if(!bag.transact({decoy:-1}))return false;state.decoys.push({position:p,ttl:12,pulse:0});emit('decoy','Decoy thrown. Go the other way.');return true;},
  attack(){if(dead||hp.dead||state.attackCooldown>0||state.stamina<18)return false;state.attackCooldown=.5;state.stamina-=18;noise(state.player.position,17);let hit=false;state.enemies.forEach((e,i)=>{const angle=Math.atan2(e.position.x-state.player.position.x,e.position.z-state.player.position.z),difference=Math.atan2(Math.sin(angle-state.player.heading),Math.cos(angle-state.player.heading));if(dist(e.position,state.player.position)<2.3&&Math.abs(difference)<1.5&&nav.lineOfSight(state.player.position,e.position)){if(enemyHealth[i].damage(30,state.player)>0)hit=true;}});emit('attack',hit?'Crowbar connects.':'The swing echoes down the street.');return true;},
  update(dt,input={}){if(dead||hp.dead||state.flags.escaped||!Number.isFinite(dt)||dt<=0)return;let remaining=Math.min(dt,.25);while(remaining>1e-8&&!hp.dead&&!state.flags.escaped){const step=Math.min(.05,remaining);remaining-=step;state.age+=step;hp.update(step);enemyHealth.forEach(h=>h.update(step));state.attackCooldown=Math.max(0,state.attackCooldown-step);state.wardFuel=Math.max(0,state.wardFuel-step*(night()?1:.2));
   let x=Number.isFinite(input.x)?input.x:0,z=Number.isFinite(input.z)?input.z:0,n=Math.max(1,Math.hypot(x,z));x/=n;z/=n;const moving=!!(x||z),running=moving&&input.run&&state.stamina>5&&!input.crouch,speed=input.crouch?1.8:running?5.3:3.4;
   state.stamina=Math.max(0,Math.min(100,state.stamina+(running?-20:13)*step));if(moving){state.player.heading=Math.atan2(x,z);move(state.player,{x:state.player.position.x+x*speed*step,z:state.player.position.z+z*speed*step});state.footstep+=step;if(state.footstep>.6){noise(state.player.position,input.crouch?1:running?12:4);state.footstep=0;}}
   state.decoys.forEach(d=>{d.ttl-=step;d.pulse-=step;if(d.pulse<=0){noise(d.position,21);d.pulse=2;}});state.decoys=state.decoys.filter(d=>d.ttl>0);
   if(state.flags.radioPowered){state.radioNoise-=step;if(state.radioNoise<=0){noise(locations.find(l=>l.type==='radio').position,14);state.radioNoise=12;}}
   brains.forEach((b,i)=>{if(enemyHealth[i].dead)return;b.update(step);if(b.mode!=='patrol')for(let j=0;j<state.doors.length;j++){const d=state.doors[j];if(!d.open&&dist(state.enemies[i].position,nav.world(...spec.doors[j].cell))<2.3){d.hp=Math.max(0,d.hp-step*(night()?10:6));if(d.hp===0){d.open=true;d.locked=false;syncDoors();emit('breach','A visitor breaks a door.');}break;}}});
   if(state.lastNoise){state.lastNoise.ttl-=step;if(state.lastNoise.ttl<=0)state.lastNoise=null;}journal.update(facts());
  }},
  dispose(){if(dead)return;dead=true;disposeSystems();nav.dispose();},
 };return api;
}
