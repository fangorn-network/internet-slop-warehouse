#!/usr/bin/env node
// Clone the data-driven starter without generating or rewriting its engine.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';
const [id,title]=process.argv.slice(2);if(!id||!/^[a-z0-9][a-z0-9-]{0,43}$/.test(id)||!title)throw Error('Usage: node scripts/new-survival-game.mjs lowercase-id "Game title"');
const parts=resolve(new URL('../parts/',import.meta.url).pathname),read=file=>JSON.parse(readFileSync(parts+'/'+file));
const scenario=read('survival/no-road-home.json'),batch=read('survival-kit.parts.json'),baseGame=batch.find(x=>x.type==='game'),baseScenario=batch.find(x=>x.id==='no-road-home-scenario'),catalog=read('parts.json');
const scenarioId=id+'-scenario',files=[id+'.html','survival/'+id+'.json',id+'.parts.json'];if(files.some(f=>existsSync(parts+'/'+f))||catalog.some(p=>[id,scenarioId].includes(p.id)))throw Error('Refusing to overwrite an existing game, file or catalog ID');
scenario.id=id;scenario.title=title;scenario.seed=id;
const definition={...baseScenario,id:scenarioId,title:'Scenario: '+title,file:files[1]},game={...baseGame,id,title,file:files[0],uses:baseGame.uses.map(x=>x==='no-road-home-scenario'?scenarioId:x)};
const html=readFileSync(parts+'/no-road-home.html','utf8').replace("const scenarioId='no-road-home-scenario';",'const scenarioId='+JSON.stringify(scenarioId)+';').replace('<title>No Road Home</title>','<title>'+title.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</title>');
writeFileSync(parts+'/'+files[0],html);writeFileSync(parts+'/'+files[1],JSON.stringify(scenario,null,2)+'\n');writeFileSync(parts+'/'+files[2],JSON.stringify([definition,game],null,2)+'\n');
writeFileSync(parts+'/parts.json','[\n'+[...catalog,definition,game].map(p=>'  '+JSON.stringify(p)).join(',\n')+'\n]\n');
console.log('Created '+files.join(', ')+'\nEdit the scenario JSON to change the game. No engine rewrite needed.\nPreview: node publish-batch.js parts/'+files[2]+' --local /tmp/'+id+'\nPublish: NETWORK=baseSepolia node publish-batch.js parts/'+files[2]);
