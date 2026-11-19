// Deterministic offline packaging. CC0-1.0.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
let html=read('template.html');for(const [key,file] of Object.entries({STYLE:'style.css',CORE:'vendor/relay-core-2.0.0.cjs',MISSION:'mission.cjs',APP:'app.js'}))html=html.replace('__'+key+'__',()=>read(file));fs.writeFileSync(path.join(root,'index.html'),html);
const files=['index.html','template.html','style.css','app.js','mission.cjs','vendor/relay-core-2.0.0.cjs','build.cjs','test.cjs','ui-source-test.cjs','README.md','SOURCES.md','LICENSE'];
const manifest={artifact:'Rescue Relay: The Last Signal',version:'1.0.0',dependencies:[{name:'neutral-relay-core',version:'2.0.0',source:'../starter/v2-update/core.cjs',runtime:'inlined exact local copy',sha256:crypto.createHash('sha256').update(read('vendor/relay-core-2.0.0.cjs')).digest('hex')}],files:Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(read(p)).digest('hex')]))};fs.writeFileSync(path.join(root,'MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Built standalone index.html and exact SHA-256 source manifest.');
