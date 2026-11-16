import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const root=resolve('/tmp/stillwater-preview'),vendor=resolve('node_modules/three'),out=resolve('artifacts/field-station');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/sandbox'){res.setHeader('Content-Type','text/html');return res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}iframe{width:100vw;height:100dvh;border:0;display:block}</style><iframe sandbox="allow-scripts allow-pointer-lock" src="/stillwater-field-station.html"></iframe>');}
 const v=path.startsWith('/vendor/three/'),base=v?vendor:root,file=resolve(base,v?path.slice(14):'.'+path);if(relative(base,file).startsWith('..'))throw Error('Traversal');
 let data=await readFile(file);if(file.endsWith('.html'))data=data.toString().replaceAll('https://cdn.jsdelivr.net/npm/three@0.170.0/','/vendor/three/');
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.png')?'image/png':'application/octet-stream');res.end(data);
 }catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;let browser;const errors=[],results={};
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))console.error('BROWSER:',m.text().split('\n')[0]);});await page.goto(base+'/sandbox');const frame=page.frames().find(f=>f!==page.mainFrame());
 await frame.waitForFunction(()=>stillwaterDebug.error||!document.querySelector('#start').disabled,null,{timeout:120000});assert.equal(await frame.evaluate(()=>stillwaterDebug.error),undefined);
 if(!process.env.SKIP_SHOTS)await page.screenshot({path:out+'/title.png',timeout:90000});await frame.locator('#start').click();await frame.waitForFunction(()=>stillwaterDebug.snapshot.playing);
 const initial=await frame.evaluate(()=>stillwaterDebug.snapshot);assert(initial.colliders>50);assert(initial.drawCalls<350);assert(initial.triangles<4000000);
 await page.keyboard.down('w');await frame.waitForFunction(z=>stillwaterDebug.camera.position.z<z-.4,initial.position.z,{timeout:45000});await page.keyboard.up('w');
 if(!process.env.SKIP_SHOTS)await page.screenshot({path:out+'/forest.png',timeout:90000});
 await frame.evaluate(()=>{window.contextEvents=[];document.addEventListener('contextmenu',e=>contextEvents.push(e.defaultPrevented));});
 const yaw=await frame.evaluate(()=>stillwaterDebug.controls.input.yaw);await page.mouse.move(650,450);await page.mouse.down({button:'right'});await page.mouse.move(800,480,{steps:8});await page.mouse.up({button:'right'});
 assert.notEqual(await frame.evaluate(()=>stillwaterDebug.controls.input.yaw),yaw);assert.deepEqual(await frame.evaluate(()=>contextEvents),[true]);assert.equal(await frame.evaluate(()=>getSelection().toString()),'');
 const go=async id=>{await frame.evaluate(id=>{const d=stillwaterDebug,s=d.world.sites.find(s=>s.id===id);d.camera.position.set(s.x,d.heightAt(s.x,s.z)+1.68,s.z+1.5);d.controls.setLook(0);},id);await frame.waitForFunction(id=>stillwaterDebug.snapshot.focus===id,id);};
 await go('generator');await frame.locator('#interact').click();assert(await frame.evaluate(()=>stillwaterDebug.rules.state.power));
 await frame.locator('#interact').click();assert.equal(await frame.evaluate(()=>stillwaterDebug.rules.state.power),false);
 await frame.locator('#interact').click();assert(await frame.evaluate(()=>stillwaterDebug.rules.state.power));
 await go('radio');await frame.locator('#interact').click();await frame.locator('#radio').waitFor();
 await frame.locator('#dial').fill('91.6');await frame.locator('#dial').dispatchEvent('input');assert.equal(await frame.evaluate(()=>stillwaterDebug.rules.signal),1);
 await frame.locator('#transmit').click();assert.equal(await frame.evaluate(()=>stillwaterDebug.rules.state.won),false);await frame.locator('#radio-close').click();
 await frame.evaluate(()=>{const d=stillwaterDebug;d.camera.position.set(-6,d.heightAt(-6,18)+1.68,18);d.controls.setLook(0,0);d.camera.rotation.set(0,0,0);});
 await frame.locator('#toss').click();await frame.waitForFunction(()=>stillwaterDebug.toys.hits>0,null,{timeout:45000});
 if(!process.env.SKIP_SHOTS)await page.screenshot({path:out+'/bells.png',timeout:90000});
 for(const id of ['fuel','fuse','log']){await go(id);await frame.locator('#interact').click();await frame.waitForFunction(id=>stillwaterDebug.rules.state.items.includes(id),id);}
 await frame.locator('#sound').click();await page.waitForTimeout(100);await frame.locator('#sound').click();
 await frame.locator('#journal').click();await frame.locator('#notes-close').click();await page.keyboard.press('Escape');assert.equal(await frame.evaluate(()=>stillwaterDebug.snapshot.playing),false);await frame.locator('#start').click();
 results.desktop={opaqueSandbox:true,load:true,movement:true,rightDrag:true,contextMenuSuppressed:true,selectionSuppressed:true,reversibleGenerator:true,radioTuning:true,noRequiredEnding:true,stoneBellHit:true,optionalFinds:true,sound:true,notes:true,pauseResume:true,drawCalls:initial.drawCalls,triangles:initial.triangles};
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base+'/sandbox');const mf=mobile.frames().find(f=>f!==mobile.mainFrame());await mf.locator('#start:not([disabled])').waitFor({timeout:120000});await mf.locator('#start').click();await mf.locator('#walkpad').waitFor();
 const pad=await mf.locator('#walkpad').boundingBox(),cdp=await mobile.context().newCDPSession(mobile),before=await mf.evaluate(()=>stillwaterDebug.camera.position.z);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pad.x+pad.width/2,y:pad.y+15}]});await mf.waitForFunction(z=>stillwaterDebug.camera.position.z<z-.3,before,{timeout:15000});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const oldYaw=await mf.evaluate(()=>stillwaterDebug.controls.input.yaw);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:270,y:430}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330,y:450}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await mf.evaluate(()=>stillwaterDebug.controls.input.yaw),oldYaw);
 if(!process.env.SKIP_SHOTS)await mobile.screenshot({path:out+'/mobile.png',timeout:90000});await mf.locator('#journal').click();assert(await mf.locator('#notes').isVisible());await mf.locator('#notes-close').click();await mobile.setViewportSize({width:844,height:390});if(!process.env.SKIP_SHOTS)await mobile.screenshot({path:out+'/mobile-landscape.png',timeout:90000});
 results.mobile={load:true,joystick:true,touchLook:true,notes:true,landscape:true};assert.deepEqual(errors,[]);results.errors=errors;await writeFile(out+'/qa.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
}finally{await browser?.close();server.close();}
