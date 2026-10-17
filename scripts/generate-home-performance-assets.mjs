import { readFile,writeFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { startSiteServer } from '../tests/helpers/site-server.mjs';
import { sha256 } from './lib/home-assets.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const output=process.env.HOME_ASSET_CANDIDATES;
if(!output)throw new Error('HOME_ASSET_CANDIDATES is required; candidates are not adopted automatically');
await mkdir(output,{recursive:true});
const server=await startSiteServer();
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={browser:browser.version(),cwebp:execFileSync('cwebp',['-version'],{encoding:'utf8'}).trim(),assets:[]};
try{
 const page=await browser.newPage({viewport:{width:1200,height:1200},deviceScaleFactor:1});
 for(const name of ['sns2','character','linestamp','game','goods','note','illast','youtube']){
  const source=`assets/home-city/map_${name}.svg`;
  const bytes=await readFile(source);
  const [width,height]=name==='character'?[650,816]:[512,512];
  await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block}</style><img src="${server.url}/${source}" width="${width}" height="${height}">`);
  await page.locator('img').evaluate(img=>img.decode());
  const png=path.join(output,`map_${name}.png`);
  await page.screenshot({path:png,omitBackground:true,clip:{x:0,y:0,width,height}});
  const candidates=[];
  for(const quality of ['80','90','lossless']){
   const file=path.join(output,`map_${name}-${quality}.webp`);
   execFileSync('cwebp',quality==='lossless'?['-quiet','-lossless','-exact',png,'-o',file]:['-quiet','-q',quality,png,'-o',file]);
   const encoded=await readFile(file);
   candidates.push({file,quality,bytes:encoded.length,sha256:sha256(encoded)});
  }
  report.assets.push({source,sourceSha256:sha256(bytes),width,height,candidates});
  console.log(name, candidates.map(c=>`${c.quality}:${c.bytes}`).join(' '));
 }
 await writeFile(path.join(output,'candidates.json'),JSON.stringify(report,null,2));
}finally{await browser.close();await server.close();}
