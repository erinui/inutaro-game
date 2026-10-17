import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {startSiteServer} from '../tests/helpers/site-server.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),sharp=require('sharp');
const directory=process.env.HOME_OTHER_CANDIDATES;if(!directory)throw new Error('HOME_OTHER_CANDIDATES required');
const report=JSON.parse(await readFile(path.join(directory,'candidates.json'))),evidence=path.join(directory,'visual');await mkdir(evidence,{recursive:true});
const server=await startSiteServer(),browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try{
 for(const document of ['/','/pages/characters.html'])for(const width of [390,1440])for(const dpr of [1,2]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:dpr});
  await page.route('**/*',r=>new URL(r.request().url()).origin===server.url?r.continue():r.abort());
  await page.goto(server.url+document+(document==='/'?'?youtubePanel=0':''),{waitUntil:'networkidle'});
  await page.evaluate(()=>{for(const a of document.getAnimations()){a.pause();a.currentTime=0;}});
  for(const image of await page.locator('img[src]').elementHandles())await image.evaluate(n=>{if(n.isConnected)n.scrollIntoView({block:'center',inline:'center',behavior:'instant'});});
  await page.waitForLoadState('networkidle');
  await page.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){a.pause();a.currentTime=0;}for(const t of document.querySelectorAll('.content-carousel-track'))t.scrollLeft=0;window.scrollTo(0,0);});
  await page.evaluate(assets=>{let i=0;for(const img of document.images){const p=new URL(img.getAttribute('src')||'',location.href).pathname; if(assets.some(a=>p==='/'+a.source&&(a.scope!=='header-only'||img.closest('.brand'))))img.setAttribute('data-compare-id',String(i++));}},report.assets);
  const reset=()=>page.evaluate(()=>{for(const t of document.querySelectorAll('.content-carousel-track'))t.scrollTo({left:0,behavior:'instant'});window.scrollTo({left:0,top:0,behavior:'instant'});});
  await reset();
  const boxes=()=>page.locator('img[data-compare-id]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return [r.x+window.scrollX,r.y+window.scrollY,r.width,r.height]}));
  const before=await boxes(),key=`${document==='/'?'top':'characters'}-${width}-${dpr}`;
  await page.screenshot({path:path.join(evidence,key+'-before.png'),fullPage:true});
  let profile;
  if(document!=='/')profile=await page.locator('.profile-inutaro-nuigurumi').screenshot();
  for(const asset of report.assets){
   const data=(await readFile(asset.file)).toString('base64');
   await page.evaluate(async({asset,url})=>{
    const images=[...document.images].filter(img=>new URL(img.getAttribute('src')||'',location.href).pathname==='/'+asset.source&&(asset.scope!=='header-only'||img.closest('.brand')));
    await Promise.all(images.map(async img=>{const loading=img.loading;img.loading="eager";img.src=url;await img.decode();img.loading=loading;}));
   },{asset,url:'data:image/webp;base64,'+data});
  }
  await reset();
  const after=await boxes();
  const delta=before.length===after.length?Math.max(0,...before.flatMap((r,i)=>r.map((n,j)=>Math.abs(n-after[i][j])))):Infinity;
  await page.screenshot({path:path.join(evidence,key+'-after.png'),fullPage:true});
  if(profile){const afterProfile=await page.locator('.profile-inutaro-nuigurumi').screenshot(),size=await sharp(profile).metadata();await sharp({create:{width:size.width*2,height:size.height,channels:4,background:'#fff'}}).composite([{input:profile,left:0,top:0},{input:afterProfile,left:size.width,top:0}]).png().toFile(path.join(evidence,key+'-photo-comparison.png'));}
  results.push({document,width,dpr,maxGeometryDeltaCssPx:delta,withinRoundingTolerance:delta<=.25});
  await page.close();
 }
 await writeFile(path.join(evidence,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();await server.close()}
