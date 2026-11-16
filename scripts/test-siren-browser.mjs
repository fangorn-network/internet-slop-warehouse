// Browser QA against `publish-batch.js ... --local <directory>` output.
// Install playwright-core separately; point PLAYWRIGHT_MODULE at it if outside this repo.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import assert from 'node:assert/strict';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const dir=resolve(process.argv[2]??'/tmp/after-the-siren'),out=resolve('artifacts/after-the-siren');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{
 const path=resolve(dir,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(relative(dir,path).startsWith('..'))throw Error('Outside preview root');
 res.setHeader('Content-Type',path.endsWith('.html')?'text/html':'application/json');res.end(await readFile(path));
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/after-the-siren.html`;
let browser;const errors=[],results={};
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const ready=async page=>{page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>!document.querySelector('#start').disabled);};
 const snapshot=page=>page.evaluate(()=>survivalDebug.snapshot);
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await ready(page);
 await page.screenshot({path:out+'/title.png'});await page.click('#start');
 await page.keyboard.down('KeyS');await page.waitForTimeout(280);await page.keyboard.up('KeyS');
 assert((await snapshot(page)).position.y>890);
 await page.keyboard.press('Escape');assert.equal((await snapshot(page)).mode,'paused');
 const paused=(await snapshot(page)).cycle.elapsed;await page.waitForTimeout(200);assert.equal((await snapshot(page)).cycle.elapsed,paused);
 await page.click('#start');await page.screenshot({path:out+'/gameplay.png'});
 // Move to the clinic/diner-side medical cache through the south refuge opening.
 for(const [key,ms] of [['KeyS',850],['KeyA',1260],['KeyS',650]]){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
 await page.keyboard.press('KeyE');const bag=(await snapshot(page)).inventory;
 assert(bag.scrap>3&&bag.fuel>1&&bag.meds>1);results.desktop={movement:true,pause:true,loot:bag};await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await ready(mobile);await mobile.click('#start');
 assert(await mobile.getByText('SWING',{exact:true}).isVisible());assert(await mobile.getByText('HEAL',{exact:true}).isVisible());
 await mobile.screenshot({path:out+'/mobile.png'});results.mobile={touchControls:true};await mobile.close();
 const sim=await browser.newPage({viewport:{width:1280,height:900}});
 await sim.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.__now=performance.now();window.tick=n=>{for(let i=0;i<n;i++)window.__frame(window.__now+=20);};});
 await ready(sim);await sim.click('#start');
 // Capture an actual rendered night frame, then minimize the drawing surface for long simulations.
 await sim.evaluate(()=>{__now=performance.now();const c=document.querySelector('canvas');c.width=1;c.height=1;tick(2260);});
 assert.equal((await snapshot(sim)).cycle.name,'night');
 await sim.evaluate(()=>{dispatchEvent(new Event('resize'));tick(1);});await sim.screenshot({path:out+'/night.png'});
 await sim.evaluate(()=>{const c=document.querySelector('canvas');c.width=1;c.height=1;tick(10000);});
 assert.equal((await snapshot(sim)).mode,'lost');results.neglectedRefuge=await snapshot(sim);
 await sim.click('#start');assert.equal((await snapshot(sim)).health,100);assert.equal((await snapshot(sim)).cycle.cycle,1);
 await sim.evaluate(()=>{
  const key=(code,on)=>dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code}));
  const travel=(code,n)=>{key(code,true);tick(n);key(code,false);};
  travel('KeyS',45);travel('KeyA',110);
  for(let round=0;round<13&&survivalDebug.snapshot.mode==='playing';round++){
   travel('KeyW',150);travel('KeyD',200);travel('KeyS',300);travel('KeyA',200);travel('KeyW',150);key('KeyF',true);key('KeyF',false);
  }
 });
 assert.equal((await snapshot(sim)).mode,'won');results.activeSurvivor=await snapshot(sim);assert.deepEqual(errors,[]);
 results.errors=errors;await writeFile(out+'/browser-qa.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
}finally{await browser?.close();server.close();}
