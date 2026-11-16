import {build} from 'rolldown';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';
const root=import.meta.dirname,out=resolve(root,'../../artifacts/mairas-dream');await mkdir(out,{recursive:true});
const built=await build({input:resolve(root,'main.js'),external:id=>id==='three'||id.startsWith('three/'),output:{format:'esm',codeSplitting:false,minify:true}});
const js=built.output.find(x=>x.type==='chunk').code;
let html=await readFile(resolve(root,'index.html'),'utf8');const css=await readFile(resolve(root,'style.css'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>').replaceAll('/vendor/three/','https://cdn.jsdelivr.net/npm/three@0.170.0/').replace('<script type="module" src="main.js"></script>',()=>'<script type="module">'+js.replaceAll('</script','<\\/script')+'</script>');
html=html.replace('</head>',`<!-- Original game, models and rules CC0-1.0. Three.js MIT: https://github.com/mrdoob/three.js/blob/r170/LICENSE -->\n<script>window.WAREHOUSE_PARTS={/*PARTS*/};</script></head>`);
await writeFile(resolve(out,'mairas-dream.html'),html);console.log('Packaged '+html.length+' characters');
