// Real WebGL smoke and interaction checks. Serve a local `publish-batch --local` build.
import { createServer } from 'node:http';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,relative } from 'node:path';
import assert from 'node:assert/strict';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const root=resolve(process.argv[2]??'/tmp/weird-worlds'),vendor=resolve('node_modules/three'),out=resolve('artifacts/weird-worlds');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file;
 if(path.startsWith('/vendor/three/')){file=resolve(vendor,path.slice('/vendor/three/'.length));if(relative(vendor,file).startsWith('..'))throw Error('Bad vendor path');}
 else{file=resolve(root,'.'+path);if(relative(root,file).startsWith('..'))throw Error('Bad path');}
 let data=await readFile(file);if(file.endsWith('.html')){data=data.toString().replaceAll('https://cdn.jsdelivr.net/npm/three@0.170.0/','/vendor/three/');res.setHeader('Content-Type','text/html');}else res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.glb')?'model/gltf-binary':'application/octet-stream');res.end(data);
}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
let browser;const report={};
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const id of process.env.WORLD_QA_PHASE==='objectives'?[]:['dead-letter-lake','lunar-lost-property','the-quiet-engine']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon')&&!m.text().includes('404'))errors.push(m.text());});
  await page.goto(base+'/'+id+'.html');await page.waitForFunction(()=>window.worldDebug&&['ready','error'].includes(worldDebug.snapshot.mode),null,{timeout:90000});
  const initial=await page.evaluate(()=>worldDebug.snapshot);console.log(id,'ready',initial);assert.equal(initial.mode,'ready',errors.join('\n'));
  await page.screenshot({path:out+'/'+id+'-title.png'});await page.locator('.exp-start').click();await page.waitForTimeout(350);await page.screenshot({path:out+'/'+id+'.png'});
  const before=await page.evaluate(()=>worldDebug.snapshot.position);await page.keyboard.down('KeyW');await page.waitForFunction(z=>worldDebug.snapshot.position[2]<z-.15,before[2],{timeout:15000});await page.keyboard.up('KeyW');const after=await page.evaluate(()=>worldDebug.snapshot.position);assert(after[2]<before[2]-.1);
  await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>worldDebug.snapshot)).mode,'paused');const t=await page.evaluate(()=>worldDebug.snapshot.elapsed);await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>worldDebug.snapshot)).elapsed,t);await page.locator('.exp-start').click();
  await page.locator('.exp-reset').click();const reset=await page.evaluate(()=>worldDebug.snapshot);assert.equal(reset.mode,'playing');assert(reset.elapsed<.2);assert.deepEqual(errors,[]);
  report[id]={loaded:true,movement:true,pause:true,restart:true,initial,errors};
  await page.close();
 }

 // Accelerate the actual game loop with a controlled clock. Draw calls are disabled only
 // after the real-render smoke checks above; positions are driven through keyboard events.
 for(const id of ['dead-letter-lake','lunar-lost-property','the-quiet-engine']){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__time=performance.now();Object.defineProperty(performance,'now',{value:()=>window.__time});
   window.requestAnimationFrame=cb=>(window.__frame=cb,1);
   window.step=n=>{for(let i=0;i<n;i++){window.__time+=50;window.__frame?.(window.__time);}};
   window.key=(code,on)=>dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code}));
   window.walkTo=(x,z,tolerance=1.1,cap=1500)=>{
    let count=0,previous=worldDebug.snapshot.position;
    for(;count<cap&&worldDebug.snapshot.mode==='playing';count++){
     const p=worldDebug.snapshot.position,dx=x-p[0],dz=z-p[2];
     if(Math.hypot(dx,dz)<tolerance)break;
     const vx=(p[0]-previous[0])/.05,vz=(p[2]-previous[2])/.05;
     const sx=dx-vx*.22,sz=dz-vz*.22;
     for(const [code,on] of [['KeyA',sx<-.35],['KeyD',sx>.35],['KeyW',sz<-.35],['KeyS',sz>.35]])key(code,on);
     previous=p;step(1);
    }
    for(const code of ['KeyA','KeyD','KeyW','KeyS'])key(code,false);step(7);
    return{count,snapshot:worldDebug.snapshot};
   };
  });
  await page.goto(base+'/'+id+'.html');await page.waitForFunction(()=>window.worldDebug&&['ready','error'].includes(worldDebug.snapshot.mode),null,{timeout:90000,polling:100});assert.equal((await page.evaluate(()=>worldDebug.snapshot)).mode,'ready');
  await page.locator('.exp-start').click();
  await page.evaluate(()=>{for(const type of [window.WebGLRenderingContext,window.WebGL2RenderingContext])if(type)for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced'])if(type.prototype[name])type.prototype[name]=()=>{};document.querySelector('canvas').width=1;document.querySelector('canvas').height=1;step(2);});
  let result;
  if(id==='dead-letter-lake'){
   result=await page.evaluate(()=>{const events=[];for(let i=0;i<8&&worldDebug.snapshot.mode==='playing';i++){const p=worldDebug.snapshot.targets[i];events.push(walkTo(p[0],p[2],1.5));}return{snapshot:worldDebug.snapshot,events};});
   console.log(id,'course result',result.snapshot);assert.equal(result.snapshot.complete,true);assert.equal(result.snapshot.mode,'won');
   await page.locator('.exp-start').click();await page.evaluate(()=>step(2450));assert.equal((await page.evaluate(()=>worldDebug.snapshot)).mode,'lost');(report[id]??={}).timeout=true;
  }else if(id==='lunar-lost-property'){
   result=await page.evaluate(()=>{const events=[];for(let i=0;i<6;i++){let p=worldDebug.snapshot.items[i].position;events.push(walkTo(p[0],p[2],1.2));key('KeyE',true);step(1);key('KeyE',false);step(3);if(worldDebug.snapshot.held!==i)throw Error('Could not attach item '+i);events.push(walkTo(0,0,.6));step(80);if(!worldDebug.snapshot.items[i].delivered)throw Error('Delivery failed '+i+': '+JSON.stringify(worldDebug.snapshot));}return{snapshot:worldDebug.snapshot,events};});
   console.log(id,'delivery result',result.snapshot);assert.equal(result.snapshot.delivered,6);assert.equal(result.snapshot.mode,'won');
  }else{
   result=await page.evaluate(()=>{const events=[];for(let i=0;i<3;i++){let p=worldDebug.snapshot.crystals[i];events.push(walkTo(p[0],p[2],1));key('KeyE',true);step(1);key('KeyE',false);step(4);if(worldDebug.snapshot.held!==i)throw Error('Could not pick up crystal '+i);p=worldDebug.snapshot.zones[i];events.push(walkTo(p[0],p[2],.9));step(20);key('KeyE',true);step(1);key('KeyE',false);step(4);if(!worldDebug.snapshot.occupied[i])throw Error('Resonator failed '+i+': '+JSON.stringify(worldDebug.snapshot));}return{snapshot:worldDebug.snapshot,events};});
   console.log(id,'puzzle result',result.snapshot);assert.equal(result.snapshot.complete,true);assert.deepEqual(result.snapshot.occupied,[true,true,true]);
  }
  assert.deepEqual(errors,[]);(report[id]??={}).playthrough={snapshot:result.snapshot,keyboardOnly:true,errors};await page.close();
 }
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await mobile.goto(base+'/the-quiet-engine.html');await mobile.waitForFunction(()=>window.worldDebug?.snapshot.mode==='ready',null,{timeout:90000});await mobile.locator('.exp-start').click();assert(await mobile.getByText('USE',{exact:true}).isVisible());await mobile.screenshot({path:out+'/mobile.png'});report.mobile={touch:true};await mobile.close();
 await writeFile(out+'/browser-smoke.json',JSON.stringify(report,null,2)+'\n');console.log('All 3D worlds passed browser smoke.');
}finally{await browser?.close();server.close();}
