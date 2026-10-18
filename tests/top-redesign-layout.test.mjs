import assert from 'node:assert/strict';
import {test, before, after} from 'node:test';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildSite} from '../scripts/build-site.mjs';
import {startSiteServer} from './helpers/site-server.mjs';

const {chromium} = createRequire(import.meta.url)('playwright');
let browser, server, temporary;
before(async () => {
  temporary = await mkdtemp(path.join(os.tmpdir(), 'erinui-top-v2-'));
  const directory = path.join(temporary, 'site'), files = await buildSite(directory);
  server = await startSiteServer({directory, files});
  browser = await chromium.launch({executablePath: process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
});
after(async () => { await browser?.close(); await server?.close(); await rm(temporary, {recursive:true, force:true}); });

async function open(viewport = {width:1440, height:900}, options = {}) {
  const page = await browser.newPage({viewport, ...options});
  await page.route('**/*', route => new URL(route.request().url()).origin === server.url ? route.continue() : route.abort());
  await page.goto(server.url + '/?youtubePanel=0', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => document.fonts.ready);
  if (options.javaScriptEnabled !== false) await page.waitForFunction(() => document.querySelector('[data-youtube-cards]')?.children.length === 6);
  return page;
}
const rect = locator => locator.boundingBox();

test('TOP-W02: PC keeps the full map and first news row within the viewport', async () => {
  for (const viewport of [{width:1440,height:900},{width:1366,height:768},{width:1280,height:720}]) {
    const page = await open(viewport);
    try {
      const header = await rect(page.locator('.site-header')), map = await rect(page.locator('.map-stage'));
      const news = await rect(page.locator('.news-section'));
      assert.equal(header.height, 72);
      assert.ok(map.y >= header.height + 23 && map.y + map.height <= viewport.height - 23);
      assert.ok(news.y + news.height <= viewport.height - 23, `news bottom ${news.y+news.height} at ${viewport.height}`);
      assert.ok(news.x > map.x + map.width);
      const top = map.y;
      await page.evaluate(() => window.scrollTo({top:1800,behavior:'instant'}));
      assert.ok(Math.abs((await rect(page.locator('.map-stage'))).y - top) < 1);
      assert.equal(await page.locator('#hero-title').count(), 1);
      assert.equal(await page.locator('.hero-copy').innerText(), 'えりぬい・犬タローの公式サイト。');
    } finally { await page.close(); }
  }
});

test('TOP-W02: SP and portrait tablet use one vertical document without horizontal overflow', async () => {
  for (const viewport of [{width:320,height:568},{width:375,height:812},{width:390,height:844},{width:430,height:932},{width:1024,height:1366},{width:1099,height:900},{width:1100,height:900},{width:1920,height:1080}]) {
    const page = await open(viewport);
    try {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
      assert.equal(await page.locator('.map-stage').count(), 1);
      assert.equal(await page.locator('.carousel-section, .character-section').count(), 7);
      if (viewport.width < 1100) {
        const hero = await rect(page.locator('.hero-board')), map = await rect(page.locator('.map-stage')), news = await rect(page.locator('.news-section'));
        assert.ok(hero.y < map.y && map.y + map.height <= news.y + 1);
        await page.evaluate(() => window.scrollTo({top:1200,behavior:'instant'}));
        assert.ok((await rect(page.locator('.map-stage'))).y < 0);
      }
    } finally { await page.close(); }
  }
});

test('TOP-W03: six map anchors and two direct links remain distinct, including YouTube layers', async () => {
  const page = await open({width:390,height:844}, {reducedMotion:'reduce'});
  try {
    for (const [name,id] of Object.entries({game:'game-title',character:'character-title',youtube:'youtube-title',blog:'blog-title',goods:'goods-title',linestamp:'line-stamp-title'})) {
      const link = page.locator('.map-link-' + name);
      assert.equal(await link.getAttribute('href'), '#'+id);
      assert.equal(await link.getAttribute('target'), null);
    }
    assert.equal(await page.locator('.map-link-sns').getAttribute('href'), 'https://x.com/erikanuinui');
    assert.equal(await page.locator('.map-link-illustrate').getAttribute('href'), 'pages/illustrations.html');
    assert.equal(await page.locator('.map-link-youtube .youtube-screen-background').count(), 1);
    assert.equal(await page.locator('.map-link-youtube .youtube-screen').count(), 1);
    assert.equal(await page.locator('.map-link-youtube .youtube-frame').count(), 1);
    assert.equal(await page.locator('.map-decoration-control').count(), 2);
    await page.locator('.map-link-game').click();
    await page.waitForFunction(() => document.activeElement?.id === 'game-title');
    const title = await rect(page.locator('#game-title')), header = await rect(page.locator('.site-header'));
    assert.ok(title.y >= header.height && title.y < header.height + 40);
  } finally { await page.close(); }
});

test('TOP-W04: cards share dimensions, contain media, and only news shows category pills', async () => {
  for (const width of [320,390,1440]) {
    const page = await open({width,height:900});
    try {
      await page.waitForFunction(() => document.querySelector('[data-news-cards]')?.children.length === 12);
      const sizes = await page.locator('.content-carousel-card, .character-card').evaluateAll(nodes => nodes.map(n => {const r=n.getBoundingClientRect();return [r.width,r.height];}));
      const [w,h] = sizes[0];
      for (const size of sizes) { assert.ok(Math.abs(size[0]-w)<1); assert.ok(Math.abs(size[1]-h)<1); }
      if (width !== 320) { assert.equal(w,321); assert.equal(h,432); }
      assert.equal(await page.locator('.news-section .content-card-kicker').count(), 12);
      assert.equal(await page.locator('section:not(.news-section) .content-card-kicker').count(), 0);
      for (const fit of await page.locator('.content-card-media').evaluateAll(nodes => nodes.filter(n=>n.tagName==='IMG').map(n=>getComputedStyle(n).objectFit))) assert.equal(fit,'contain');
      assert.equal(await page.locator('.section-more').count(), 6);
    } finally { await page.close(); }
  }
});

test('TOP-W04: category colors follow content rather than the card index when a provider is empty', async () => {
  const page = await open();
  try {
    await page.waitForFunction(()=>document.querySelector('[data-news-cards]')?.children.length===12);
    await page.evaluate(()=>renderLatestNews({youtube:{ok:true,videos:[]}}));
    const colors = await page.locator('.news-section .content-card-kicker[data-category="NOTE"]').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundColor));
    assert.equal(colors.length, 6);
    for (const color of colors) assert.equal(color, 'rgb(204, 231, 215)');
  } finally {await page.close();}
});

