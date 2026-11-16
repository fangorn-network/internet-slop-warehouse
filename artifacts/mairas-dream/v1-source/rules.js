// SPDX-License-Identifier: CC0-1.0
export const catalog=[
{id:'hanger',name:'Wire clothes hanger',kind:'hanger',price:125,section:'Men’s · accessories',x:-10,z:2,y:1.1,detail:'One previous shirt. No questions asked.'},
{id:'hammer',name:'Nearly straight hammer',kind:'hammer',price:650,section:'Hardware',x:11,z:-8,y:1.28,detail:'The handle has seen three sheds and a divorce.'},
{id:'mug',name:'World’s Okayest Neighbor',kind:'mug',price:225,section:'Housewares',x:11,z:-2,y:1.29,detail:'A mug for a carefully measured friendship.'},
{id:'plate',name:'Floral dinner plate',kind:'plate',price:175,section:'Housewares',x:9.6,z:-2,y:1.29,detail:'Dishwasher uncertain. Dinner possible.'},
{id:'lamp',name:'Avocado table lamp',kind:'lamp',price:899,section:'Electronics',x:7,z:-8,y:.73,detail:'Tested. It makes light. That is all we promise.'},
{id:'radio',name:'AM / FM / probably ghosts',kind:'radio',price:799,section:'Electronics',x:6,z:-8,y:1.28,detail:'Picks up the weather from 1987.'},
{id:'book',name:'A Shed of One’s Own',kind:'book',price:250,section:'Books & media',x:-7,z:-9,y:1.28,detail:'Chapter one: find a hammer. Chapter two: optimism.'},
{id:'shirt',name:'Emergency dinner shirt',kind:'shirt',price:499,section:'Women’s · casual tops',x:-4,z:3,y:.7,detail:'Polite enough for dinner. Interesting enough to leave early.'},
{id:'trousers',name:'Perfectly adequate trousers',kind:'trousers',price:599,section:'Men’s · bottoms',x:-10,z:6,y:.6,detail:'Contains the standard number of legs.'}
];
export const objectives=[
{title:'The keys are in the car. Again.',text:'Find a wire hanger. A mug and a book will make the wait for roadside assistance feel intentional.',needs:['hanger','mug','book']},
{title:'An extremely small shed.',text:'A hammer, a how-to book, and a plate. Every construction project needs a lunch break.',needs:['hammer','book','plate']},
{title:'Dinner with someone’s parents.',text:'Find a presentable shirt, a table lamp, and a mug. Pretend this was planned.',needs:['shirt','lamp','mug']}
];
export function createRun(seed=Math.floor(Math.random()*1e6)){
const state={seed,objective:objectives[Math.abs(seed)%objectives.length],phase:'shopping',money:3000,bag:[],paid:[],swapped:[],suspicion:0,health:100,car:100,elapsed:0,charge:100,extinguisher:false,reason:''};
const item=id=>catalog.find(i=>i.id===id);const price=id=>state.swapped.includes(id)?99:item(id)?.price??0;
const total=()=>state.bag.reduce((s,id)=>s+price(id),0);
const required=()=>state.objective.needs.every(id=>state.paid.includes(id));
function take(id){if(state.phase!=='shopping'||!item(id)||state.bag.includes(id)||state.paid.includes(id))return false;state.bag.push(id);return true;}
function putBack(id){const i=state.bag.indexOf(id);if(state.phase!=='shopping'||i<0)return false;state.bag.splice(i,1);return true;}
function swap(id){if(state.phase!=='shopping'||!state.bag.includes(id)||state.swapped.includes(id))return false;state.swapped.push(id);return true;}
function checkout(){if(state.phase!=='shopping')return {ok:false,message:'The register is closed.'};if(!state.bag.length)return{ok:false,message:'“Find something you like first.”'};if(total()>state.money)return{ok:false,message:'“Over budget. You can put something back.”'};if(state.bag.some(id=>state.swapped.includes(id))){state.suspicion=Math.max(state.suspicion,65);return{ok:false,message:'“This tag doesn’t match.” The manager has been called.'};}const cost=total();state.money-=cost;state.paid.push(...state.bag);state.bag=[];return{ok:true,cost,message:required()?'“Receipt’s in the bag. Have a normal day.”':'“Thank you. Still looking for something?”'};}
function fail(reason){if(['won','lost'].includes(state.phase))return;state.phase='lost';state.reason=reason;}
function leave(){if(state.phase!=='shopping')return false;if(state.bag.length){state.suspicion=100;return false;}if(!required())return false;state.phase='escape';state.elapsed=0;return true;}
function escape(){if(state.phase!=='escape'||!required())return false;state.phase='won';return true;}
function update(dt,{seen=false,nearFire=false,spraying=false}={}){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);if(state.phase==='shopping'){state.suspicion=Math.max(0,Math.min(100,state.suspicion+(seen&&state.swapped.length?22:-5)*dt));}if(state.phase==='escape'){state.elapsed+=dt;state.car=Math.max(0,state.car-(state.elapsed>18?1.15:0)*dt);if(nearFire)state.health=Math.max(0,state.health-17*dt);if(spraying&&state.extinguisher)state.charge=Math.max(0,state.charge-14*dt);if(state.health<=0)fail('The cats have made the parking lot uninhabitable.');if(state.car<=0)fail('Your car is now a very expensive candle.');}}
return{state,item,price,total,required,take,putBack,swap,checkout,leave,escape,fail,update};
}
export function attach(object,opts={}){const run=createRun(opts.seed);return {...run,update:run.update,dispose(){}};}
