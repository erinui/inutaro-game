import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {buildSite} from '../scripts/build-site.mjs';
import {startSiteServer} from './helpers/site-server.mjs';
import {createYoutubeSnapshot} from '../scripts/lib/home-youtube-snapshot.mjs';
import {createYoutubeImage} from '../scripts/lib/youtube-images.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');

test('HP-T07: same snapshot reconciles six videos into five plus more without replacing the first image',async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'erinui-hydrate-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const sharp=require('sharp');
 const bytes=await sharp({create:{width:80,height:45,channels:3,background:'#caffee'}}).jpeg().toBuffer();
 const videos=[];
 for(let i=0;i<6;i++){const id=`video_${i}`;videos.push({id,title:`動画${i}`,url:`https://www.youtube.com/watch?v=${id}`,thumbnail:{url:`https://i.ytimg.com/vi/${id}/default.jpg`},localThumbnail:await createYoutubeImage({bytes,videoId:id,directory:temp})});}
 const data={schemaVersion:2,ok:true,channel:{statistics:{}},videos};
 const html=createYoutubeSnapshot(await readFile(new URL('../index.html',import.meta.url),'utf8'),data);
 const source=await readFile(new URL('../home.js',import.meta.url),'utf8');
 const server=await startSiteServer();t.after(()=>server.close());
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});t.after(()=>browser.close());
 const page=await browser.newPage();
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==server.url)return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
  if(url.pathname==='/home.js')return route.fulfill({contentType:'text/javascript',body:'window.snapshotImages=[...document.querySelectorAll("[data-youtube-cards] img")];window.snapshotImage=window.snapshotImages[0];\n'+source});
  if(url.pathname.endsWith('youtube-latest.json'))return route.fulfill({json:data});
  if(url.pathname.endsWith('.webp'))return route.fulfill({contentType:'image/webp',body:await readFile(path.join(temp,path.basename(url.pathname)))});
  return route.continue();
 });
 await page.goto(server.url);
 await page.waitForFunction(()=>document.querySelector('[data-youtube-cards]').children.length===6);
 assert.equal(await page.locator('[data-youtube-cards] .content-card-more').count(),1);
 assert.equal(await page.evaluate(()=>document.querySelector('[data-youtube-cards] img')===window.snapshotImage),true);
 assert.equal(await page.evaluate(()=>window.snapshotImages.every((image,i)=>image===document.querySelectorAll('[data-youtube-cards] img')[i])),true,'all three snapshot image nodes survive hydration');
 const first=await page.locator('[data-youtube-cards] img').first().getAttribute('src');assert.equal(first,videos[0].localThumbnail.url);
 await page.evaluate(()=>{window.firstCard=document.querySelector('[data-youtube-cards] a');return hydrateYoutubeContent(document.querySelector('.map-link-youtube'));});
 assert.equal(await page.evaluate(()=>document.querySelector('[data-youtube-cards] a')===window.firstCard),true);
 assert.equal(await page.locator('[data-youtube-cards] a').count(),6);
 assert.equal(await page.locator('.youtube-thumb').nth(2).getAttribute('src'),null,'inactive map images keep src deferred');
 await page.evaluate(()=>{
  window.originalDecode=HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode=function(){
   if(this.src.includes('video_1-'))return new Promise((resolve,reject)=>{window.releaseDecode=()=>window.originalDecode.call(this).then(resolve,reject);});
   return window.originalDecode.call(this);
  };
  showYoutubePanel(document.querySelector('.map-link-youtube'),1);
 });
 assert.equal(await page.locator('.youtube-thumb.is-active').getAttribute('data-video-id'),'video_0','previous image stays visible until decode');
 await page.evaluate(()=>{
  showYoutubePanel(document.querySelector('.map-link-youtube'),3);
  window.releaseDecode();HTMLImageElement.prototype.decode=window.originalDecode;
 });
 await page.waitForTimeout(100);
 assert.equal(await page.locator('.map-link-youtube').evaluate(n=>n.classList.contains('is-showing-stats')),true,'late decode must not overwrite the statistics panel');
 for(const count of [5,3,1,0,6]){
  data.videos=videos.slice(0,count);
  await page.evaluate(()=>hydrateYoutubeContent(document.querySelector('.map-link-youtube')));
  assert.equal(await page.locator('[data-youtube-cards] a').count(),count?Math.min(5,count)+(count>5?1:0):1,`hydrated count ${count}`);
  assert.equal(await page.locator('[data-youtube-cards] .content-card-more').count(),count>5?1:0);
 }
 const replacements=[];
 for(const id of ['generation_old','generation_new'])replacements.push({...videos[0],id,url:`https://www.youtube.com/watch?v=${id}`,localThumbnail:await createYoutubeImage({bytes,videoId:id,directory:temp})});
 await page.evaluate(()=>{
  window.originalDecode=HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode=function(){if(this.src.includes('generation_old-'))return new Promise(resolve=>{window.finishOldGeneration=resolve;});return window.originalDecode.call(this);};
 });
 await page.evaluate(payload=>{const card=document.querySelector('.map-link-youtube');applyYoutubeMapData(card,payload);showYoutubePanel(card,0);},{...data,videos:[replacements[0],...videos.slice(1)]});
 await page.waitForFunction(()=>typeof window.finishOldGeneration==='function');
 await page.evaluate(payload=>applyYoutubeMapData(document.querySelector('.map-link-youtube'),payload),{...data,videos:[replacements[1],...videos.slice(1)]});
 await page.waitForFunction(()=>document.querySelector('.youtube-thumb.is-active')?.getAttribute('data-video-id')==='generation_new');
 await page.evaluate(()=>{window.finishOldGeneration();HTMLImageElement.prototype.decode=window.originalDecode;});
 await page.waitForTimeout(50);
 assert.equal(await page.locator('.youtube-thumb.is-active').getAttribute('data-video-id'),'generation_new','old generation decode cannot replace updated data');


});