test('TOP-W05: SP arrows move exactly one card, stop at the end, and preserve vertical position', async () => {
  const page = await open({width:390,height:844}, {reducedMotion:'reduce'});
  try {
    const section = page.locator('.character-section'), track = section.locator('.content-carousel-track');
    await section.scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => window.scrollY), button = section.locator('.content-carousel-next');
    assert.ok(await button.isVisible());
    assert.equal((await rect(button)).width, 44);
    await button.click();
    await page.waitForFunction(() => Math.abs(document.querySelector('.character-section .content-carousel-track').scrollLeft - 343) < 2);
    assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - y) < 1);
    await track.evaluate(n=>n.scrollTo({left:n.scrollWidth,behavior:'instant'}));
    await page.waitForFunction(() => document.querySelector('.character-section .content-carousel-next').disabled);
    assert.equal(await section.locator('.content-carousel-prev').isDisabled(), false);
  } finally { await page.close(); }
});

test('TOP-W04: reference heights and SP next-card preview fit without covering the news shadow', async () => {
  for (const width of [320,390,430,1440]) {
    const page = await open({width,height:900});
    try {
      const hero = await rect(page.locator('.hero-board'));
      if (width < 1100) assert.equal(hero.height,96);
      const news = await rect(page.locator('.news-section'));
      const character = await rect(page.locator('.character-section'));
      assert.equal(news.height,width < 1100 ? 614 : 544);
      assert.equal(character.height,width === 320 ? 680 : width < 1100 ? 646 : 614);
      if (width < 1100) {
        const track = await rect(page.locator('.character-section .content-carousel-track'));
        const next = await rect(page.locator('.character-card').nth(1));
        assert.ok(track.x + track.width - next.x >= 20,'at least 20px of next card remains visible');
      }
      const card = await rect(page.locator('.news-section .content-carousel-card').first());
      const intrusion = await page.locator('.character-section').evaluate(n=>parseFloat(getComputedStyle(n,'::after').top));
      assert.ok(card.y + card.height + 5 <= character.y + intrusion,'wave must clear the card shadow');
    } finally { await page.close(); }
  }
});

