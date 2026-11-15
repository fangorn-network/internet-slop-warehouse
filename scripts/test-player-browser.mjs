// The warehouse player, using real browser fullscreen and a sandboxed fixture game.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const game='<!doctype html><html><body style="margin:0;background:#203a30;color:white"><button id="count">0</button><p>Fixture game</p><script>document.querySelector("button").onclick=e=>e.target.textContent=+e.target.textContent+1;<\/script></body></html>';
const record=(id,type,src,title,uses=[])=>({id,type,publisher:'0x1234567890abcdef',cid:id,payload:{title,description:'A player test fixture.',tags:[],src,author:'Warehouse QA',uses}});
const records=[record('game','game','game','Test game',[{id:'logic',publisher:'0x1234567890abcdef'}]),record('slow','game','slow','Slow game'),record('logic','logic','logic','Test logic'),record('asset','asset','asset','Test asset')];
let base;
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Content-Type','application/json');
 if(path==='/view.json')return res.end(JSON.stringify({root:'fixture-root',gateway:base,records}));
 if(path==='/ipfs/game')return res.end(JSON.stringify({html:game}));
 if(path==='/ipfs/slow')return setTimeout(()=>res.end(JSON.stringify({html:game.replace('Fixture game','Slow game')})),400);
 if(path==='/ipfs/logic')return res.end(JSON.stringify({js:'export function attach() {}'}));
 if(path==='/catalog.js'){res.setHeader('Content-Type','text/javascript');return res.end(await readFile('site/catalog.js'));}
 if(path==='/warehouse.css'){res.setHeader('Content-Type','text/css');return res.end(await readFile('site/warehouse.css'));}
 if(path==='/'){res.setHeader('Content-Type','text/html');return res.end(await readFile('site/index.html'));}
 res.statusCode=404;res.end('{}');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
