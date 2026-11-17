const { chromium }=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
import {readFile,writeFile,mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const origin='https://internet-slop-warehouse.quickbeam.workers.dev',api='https://internet-slop-warehouse.fangorn.network',ids=['no-road-home'];
const receipts=JSON.parse(await readFile('parts/survival-kit.parts.receipts.json'));await mkdir('artifacts/survival-kit',{recursive:true});
for(const id of ids){const r=receipts.find(x=>x.id===id),res=await fetch(r.url);assert(res.ok);const {html}=await res.json();assert.equal(typeof html,'string');assert(!html.includes('{/*PARTS*/}'));await writeFile('artifacts/survival-kit/'+id+'-play.html',html);}
const archive=JSON.parse(await readFile('parts/survival-starter.parts.receipts.json'))[0];let catalog;
for(let i=0;i<18;i++){const res=await fetch(api+'/view.json',{cache:'no-store'});catalog=await res.json();const found=ids.filter(id=>catalog.records.some(r=>r.id===id&&r.cid===receipts.find(p=>p.id===id).cid));console.log('Catalog',catalog.records.length,'parts; new worlds',found.length+'/1');if(found.length===1&&catalog.records.some(r=>r.id===archive.id&&r.cid===archive.cid))break;if(i===17)throw Error('Catalog did not catch up');await new Promise(r=>setTimeout(r,5000));}
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report={catalogCount:catalog.records.length,games:{}};
try{
 for(const id of ids){const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Shader Error|Error:|THREE.WebGLProgram/.test(m.text()))errors.push(m.text());});
  await page.goto(origin);const title=catalog.records.find(r=>r.id===id).payload.title;await page.getByRole('button',{name:new RegExp(title)}).click({timeout:60000});
  const f=page.frameLocator('#frame');await f.locator('.exp-start:not([disabled])').waitFor({timeout:90000});await f.locator('.exp-start').click();
  const frame=page.frames().find(f=>f!==page.mainFrame()&&f.url()==='about:srcdoc');assert(frame);assert.equal((await frame.evaluate(()=>worldDebug.snapshot)).mode,'playing');
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='player-shell');await page.waitForTimeout(300);if(await f.locator('.exp-start').isVisible())await f.locator('.exp-start').click();await page.screenshot({path:'artifacts/survival-kit/'+id+'-live.png'});
  await f.locator('body').press('KeyI');await f.getByRole('button',{name:'Use medicine',exact:true}).waitFor({state:'visible',timeout:15000});await f.locator('.pack-close').click();await page.locator('#close').click();await page.waitForFunction(()=>!document.fullscreenElement);assert.deepEqual(errors,[]);report.games[id]={loaded:true,started:true,fullscreen:true,closed:true,pinned:receipts.find(r=>r.id===id).cid,errors};console.log('Live verified',id);await page.close();
 }
 report.starter={cid:archive.cid,url:archive.url};await writeFile('artifacts/survival-kit/published-qa.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