test('TOP-W03/11: JS-free built HTML retains anchors, content, metadata and one H1', async () => {
  const page = await open({width:390,height:844}, {javaScriptEnabled:false});
  try {
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://erinui.com/');
    assert.equal(await page.locator('.section-more').count(),6);
    assert.equal(await page.locator('.map-link-game').getAttribute('href'),'#game-title');
    assert.ok(await page.locator('[data-youtube-cards] a').count() >= 3);
    assert.equal(await page.locator('.game-section .content-carousel-track > *').count(),3);
    assert.equal(await page.locator('link[rel="preload"][as="image"][href*="city-checker-tile."]').count(),1);
  } finally { await page.close(); }
});

test('TOP-W03/05: map keyboard navigation, repeated anchors, history and initial hashes keep headings clear', async () => {
  const page = await open({width:390,height:844},{reducedMotion:'reduce'});
  try {
    const activate = async name => {
      const link = page.locator('.map-link-'+name);
      await link.focus(); await page.keyboard.press('Enter');
      const id = name === 'linestamp' ? 'line-stamp-title' : name+'-title';
      await page.waitForFunction(id=>document.activeElement?.id===id,id);
      assert.ok((await rect(page.locator('#'+id))).y >= 64);
    };
    await activate('game'); await activate('game'); await activate('youtube');
    await page.goBack();
    await page.waitForFunction(()=>location.hash==='#game-title');
    assert.ok((await rect(page.locator('#game-title'))).y >= 64);
    await page.goto(server.url+'/?youtubePanel=0#goods-title');
    await page.waitForFunction(()=>document.querySelector('[data-youtube-cards]')?.children.length===6);
    assert.ok((await rect(page.locator('#goods-title'))).y >= 64);
    assert.ok((await rect(page.locator('#goods-title'))).y < 110);
  } finally {await page.close();}
});

test('TOP-W03: anchor clearance follows the measured header rather than a stale inherited token', async () => {
  const page = await open({width:390,height:844},{reducedMotion:'reduce'});
  try {
    await page.locator('.site-header').evaluate(n=>n.style.height='96px');
    await page.waitForFunction(()=>getComputedStyle(document.body).getPropertyValue('--top-header-height').trim()==='96px');
    await page.locator('.map-link-game').focus(); await page.keyboard.press('Enter');
    assert.ok((await rect(page.locator('#game-title'))).y>=96);
  } finally {await page.close();}
});

