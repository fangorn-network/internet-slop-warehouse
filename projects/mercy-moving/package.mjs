import {build} from 'rolldown';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';
const root=import.meta.dirname,out=resolve(root,'../../artifacts/mercy-moving');await mkdir(out,{recursive:true});
const built=await build({input:resolve(root,'main.js'),external:id=>id==='three'||id.startsWith('three/'),output:{format:'esm',codeSplitting:false,minify:true}});
let js=built.output.find(x=>x.type==='chunk').code;
const atlas=await readFile(resolve(root,'assets/town-materials-v2.png'));js=js.replace('./assets/town-materials-v2.png','data:image/png;base64,'+atlas.toString('base64'));
if(js.includes('./assets/town-materials-v2.png'))throw Error('Atlas path was not embedded');
let html=await readFile(resolve(root,'index.html'),'utf8');const css=await readFile(resolve(root,'style.css'),'utf8');html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>').replaceAll('/vendor/three/','https://cdn.jsdelivr.net/npm/three@0.170.0/').replace('<script type="module" src="main.js"></script>',()=>'<script type="module">'+js.replaceAll('</script','<\\/script')+'</script>');
await writeFile(resolve(out,'mercy-moving.html'),html);console.log('Packaged '+html.length+' characters into artifacts/mercy-moving/mercy-moving.html');
