// Original CC0 authored layout, shared by rendering, simulation and traversal QA.
export const BUILDINGS = [
 {id:'diner',name:'Mercy Diner',x:-15,z:12,w:16,d:10,h:4,front:1,doorWidth:2,claimable:false,kind:'diner'},
 ...Array.from({length:6},(_,i)=>({id:`motel-${i+3}`,name:`Stillwater · Room ${i+3}`,x:9.5+(23/6)*(i+.5),z:-24,w:23/6,d:9,h:4,front:1,doorWidth:1.5,claimable:true,kind:'motel'})),
 {id:'chapel',name:'Mercy Chapel',x:-22,z:-41,w:13,d:18,h:6,front:1,doorWidth:2.3,claimable:true,kind:'chapel'},
 {id:'post-office',name:'U.S. Post Office',x:17,z:38,w:13,d:9,h:4,front:-1,doorWidth:1.8,claimable:true,kind:'post-office'},
 ...[[-30,45],[32,63],[-27,-67],[33,-59]].map(([x,z],i)=>({id:`house-${i+1}`,name:`${[12,27,6,31][i]} County Road`,x,z,w:12,d:10,h:4.8,front:1,doorWidth:1.8,claimable:true,kind:'house'}))
];
export function doorFor(b){return {buildingId:b.id,name:b.name,x:b.x,z:b.z+b.front*b.d/2,w:b.doorWidth,d:.2,open:b.kind==='diner'};}
export function contains(b,p,margin=.45){return Math.abs(p.x-b.x)<b.w/2-margin&&Math.abs(p.z-b.z)<b.d/2-margin;}
