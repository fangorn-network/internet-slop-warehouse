// Browser loading evidence only. Gameplay acceptance remains a separate evaluation.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [url,destination]=process.argv.slice(2);
if(!url||!destination)throw new Error('Usage: PLAYWRIGHT_MODULE=/absolute/path/index.mjs node benchmarks/browser-smoke.mjs URL NEW_EVIDENCE_DIRECTORY');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE??'/tmp/fangorn-benchmark-browser/node_modules/playwright-core/index.mjs'));
const out=resolve(destination);await mkdir(out,{recursive:true});
let browser;
try{browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});}
catch(e){
 const message=String(e.message).split('\n').filter(l=>/Operation not permitted|setsockopt|launch:/.test(l)).slice(0,3).join('\n')||String(e.message).split('\n')[0];
 await writeFile(join(out,'browser-smoke.json'),JSON.stringify({url,at:new Date().toISOString(),status:'blocked',stage:'browser-launch',error:message,results:[],scope:'No browser or gameplay checks ran'},null,2)+'\n');
 console.error(message);process.exit(2);
}
const results=[];
try{
 for(const [name,viewport,isMobile] of [['desktop',{width:1280,height:800},false],['mobile',{width:390,height:844},true]]){
   const context=await browser.newContext({viewport,isMobile,hasTouch:isMobile});
   const page=await context.newPage(), errors=[],consoleErrors=[],failedRequests=[];let responseBytes=0,responses=0;
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
   page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
   page.on('response',r=>{responses++;responseBytes+=Number(r.headers()['content-length']??0)||0;});
   const response=await page.goto(url,{waitUntil:'networkidle',timeout:30000});
   await page.screenshot({path:join(out,`${name}.png`),fullPage:true});
   results.push({name,viewport,httpStatus:response?.status()??null,title:await page.title(),errors,consoleErrors,failedRequests,responses,declaredResponseBytes:responseBytes,loadPassed:!!response&&response.ok()&&!errors.length&&!consoleErrors.length&&!failedRequests.length,gameplay:'not-evaluated'});
   await context.close();
 }
}finally{await browser.close();}
await writeFile(join(out,'browser-smoke.json'),JSON.stringify({url,at:new Date().toISOString(),scope:'Loading only; no gameplay success implied',results},null,2)+'\n');
console.log(JSON.stringify(results));
if(results.some(r=>!r.loadPassed))process.exitCode=1;
