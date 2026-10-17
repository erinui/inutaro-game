// macOS Safari WebDriver check. Requires the user's existing automation permission.
// It never enables settings, changes normal tabs, or publishes a release.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {buildSite} from './build-site.mjs';
import {startSiteServer} from '../tests/helpers/site-server.mjs';

const output=process.env.HOME_SAFARI_OUTPUT;
const baseline=process.env.HOME_SAFARI_BEFORE;
if(!output||!baseline)throw new Error('Fresh HOME_SAFARI_OUTPUT and HOME_SAFARI_BEFORE evidence directories required');
await mkdir(output,{recursive:false});
const current=path.resolve(output,'site');
const files=await buildSite(current);
const oldFiles=Object.keys(JSON.parse(await readFile(path.join(baseline,'source-hashes.json'),'utf8')));
const servers={before:await startSiteServer({directory:path.resolve(baseline,'site'),files:oldFiles}),after:await startSiteServer({directory:current,files})};
const listener=net.createServer();
await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));
const port=listener.address().port;
await new Promise(resolve=>listener.close(resolve));
const driver=spawn('/usr/bin/safaridriver',['-p',String(port)],{stdio:'ignore'});
const origin=`http://127.0.0.1:${port}`;
let session;
const result={pages:[],operations:{},limitations:[]};
async function command(method,route,payload){
 const response=await fetch(origin+route,{method,headers:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});
 const data=await response.json();
 if(!response.ok||data.value?.error)throw new Error(JSON.stringify(data.value));
 return data.value;
}
const execute=(script,args=[])=>command('POST',`/session/${session}/execute/sync`,{script,args});
const navigate=url=>command('POST',`/session/${session}/url`,{url});
async function click(selector){
 const element=await command('POST',`/session/${session}/element`,{using:'css selector',value:selector});
 await command('POST',`/session/${session}/element/${element['element-6066-11e4-a52e-4f735466cecf']}/click`,{});
}
async function screenshot(name){
 const png=await command('GET',`/session/${session}/screenshot`);
 await writeFile(path.join(output,name+'.png'),Buffer.from(png,'base64'));
}
try{
 for(let i=0;i<30;i++){try{await command('GET','/status');break;}catch{}await delay(100);}
 const created=await command('POST','/session',{capabilities:{alwaysMatch:{browserName:'safari'}}});
 session=created.sessionId;result.capabilities=created.capabilities;
 await command('POST',`/session/${session}/timeouts`,{script:30000,pageLoad:30000,implicit:0});
 const pages=['/','/games/','/pages/characters.html','/pages/blog.html','/pages/illustrations.html','/pages/terms.html','/pages/privacy.html','/games/inutaro-mushi/'];
 for(const requestedWidth of [390,1440]){
  await command('POST',`/session/${session}/window/rect`,{width:requestedWidth,height:1000});
  for(const document of pages){
   const captures=[];
   for(const mode of ['before','after']){
    await navigate(servers[mode].url+document+(document==='/'?'?youtubePanel=0':''));
    await execute('return document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))');
    await execute('for(const a of document.getAnimations()){a.pause();a.currentTime=0;}for(const track of document.querySelectorAll(".content-carousel-track"))track.scrollTo({left:0,behavior:"instant"});window.scrollTo({top:0,behavior:"instant"});');
    const metrics=await execute(`return {width:innerWidth,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,fontReady:document.fonts.check('16px KeinannPop','エリカッテシティ'),nodes:[...document.querySelectorAll('h1,.page-hero>p,.map-guide-card h3,.map-card')].map(n=>{const r=n.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(n);return {tag:n.tagName,text:n.matches('.map-card')?n.getAttribute('aria-label'):n.textContent,x:r.x,y:r.y,w:r.width,h:r.height,lines:n.matches('.map-card')?[]:[...range.getClientRects()].map(r=>[r.x,r.y,r.width,r.height])}})};`);
    captures.push(metrics);
    await writeFile(path.join(output,`${requestedWidth}-${document.replaceAll('/','_')||'top'}-${mode}.json`),JSON.stringify(metrics,null,2));
    if(['/','/pages/characters.html','/pages/privacy.html'].includes(document))await screenshot(`${requestedWidth}-${document==='/'?'top':path.basename(document,'.html')}-${mode}`);
   }
   const [before,after]=captures;
   assert.equal(after.width,before.width);assert.equal(after.scrollWidth,after.clientWidth,document+' overflow');
   assert.equal(after.nodes.length,before.nodes.length);
   let delta=0;
   for(let i=0;i<before.nodes.length;i++){
    const a=before.nodes[i],b=after.nodes[i];assert.equal(b.text,a.text,document+' text');
    assert.equal(b.lines.length,a.lines.length,document+' line count');
    for(const key of ['x','y','w','h'])delta=Math.max(delta,Math.abs(b[key]-a[key]));
    for(let j=0;j<a.lines.length;j++)for(let k=0;k<4;k++)delta=Math.max(delta,Math.abs(b.lines[j][k]-a.lines[j][k]));
   }
   assert.ok(delta<=.25,`${document} at ${requestedWidth}: geometry delta ${delta}`);
   if(document!=='/games/inutaro-mushi/')assert.equal(after.fontReady,true,document+' font');
   result.pages.push({document,requestedWidth,actualWidth:after.width,dpr:after.dpr,maxGeometryDelta:delta,passed:true});
   console.log(JSON.stringify(result.pages.at(-1)));
   await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));
  }
 }
 await command('POST',`/session/${session}/window/rect`,{width:390,height:1000});
 await navigate(servers.after.url+'/?youtubePanel=0');
 const visibleMenu=await execute('return getComputedStyle(document.querySelector(".site-menu-toggle")).display!=="none"');
 if(visibleMenu){
  await click('.site-menu-toggle');assert.equal(await execute('return document.querySelector(".site-menu-toggle").getAttribute("aria-expanded")'),'true');
  await execute('document.querySelector("#site-menu a").focus()');
  await command('POST',`/session/${session}/actions`,{actions:[{type:'key',id:'keyboard',actions:[{type:'keyDown',value:'\uE00C'},{type:'keyUp',value:'\uE00C'}]}]});
  assert.equal(await execute('return document.querySelector(".site-menu-toggle").getAttribute("aria-expanded")'),'false');
  result.operations.menu=true;
 }else result.limitations.push('Narrow viewport menu could not be exercised');
 await command('POST',`/session/${session}/window/rect`,{width:1440,height:1000});
 await execute('document.querySelector(".news-section .content-carousel-next").scrollIntoView({block:"center",behavior:"instant"})');
 await click('.news-section .content-carousel-next');
 for(let i=0;i<20;i++){if(await execute('return document.querySelector("[data-news-cards]").scrollLeft>0'))break;await delay(100);}
 assert.equal(await execute('return document.querySelector("[data-news-cards]").scrollLeft>0'),true);result.operations.carousel=true;
 await navigate(servers.after.url+'/games/inutaro-mushi/');await click('#start');
 assert.equal(await execute('return document.querySelector(".game-shell").classList.contains("is-playing")'),true);result.operations.gameStart=true;
 await navigate(servers.after.url+'/');
 result.cycle=[];
 for(let index=0;index<4;index++){
  if(index)await delay(10300);
  const state=await execute('return {time:performance.now(),stats:document.querySelector(".map-link-youtube").classList.contains("is-showing-stats"),video:document.querySelector(".youtube-thumb.is-active")?.getAttribute("data-video-id"),ready:[...document.querySelectorAll(".youtube-thumb[src]")].every(i=>i.complete&&i.naturalWidth>0)}');
  result.cycle.push(state);
 }
 assert.equal(result.cycle[3].stats,true);assert.equal(new Set(result.cycle.slice(0,3).map(s=>s.video)).size,3);assert.ok(result.cycle.every(s=>s.ready));
 await execute('showYoutubePanel(document.querySelector(".map-link-youtube"),0)');
 const prior=await execute('return document.querySelector(".youtube-thumb.is-active")?.getAttribute("data-video-id")');
 await execute(`const card=document.querySelector('.map-link-youtube'),state=youtubePanelState(card);window.safariOriginalDecode=HTMLImageElement.prototype.decode;state.items[1].status='idle';state.items[1].promise=null;HTMLImageElement.prototype.decode=function(){if(this.src.includes(state.items[1].url))return new Promise((resolve,reject)=>{window.safariFinishDecode=()=>window.safariOriginalDecode.call(this).then(resolve,reject);});return window.safariOriginalDecode.call(this);};showYoutubePanel(card,1);`);
 assert.equal(await execute('return document.querySelector(".youtube-thumb.is-active")?.getAttribute("data-video-id")'),prior,'Previous image stays visible while decode waits');
 await execute('showYoutubePanel(document.querySelector(".map-link-youtube"),3);window.safariFinishDecode();HTMLImageElement.prototype.decode=window.safariOriginalDecode;');
 await delay(100);
 assert.equal(await execute('return document.querySelector(".map-link-youtube").classList.contains("is-showing-stats")'),true,'Late decode cannot replace statistics');
 result.operations.delayedDecodeKeepsPrevious=true;result.operations.lateDecodeDoesNotReplaceStatistics=true;

 const actualWidths=[...new Set(result.pages.map(p=>p.actualWidth))],dprs=[...new Set(result.pages.map(p=>p.dpr))];
 if(actualWidths.some(w=>![390,1440].includes(w)))result.limitations.push('Safari window minimum changes the requested narrow viewport; actual widths are recorded');
 if(!dprs.includes(1)||!dprs.includes(2))result.limitations.push('Physical display DPR only; DPR1/2 and real iOS devices are not both verified');
 result.passed=true;
}catch(error){result.passed=false;result.error=error.message;throw error;}
finally{
 await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');
 if(session)await command('DELETE',`/session/${session}`).catch(()=>{});
 driver.kill('SIGTERM');await Promise.all(Object.values(servers).map(s=>s.close()));
}
