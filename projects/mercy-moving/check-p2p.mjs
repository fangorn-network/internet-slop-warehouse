import {chromium} from '/tmp/warehouse-validation/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
try{
 const host=await browser.newPage();host.on('pageerror',e=>errors.push(e.message));
 await host.goto('http://localhost:4177/assets/THREE-LICENSE.txt');
 await host.evaluate(async()=>{
  const [{createSession},{attach},transport]=await Promise.all([import('/session.js'),import('/vendor/p2p-homestead.js'),import('/vendor/trystero-0.27.0.js')]);
  const session=createSession({colliders:[]});Object.assign(session.state.players.solo,{x:32,z:63});session.command('solo',{type:'claim',buildingId:'house-2'});Object.assign(session.state.players.solo,{x:1,z:30});
  window.qa={session,coop:attach(session,{transport,isHost:true}),input:{}};setInterval(()=>qa.coop.update(.05,qa.input),50);
 });
 const invite=await host.evaluate(()=>qa.coop.ready);assert(await host.evaluate(()=>qa.session.state.claims['house-2']===qa.coop.id));console.log('Host ready; solo claim preserved');
 const guest=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});guest.on('pageerror',e=>errors.push(e.message));
 await guest.goto('http://localhost:4177');await guest.waitForFunction(()=>window.mercyDebug?.mode==='ready',null,{timeout:60000});await guest.locator('summary').click();await guest.locator('#code').fill(invite.code);await guest.locator('#join').click();
 await host.waitForFunction(()=>Object.keys(qa.session.state.players).length===2,null,{timeout:60000});
 const id=await host.evaluate(()=>Object.keys(qa.session.state.players).find(id=>id!==qa.coop.id));await guest.waitForFunction(()=>mercyDebug.players===2,null,{timeout:60000});await guest.locator('#start').click();
 console.log('Game UI guest connected');await guest.locator('[data-move="forward"]').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});await host.waitForFunction(id=>qa.session.state.players[id].z<29.5,id);await guest.locator('[data-move="forward"]').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch'});
 // Allow the final zero-input intention to arrive before placing the guest.
 await guest.waitForTimeout(600);
 await host.evaluate(id=>Object.assign(qa.session.state.players[id],{x:-15,z:18.2}),id);await guest.waitForFunction(()=>Math.abs(mercyDebug.position[1]-18.2)<.01);await guest.locator('#use').click();await host.waitForFunction(()=>qa.session.state.doors[0]===false);await guest.waitForFunction(()=>mercyDebug.doors[0]===false);
 await host.evaluate(id=>Object.assign(qa.session.state.players[id],{x:-30,z:45}),id);await guest.waitForFunction(()=>mercyDebug.interior==='house-1');await guest.locator('#claim').waitFor({state:'visible'});
 await guest.keyboard.press('q');await host.waitForFunction(id=>qa.session.state.claims['house-1']===id,id);await guest.waitForFunction(()=>mercyDebug.claims['house-1']!==null);assert.equal(await guest.locator('#homeStatus').textContent(),'YOUR HOME · THIS VISIT');
 const denied=await host.evaluate(()=>{Object.assign(qa.session.state.players[qa.coop.id],{x:-30,z:45});return qa.coop.command({type:'claim',buildingId:'house-1'});});assert(!denied.ok);
 await guest.screenshot({path:'artifacts/mercy-moving/claimed-home-mobile.png'});
 await guest.locator('#claim').click();await host.waitForFunction(()=>qa.session.state.claims['house-1']===null);await guest.waitForFunction(()=>mercyDebug.claims['house-1']===null);
 await guest.locator('#claim').click();await host.waitForFunction(id=>qa.session.state.claims['house-1']===id,id);await guest.waitForFunction(()=>mercyDebug.claims['house-1']!==null);
 await host.evaluate(()=>qa.coop.dispose());await guest.waitForFunction(()=>document.querySelector('#connection').textContent.includes('Host left'));
 await guest.keyboard.press('Escape');await guest.locator('#leave').click();await guest.waitForFunction(()=>mercyDebug.players===1);assert.equal(await guest.evaluate(()=>mercyDebug.claims['house-1']),'solo');assert.equal(await guest.evaluate(()=>mercyDebug.claims['house-2']),null);
 assert.deepEqual(errors,[]);
 const report={realWebRTC:true,publicSignaling:true,gameUI:true,touchMovement:true,sharedDoor:true,sharedClaim:true,keyboardClaim:true,touchReleaseAndReclaim:true,claimContention:true,hostClaimPreserved:true,hostDeparture:true,continueSoloClaimPreserved:true,errors};
 await writeFile('artifacts/mercy-moving/p2p-qa.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
