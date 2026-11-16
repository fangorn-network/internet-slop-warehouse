import * as T from 'three';
// Original low-poly civilian, metre scale. Joint hierarchy is deliberately editable.
// Adult proportions, subdued work clothes and an understated walk; no armor asset.
export function createResident(scene,tint='#77756b'){
 const holder=new T.Group(),model=new T.Group();holder.add(model);scene.add(holder);
 const cloth=new T.MeshStandardMaterial({color:tint,roughness:1,flatShading:true});
 const trousers=new T.MeshStandardMaterial({color:0x353834,roughness:1,flatShading:true});
 const skin=new T.MeshStandardMaterial({color:0x9b8b75,roughness:1,flatShading:true});
 const hair=new T.MeshStandardMaterial({color:0x3b3932,roughness:1,flatShading:true});
 const boot=new T.MeshStandardMaterial({color:0x292b27,roughness:1});
 function mesh(g,m,parent,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;}
 function limb(parent,length,top,bottom,mat){const geo=new T.CylinderGeometry(top,bottom,length,7);geo.translate(0,-length/2,0);return mesh(geo,mat,parent,0,0,0,1,1,.83);}
 const hips=new T.Group();hips.position.y=.91;model.add(hips);
 mesh(new T.CylinderGeometry(.155,.145,.22,8),trousers,hips,0,0,0,1,1,.78);
 const torso=new T.Group();torso.position.y=.11;hips.add(torso);
 mesh(new T.CylinderGeometry(.21,.165,.48,8),cloth,torso,0,.23,0,1,1,.65);
 mesh(new T.BoxGeometry(.16,.31,.018),new T.MeshStandardMaterial({color:0x79796a,roughness:1}),torso,0,.28,.128);
 for(const side of [-1,1]){const lapel=mesh(new T.BoxGeometry(.08,.24,.018),cloth,torso,side*.095,.34,.143);lapel.rotation.z=side*.25;mesh(new T.BoxGeometry(.08,.09,.02),cloth,torso,side*.13,.15,.13);}
 for(let y=.08;y<.4;y+=.09)mesh(new T.SphereGeometry(.012,5,4),boot,torso,.025,y,.15);
 limb(torso,.1,.055,.06,skin).position.set(0,.59,0);
 const head=new T.Group();head.position.set(0,.62,.005);torso.add(head);
 mesh(new T.SphereGeometry(1,9,7),skin,head,0,.075,0,.102,.139,.105);
 const cap=mesh(new T.SphereGeometry(1,9,5,0,Math.PI*2,0,Math.PI*.58),hair,head,0,.113,-.006,.105,.108,.105);
 // Small facial planes read as a person at encounter distance, not a cartoon face.
 mesh(new T.ConeGeometry(.024,.065,4),skin,head,0,.064,.104,1,1,.6).rotation.x=Math.PI/2;
 for(const side of [-1,1]){mesh(new T.BoxGeometry(.031,.012,.007),hair,head,side*.041,.095,.096);mesh(new T.BoxGeometry(.032,.007,.008),hair,head,side*.043,.112,.09);mesh(new T.SphereGeometry(.025,5,4),skin,head,side*.098,.071,-.004,.5,1,.6);}
 mesh(new T.BoxGeometry(.044,.005,.009),hair,head,0,.021,.089);
 const joints=[];
 for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*.087,-.1,0);hips.add(leg);limb(leg,.39,.09,.067,trousers);const knee=new T.Group();knee.position.y=-.39;leg.add(knee);limb(knee,.38,.067,.05,trousers);mesh(new T.BoxGeometry(.13,.105,.25),boot,knee,0,-.38,.055);const arm=new T.Group();arm.position.set(side*.22,.43,0);torso.add(arm);arm.rotation.z=side*.08;limb(arm,.28,.074,.054,cloth);const elbow=new T.Group();elbow.position.y=-.28;arm.add(elbow);limb(elbow,.27,.054,.043,cloth);mesh(new T.SphereGeometry(.052,6,5),skin,elbow,0,-.29,.008,.85,1.25,.7);joints.push({side,leg,knee,arm,elbow});}
 let phase=0,blend=0;const record={holder,model,moving:false};model.userData.initialSize=[.58,1.78,.3];record.anim={update(dt){blend=T.MathUtils.damp(blend,record.moving?1:0,8,dt);phase+=dt*(record.speed??2.5)*4;hips.position.y=.91+Math.cos(phase*2)*.014*blend;torso.rotation.y=Math.sin(phase)*.045*blend;for(const j of joints){const s=Math.sin(phase+(j.side>0?Math.PI:0));j.leg.rotation.x=s*.34*blend;j.knee.rotation.x=Math.max(0,-s)*.43*blend;j.arm.rotation.x=-s*.23*blend;j.elbow.rotation.x=-.1-Math.max(0,s)*.08*blend;}head.rotation.y=Math.sin(phase*.12)*.025;},dispose(){}};return record;
}