test('TOP-W05: empty, single, fitting, shrinking and resized tracks retain sensible controls and focus', async () => {
  const page = await open({width:390,height:844},{reducedMotion:'reduce'});
  try {
    const track = page.locator('.character-section .content-carousel-track');
    const carousel = page.locator('.character-section .content-carousel');
    await track.evaluate(n=>window.savedCharacterCards=[...n.children].map(n=>n.cloneNode(true)));
    await track.evaluate(n=>n.replaceChildren());
    await page.waitForFunction(()=>!document.querySelector('.character-section .content-carousel').classList.contains('is-scrollable'));
    await track.evaluate(n=>n.replaceChildren(window.savedCharacterCards[0].cloneNode(true)));
    assert.equal(await carousel.locator('.content-carousel-next').isVisible(),false);
    await track.evaluate(n=>n.replaceChildren(...window.savedCharacterCards.map(n=>n.cloneNode(true))));
    await page.waitForFunction(()=>document.querySelector('.character-section .content-carousel').classList.contains('is-scrollable'));
    await track.scrollIntoViewIfNeeded();
    const last = track.locator('a').last();
    await last.focus();
    await page.waitForFunction(()=>document.querySelector('.character-section .content-carousel-next').disabled);
    const bounds = await rect(track), focused = await rect(last);
    assert.ok(focused.x >= bounds.x-1 && focused.x+focused.width <= bounds.x+bounds.width+1);
    await track.evaluate(n=>n.replaceChildren(window.savedCharacterCards[0].cloneNode(true)));
    await page.waitForFunction(()=>!document.querySelector('.character-section .content-carousel').classList.contains('is-scrollable'));
    assert.equal(await track.evaluate(n=>n.scrollLeft),0);
    await page.setViewportSize({width:1024,height:1366});
    await track.evaluate(n=>n.replaceChildren(...window.savedCharacterCards.slice(0,2).map(n=>n.cloneNode(true))));
    await page.waitForFunction(()=>!document.querySelector('.character-section .content-carousel').classList.contains('is-scrollable'));
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('.character-section .content-carousel').classList.contains('is-scrollable'));
  } finally {await page.close();}
});

test('TOP-W03: named decoration buttons retain keyboard actions and bird crossing stays linear', async () => {
  const page = await open();
  try {
    for (const [name,active,key] of [['sasuke','is-walking','Enter'],['bukurochan','is-questioning','Space']]) {
      const control = page.locator('.map-decoration-'+name);
      assert.equal(await control.getAttribute('aria-hidden'),null);
      assert.ok(await control.getAttribute('aria-label'));
      await control.focus(); await page.keyboard.press(key);
      await page.waitForFunction(([selector,active])=>document.querySelector(selector).classList.contains(active),['.map-decoration-'+name,active]);
      await page.waitForFunction(([selector,active])=>!document.querySelector(selector).classList.contains(active),['.map-decoration-'+name,active]);
    }
    assert.equal(await page.locator('.map-decoration-bird').evaluate(n=>getComputedStyle(n).animationTimingFunction),'linear');
    assert.equal(await page.locator('.map-decoration-tree-1').getAttribute('aria-hidden'),'true');
    const map = page.locator('.map-link-youtube');
    await page.evaluate(()=>showYoutubePanel(document.querySelector('.map-link-youtube'),3));
    assert.equal(await map.getAttribute('href'),'#youtube-title');
    assert.equal(await map.evaluate(n=>n.classList.contains('is-showing-stats')),true);
  } finally {await page.close();}
});

test('TOP-W02/04: failed fonts and effective 200-percent viewports remain operable', async () => {
  for (const viewport of [{width:720,height:450},{width:640,height:360},{width:1100,height:900},{width:1101,height:900}]) {
    const page = await browser.newPage({viewport,reducedMotion:'reduce'});
    try {
      await page.route('**/*',route=>new URL(route.request().url()).origin!==server.url||/\.(woff2?|ttf)(\?|$)/.test(route.request().url()) ? route.abort() : route.continue());
      await page.goto(server.url+'/?youtubePanel=0',{waitUntil:'networkidle'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
      const titles = page.locator('.section-title');
      for (const title of await titles.all()) {
        assert.ok(await title.evaluate(n=>n.scrollWidth<=n.clientWidth+1));
      }
      await page.locator('.map-link-game').focus(); await page.keyboard.press('Enter');
      assert.ok((await rect(page.locator('#game-title'))).y >= 64);
    } finally {await page.close();}
  }
});
