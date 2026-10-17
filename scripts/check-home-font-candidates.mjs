import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {startSiteServer} from '../tests/helpers/site-server.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const directory=process.env.HOME_FONT_CANDIDATES;if(!directory)throw new Error('HOME_FONT_CANDIDATES required');
const report=JSON.parse(await readFile(path.join(directory,'font-report.json'),'utf8'));
const evidence=path.join(directory,'visual');await mkdir(evidence,{recursive:true});
const faces=report.groups.map(g=>`@font-face{font-family:"KeinannPop";font-style:normal;font-weight:400;font-display:swap;src:url("/__candidate-font/${path.basename(g.file)}") format("woff2");unicode-range:${g.unicodeRange};}`).join('\n');
const server=await startSiteServer(),browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try{
 for(const width of [390,1440])for(const dpr of [1,2]){
  const captures=[];let requested;
  for(const mode of ['before','after']){
   const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:dpr});requested=new Set();
   await page.route('**/*',async route=>{
    const u=new URL(route.request().url());if(u.origin!==server.url)return route.abort();
    if(mode==='after'&&u.pathname==='/')return route.fulfill({contentType:'text/html',body:(await readFile('index.html','utf8')).replace(/<link[^>]+as="font"[^>]*>/g,'')});
    if(mode==='after'&&u.pathname==='/home.css')return route.fulfill({contentType:'text/css',body:faces+(await readFile('home.css','utf8')).replace(/^@font-face\s*\{[^}]*\}/,'')});
    if(u.pathname.startsWith('/__candidate-font/')){
     const group=report.groups.find(g=>path.basename(g.file)===path.basename(u.pathname));if(!group)return route.abort();
     requested.add(group.file);return route.fulfill({contentType:'font/woff2',body:await readFile(group.file)});
    }
    return route.continue();
   });
   await page.goto(server.url+'/?youtubePanel=0',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   const metrics=await page.locator('h1,h2,h3,main p').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n);return {text:n.textContent,x:r.x,y:r.y,w:r.width,h:r.height,lines:[...range.getClientRects()].map(r=>[r.x,r.y,r.width,r.height])}}));
   const initialRequested=new Set(requested);
   await page.evaluate(()=>{const p=document.createElement('p');p.id='font-probe';p.style.cssText='font-family:KeinannPop;font-size:24px;width:360px';p.textContent='office fi fl ffi ffl café cafe\u0301 か\u3099 ハ\u309a ｶﾞ ΑΒΓ АБВ 鬱 髙 𠮷 😀';document.body.append(p)});
   await page.evaluate(()=>document.fonts.ready);
   const probe=await page.locator('#font-probe').evaluate(n=>{const range=document.createRange();range.selectNodeContents(n);return [...range.getClientRects()].map(r=>[r.width,r.height])});
   captures.push({metrics,probe});
   await writeFile(path.join(evidence,`${width}-${dpr}-${mode}-metrics.json`),JSON.stringify(metrics,null,2));
   await page.screenshot({path:path.join(evidence,`${width}-${dpr}-${mode}.png`),fullPage:true});
   if(mode==='after')results.push({width,dpr,fontBytes:report.groups.filter(g=>initialRequested.has(g.file)).reduce((n,g)=>n+g.bytes,0),requested:[...initialRequested],layoutEqual:JSON.stringify(captures[0])===JSON.stringify(captures[1])});
   await page.close();
  }
 }
 await writeFile(path.join(evidence,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({requested,...r})=>({...r,files:requested.length}))));
}finally{await browser.close();await server.close()}
