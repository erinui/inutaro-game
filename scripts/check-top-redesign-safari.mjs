// Uses an already permitted Safari WebDriver session; never changes system settings.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {buildSite} from './build-site.mjs';
import {startSiteServer} from '../tests/helpers/site-server.mjs';

const [output,baseline] = process.argv.slice(2);
if (!output || !baseline) throw new Error('Pass fresh evidence output and pre-TOP performance directory');
await mkdir(output,{recursive:false});
const directory = path.resolve(output,'site'), files = await buildSite(directory);
const oldFiles = Object.keys(JSON.parse(await readFile(path.join(baseline,'source-hashes.json'),'utf8')));
const servers = {before:await startSiteServer({directory:path.resolve(baseline,'site'),files:oldFiles}),after:await startSiteServer({directory,files})};
const listener = net.createServer();
await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));
const port = listener.address().port;
await new Promise(resolve=>listener.close(resolve));
const driver = spawn('/usr/bin/safaridriver',['-p',String(port)],{stdio:'ignore'});
let session;
const result = {pages:[],top:[],limitations:[]};
async function command(method,route,payload) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`,{method,headers:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});
  const data = await response.json();
  if (!response.ok || data.value?.error) throw new Error(JSON.stringify(data.value));
  return data.value;
}
const execute = script => command('POST',`/session/${session}/execute/sync`,{script,args:[]});
const navigate = url => command('POST',`/session/${session}/url`,{url});
async function screenshot(name) {
  await writeFile(path.join(output,name+'.png'),Buffer.from(await command('GET',`/session/${session}/screenshot`),'base64'));
}
async function click(selector) {
  const element = await command('POST',`/session/${session}/element`,{using:'css selector',value:selector});
  await command('POST',`/session/${session}/element/${element['element-6066-11e4-a52e-4f735466cecf']}/click`,{});
}
try {
  for (let i=0;i<30;i++) {try {await command('GET','/status');break;} catch {} await delay(100);}
  const created = await command('POST','/session',{capabilities:{alwaysMatch:{browserName:'safari'}}});
  session = created.sessionId; result.capabilities = created.capabilities;
  for (const requestedWidth of [390,1440]) {
    await command('POST',`/session/${session}/window/rect`,{width:requestedWidth,height:1000});
    for (const route of ['/games/','/pages/characters.html','/pages/blog.html','/pages/illustrations.html','/pages/terms.html','/pages/privacy.html','/games/inutaro-mushi/']) {
      const versions = [];
      for (const mode of ['before','after']) {
        await navigate(servers[mode].url+route);
        await execute('return document.fonts.ready.then(()=>true)');
        versions.push(await execute(`return [...document.querySelectorAll('h1,.page-hero>p,.games-hero>p')].map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,x:r.x,y:r.y,w:r.width,h:r.height}})`));
      }
      assert.deepEqual(versions[1],versions[0],route);
      result.pages.push({route,requestedWidth,passed:true});
    }
    await navigate(servers.after.url+'/?youtubePanel=0');
    await execute('return document.fonts.ready.then(()=>true)');
    const geometry = await execute(`const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};return {width:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,dpr:devicePixelRatio,header:rect(document.querySelector('.site-header')),map:rect(document.querySelector('.map-stage')),news:rect(document.querySelector('.news-section')),cards:[...document.querySelectorAll('.content-carousel-card,.character-card')].map(rect)}`);
    assert.equal(geometry.scrollWidth,geometry.clientWidth);
    assert.ok(geometry.cards.every(c=>c.w===321&&c.h===432));
    await screenshot(`${requestedWidth}-top`);
    await execute(`document.querySelector('.map-link-youtube').dispatchEvent(new MouseEvent('click',{bubbles:true,button:0}));`);
    for (let i=0;i<30;i++) {if (await execute(`return Math.abs(document.querySelector('#youtube-title').getBoundingClientRect().top-(document.querySelector('.site-header').offsetHeight+24))<3`))break;await delay(100);}
    assert.equal(await execute(`return document.activeElement.id`),'youtube-title');
    assert.ok(await execute(`return document.querySelector('#youtube-title').getBoundingClientRect().top>=document.querySelector('.site-header').offsetHeight`));
    await screenshot(`${requestedWidth}-youtube`);
    await click('.youtube-section .content-carousel-next');
    for (let i=0;i<30;i++) {if (await execute(`return document.querySelector('[data-youtube-cards]').scrollLeft>300`))break;await delay(100);}
    assert.ok(await execute(`return document.querySelector('[data-youtube-cards]').scrollLeft>300`));
    await execute(`window.scrollTo({top:0,behavior:'instant'});showYoutubePanel(document.querySelector('.map-link-youtube'),3);`);
    await delay(300);
    assert.equal(await execute(`return document.querySelector('.map-link-youtube').classList.contains('is-showing-stats')`),true);
    assert.equal(await execute(`return document.querySelector('.map-link-youtube').getAttribute('href')`),'#youtube-title');
    await screenshot(`${requestedWidth}-statistics`);
    if (requestedWidth===390) {
      await click('.site-menu-toggle');
      assert.equal(await execute(`return document.querySelector('.site-menu-toggle').getAttribute('aria-expanded')`),'true');
      await click('.site-menu-toggle');
    }
    for (const [name,active] of [['sasuke','is-walking'],['bukurochan','is-questioning']]) {
      await click('.map-decoration-'+name);
      assert.equal(await execute(`return document.querySelector('.map-decoration-${name}').classList.contains('${active}')`),true);
    }
    const hover = await command('POST',`/session/${session}/element`,{using:'css selector',value:'.map-link-game'});
    await command('POST',`/session/${session}/actions`,{actions:[{type:'pointer',id:'mouse',parameters:{pointerType:'mouse'},actions:[{type:'pointerMove',duration:100,origin:hover,x:0,y:0}]}]});
    await delay(40);
    await screenshot(`${requestedWidth}-hover-transition`);
    await delay(180);
    assert.equal(await execute(`return getComputedStyle(document.querySelector('.map-link-game')).transform`),'matrix(1, 0, 0, 1, 0, -3)');
    await screenshot(`${requestedWidth}-hover`);
    result.top.push({requestedWidth,...geometry,operationsPassed:true});
  }
  result.limitations.push('Desktop Safari only; real iOS, DPR1, physical touch and audio output are not verified.');
  result.passed = true;
} catch (error) {
  result.passed = false; result.error = error.message;
  process.exitCode = 1;
} finally {
  await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({passed:result.passed,error:result.error,pages:result.pages.length,top:result.top.length}));
  if (session) await command('DELETE',`/session/${session}`).catch(()=>{});
  driver.kill('SIGTERM');
  for (const server of Object.values(servers)) await server.close();
}
