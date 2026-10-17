import http from 'node:http';
import path from 'node:path';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { brotliCompressSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { buildSite } from './build-site.mjs';
import { cumulativeLayoutShift } from './lib/home-performance-metrics.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const output = process.env.HOME_PERFORMANCE_OUTPUT;
if (!output) throw new Error('HOME_PERFORMANCE_OUTPUT must be a fresh evidence directory');
await mkdir(output, {recursive:false});
const snapshot = path.join(output, 'site');
let files;
if(process.env.HOME_PERFORMANCE_SOURCE){
 const source=path.resolve(process.env.HOME_PERFORMANCE_SOURCE);
 files=Object.keys(JSON.parse(await readFile(path.join(source,'../source-hashes.json'),'utf8')));
 await cp(source,snapshot,{recursive:true});
}else files=await buildSite(snapshot);
const hashes = {};
for (const file of files) hashes[file] = createHash('sha256').update(await readFile(path.join(snapshot,file))).digest('hex');
await writeFile(path.join(output,'source-hashes.json'),JSON.stringify(hashes,null,2));
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain','.xml':'application/xml'};
const bodies = new Map();
const server = http.createServer(async(req,res)=>{
  try {
    let key = decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '');
    if (!key || key.endsWith('/')) key += 'index.html';
    if (!files.includes(key)) return res.writeHead(404).end();
    const original = await readFile(path.join(snapshot,key));
    const type = mime[path.extname(key)] || 'application/octet-stream';
    const compress = /text\/|json|xml|svg/.test(type) && /br/.test(req.headers['accept-encoding'] || '');
    const bytes = compress ? brotliCompressSync(original) : original;
    bodies.set('/'+key,bytes.length);
    res.setHeader('Content-Type',type);
    res.setHeader('Content-Length',bytes.length);
    res.setHeader('Cache-Control',key.startsWith('assets/versioned/')?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate');
    if(compress) res.setHeader('Content-Encoding','br');
    res.end(bytes);
  } catch { res.writeHead(500).end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const target = process.env.HOME_PERFORMANCE_URL || origin;
const browser = await chromium.launch({executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const runs = [], runCount = Number(process.env.HOME_PERFORMANCE_RUNS || 3);
try {
  for(const viewport of (process.env.HOME_PERFORMANCE_MOBILE_ONLY?[{width:390,height:844}]:[{width:390,height:844},{width:1440,height:900}])) for(const dpr of (process.env.HOME_PERFORMANCE_DPR?[Number(process.env.HOME_PERFORMANCE_DPR)]:[1,2])) for(let run=1;run<=runCount;run++) {
    const context=await browser.newContext({viewport,deviceScaleFactor:dpr});
    const page=await context.newPage();
    const cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:6000000/8,uploadThroughput:1500000/8});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const requests=new Map(),bodyReads=[];
    cdp.on('Network.requestWillBeSent',e=>requests.set(e.requestId,{url:e.request.url,type:e.type,initiator:e.initiator.type,bodyBytes:0,decodedBytes:0}));
    cdp.on('Network.responseReceived',e=>Object.assign(requests.get(e.requestId)||{},{status:e.response.status,mime:e.response.mimeType,headers:e.response.headers,cached:e.response.fromDiskCache||e.response.fromServiceWorker}));
    cdp.on('Network.dataReceived',e=>{const r=requests.get(e.requestId);if(r){r.bodyBytes+=e.encodedDataLength;r.decodedBytes+=e.dataLength;}});
    cdp.on('Network.loadingFinished',e=>{const r=requests.get(e.requestId);if(r){
      Object.assign(r,{finished:true,transferBytes:e.encodedDataLength});
      if(new URL(r.url).origin!==origin)bodyReads.push(cdp.send('Network.getResponseBody',{requestId:e.requestId}).then(body=>{
        const encoding=Object.entries(r.headers||{}).find(([k])=>k.toLowerCase()==='content-encoding')?.[1];
        if(!encoding){r.completeBodyBytes=Buffer.from(body.body,body.base64Encoded?'base64':'utf8').length;}
      }).catch(()=>{}));
    }});
    cdp.on('Network.loadingFailed',e=>{const r=requests.get(e.requestId);if(r)Object.assign(r,{finished:true,error:e.errorText});});
    await page.addInitScript(()=>{
      window.homePerformance={lcp:0,lcpElement:null,shifts:[]};
      new PerformanceObserver(list=>{for(const e of list.getEntries()){window.homePerformance.lcp=e.startTime;window.homePerformance.lcpElement=e.element?.outerHTML?.slice(0,600);}}).observe({type:'largest-contentful-paint',buffered:true});
      new PerformanceObserver(list=>{for(const e of list.getEntries())window.homePerformance.shifts.push({startTime:e.startTime,value:e.value,hadRecentInput:e.hadRecentInput});}).observe({type:'layout-shift',buffered:true});
    });
    await page.goto(target+'/',{waitUntil:'commit'});
    await page.waitForFunction(()=>performance.now()>=30000,null,{timeout:60000});
    const metrics=await page.evaluate(()=>({...window.homePerformance,fontResources:performance.getEntriesByType('resource').filter(e=>/woff|ttf/.test(e.name)).map(e=>e.name),images:[...document.images].map(i=>({src:i.currentSrc,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,complete:i.complete}))}));
    await Promise.all(bodyReads);
    const resources=[...requests.values()].map(r=>{
      const u=new URL(r.url);
      const key=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname;
      if(u.origin===origin && r.finished && !r.error && bodies.has(key)) return {...r,bodyBytes:bodies.get(key),byteSource:'local-response-body'};
      const declared=Object.entries(r.headers||{}).find(([name])=>name.toLowerCase()==='content-length')?.[1];
      if(r.finished&&!r.error&&!r.cached&&r.status===200&&/^\d+$/.test(declared||''))return {...r,bodyBytes:Number(declared),byteSource:'complete-response-content-length'};
      if(Number.isFinite(r.completeBodyBytes)&&!r.error)return {...r,bodyBytes:r.completeBodyBytes,byteSource:'complete-uncompressed-response-body'};
      return {...r,byteSource:r.bodyBytes>0?'cdp-dataReceived':null};
    });
    const unknown=resources.filter(r=>r.error||(!r.byteSource&&!r.cached&&r.status!==304)).map(r=>r.url);
    const sum=filter=>resources.filter(filter).reduce((n,r)=>n+r.bodyBytes,0);
    const result={viewport,dpr,run,browser:browser.version(),network:{down:6000000,up:1500000,latency:150,cpu:4},elapsed:30000,...metrics,cls:cumulativeLayoutShift(metrics.shifts),bodyBytes:sum(()=>true),fontBytes:sum(r=>/font|woff|ttf/.test(r.mime||r.url)),imageBytes:sum(r=>/^image\//.test(r.mime||'')),maxImageBytes:Math.max(0,...resources.filter(r=>/^image\//.test(r.mime||'')).map(r=>r.bodyBytes)),unknown,incomplete:resources.filter(r=>!r.finished).map(r=>r.url),resources};
    runs.push(result);
    await writeFile(path.join(output,'runs.json'),JSON.stringify(runs,null,2));
    console.log(JSON.stringify({width:viewport.width,dpr,run,lcp:result.lcp,cls:result.cls,bodyBytes:result.bodyBytes,unknown:unknown.length,incomplete:result.incomplete.length}));
    await page.screenshot({path:path.join(output,`initial-${viewport.width}-${dpr}-${run}.png`)});
    await context.close();
  }
} finally {await browser.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
