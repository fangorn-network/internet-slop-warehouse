import {writeFileSync} from 'node:fs';import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';import {makeTower} from '../parts/water-tower.js';
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
writeFileSync('parts/dead-air/water-tower.glb',Buffer.from(await new GLTFExporter().parseAsync(makeTower(),{binary:true})));console.log('Original CC0 water tower exported');