const out=resolve('artifacts/player');await mkdir(out,{recursive:true});let browser;const errors=[],results={};
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.getByRole('button',{name:/Test game/}).click();
 const frame=page.frameLocator('#frame');await frame.locator('#count').click();assert.equal(await frame.locator('#count').textContent(),'1');
 let box=await page.locator('#frame').boundingBox();assert(box.height>700);assert.equal(await page.locator('#credits').getAttribute('open'),null);
 await page.screenshot({path:out+'/desktop.png'});
 await page.locator('#restart').click();await frame.locator('#count').waitFor();assert.equal(await frame.locator('#count').textContent(),'0');
 await page.locator('#expand').click();box=await page.locator('#player').boundingBox();assert.equal(box.width,1440);assert.equal(box.height,1000);
 await page.locator('#expand').click();assert.equal(await page.locator('#expand').getAttribute('aria-pressed'),'false');
 await page.locator('#fullscreen').click();await page.waitForFunction(()=>document.fullscreenElement?.id==='player-shell'&&document.getElementById('fullscreen').textContent==='Exit fullscreen');
 assert.equal(await page.locator('#fullscreen').textContent(),'Exit fullscreen');
 await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
 await page.locator('#credits summary').click();await page.locator('#lineage').getByRole('button',{name:'Test logic'}).click();
 assert.equal(await page.locator('#frame').isVisible(),false);assert.equal(await page.locator('#fullscreen').isVisible(),false);assert.match(await page.locator('#view').textContent(),/export function/);
 await page.locator('#close').click();assert.equal(await page.locator('#frame').getAttribute('srcdoc'),'');
 // Browser refusing fullscreen should still yield a usable expanded player.
 await page.getByRole('button',{name:/Test game/}).click();await frame.locator('#count').waitFor();
 await page.locator('#player-shell').evaluate(el=>el.requestFullscreen=()=>Promise.reject(new TypeError('Not available')));
 await page.locator('#fullscreen').click();assert.equal(await page.locator('#expand').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#player-message').isVisible(),false);let fullFrame=await page.locator('#frame').boundingBox();assert.equal(fullFrame.height,1000);assert.equal(fullFrame.width,1440);await page.locator('#fullscreen').click();assert.equal(await page.locator('#fullscreen').getAttribute('aria-pressed'),'false');
 await page.locator('#close').click();
 // A delayed fetch must never reopen a closed player or replace the next game.
 await page.getByRole('button',{name:/Slow game/}).click();await page.locator('#close').click();await page.getByRole('button',{name:/Test game/}).click();await frame.locator('#count').waitFor();await page.waitForTimeout(500);assert.equal(await page.locator('#title').textContent(),'Test game');assert.match(await frame.locator('body').textContent(),/Fixture game/);await page.locator('#close').click();
 // Sharing must survive reloads, cover every part type and preserve publisher identity.
 const shared=await browser.newPage(); shared.on('pageerror',e=>errors.push(e.message));
 await shared.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
 for(const id of ['game','logic','asset']) {
   const url=new URL(base);url.searchParams.set('part',`0x1234567890abcdef/${id}`);
   await shared.goto(url.href);await shared.locator('#player[open]').waitFor();
   assert.equal(await shared.locator('#title').textContent(),`Test ${id}`);
   await shared.locator('#share').click();
   await shared.getByText('Link copied',{exact:true}).waitFor();
   assert.equal(await shared.evaluate(()=>navigator.clipboard.readText()),url.href);
   await shared.reload();await shared.locator('#player[open]').waitFor();
   await shared.locator('#close').click();assert.equal(new URL(shared.url()).searchParams.has('part'),false);
   await shared.goBack();await shared.locator('#player[open]').waitFor();
   assert.equal(await shared.locator('#title').textContent(),`Test ${id}`);
   await shared.goForward();await shared.locator('#player').waitFor({state:'hidden'});
 }
 await shared.goto(base+'?part=0x1234567890abcdef/logic');await shared.locator('#player[open]').waitFor();
 await shared.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('Denied'))},configurable:true}));
 await shared.locator('#share').click();await shared.locator('#share-link').waitFor();
 assert.equal(await shared.locator('#share-link').inputValue(),shared.url());
 await shared.keyboard.press('Escape');await shared.locator('#player').waitFor({state:'hidden'});
 assert.equal(new URL(shared.url()).searchParams.has('part'),false);
 await shared.goto(base+'?part=unknown/game');await shared.getByRole('status').filter({hasText:'This shared part'}).waitFor();
 assert.equal(await shared.locator('#player').isVisible(),false);
 results.sharing={allTypes:true,clipboard:true,fallback:true,reload:true,history:true,escape:true,missingPart:true};
 await shared.close();
 results.desktop={restart:true,expand:true,nativeFullscreen:true,fullscreenFallback:true,credits:true,logicSwitch:true,staleLoadGuard:true};
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base);await mobile.getByRole('button',{name:/Test game/}).click();await mobile.frameLocator('#frame').locator('#count').waitFor();
 const dialog=await mobile.locator('#player').boundingBox(),mobileFrame=await mobile.locator('#frame').boundingBox();assert.equal(dialog.width,390);assert.equal(dialog.height,844);assert(mobileFrame.height>600);
 for(const id of ['restart','fullscreen','close']){const b=await mobile.locator('#'+id).boundingBox();assert(b.height>=44&&b.x>=0&&b.x+b.width<=390);}
 await mobile.locator('#player-shell').evaluate(el=>el.requestFullscreen=undefined);
 await mobile.locator('#fullscreen').click();let immersive=await mobile.locator('#frame').boundingBox();assert.equal(immersive.width,390);assert.equal(immersive.height,844);assert.equal(immersive.y,0);
 await mobile.screenshot({path:out+'/mobile.png'});
 await mobile.setViewportSize({width:844,height:390});await mobile.waitForTimeout(100);immersive=await mobile.locator('#frame').boundingBox();assert.equal(immersive.width,844);assert.equal(immersive.height,390);assert.equal(immersive.y,0);
 await mobile.screenshot({path:out+'/mobile-landscape.png'});
 await mobile.locator('#fullscreen').click();assert.equal(await mobile.locator('#fullscreen').getAttribute('aria-pressed'),'false');
 await mobile.setViewportSize({width:390,height:650});await mobile.waitForTimeout(100);assert.equal((await mobile.locator('#player').boundingBox()).height,650);await mobile.locator('#close').click();assert.equal(await mobile.locator('#player').isVisible(),false);
 results.mobile={viewportPlayer:true,touchTargets:true,immersivePortrait:true,immersiveLandscape:true,viewportResize:true,exitFallback:true,close:true};assert.deepEqual(errors,[]);results.errors=errors;
 await writeFile(out+'/qa.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
}finally{await browser?.close();server.close();}
