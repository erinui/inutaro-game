import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {startSiteServer} from '../tests/helpers/site-server.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),sharp=require('sharp');
const directory=process.env.HOME_ASSET_CANDIDATES;
if(!directory)throw new Error('HOME_ASSET_CANDIDATES required');
const report=JSON.parse(await readFile(path.join(directory,'candidates.json')));
const evidence=path.join(directory,'visual');await mkdir(evidence,{recursive:true});
const server=await startSiteServer(),browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try{
 for(const width of [390,1440])for(const dpr of [1,2]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:dpr});
  await page.route('**/*',r=>new URL(r.request().url()).origin===server.url?r.continue():r.abort());
  await page.goto(server.url+'/?youtubePanel=0');
  await page.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){a.pause();a.currentTime=0;}});
  const stage=page.locator('.map-stage');
  const before=await stage.screenshot({path:path.join(evidence,`${width}-${dpr}-before.png`)});
  const geometry=await page.locator('.map-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,href:n.getAttribute('href')}}));
  for(const asset of report.assets){
   const selected=asset.candidates.find(c=>c.quality==='90');
   const data=(await readFile(selected.file)).toString('base64');
   await page.locator(`img[src^="${asset.source}"]`).evaluate(async(img,url)=>{img.src=url;await img.decode()},'data:image/webp;base64,'+data);
  }
  const after=await stage.screenshot({path:path.join(evidence,`${width}-${dpr}-after.png`)});
  const changed=await page.locator('.map-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,href:n.getAttribute('href')}}));
  if(JSON.stringify(geometry)!==JSON.stringify(changed))throw new Error('Map geometry or links changed');
  const a=await sharp(before).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(after).ensureAlpha().raw().toBuffer();
  let different=0;for(let i=0;i<b.length;i++)if(a.data[i]!==b[i])different++;
  await sharp({create:{width:a.info.width*2,height:a.info.height,channels:4,background:'#fff'}}).composite([{input:before,left:0,top:0},{input:after,left:a.info.width,top:0}]).png().toFile(path.join(evidence,`${width}-${dpr}-comparison.png`));
  results.push({width,dpr,geometryEqual:true,differentChannels:different,totalChannels:b.length});
  await page.close();
 }
 await writeFile(path.join(evidence,'results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));
}finally{await browser.close();await server.close()}
