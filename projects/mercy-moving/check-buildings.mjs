import {chromium} from '/tmp/warehouse-validation/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],missing=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))missing.push({url:r.url(),status:r.status()});});
 await page.route('**/building-qa.html',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0;background:#888}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js"}}</script>`}));
 await page.goto('http://localhost:4177/building-qa.html');
 const report=await page.evaluate(async()=>{
  const [T,{buildWorld},{createSession},{contains}]=await Promise.all([import('three'),import('/world.js'),import('/session.js'),import('/building-layout.js')]);
  const scene=new T.Scene();scene.background=new T.Color(0x8a8e86);scene.fog=new T.Fog(0x8a8e86,13,76);scene.add(new T.HemisphereLight(0xd4d5c9,0x4b4a3e,1.65));const sun=new T.DirectionalLight(0xe8e5d8,.9);sun.position.set(-35,55,20);scene.add(sun);
  const world=await buildWorld(scene),s=createSession(world),results=[];
  const check=(ok,message)=>{if(!ok)throw Error(message);};
  check(world.doors.length===world.buildings.length,'Every building needs a door');
  world.buildings.forEach((b,i)=>{
   const d=world.doors[i],p=s.state.players.solo;check(d.buildingId===b.id,`Door order ${b.id}`);
   Object.assign(p,{x:d.x,z:d.z+b.front*1.6});check(!s.blocked(p.x,p.z),`Outside blocked: ${b.id}`);
   s.state.doors[i]=false;
   for(let n=0;n<20;n++)s.update(.05,{solo:{z:-b.front}});
   check(Math.abs(p.z-d.z)>.4,`Closed door leaked: ${b.id}`);
   check(s.command('solo',{type:'door',buildingId:b.id}).ok,`Cannot open: ${b.id}`);
   const target=b.z+b.front*1;
   for(let n=0;n<200&&(p.z-target)*b.front>.05;n++)s.update(.05,{solo:{z:-b.front}});
   check(contains(b,p),`Cannot enter: ${b.id} at ${p.x},${p.z}`);
   check(Math.abs(p.z-target)<.15,`Furniture blocks central route: ${b.id}`);
   if(b.claimable){check(s.command('solo',{type:'claim',buildingId:b.id}).ok,`Claim failed: ${b.id}`);check(s.state.claims[b.id]==='solo',`Claim missing: ${b.id}`);check(s.command('solo',{type:'claim',buildingId:b.id}).ok,`Release failed: ${b.id}`);}
   check(s.command('solo',{type:'door',buildingId:b.id}).ok===false||!s.state.doors[i],`Unexpected door command: ${b.id}`);
   // Reopen from within reach after approaching the threshold.
   s.state.doors[i]=true;
   for(let n=0;n<200&&(p.z-d.z)*b.front<1.5;n++)s.update(.05,{solo:{z:b.front}});
   check((p.z-d.z)*b.front>=1.5,`Cannot exit: ${b.id}`);
   check(s.command('solo',{type:'door',buildingId:b.id}).ok,`Cannot close: ${b.id}`);
   check(s.validateSnapshot(s.snapshot()),`Invalid snapshot after visiting: ${b.id}`);
   results.push({id:b.id,closedDoorBlocks:true,entry:true,exit:true,claimAndRelease:b.claimable});
  });
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1280,800);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;document.body.append(renderer.domElement);
  const camera=new T.PerspectiveCamera(65,1.6,.08,350);
  window.qa={world,scene,renderer,camera,view(position,target){world.doors.forEach(d=>{d.pivot.rotation.y=d.baseYaw;});camera.position.set(...position);camera.lookAt(...target);renderer.render(scene,camera);}};
  return{buildings:results,doorCount:world.doors.length};
 });
 for(const [name,position,target]of [
  ['house-interior',[-30,1.77,44],[-30,1.8,50]],
  ['motel-entrances',[21,1.77,-12],[21,2,-22]],
  ['chapel-interior',[-22,1.77,-35],[-22,2,-45]],
  ['post-office-entrance',[17,1.77,28],[17,2,35]],
  ['diner-door',[-15,1.77,22],[-15,1.8,16]]
 ]){await page.evaluate(({position,target})=>qa.view(position,target),{position,target});await page.screenshot({path:`artifacts/mercy-moving/${name}.png`});}
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile('artifacts/mercy-moving/buildings-qa.json',JSON.stringify({...report,errors,missing},null,2));console.log('All building traversal and claims passed',JSON.stringify(report));
}finally{await browser.close();}
