// CC0. A single draw-call particle field: fireflies, dust, spores or suspended stars.
import * as THREE from 'three';
export function attach(parent,{count=180,area=[60,60],height=[.5,8],color=0xc4f8a3,size=.1,speed=.3,seed=42,opacity=.8}={}){
    if(!Number.isSafeInteger(count)||count<0||count>20000)throw new RangeError('Invalid particle count');
    let s=seed>>>0;const rand=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
    const base=new Float32Array(count*3),data=new Float32Array(count*3),phase=new Float32Array(count);
    for(let i=0;i<count;i++){base[i*3]=(rand()-.5)*area[0];base[i*3+1]=height[0]+rand()*(height[1]-height[0]);base[i*3+2]=(rand()-.5)*area[1];phase[i]=rand()*6.28;}
    data.set(base);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data,3));
    const material=new THREE.PointsMaterial({color,size,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending});
    const points=new THREE.Points(geometry,material);parent.add(points);let t=0,dead=false;
    return {points,update(dt){if(dead||!Number.isFinite(dt)||dt<=0)return;t+=dt*speed;for(let i=0;i<count;i++){data[i*3]=base[i*3]+Math.sin(t+phase[i])*.7;data[i*3+1]=base[i*3+1]+Math.sin(t*.8+phase[i])*.35;data[i*3+2]=base[i*3+2]+Math.cos(t+phase[i])*.7;}geometry.attributes.position.needsUpdate=true;},dispose(){if(dead)return;dead=true;points.removeFromParent();geometry.dispose();material.dispose();}};
}
