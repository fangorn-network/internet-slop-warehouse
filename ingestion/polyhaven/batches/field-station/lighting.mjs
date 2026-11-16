// Bounded CC0 lighting/terrain downloads; verify upstream bytes and MD5, retain SHA-256.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./',import.meta.url), dest=new URL('../../../../parts/haven/',root);
const hash=(b,a='sha256')=>createHash(a).update(b).digest('hex');
const definitions=[
 ['misty_pines','ph-misty-pines','Misty Pines forest environment','hdr','image/vnd.radiance',j=>j.hdri['1k'].hdr],
 ['forrest_ground_01','ph-forest-floor-normal','Forest floor OpenGL normal map','jpg','image/jpeg',j=>j.nor_gl['1k'].jpg],
 ['forrest_ground_01','ph-forest-floor-roughness','Forest floor roughness map','jpg','image/jpeg',j=>j.Rough['1k'].jpg]
];
const parts=[],evidence=[];
for(const [upstream,id,title,ext,mime,select] of definitions){
 const metadata=await(await fetch(`https://api.polyhaven.com/info/${upstream}`)).json();
 const files=await(await fetch(`https://api.polyhaven.com/files/${upstream}`)).json(),spec=select(files);
 if(!spec)throw Error('Missing variant: '+id);
 let bytes;const file=`haven/${id}.${ext}`;
 try{bytes=await readFile(new URL(`${id}.${ext}`,dest));}catch{}
 if(!bytes||hash(bytes,'md5')!==spec.md5){const res=await fetch(spec.url,{signal:AbortSignal.timeout(60000)});if(!res.ok)throw Error(res.status);bytes=Buffer.from(await res.arrayBuffer());}
 if(bytes.length!==spec.size||hash(bytes,'md5')!==spec.md5)throw Error('Source mismatch');
 await writeFile(new URL(`${id}.${ext}`,dest),bytes);
 const creator=Object.keys(metadata.authors??{}).join(', ');
 parts.push({id,file,title,type:'asset',mime,author:creator,license:'CC0-1.0',tags:['forest','pbr',ext==='hdr'?'hdri':'texture','realistic','polyhaven'],description:`${title}, 1K. Source https://polyhaven.com/a/${upstream}, by ${creator}. CC0. ${id.includes('normal')?'OpenGL +Y tangent-space, linear data.':id.includes('roughness')?'Linear roughness data.':'Equirectangular Radiance HDR, load with RGBELoader for image-based lighting.'}`});
 evidence.push({id,source:`https://polyhaven.com/a/${upstream}`,license:'https://polyhaven.com/license',creator,download:spec,sha256:hash(bytes),bytes:bytes.length,file,acquiredAt:new Date().toISOString()});
 console.log(id,bytes.length);
}
await writeFile(new URL('lighting.parts.json',root),JSON.stringify(parts,null,2)+'\n');
await writeFile(new URL('lighting.provenance.json',root),JSON.stringify(evidence,null,2)+'\n');
