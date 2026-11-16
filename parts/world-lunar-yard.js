// CC0. A salvage yard under an impossible ringed planet. No textures or external assets required.
import * as THREE from 'three';
export function attach(scene,{radius=34,accent=0xe6a66b,onReady=()=>{}}={}){
    const root=new THREE.Group();scene.add(root);const old={background:scene.background,fog:scene.fog};scene.background=new THREE.Color(0x101628);scene.fog=new THREE.FogExp2(0x101628,.009);
    const meshes=[],mesh=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);meshes.push(m);return m;};
    const concrete=new THREE.MeshStandardMaterial({color:0x43505b,roughness:.85}),edge=new THREE.MeshStandardMaterial({color:accent,metalness:.4,roughness:.55}),dark=new THREE.MeshStandardMaterial({color:0x1e2b36,roughness:.6,metalness:.5});
    const floor=mesh(new THREE.CylinderGeometry(radius,radius+1,1.8,64),concrete,0,-1,0);
    const grid=new THREE.GridHelper(radius*2,32,0x85918e,0x59626a);grid.position.y=-.08;root.add(grid);
    const obstacles=[];
    for(let i=0;i<20;i++){
        const a=i/20*Math.PI*2,x=Math.cos(a)*(radius-1),z=Math.sin(a)*(radius-1);
        const post=mesh(new THREE.BoxGeometry(.8,1.6,.8),edge,x,.7,z);obstacles.push(new THREE.Box3().setFromObject(post));
        const stripe=mesh(new THREE.BoxGeometry(.83,.2,.83),dark,x,1,z);
    }
    const pad=mesh(new THREE.CylinderGeometry(4.2,4.5,.2,48),new THREE.MeshStandardMaterial({color:0x63775e,metalness:.5,roughness:.4,emissive:0x253b21}),0,0,0);
    const ring=mesh(new THREE.TorusGeometry(4.4,.06,8,64),new THREE.MeshBasicMaterial({color:0xb7ef9a}),0,.15,0);ring.rotation.x=Math.PI/2;
    // The gantry is high enough to drive under; its legs remain outside the delivery pad.
    for(const x of [-6,6])mesh(new THREE.BoxGeometry(.5,7,.5),edge,x,3.4,-4.5);
    mesh(new THREE.BoxGeometry(12.5,.5,.6),edge,0,7,-4.5);
    for(let i=0;i<6;i++){const m=mesh(new THREE.BoxGeometry(4,2.7,2.5),dark,-22+i*8,1.25,-25);const stripe=mesh(new THREE.BoxGeometry(3.8,.1,2.53),edge,m.position.x,2,m.position.z);obstacles.push(new THREE.Box3().setFromObject(m));}
    const planet=mesh(new THREE.SphereGeometry(13,40,24),new THREE.MeshBasicMaterial({color:0x8a715a}),-38,1,-82);
    const planetRing=mesh(new THREE.RingGeometry(17,23,96),new THREE.MeshBasicMaterial({color:0xc8b19a,side:THREE.DoubleSide,transparent:true,opacity:.65}),-38,1,-82);planetRing.rotation.x=-.7;planetRing.rotation.z=.3;
    const hemi=new THREE.HemisphereLight(0xb5d1ed,0x26303e,2.8);root.add(hemi);const sun=new THREE.DirectionalLight(0xffcb93,3.5);sun.position.set(-15,20,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:.1,far:160});sun.shadow.normalBias=.04;root.add(sun);const fill=new THREE.PointLight(0xa5e7aa,30,25);fill.position.set(0,5,0);root.add(fill);
    let dead=false,t=0;const handle={root,spawn:new THREE.Vector3(0,1.1,9),depot:new THREE.Vector3(0,0,0),bounds:[-radius+2,radius-2,-radius+2,radius-2],obstacles,
        update(dt){if(dead)return;t+=dt;planetRing.rotation.z=.3+Math.sin(t*.04)*.04;},
        dispose(){if(dead)return;dead=true;root.removeFromParent();const g=new Set(),m=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material);});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());scene.background=old.background;scene.fog=old.fog;},
    };onReady(handle);return handle;
}
