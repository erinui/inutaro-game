import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {buildSite} from '../scripts/build-site.mjs';
import {startSiteServer} from './helpers/site-server.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
test('HP-T12: built pages keep headings, resolve local assets and fit all twelve boundary widths',{timeout:180000},async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'erinui-layout-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const directory=path.join(temp,'site'),files=await buildSite(directory),server=await startSiteServer({directory,files});t.after(()=>server.close());
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});t.after(()=>browser.close());
 const spec=JSON.parse(await readFile(new URL('./fixtures/site-design.json',import.meta.url),'utf8'));
 const pages=[...spec.pages.map(p=>({url:p.url,h1:p.h1})),{url:'/games/inutaro-mushi/',h1:null}];
 const page=await browser.newPage(),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(server.url)&&r.status()>=400)failed.push(r.url());});
 await page.route('**/*',r=>new URL(r.request().url()).origin===server.url?r.continue():r.abort());
 for(const width of spec.widths){await page.setViewportSize({width,height:900});
  for(const item of pages){await page.goto(server.url+item.url,{waitUntil:'domcontentloaded'});
   if(item.url==='/')await page.waitForFunction(()=>document.querySelector('[data-youtube-cards]')?.children.length===6);
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   if([390,1440].includes(width)){
    for(const image of await page.locator('img[src]').elementHandles()){
     if(await image.evaluate(n=>n.isConnected&&n.getClientRects().length>0))await image.evaluate(async n=>{n.scrollIntoView({behavior:'instant'});await Promise.race([n.decode().catch(()=>{}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Image decode timeout: '+n.currentSrc)),3000))]);});
    }
   }
   if(item.h1)assert.equal(await page.locator('h1').innerText(),item.h1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,`${item.url} overflow at ${width}`);
  }
  console.log(`compiled layout ${width}px: 8 pages passed`);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
});
