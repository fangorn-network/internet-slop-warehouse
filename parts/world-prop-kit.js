// SPDX-License-Identifier: CC0-1.0
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
// Preserve authored axes/materials; normalize only the wrapper, in meters, at ground origin.
export function fitModel(source,height=1){
 const root=new T.Group(),model=source.clone(true);root.add(model);root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 if(!Number.isFinite(size.y)||size.y<=0)throw Error('Model has no finite height');
 model.position.sub(new T.Vector3(center.x,box.min.y,center.z));root.scale.setScalar(height/size.y);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});root.updateMatrixWorld(true);return root;
}
export function attach(scene,{parts={},heightAt=()=>0,onProgress=()=>{}}={}){
 const loader=new GLTFLoader(),cache=new Map(),root=new T.Group(),colliders=[];scene.add(root);let dead=false;
 async function load(id){if(cache.has(id))return cache.get(id);if(!parts[id])throw Error(`Missing warehouse asset: ${id}`);if(!cache.has(id))cache.set(id,loader.loadAsync(parts[id]).then(g=>{onProgress(id);return g.scene;}));return cache.get(id);}
 async function place(id,{x=0,z=0,y=heightAt(x,z),height=1,yaw=0,radius=0}={}){
  const model=fitModel(await load(id),height);if(dead)return null;model.position.set(x,y,z);model.rotation.y=yaw;root.add(model);if(radius)colliders.push({x,z,radius});return model;
 }
 async function scatter(id,placements,{castShadow=false}={}){
  if(!placements.length)return[];const source=await load(id);if(dead)return[];
  const prototype=fitModel(source,1),meshList=[];prototype.traverse(o=>{if(o.isMesh)meshList.push(o);});
  const dummy=new T.Object3D(),matrix=new T.Matrix4(),out=[];
  for(const mesh of meshList){const batch=new T.InstancedMesh(mesh.geometry,mesh.material,placements.length);batch.castShadow=castShadow;batch.receiveShadow=true;
   placements.forEach((p,i)=>{dummy.position.set(p.x,p.y??heightAt(p.x,p.z),p.z);dummy.rotation.set(0,p.yaw??0,0);dummy.scale.setScalar(p.height??1);dummy.updateMatrix();matrix.multiplyMatrices(dummy.matrix,mesh.matrixWorld);batch.setMatrixAt(i,matrix);});batch.computeBoundingSphere();root.add(batch);out.push(batch);
  }
  return out;
 }
 return{root,colliders,load,place,scatter,register(id,model){cache.set(id,Promise.resolve(model));},update(){},dispose(){dead=true;root.removeFromParent();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});for(const p of cache.values())p.then(model=>{const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}).catch(()=>{});cache.clear();}};
}
