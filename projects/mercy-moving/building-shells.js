import * as T from 'three';
import {doorFor} from './building-layout.js';
// Original CC0 hollow shells. box/block are injected so material UVs and static
// collision use the same wall dimensions as the surrounding authored world.
export function buildShell(b,{box,block,mats,root,doors,point}){
 const {x,z,w,d,h,front}=b,wall=b.kind==='chapel'?mats.stone:b.kind==='house'?mats.wood:mats.plaster;
 const thickness=.22,doorH=2.75,windowH=1.35,windowY=2.25;
 const interiorPaint=new T.MeshStandardMaterial({color:b.kind==='motel'?0xa69e87:0xb3aa95,roughness:1});
 const floorPaint=new T.MeshStandardMaterial({color:0x665b48,roughness:1});
 const doorPaint=new T.MeshStandardMaterial({color:0x566258,roughness:.88});
 const frontZ=z+front*d/2,backZ=z-front*d/2;
 function wallVisual(cx,y,cz,width,height,depth){box(cx,y,cz,width,height,depth,wall);if(width>depth)box(cx,y,cz+Math.sign(z-cz)*.13,width,height,.025,interiorPaint);else box(cx+Math.sign(x-cx)*.13,y,cz,.025,height,depth,interiorPaint);}
 function wallPiece(cx,cz,width,height,depth,y=height/2+.18){wallVisual(cx,y,cz,width,height,depth);block(cx,cz,width,depth);}
 box(x,.12,z,w,.12,d,floorPaint);
 box(x,h+.18,z,w+.35,.16,d+.35,interiorPaint);
 wallPiece(x,backZ,w,h,thickness);
 for(const side of [-1,1])wallPiece(x+side*w/2,z,thickness,h,d);
 const windows=b.kind==='motel'?[]:[{x:x-w*.26,w:1.65},{x:x+w*.26,w:1.65}];
 const openings=[{x,w:b.doorWidth,door:true},...windows].sort((a,b)=>a.x-b.x);
 let start=x-w/2;
 for(const opening of openings){const left=opening.x-opening.w/2,right=opening.x+opening.w/2;
  if(left>start)wallPiece((start+left)/2,frontZ,left-start,h,thickness);
  if(opening.door){wallVisual(opening.x,.18+doorH+(h-doorH)/2,frontZ,opening.w,h-doorH,thickness);}
  else{
   const low=windowY-windowH/2,high=windowY+windowH/2;
   wallVisual(opening.x,.18+low/2,frontZ,opening.w,low,thickness);
   wallVisual(opening.x,.18+high+(h-high)/2,frontZ,opening.w,h-high,thickness);
   block(opening.x,frontZ,opening.w,thickness);
   box(opening.x,.18+windowY,frontZ,opening.w,windowH,.07,mats.glass);
   for(const side of [-1,1])box(opening.x+side*opening.w/2,.18+windowY,frontZ+front*.13,.075,windowH+.15,.12,mats.wood);
   for(const y of [low,high])box(opening.x,.18+y,frontZ+front*.13,opening.w+.15,.075,.12,mats.wood);
   box(opening.x,.18+windowY,frontZ+front*.13,.045,windowH,.12,mats.wood);
  }
  start=right;
 }
 if(start<x+w/2)wallPiece((start+x+w/2)/2,frontZ,x+w/2-start,h,thickness);
 const pivot=new T.Group();pivot.position.set(x-front*b.doorWidth/2,.18,frontZ);root.add(pivot);
 const baseYaw=front===1?0:Math.PI;pivot.rotation.y=baseYaw;
 box(b.doorWidth/2,.75,0,b.doorWidth,1.5,.14,doorPaint,pivot);
 box(b.doorWidth/2,2.55,0,b.doorWidth,.4,.14,doorPaint,pivot);
 for(const side of [.09,.91])box(b.doorWidth*side,1.925,0,b.doorWidth*.18,.85,.14,doorPaint,pivot);
 box(b.doorWidth/2,1.925,0,b.doorWidth*.64,.85,.07,mats.glass,pivot);
 box(b.doorWidth-.16,1.15,.115,.06,.2,.08,mats.steel,pivot);
 box(b.doorWidth-.16,1.15,-.115,.06,.2,.08,mats.steel,pivot);
 for(const side of [-1,1])box(x+side*(b.doorWidth/2+.045),1.58,frontZ+front*.03,.09,2.9,.25,mats.wood);
 box(x,3.01,frontZ,b.doorWidth+.18,.12,.27,mats.wood);
 doors.push({...doorFor(b),pivot,baseYaw,target:baseYaw});
 // Restrained furnishing leaves a direct route from each threshold to its centre.
 if(b.kind==='house'||b.kind==='motel'){
  box(x-w*.27,.48,z-d*.19,w*.3,.6,2.1,mats.wood);
  box(x-w*.27,.83,z-d*.19,w*.3,.16,2.1,mats.plaster);
  box(x-w*.27,.96,z-d*.19-.65,w*.24,.16,.5,mats.plaster);
  box(x+w*.28,.57,z-d*.2,.9,.8,.55,mats.wood);
 }else if(b.kind==='chapel'){
  for(const side of [-1,1])for(let row=-5;row<=4;row+=3){box(x+side*3,.66,z+row,3.3,.5,.65,mats.wood);box(x+side*3,1.12,z+row-.35,3.3,.85,.12,mats.wood);block(x+side*3,z+row,3.3,.8);}
  box(x,.85,z-d/2+2,3,1.3,1,mats.wood);block(x,z-d/2+2,3,1);
 }else if(b.kind==='post-office'){
  box(x,1.1,z+1,7,1.8,.65,mats.wood);block(x,z+1,7,.65);
  for(let a=-4;a<=4;a+=.8)for(let y=.8;y<2.8;y+=.55)box(x+a,y,z+d/2-.2,.65,.4,.15,mats.steel);
 }
 // Flat ground-floor simulation: furnishings that obstruct walking get colliders.
 if(b.kind==='house'||b.kind==='motel'){block(x-w*.27,z-d*.19,w*.3,2.1);block(x+w*.28,z-d*.2,.9,.55);}
 box(x,h-.35,z,.45,.1,.45,mats.warm);
 point(x,h-.65,z,0xe7c28b,b.kind==='chapel'?38:19,b.kind==='chapel'?14:8);
 return b;
}
