// CC0. A circular architectural garden with three resonators and a central kinetic sculpture.
import * as THREE from 'three';
export function attach(scene,{accent=0xd8c98b,onReady=()=>{}}={}){
    const root=new THREE.Group();scene.add(root);const old={background:scene.background,fog:scene.fog};scene.background=new THREE.Color(0x9ab3ac);scene.fog=new THREE.FogExp2(0x9ab3ac,.012);
    const mesh=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
    const stone=new THREE.MeshStandardMaterial({color:0xbbbca5,roughness:.7}),gold=new THREE.MeshStandardMaterial({color:accent,metalness:.7,roughness:.3}),moss=new THREE.MeshStandardMaterial({color:0x526f57,roughness:1});
    mesh(new THREE.CylinderGeometry(32,33,2,64),moss,0,-1.15,0);
    const path=mesh(new THREE.RingGeometry(9,13,80),stone,0,-.1,0);path.rotation.x=-Math.PI/2;
    const outer=mesh(new THREE.RingGeometry(24.5,25,80),gold,0,-.08,0);outer.rotation.x=-Math.PI/2;
    mesh(new THREE.CylinderGeometry(4.5,5,.9,48),stone,0,.25,0);
    const sculpture=new THREE.Group();sculpture.position.y=5;root.add(sculpture);
    const rings=[];for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(2.8+i*.5,.085,10,80),gold);ring.rotation.x=i*.8;ring.rotation.z=i*.6;sculpture.add(ring);rings.push(ring);}
    const core=mesh(new THREE.IcosahedronGeometry(1.25,1),new THREE.MeshStandardMaterial({color:0xffe4aa,emissive:0xb1883b,emissiveIntensity:.5,metalness:.4,roughness:.3}),0,5,0);
    const zones=[],colors=[0xf1b080,0x8fd3db,0xc9b1ed],obstacles=[];
    for(let i=0;i<3;i++){
        const a=i/3*Math.PI*2-Math.PI/2,x=Math.cos(a)*17,z=Math.sin(a)*17;
        const base=mesh(new THREE.CylinderGeometry(2.4,2.7,.3,32),stone,x,.05,z);
        const trim=mesh(new THREE.TorusGeometry(2.15,.08,8,48),new THREE.MeshBasicMaterial({color:colors[i]}),x,.25,z);trim.rotation.x=Math.PI/2;
        zones.push({position:new THREE.Vector3(x,0,z),radius:2.1,index:i,color:colors[i],trim});
    }
    for(let i=0;i<18;i++){
        const a=i/18*Math.PI*2,x=Math.cos(a)*28,z=Math.sin(a)*28,h=3+(i%4)*1.3;
        mesh(new THREE.CylinderGeometry(.5,.8,h,12),stone,x,h/2,z);
        const arch=mesh(new THREE.BoxGeometry(2.7,.35,1.2),stone,x,h+.1,z);arch.rotation.y=-a;
        // The colonnade is scenery beyond the walkable puzzle area.
    }
    const hemi=new THREE.HemisphereLight(0xdbede0,0x3c5144,2.8);root.add(hemi);const sun=new THREE.DirectionalLight(0xffd9a0,3);sun.position.set(10,20,-7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:.1,far:160});sun.shadow.normalBias=.04;root.add(sun);
    const glow=new THREE.PointLight(0xffdb8e,15,35);glow.position.set(0,7,0);root.add(glow);
    let t=0,power=0,dead=false;const handle={root,zones,spawn:new THREE.Vector3(0,.85,19),bounds:[-25,25,-25,25],obstacles,
        setPower(value){power=Math.max(0,Math.min(1,value));},
        update(dt){if(dead)return;t+=dt;sculpture.rotation.y+=dt*(.06+power*.35);rings.forEach((r,i)=>r.rotation.x+=dt*(.04+power*.2)*(i%2?-1:1));core.rotation.y+=dt*.2;core.material.emissiveIntensity=.5+power*2;glow.intensity=15+power*40;sun.intensity=3+power;},
        dispose(){if(dead)return;dead=true;root.removeFromParent();const g=new Set(),m=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material);});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());scene.background=old.background;scene.fog=old.fog;},
    };onReady(handle);return handle;
}
