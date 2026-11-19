import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {REVISION} from '../vendor/three.module.min.js';
const root=new URL('../',import.meta.url);
test('all entry assets and module imports resolve to local files',async()=>{const files=['index.html','style.css','main.mjs','core.mjs','input.mjs'];for(const f of files){const source=await readFile(new URL(f,root),'utf8');assert.ok(!/https?:\/\/|fetch\s*\(|XMLHttpRequest|import\s*\(/.test(source),`${f} has no remote or dynamic loading`);const paths=f.endsWith('.html')?[...source.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]):[...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);for(const p of paths){assert.ok(!p.startsWith('/'));await access(new URL(p,new URL(f,root)))}}});
test('supplied Three.js revision and license remain present',async()=>{assert.equal(REVISION,'170');assert.match(await readFile(new URL('vendor/THREE-LICENSE.txt',root),'utf8'),/MIT License/) });
test('UI selectors referenced by source exist in initial or generated UI',async()=>{const html=await readFile(new URL('index.html',root),'utf8'),source=await readFile(new URL('main.mjs',root),'utf8');const ids=new Set([...`${html}\n${source}`.matchAll(/id=["']([^"']+)["']/g)].map(m=>m[1]));for(const m of source.matchAll(/\$\(['"]#([^'" ]+)['"]\)/g))assert.ok(ids.has(m[1]),`missing UI id ${m[1]}`)});
