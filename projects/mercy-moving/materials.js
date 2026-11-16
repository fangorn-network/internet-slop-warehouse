import * as T from 'three';
// Original generated diffuse atlas. Each crop is reduced to a deliberately modest
// 256 px; metre-scale UVs, muted albedo and geometry carry the period look.
export async function loadTownMaterials(){
 const image=await new T.TextureLoader().loadAsync('./assets/town-materials-v2.png');
 const specs={steel:[0,0,.8,3.5],plaster:[1,0,4,4],road:[2,0,3,3],wood:[0,1,3,2.5],stone:[1,1,2,2],concrete:[2,1,2.6,2.6]};
 const materials={};for(const [name,[col,row,metresX,metresY]]of Object.entries(specs)){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;canvas.getContext('2d').drawImage(image.image,col*image.image.width/3,row*image.image.height/2,image.image.width/3,image.image.height/2,0,0,256,256);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.anisotropy=2;const material=new T.MeshStandardMaterial({map,roughness:name==='road'?.87:.96,metalness:name==='steel'?.18:0});material.name=name;material.userData.tileSize=[metresX,metresY];materials[name]=material;}
 image.dispose();return materials;
}
export function metricUV(geometry,material){const tile=material.userData.tileSize;if(!tile)return geometry;const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i):p.getX(i))/tile[0],(ny>.5?p.getZ(i):p.getY(i))/tile[1]);}return geometry;}
