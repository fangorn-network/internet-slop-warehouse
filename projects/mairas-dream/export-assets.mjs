import {writeFile} from 'node:fs/promises';
import {Group} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {kinds,makePiece} from './prop-kit.js';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(r=>{this.result='data:application/octet-stream;base64,'+Buffer.from(r).toString('base64');this.onloadend?.();});}};
const root=new Group();for(const kind of kinds)root.add(makePiece(kind));
const glb=await new GLTFExporter().parseAsync(root,{binary:true});await writeFile(new URL('./assets/thrift-kit.glb',import.meta.url),Buffer.from(glb));console.log(`${kinds.length} original models; ${glb.byteLength} bytes`);
