import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';

const source = await readFile(new URL('../home.js', import.meta.url), 'utf8');
const implementation = source.slice(source.indexOf('function renderLatestNews('), source.indexOf('function createLatestCard('));
function setup() {
  let cards;
  const context = {
    newsCardsTrack: {}, latestNewsContent: {},
    youtubeThumbnailUrl: video => video.thumbnail?.url || '',
    formatPublishedDate: value => value || '', formatCount: String,
    reconcileCards: (_track, specs) => { cards = specs; },
    window: {dispatchEvent() {}}, Event: class {},
  };
  runInNewContext(implementation, context);
  return content => { context.renderLatestNews(content); return cards; };
}
const item = (id, publishedAt, extra = {}) => ({id, title:id, url:`https://example.com/${id}`, publishedAt, ...extra});
const ids = cards => Array.from(cards, card => card.item.id || 'game');

test('news: all available categories merge chronologically, not one card per category', () => {
  const cards = setup()({
    youtube: {videos:[item('video-old','2026-04-01'),item('video-new','2026-10-01')]},
    note: {items:[item('note','Sun, 05 Jul 2026 20:06:15 +0900')]},
    suzuri: {items:[item('goods','2026-08-01')]},
    lineStamp: {items:[item('line','2026-06-01')]},
  });
  assert.deepEqual(ids(cards), ['video-new','goods','note','line','video-old','game']);
  assert.ok(cards.every(c => c.showCategory && !c.isMore));
});

test('news: one category can fill all twelve slots, with no AND MORE card', () => {
  const videos = Array.from({length:15}, (_, i) => item(`v${i}`, `2026-10-${String(i + 1).padStart(2,'0')}`));
  const cards = setup()({youtube:{videos}});
  assert.equal(cards.length, 12);
  assert.deepEqual(ids(cards), videos.slice(3).reverse().map(v => v.id));
  assert.ok(cards.every(c => c.category === 'YOUTUBE' && !c.isMore));
});

test('news: fewer than twelve real contents stay short and retain valid link/media metadata', () => {
  const cards = setup()({suzuri:{items:[item('goods','2026-08-01',{priceWithTax:512})]}});
  assert.equal(cards.length, 2);
  assert.equal(cards[0].meta,'512円（税込）');
  assert.equal(cards[1].openInNewTab,false);
  assert.equal(cards[1].item.url,'games/inutaro-mushi/');
});

test('news: unknown or invalid dates come last; provider retrieval time is not a publication date', () => {
  const cards = setup()({
    youtube:{fetchedAt:'2099-01-01',videos:[item('old','2022-01-01')]},
    note:{items:[item('invalid','not-a-date')]},
    lineStamp:{items:[item('undated',undefined)]},
  });
  assert.deepEqual(ids(cards),['old','game','invalid','undated']);
});

test('news: valid updatedAt takes priority, invalid updatedAt falls back to publishedAt', () => {
  const cards = setup()({note:{items:[
    item('updated','2025-01-01',{updatedAt:'2026-10-02'}),
    item('published','2026-10-01',{updatedAt:'invalid'}),
  ]}});
  assert.deepEqual(ids(cards),['updated','published','game']);
});

test('news: equal timestamps preserve source order and duplicate links appear only once', () => {
  const render = setup();
  const videos = [item('first','2026-10-01'),item('second','2026-10-01'),item('first','2026-09-01')];
  const cards = render({youtube:{videos}});
  assert.deepEqual(ids(cards),['first','second','game']);
  assert.deepEqual(ids(render({youtube:{videos}})),ids(cards));
  assert.equal(videos.length,3);
});

test('news: staggered hydration preserves other providers, empty updates remove stale entries', () => {
  const render = setup();
  render({youtube:{videos:[item('video','2026-09-01')]}});
  assert.deepEqual(ids(render({note:{items:[item('note','2026-10-01')]}})),['note','video','game']);
  assert.deepEqual(ids(render({youtube:{videos:[]}})),['note','game']);
  assert.deepEqual(ids(render({note:{items:[]}})),['game']);
});

test('news: current stored data selects twelve real cards in descending order', async () => {
  const content = {};
  for (const [provider, file] of [['youtube','youtube-latest'],['note','note-latest'],['suzuri','suzuri-latest'],['lineStamp','line-stamps']]) {
    content[provider] = JSON.parse(await readFile(new URL(`../assets/home-city/${file}.json`, import.meta.url), 'utf8'));
  }
  const cards = setup()(content);
  assert.equal(cards.length,12);
  const times = Array.from(cards, c => Date.parse(c.item.updatedAt || c.item.publishedAt));
  assert.ok(times.every(Number.isFinite));
  assert.ok(times.every((t,i) => !i || times[i-1] >= t));
  assert.equal(new Set(cards.map(c => c.item.url)).size,12);
});
