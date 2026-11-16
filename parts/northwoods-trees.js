// SPDX-License-Identifier: CC0-1.0
import * as T from 'three';
// Local seeded generator keeps this module independently remixable.
function rng(seed){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296);}
function builder(){const p=[],c=[],n=[],uv=[];const up=new T.Vector3(0,1,0);
 function tri(a,b,d,color,tex=[[0,0],[1,1],[1,0]]){const normal=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(d,a)).normalize();let index=0;for(const v of [a,b,d]){uv.push(...tex[index++]);p.push(v.x,v.y,v.z);n.push(normal.x,normal.y,normal.z);c.push(...color);}}
 function branch(a,b,r1,r2,color,sides=5){const axis=new T.Vector3().subVectors(b,a).normalize(),u=new T.Vector3().crossVectors(axis,Math.abs(axis.y)>.95?new T.Vector3(1,0,0):up).normalize(),v=new T.Vector3().crossVectors(axis,u);for(let i=0;i<sides;i++){const point=(o,r,k)=>o.clone().addScaledVector(u,Math.cos(k/sides*Math.PI*2)*r).addScaledVector(v,Math.sin(k/sides*Math.PI*2)*r),a1=point(a,r1,i),a2=point(a,r1,i+1),b1=point(b,r2,i),b2=point(b,r2,i+1);tri(a1,a2,b1,color);tri(a2,b2,b1,color);}}
 return{tri,branch,geometry(){const g=new T.BufferGeometry();g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.computeBoundingSphere();return g;}};
}
export function makeTree({species='pine',seed=1,snow=.8,height=species==='pine'?17:14,needleTexture,barkTexture,textured=!!needleTexture,detail=1}={}){
 const r=rng(seed),wood=builder(),green=builder(),white=builder();const V=(x,y,z)=>new T.Vector3(x,y,z),bark=(barkTexture||textured)?[1,1,1]:species==='pine'?[.18,.13,.095]:[.24,.23,.22];
 wood.branch(V(0,0,0),V(.12,height,0),species==='pine'?.25:.28,.018,bark,8);
 if(species==='pine'){
  // Radial branch whorls, hanging secondary sprays, and irregular snow pillows.
  // Open silhouettes avoid the stacked-cone shape of the old tree generator.
  const levels=detail<1?7:12;for(let level=0;level<levels;level++){
   const y=1.8+level*(height-2)/levels,length=(1-y/height)*3.6+.25,arms=detail<1?4:5;
   for(let a=0;a<arms;a++){
    const angle=a/arms*Math.PI*2+level*2.399+r()*.4,dir=V(Math.cos(angle),0,Math.sin(angle)),start=V(.08,y,0),end=start.clone().addScaledVector(dir,length*(.8+r()*.35));end.y-=.35+r()*.3;
    wood.branch(start,end,.055*(1-y/height)+.01,.006,bark);
    for(let s=1;s<=(detail<1?3:5);s++){
     const f=s/(detail<1?4:6),center=start.clone().lerp(end,f),span=(1-f)*.7+.18;
     for(const sign of [-1,1]){const tip=center.clone().addScaledVector(dir,.4).add(V(-dir.z*span*sign,-.22,dir.x*span*sign));
      // Fine twig is represented by its needle sprays.
      const col=textured?[1,1,1]:[.09,.17,.13],side=V(-dir.z*.24,0,dir.x*.24);
      // Two crossed alpha-tested branch cards give fine needles from every angle.
      const end=tip.clone().addScaledVector(dir,.15),base=center.clone().addScaledVector(dir,-.13);
      for(const width of [side,V(0,.23,0)]){
       const a=base.clone().sub(width),b=base.clone().add(width),c=end.clone().addScaledVector(width,.5),d=end.clone().addScaledVector(width,-.5);
       green.tri(a,b,c,col,[[0,0],[1,0],[1,1]]);green.tri(a,c,d,col,[[0,0],[1,1],[0,1]]);
      }
      if(!textured&&r()<snow){const q=center.clone().add(V(0,.07,0)),e=tip.clone().add(V(0,.09,0));white.tri(q.clone().addScaledVector(side,-1),e,q.clone().addScaledVector(side,1),[.87,.92,.96]);}
      else r();
     }
    }
   }
  }
 }else{
  function fork(a,dir,length,radius,depth){const b=a.clone().addScaledVector(dir,length);wood.branch(a,b,radius,radius*.57,bark,depth>2?6:4);
   if(depth>0){const count=depth>2?3:2;for(let k=0;k<count;k++){const angle=r()*Math.PI*2,d=dir.clone().multiplyScalar(.5).add(V(Math.cos(angle)*.68,.25+r()*.45,Math.sin(angle)*.68)).normalize();fork(b,d,length*(.52+r()*.16),radius*.54,depth-1);}}
   if(depth>1&&r()<snow){const side=V(.035,0,.035),aa=a.clone().add(V(0,radius,0)),bb=b.clone().add(V(0,radius*.5,0));white.tri(aa.clone().sub(side),bb,aa.clone().add(side),[.8,.87,.92]);}
  }
  for(let k=0;k<(detail<1?5:7);k++){const a=k*2.399,y=height*(.25+k*.075);fork(V(0,y,0),V(Math.cos(a)*.7,.65,Math.sin(a)*.7).normalize(),height*(.27+r()*.12),.12*(1-k*.07),detail<1?2:4);}
 }
 const root=new T.Group();root.name=species==='pine'?'Snow-laden red pine':'Leafless sugar maple';
 for(const [b,name] of [[wood,'bark'],[green,'needles'],[white,'snow']]){const g=b.geometry();if(g.attributes.position.count){const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide,...(name==='needles'&&needleTexture?{map:needleTexture,alphaTest:.45}:{}),...(name==='bark'&&barkTexture?{map:barkTexture,bumpMap:barkTexture,bumpScale:.035,color:'#d6c7b5'}:{})}));mesh.name=name;mesh.material.name=name;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}else g.dispose();}
 return root;
}
export function attach(parent,opts={}){const root=makeTree(opts);parent.add(root);return{root,update(){},dispose(){root.removeFromParent();root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};}
