import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {normalizeDataRecovery,writeDataAliases,verifyRequiredAssets,applyDataRoutes} from '../scripts/lib/home-recovery.mjs';
import {sha256} from '../scripts/lib/home-assets.mjs';
const canonical='assets/home-city/youtube-latest.json',alias='assets/home-city/youtube-latest.recovery-20261017-01.json';
test('HP-T10: recovery aliases follow canonical updates and cannot select an unsafe or immutable path',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'erinui-alias-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 await mkdir(path.join(directory,'assets/home-city'),{recursive:true});
 const settings={version:1,routes:{[canonical]:{active:alias,aliases:[alias]}}};
 const routes=normalizeDataRecovery(settings);assert.equal(routes[canonical].active,alias);
 await writeFile(path.join(directory,canonical),'{"revision":1}');
 assert.deepEqual(await writeDataAliases(directory,routes),[alias]);
 assert.equal(await readFile(path.join(directory,alias),'utf8'),'{"revision":1}');
 await writeFile(path.join(directory,canonical),'{"revision":2}');await writeDataAliases(directory,routes);
 assert.equal(await readFile(path.join(directory,alias),'utf8'),'{"revision":2}');
 assert.match(applyDataRoutes('<html><head></head><body></body></html>',routes),/home-data-routes/);
 for(const value of ['assets/versioned/bad.json','assets/home-city/../../.env.local','https://example.com/data.json'])assert.throws(()=>normalizeDataRecovery({version:1,routes:{[canonical]:{active:value,aliases:[value]}}}),/route|alias/);
});
test('HP-T10: an old release missing a new page delayed asset is rejected before rollback',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'erinui-rollback-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 await mkdir(path.join(directory,'assets/versioned'),{recursive:true});
 const a='assets/versioned/a.aaaaaaaaaaaaaaaa.webp',b='assets/versioned/b.bbbbbbbbbbbbbbbb.webp';
 await writeFile(path.join(directory,a),'old');
 const required={[a]:sha256('old'),[b]:sha256('new')};
 assert.equal((await verifyRequiredAssets(directory,required)).passed,false);
 await writeFile(path.join(directory,b),'new');assert.equal((await verifyRequiredAssets(directory,required)).passed,true);
 await writeFile(path.join(directory,b),'corrupt');assert.equal((await verifyRequiredAssets(directory,required)).passed,false);
 await assert.rejects(verifyRequiredAssets(directory,{'../secret':sha256('secret')}),/path/);
});

test('HP-T10: a page opened before rollback can still load its delayed hashed image from the union release',async t=>{
 const {createRequire}=await import('node:module'),{createServer}=await import('node:http');
 const {chromium}=createRequire(import.meta.url)('playwright');
 const directory=await mkdtemp(path.join(os.tmpdir(),'erinui-delayed-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const manifest=JSON.parse(await readFile(new URL('../config/home-performance-assets.json',import.meta.url),'utf8'));
 const image=manifest.outputs.find(e=>e.kind==='static-image'),bytes=await readFile(new URL('../'+image.file,import.meta.url));
 await mkdir(path.join(directory,'assets/versioned'),{recursive:true});let rolledBack=false;
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/')return res.setHeader('Content-Type','text/html').end(`<button onclick="const i=new Image();i.src='/${image.file}';document.body.append(i)">load</button>`);
  if(req.url==='/'+image.file){
   try{const body=rolledBack?await readFile(path.join(directory,image.file)):bytes;return res.setHeader('Content-Type','image/webp').end(body);}catch{return res.writeHead(404).end();}
  }res.writeHead(404).end();
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections()}));
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});t.after(()=>browser.close());
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
 const required={[image.file]:image.sha256};assert.equal((await verifyRequiredAssets(directory,required)).passed,false);
 rolledBack=true;let response=page.waitForResponse(r=>r.url().endsWith(image.file));await page.locator('button').click();assert.equal((await response).status(),404);
 await writeFile(path.join(directory,image.file),bytes);assert.equal((await verifyRequiredAssets(directory,required)).passed,true);
 response=page.waitForResponse(r=>r.url().endsWith(image.file));await page.locator('button').click();assert.equal((await response).status(),200);
 await page.waitForFunction(()=>[...document.images].at(-1).naturalWidth>0);
});
