#!/usr/bin/env node
// Portable starter. Uses pinned warehouse modules; it does not generate another engine.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';import {resolve} from 'node:path';
const [id,title,input]=process.argv.slice(2);if(!id||!/^[a-z0-9][a-z0-9-]{0,43}$/.test(id)||!title)throw Error('Usage: node new-game.mjs lowercase-id "Game title" [scenario.json]');
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8'),lock=JSON.parse(read('lock.json')),scenario=JSON.parse(input?readFileSync(resolve(input),'utf8'):read('scenario.json'));
const out=resolve(id);if(existsSync(out))throw Error('Refusing to overwrite '+out);scenario.id=id;scenario.title=title;scenario.seed=id;
const urls={...lock.parts,'survival-recipe-pack':'data:application/json;charset=utf-8,'+encodeURIComponent(read('recipes.json')),'no-road-home-scenario':'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(scenario))};
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const html=read('game-template.html').replace('{/*PARTS*/}',JSON.stringify(urls)).replace('<title>No Road Home</title>','<title>'+escape(title)+'</title>');
mkdirSync(out);writeFileSync(out+'/index.html',html);writeFileSync(out+'/scenario.json',JSON.stringify(scenario,null,2)+'\n');
writeFileSync(out+'/record.json',JSON.stringify({id,type:'game',title,description:scenario.description,tags:['survival','3d','starter','remix'],license:'CC0-1.0',parent:lock.parent,uses:lock.uses},null,2)+'\n');
console.log('Created '+out+'/index.html and record.json. All shared code is already pinned. To change the scenario, edit the input JSON and regenerate under a new output ID. Publish index.html as record.json’s game content; its dependency references already credit the warehouse.');
