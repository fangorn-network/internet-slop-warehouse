// SPDX-License-Identifier: CC0-1.0
import {catalog} from './stock.js';
export {catalog};
export const objectives=[
{title:'The keys are in the car. Again.',text:'A hanger, a mug, and a book. Roadside assistance appreciates a prepared audience.',needs:['hanger','mug','book']},
{title:'An extremely small shed.',text:'A hammer, a how-to book, and a plate. Construction requires a lunch break.',needs:['hammer','book','plate']},
{title:'Dinner with someone’s parents.',text:'A presentable shirt, a lamp, and a mug. Pretend this was planned.',needs:['shirt','lamp','mug']}
];
export function levelConfig(level=1){level=Math.max(1,Math.floor(level));return{level,budget:level===1?3000:level===2?2200:Math.max(350,1000-(level-3)*150),cats:Math.min(8,level),catSpeed:.85+(level-1)*.33,fireEvery:Math.max(.95,4.4-level*.43),carGrace:Math.max(7,23-level*2),carDamage:.6+level*.38,managerSpeed:1.9+Math.min(level,8)*.12,managerSight:9+Math.min(level,5),maxFire:20+level*8};}
export function createRun(seed=Math.floor(Math.random()*1e6),level=1){const config=levelConfig(level),lookup=new Map(catalog.map(i=>[i.id,i]));const mission=level>=3?objectives[(level-3)%2===0?2:1]:objectives[Math.abs(seed)%objectives.length];
const state={seed,level:config.level,config,objective:mission,phase:'shopping',money:config.budget,bag:[],paid:[],concealed:[],swapped:[],suspicion:0,health:100,car:100,elapsed:0,charge:100,extinguisher:false,reason:'',witnessed:false};
const item=id=>lookup.get(id);const price=id=>state.swapped.includes(id)?99:item(id)?.price??0;
const total=()=>state.bag.filter(id=>!state.concealed.includes(id)).reduce((s,id)=>s+price(id),0);
const has=id=>state.bag.includes(id)||state.paid.includes(id);
const required=()=>state.objective.needs.every(has);
const ownedRequired=()=>state.objective.needs.every(id=>state.paid.includes(id)||state.concealed.includes(id));
function take(id){if(state.phase!=='shopping'||!item(id)||has(id)||state.bag.length>=18)return false;state.bag.push(id);return true;}
function putBack(id){const i=state.bag.indexOf(id);if(state.phase!=='shopping'||i<0)return false;state.bag.splice(i,1);state.concealed=state.concealed.filter(x=>x!==id);state.swapped=state.swapped.filter(x=>x!==id);return true;}
function swap(id,{seen=false}={}){if(state.phase!=='shopping'||!state.bag.includes(id)||state.swapped.includes(id))return false;state.swapped.push(id);if(seen){state.witnessed=true;state.suspicion=Math.min(100,state.suspicion+75);}return true;}
function conceal(id,{seen=false}={}){if(state.phase!=='shopping'||!state.bag.includes(id))return false;if(state.concealed.includes(id)){state.concealed=state.concealed.filter(x=>x!==id);return true;}state.concealed.push(id);if(seen){state.witnessed=true;state.suspicion=Math.min(100,state.suspicion+85);}return true;}
function checkout(){if(state.phase!=='shopping')return{ok:false,message:'The register is closed.'};const sale=state.bag.filter(id=>!state.concealed.includes(id));if(!sale.length)return{ok:false,message:'“Anything on the counter?”'};if(total()>state.money)return{ok:false,message:'“That’s more than you have. Something has to go back.”'};if(state.witnessed&&sale.some(id=>state.swapped.includes(id))){state.suspicion=100;return{ok:false,message:'“Hang on. The manager mentioned these tags.”'};}const cost=total();state.money-=cost;state.paid.push(...sale);state.bag=state.bag.filter(id=>state.concealed.includes(id));return{ok:true,cost,message:'“Receipt’s in the bag. Good luck out there.”'};}
function fail(reason){if(['won','lost'].includes(state.phase))return;state.phase='lost';state.reason=reason;}
function leave({seen=false}={}){if(state.phase!=='shopping'||!ownedRequired())return false;if(state.bag.some(id=>!state.concealed.includes(id)))return false;if(state.concealed.length&&seen){state.witnessed=true;state.suspicion=100;}state.phase='escape';state.elapsed=0;return true;}
function escape(){if(state.phase!=='escape'||!ownedRequired())return false;state.phase='won';return true;}
function update(dt,{tampering=false,seen=false,nearFire=false,carFire=false,spraying=false}={}){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);if(['shopping','escape'].includes(state.phase)){if(tampering&&seen){state.suspicion=Math.min(100,state.suspicion+42*dt);if(state.suspicion>55)state.witnessed=true;}else if(!state.witnessed)state.suspicion=Math.max(0,state.suspicion-7*dt);}if(state.phase==='escape'){state.elapsed+=dt;if(state.elapsed>config.carGrace)state.car=Math.max(0,state.car-(config.carDamage+(carFire?1.5:0))*dt);if(nearFire)state.health=Math.max(0,state.health-19*dt);if(spraying&&state.extinguisher)state.charge=Math.max(0,state.charge-12*dt);if(state.health<=0)fail('The cats have made the parking lot uninhabitable.');else if(state.car<=0)fail('Your car is now a very expensive candle.');}}
return{state,item,price,total,has,required,ownedRequired,take,putBack,swap,conceal,checkout,leave,escape,fail,update};}
export function attach(object,opts={}){const run=createRun(opts.seed,opts.level);return{...run,dispose(){}};}