test('HP-T01/T09: built pages use hashed WebP, preserve shared paths, and exclude private files',async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'erinui-runtime-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const directory=path.join(temp,'site'),files=await buildSite(directory);
 const server=await startSiteServer({directory,files});t.after(()=>server.close());
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});t.after(()=>browser.close());
 const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
 await page.route('**/*',r=>new URL(r.request().url()).origin===server.url?r.continue():r.abort());
 await page.goto(server.url);
 const images=await page.locator('.map-card img.map-image').evaluateAll(nodes=>nodes.map(i=>({src:i.getAttribute('src'),complete:i.complete,width:i.naturalWidth})));
 assert.equal(images.length,8);
 for(const image of images){assert.match(image.src,/^assets\/versioned\/map_.*\.[a-f0-9]{16}\.webp$/);assert.ok(image.complete&&image.width>0);assert.match((await page.request.get(server.url+'/'+image.src)).headers()['content-type'],/^image\/webp/);}
 await page.goto(server.url+'/pages/characters.html');
 const css=page.locator('link[rel="stylesheet"]');
 assert.match(await css.getAttribute('href'),/^\.\.\/assets\/versioned\/home\.[a-f0-9]{16}\.css$/);
 assert.equal(await page.locator('h1').innerText(),'キャラクター紹介');
 for(const forbidden of ['/config/home-performance-assets.json','/.env.local','/docs/home-performance-design.md'])assert.equal((await page.request.get(server.url+forbidden)).status(),404);
});

test('HP-FONT-01: swap keeps the original font and preload, including failure fallback',async t=>{
 const css=await readFile(new URL('../home.css',import.meta.url),'utf8');
 assert.match(css,/font-display:\s*swap/);
 assert.match(css,/keinann-pop-jp\.woff2/);
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/<link rel="preload" href="assets\/fonts\/keinann-pop-jp\.woff2" as="font"/);
 const server=await startSiteServer();t.after(()=>server.close());
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});t.after(()=>browser.close());
 const page=await browser.newPage();
 await page.route('**/*',r=>/\.(woff2|ttf)$/.test(r.request().url())||new URL(r.request().url()).origin!==server.url?r.abort():r.continue());
 await page.goto(server.url);
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('h1').innerText(),'エリカッテシティ');
 const metrics=await page.locator('h1').evaluate(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,font:getComputedStyle(n).fontFamily}));
 assert.ok(metrics.w>0&&metrics.h>0);assert.match(metrics.font,/KeinannPop/);
});

test('HP-FONT-02/IMG-02/LOAD-01: compiled TOP loads subsets, reserves image sizes, and fetches its LCP background once',async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'erinui-final-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const directory=path.join(temp,'site'),files=await buildSite(directory);
 const server=await startSiteServer({directory,files});t.after(()=>server.close());
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:390,height:844}}),seen=[];
 await page.route('**/*',r=>new URL(r.request().url()).origin===server.url?r.continue():r.abort());
 page.on('request',r=>seen.push(r.url()));await page.goto(server.url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('link[as="font"]').count(),0);
 const fontRequests=seen.filter(u=>/\.woff2/.test(u));assert.ok(fontRequests.length>0);let fontBytes=0;
 for(const url of fontRequests){assert.match(url,/\/assets\/versioned\/keinann-pop-jp-/);fontBytes+=(await readFile(path.join(directory,new URL(url).pathname))).length;}
 assert.ok(fontBytes<=100000,`font bytes ${fontBytes}`);
 assert.equal(seen.filter(u=>u.includes('/map_bg.svg?')).length,1);
 assert.equal(await page.locator('link[as="image"][href*="map_bg.svg"]').getAttribute('fetchpriority'),'high');
 const pattern=page.locator('link[as="image"][href*="city-checker-tile."]');
 assert.equal(await pattern.count(),1);
 assert.equal(await pattern.getAttribute('fetchpriority'),'high');
 assert.equal(seen.filter(u=>u.includes('/city-checker-tile.')).length,1);
 const missing=await page.locator('img').evaluateAll(nodes=>nodes.filter(n=>!n.hasAttribute('width')||!n.hasAttribute('height')).map(n=>n.outerHTML));assert.deepEqual(missing,[]);
 assert.equal(seen.some(u=>/gameplay-preview\.png/.test(u)),false);
});
