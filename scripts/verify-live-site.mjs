// Read-only smoke/integrity verification against this project's public origins.
import assert from 'node:assert/strict';import {mkdir,readFile,writeFile} from 'node:fs/promises';import path from 'node:path';import {chromium} from 'playwright';
import {sha256} from './lib/home-assets.mjs';import {imageDimensions} from './lib/youtube-images.mjs';import {validPublicUrl} from './lib/provider-url-policy.mjs';import {assertNodeVersion} from './check-node-version.mjs';
assertNodeVersion();
const [origin,output]=process.argv.slice(2),u=new URL(origin);
assert.ok(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.pathname==='/'&&(u.hostname==='erinui.com'||u.hostname.endsWith('-inutaro-game.erikanuinui.workers.dev')),'Expected a project HTTPS origin');assert.ok(output&&process.env.CHROME_EXECUTABLE,'Pass evidence directory and verified CHROME_EXECUTABLE');
await mkdir(output,{recursive:true});const report={origin,checkedAt:new Date().toISOString(),pages:[],providers:[],immutableAssets:0,internal404:[],errors:[]};
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE});
try{
 report.browser=browser.version();const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.addInitScript(()=>{window.securityViolations=[];document.addEventListener('securitypolicyviolation',e=>window.securityViolations.push({directive:e.violatedDirective,uri:e.blockedURI,disposition:e.disposition}));});
 page.on('pageerror',e=>report.errors.push(e.message));
 const spec=JSON.parse(await readFile(new URL('../tests/fixtures/seo.json',import.meta.url),'utf8'));
 for(const item of spec.pages){
  const response=await page.goto(new URL(item.canonicalPath,origin).href,{waitUntil:'networkidle'});assert.equal(response.status(),200,item.canonicalPath);await page.evaluate(()=>document.fonts.ready);
  const headers=response.headers(),csp=headers['content-security-policy']||headers['content-security-policy-report-only'];assert.ok(csp,'CSP missing');if(process.env.REQUIRE_CSP_ENFORCED==='1')assert.ok(headers['content-security-policy'],'CSP must be enforced');assert.equal(headers['x-content-type-options'],'nosniff');assert.equal(headers['x-frame-options'],'DENY');assert.equal(headers['referrer-policy'],'strict-origin-when-cross-origin');
  assert.equal(await page.title(),item.title);assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://erinui.com'+item.canonicalPath);
  if(item.file==='index.html'){
   for(const id of ['news','youtube','blog','goods','line-stamp'])await page.locator(`#${id}-title`).scrollIntoViewIfNeeded();
   await page.waitForTimeout(500);const broken=await page.locator('img').evaluateAll(nodes=>nodes.filter(n=>n.getAttribute('src')&&n.complete&&!n.naturalWidth).map(n=>n.getAttribute('src')));assert.deepEqual(broken,[],'broken TOP images');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'top.png'),fullPage:true});
  }
  if(item.file==='games/inutaro-mushi/index.html'){
   await page.locator('#start').click();assert.equal(await page.evaluate(()=>state.running),true);await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>state.playerLift>0||state.playerLiftVelocity>0),true);await page.locator('#sound-toggle').click();assert.equal(await page.evaluate(()=>soundEnabled),false);await page.locator('#sound-toggle').click();await page.waitForFunction(()=>backgroundMusic&&!backgroundMusic.paused);assert.equal(await page.evaluate(async()=>{const b=await canvasToBlob(createResultCardCanvas());return b.type==='image/png'&&b.size>1000;}),true);await page.screenshot({path:path.join(output,'game.png')});
  }
  const violations=await page.evaluate(()=>window.securityViolations);assert.deepEqual(violations,[],item.canonicalPath+' CSP');report.pages.push({path:item.canonicalPath,status:200,cspMode:headers['content-security-policy']?'enforced':'report-only',headers,violations});
 }
 for(const [name,id]of [['youtube-latest','youtube'],['note-latest','note'],['suzuri-latest','suzuri'],['line-stamps','line']]){
  const r=await page.request.get(new URL(`assets/home-city/${name}.json`,origin).href);assert.equal(r.status(),200);const data=await r.json();assert.equal(data.ok,true);const items=data.videos||data.items;for(const item of items){assert.ok(validPublicUrl(item.url,id),item.url);if(item.localThumbnail){const response=await page.request.get(new URL(item.localThumbnail.url,origin).href);assert.equal(response.status(),200);const bytes=await response.body();assert.equal(sha256(bytes),item.localThumbnail.sha256);assert.deepEqual(imageDimensions(bytes),{width:item.localThumbnail.width,height:item.localThumbnail.height});}}report.providers.push({id,count:items.length,fetchedAt:data.fetchedAt});
 }
 const manifest=JSON.parse(await readFile(new URL('../config/home-performance-assets.json',import.meta.url),'utf8')),pending=[...manifest.outputs];
 await Promise.all(Array.from({length:6},async()=>{for(let item;(item=pending.pop());){const r=await page.request.get(new URL(item.file,origin).href);assert.equal(r.status(),200,item.file);assert.equal(sha256(await r.body()),item.sha256,item.file);assert.match(r.headers()['cache-control'],/max-age=31536000/);report.immutableAssets++;}}));
 for(const file of ['/.env','/.git/config','/package.json','/config/home-performance-assets.json','/scripts/publish-candidates.mjs','/docs/security-hardening-operations-20261027.md','/tools/deploy/package-lock.json']){const response=await page.request.get(origin.replace(/\/$/,'')+file);assert.equal(response.status(),404,file);report.internal404.push(file);}
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error.message;process.exitCode=1;}finally{await browser.close();await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({origin,passed:report.passed,pages:report.pages.length,immutableAssets:report.immutableAssets,...(report.failure?{failure:report.failure}:{})}));}
