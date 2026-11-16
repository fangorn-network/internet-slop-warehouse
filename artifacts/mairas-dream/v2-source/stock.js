// SPDX-License-Identifier: CC0-1.0
// All visible merchandise has a stable, unique identity. Fixture positions are in meters.
export const shelves=[
[-11,-9,'media'],[-7.5,-9,'media'],[-11,-4,'media'],[-7.5,-4,'home'],
[5,-8.5,'electrics'],[8.7,-8.5,'hardware'],[12.3,-8.5,'home'],
[5,-3.8,'electrics'],[8.7,-3.8,'home'],[12.3,-3.8,'home'],
[8.7,1,'home'],[12.3,1,'home']
].map(([x,z,section],i)=>({id:'shelf-'+i,x,z,section}));
export const racks=[[-11,4.8,'Men’s · trousers'],[-11,.4,'Men’s · shirts'],[-6.4,5,'Women’s · casual'],[-6.4,.5,'Women’s · formal'],[-1.8,4.8,'Children'],[-1.8,.4,'Socks & basics']].map(([x,z,section],i)=>({id:'rack-'+i,x,z,section,round:i>3}));
export const specials=[
{id:'hanger',name:'Wire clothes hanger',kind:'hanger',price:125,section:'Men’s · accessories',x:-11,z:2.7,y:1.15,scale:1,detail:'One previous shirt. No questions asked.'},
{id:'hammer',name:'Nearly straight hammer',kind:'hammer',price:650,section:'Hardware',x:9,z:-7.95,y:1.28,scale:1,detail:'Three sheds and a divorce. Still mostly straight.'},
{id:'mug',name:'World’s Okayest Neighbor',kind:'mug',price:225,section:'Housewares',x:8.8,z:-3.55,y:1.32,scale:1,detail:'For a carefully measured friendship.'},
{id:'plate',name:'Floral dinner plate',kind:'plate',price:175,section:'Housewares',x:12.1,z:-3.65,y:1.32,scale:.75,detail:'Dishwasher uncertain. Dinner possible.'},
{id:'lamp',name:'Avocado table lamp',kind:'desk-lamp',price:899,section:'Electronics',x:.2,z:-6.2,y:.78,scale:1,detail:'Tested. Makes light. No other promises.'},
{id:'radio',name:'AM / FM / probably ghosts',kind:'boombox',price:799,section:'Electronics',x:5,z:-3.55,y:1.32,scale:.8,detail:'Picks up the weather from 1987.'},
{id:'book',name:'A Shed of One’s Own',kind:'book',price:250,section:'Books & media',x:-7.4,z:-8.74,y:1.39,scale:1,detail:'Chapter one: a hammer. Chapter two: optimism.'},
{id:'shirt',name:'Emergency dinner shirt',kind:'shirt',price:499,section:'Women’s · casual',x:-6.4,z:3.95,y:.65,scale:1,detail:'Presentable enough. Interesting enough to leave early.'},
{id:'trousers',name:'Perfectly adequate trousers',kind:'trousers',price:599,section:'Men’s · trousers',x:-11,z:5.5,y:.65,scale:1,detail:'Contains the standard number of legs.'}
];
const types={
home:['mug','plate','vase','pot','kettle','book','vase','plate'],
electrics:['desk-lamp','radio','lamp','kettle','boombox','vase'],
hardware:['hammer','hanger','radio','pot','book'],
media:['book','book','dvd','book','dvd','book','book']
};
const names={mug:['World’s Best Uncle (disputed)','Formerly white mug','Florida souvenir mug','Promotional coffee cup'],plate:['Single dinner plate','Chipped side plate','Wedding china (one survivor)'],vase:['A vase with opinions','Possibly antique vase','Unfashionable ceramic vase'],pot:['Sunday enamel pot','One-pot dinner solution'],kettle:['Vintage electric kettle','The good kettle'],book:['Practical Disappointments, Vol. II','Yesterday’s Computer Manual','The Complete Incomplete Cookbook','A Very Long Weekend'],dvd:['Pilates For Everyone Else','Unlabeled wedding video','Disc 2 of 3','Romantic Comedy, Probably'],radio:['Kitchen radio','Clock radio, no clock'],lamp:['Beige is a lifestyle','One bedside lamp'], 'desk-lamp':['Adjustable desk lamp','Homework light'],boombox:['Cassette player','Portable neighborhood disturbance'],hammer:['Well-used hammer'],hanger:['Spare wire hanger'],shirt:['Striped weekend shirt','A very confident blouse','Company picnic tee','Forgotten formal shirt'],trousers:['Corduroy trousers','Office pants','Sunday slacks'],shoe:['Left and right shoe','Very optimistic sneakers']};
const prices={mug:199,plate:149,vase:499,pot:699,kettle:1199,book:199,dvd:99,radio:599,lamp:799,'desk-lamp':899,boombox:1299,hammer:550,hanger:99,shirt:399,trousers:499,shoe:699};
export function makeStock(){const out=specials.map(i=>({...i,variant:2,rotation:0}));let n=0;
for(const s of shelves){const levels=s.section==='media'?[.12,.43,.73,1.05,1.39,1.81]:[.15,.41,.71,1.02,1.32,1.63,1.93];for(let tier=0;tier<levels.length;tier++){const kinds=types[s.section];const count=s.section==='media'?30:8;for(let col=0;col<count;col++){const kind=kinds[(col+tier*3+Math.abs(Math.round(s.x)))%kinds.length];const x=s.x-1.05+col*2.1/(count-1),z=s.z+.08+(col%2)*.08,y=levels[tier];const scale=kind==='book'||kind==='dvd'?1:kind==='plate'?.5:kind==='mug'||kind==='hanger'?.85:kind==='vase'?.56:kind==='desk-lamp'?.32:.5;
if(specials.some(i=>Math.abs(i.x-x)<.48&&Math.abs(i.z-z)<.65&&Math.abs(i.y-y)<.5))continue;
out.push({id:`find-${n++}`,kind,name:names[kind][(col+tier)%names[kind].length],price:prices[kind]+(col%3)*25,section:s.section==='home'?'Housewares':s.section==='media'?'Books & media':s.section==='hardware'?'Hardware':'Electronics',x,y,z,scale,variant:(col+tier)%6,rotation:kind==='book'||kind==='dvd'?Math.PI/2+(col%7===0?.09:0):(col%3-1)*.15,detail:['One previous life. Ready for another.','As-is. Which is also how most of us arrived.','A minor bargain with a complicated history.'][col%3]});}}}
for(const r of racks){const count=r.round?28:25;for(let i=0;i<count;i++){const angle=i/count*Math.PI*2,kind=r.section.includes('trousers')?'trousers':'shirt';out.push({id:`garment-${n++}`,kind,name:names[kind][i%names[kind].length],price:prices[kind]+(i%4)*50,section:r.section,x:r.x+(r.round?Math.sin(angle)*.95:-1.15+i*2.3/(count-1)),z:r.z+(r.round?Math.cos(angle)*.95:0),y:r.section==='Children'?.72:.6,scale:r.section==='Children'?.72:1,variant:i%6,rotation:r.round?angle:Math.PI/2,detail:'Check the seams. Read the tag. Imagine the possibilities.'});}}
for(let i=0;i<24;i++)out.push({id:`shoe-${i}`,kind:'shoe',name:names.shoe[i%2],price:699+(i%3)*100,section:'All-gender shoes',x:-14.1+(i%2)*.4,y:.25+Math.floor(i/8)*.44,z:-6.1+(i%8)*.3,scale:1,variant:i%6,rotation:Math.PI/2,detail:'Two shoes. One questionable journey.'});
return out;}
export const catalog=makeStock();

export function attach(object,{transformItem=item=>item}={}){return{catalog:makeStock().map(transformItem),shelves,racks,update(){},dispose(){}};}
