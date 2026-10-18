import {readFile, writeFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import os from 'node:os';
import {buildSite} from './build-site.mjs';
import {startSiteServer} from '../tests/helpers/site-server.mjs';

const output = process.argv[2];
if (!output) throw new Error('Pass an evidence directory');
await mkdir(output,{recursive:true});
const {chromium} = createRequire(import.meta.url)('playwright');
const temporary = await mkdtemp(path.join(os.tmpdir(),'erinui-top-review-'));
const directory = path.join(temporary,'site'), files = await buildSite(directory);
const server = await startSiteServer({directory,files});
const browser = await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report = {browser:browser.version(), runs:[], errors:[], failed:[]};
try {
  for (const viewport of [{width:1440,height:900},{width:1366,height:768},{width:1280,height:720},{width:1920,height:1080},{width:1024,height:1366},{width:390,height:844},{width:320,height:568},{width:430,height:932}]) {
    const page = await browser.newPage({viewport,deviceScaleFactor:2,reducedMotion:'reduce'});
    await page.addInitScript(()=>{window.topInputEvents=[];new PerformanceObserver(list=>{for(const e of list.getEntries())window.topInputEvents.push({name:e.name,duration:e.duration,interactionId:e.interactionId});}).observe({type:'event',buffered:true,durationThreshold:16});});
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('response',r=>{if(r.url().startsWith(server.url)&&r.status()>=400)report.failed.push(r.url())});
    await page.route('**/*',route=>new URL(route.request().url()).origin===server.url?route.continue():route.abort());
    await page.goto(server.url+'/?youtubePanel=0',{waitUntil:'networkidle'});
    await page.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){a.pause();a.currentTime=0;}});
    await page.screenshot({path:path.join(output,`${viewport.width}-${viewport.height}-top.png`)});
    const measurements = await page.evaluate(() => {
      const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
      return {scrollWidth:document.documentElement.scrollWidth,header:rect(document.querySelector('.site-header')),map:rect(document.querySelector('.map-stage')),news:rect(document.querySelector('.news-section')),cards:[...document.querySelectorAll('.content-carousel-track')].map(t=>({section:t.closest('section').getAttribute('aria-labelledby'),count:t.children.length,first:rect(t.firstElementChild),clientWidth:t.clientWidth,scrollWidth:t.scrollWidth})),mapImages:[...document.querySelectorAll('.map-card > img')].map(n=>({source:n.currentSrc,naturalWidth:n.naturalWidth,...rect(n)}))};
    });
    for (const id of ['character-title','youtube-title','blog-title','goods-title','line-stamp-title']) {
      const section=page.locator('#'+id).locator('..').locator('..');
      await section.evaluate(n=>window.scrollTo({top:window.scrollY+n.getBoundingClientRect().top-72,behavior:'instant'}));
      await page.screenshot({path:path.join(output,`${viewport.width}-${viewport.height}-${id}.png`)});
    }
    await page.locator('.character-section').scrollIntoViewIfNeeded();
    await page.locator('.character-section .content-carousel-next').click();
    await page.waitForTimeout(200);
    const inputEvents = await page.evaluate(()=>window.topInputEvents);
    report.runs.push({viewport,dpr:2,...measurements,inputEvents});
    console.log(JSON.stringify({viewport,...measurements}));
    await page.close();
  }
  await writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
} finally { await browser.close(); await server.close(); await rm(temporary,{recursive:true,force:true}); }
