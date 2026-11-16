import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
const root=resolve(import.meta.dirname),three=resolve(root,'../../node_modules/three');
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const vendor=path.startsWith('/vendor/three/'),base=vendor?three:root,file=resolve(base,vendor?path.slice(14):'.'+(path==='/'?'/index.html':decodeURIComponent(path)));if(relative(base,file).startsWith('..'))throw Error('path');const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.txt':'text/plain'})[extname(file)]??'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end('Not found');}});server.listen(Number(process.env.PORT??4177),'0.0.0.0',()=>console.log('Mercy, Moving: http://localhost:'+server.address().port));
