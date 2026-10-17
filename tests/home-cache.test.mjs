import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {startJsonCacheServer} from './helpers/json-cache-server.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
test('HP-CACHE-01: immutable applies only to versioned assets, retaining host-scoped noindex',async()=>{
 const headers=await readFile(new URL('../_headers',import.meta.url),'utf8');
 assert.match(headers,/^\/assets\/versioned\/\*\n  Cache-Control: public, max-age=31536000, immutable/m);
 assert.ok(!/^\/assets\/\*\s+Cache-Control/m.test(headers));
 assert.equal((headers.match(/Cache-Control:/g)||[]).length,1);
 assert.equal((headers.match(/X-Robots-Tag: noindex/g)||[]).length,2);
});
test('HP-T10: an already fresh JSON needs a new URL; no-cache and recovery aliases keep receiving updates',async t=>{
 const canonical='assets/home-city/youtube-latest.json',alias='assets/home-city/youtube-latest.recovery-20261017-01.json';
 const server=await startJsonCacheServer({cacheControl:'public, max-age=31536000, immutable'});t.after(()=>server.close());
 server.setData('/'+canonical,{revision:1});
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});t.after(()=>browser.close());
 const old=await browser.newPage();await old.goto(server.url);
 const cached=()=>old.evaluate(url=>fetch(url).then(r=>r.json()),canonical);
 assert.equal((await cached()).revision,1);
 server.setData('/'+canonical,{revision:2});
 assert.equal((await cached()).revision,1,'changing the origin cannot repair a fresh cached URL');
 server.setCacheControl('public, max-age=0, must-revalidate');
 const fresh=await browser.newPage();await fresh.goto(server.url);
 assert.equal((await fresh.evaluate(url=>fetchStaticData(url),canonical)).revision,2,'the current explicit no-cache path still revalidates');
 server.setRoutes({[canonical]:alias});server.setData('/'+alias,{revision:2});
 await fresh.reload();
 assert.equal((await fresh.evaluate(url=>fetchStaticData(url),canonical)).revision,2);
 server.setData('/'+alias,{revision:3});
 assert.equal((await fresh.evaluate(url=>fetchStaticData(url),canonical)).revision,3);
 assert.ok(server.requests.some(r=>r.url==='/'+alias&&r.ifNoneMatch));
 assert.equal((await cached()).revision,1,'an open old client is not rewritten by a new release');
});

test('HP-CACHE-01: a normal built-site revisit serves immutable assets from the browser cache',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{default:path}=await import('node:path'),{default:os}=await import('node:os');
 const {buildSite}=await import('../scripts/build-site.mjs'),{startSiteServer}=await import('./helpers/site-server.mjs');
 const temp=await mkdtemp(path.join(os.tmpdir(),'erinui-revisit-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const directory=path.join(temp,'site'),files=await buildSite(directory),server=await startSiteServer({directory,files});t.after(()=>server.close());
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});t.after(()=>browser.close());
 const page=await browser.newPage({javaScriptEnabled:false});
 await page.goto(server.url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const initial=server.requests.filter(u=>u.startsWith('/assets/versioned/')).length;assert.ok(initial>0);
 await page.goto('about:blank');const start=server.requests.length;await page.goto(server.url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 assert.deepEqual(server.requests.slice(start).filter(u=>u.startsWith('/assets/versioned/')),[]);
 const {writeFile}=await import('node:fs/promises'),{sha256}=await import('../scripts/lib/home-assets.mjs');
 const sharp=require('sharp'),bytes=await sharp({create:{width:96,height:96,channels:3,background:'#caffee'}}).webp().toBuffer();
 const replacement=`assets/versioned/header.${sha256(bytes).slice(0,16)}.webp`;
 await writeFile(path.join(directory,replacement),bytes);files.push(replacement);
 const htmlFile=path.join(directory,'index.html'),html=await readFile(htmlFile,'utf8');
 await writeFile(htmlFile,html.replace(/assets\/versioned\/icon-192-header\.[a-f0-9]{16}\.webp/,replacement));
 await page.goto('about:blank');const updateStart=server.requests.length;await page.goto(server.url,{waitUntil:'networkidle'});
 assert.ok(server.requests.slice(updateStart).includes('/'+replacement),'changed hash is fetched while unchanged immutable assets stay cached');

});
