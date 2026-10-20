import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {htmlNodes} from '../scripts/lib/home-youtube-snapshot.mjs';
import {applyAssetBindings,bindingsForDocument} from '../scripts/lib/home-assets.mjs';
import {applyStaticImageMetadata} from '../scripts/lib/home-image-html.mjs';

test('GAME-CARD-01: game listing reuses TOP gameplay artwork and keeps both playable links',async()=>{
 const html=await readFile(new URL('../games/index.html',import.meta.url),'utf8');
 const top=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const nodes=htmlNodes(html),image=nodes.find(n=>n.tag==='img'&&n.parent?.attrs.class==='game-thumb');
 const reference=htmlNodes(top).find(n=>n.tag==='img'&&n.attrs.src?.includes('gameplay-preview'));
 assert.equal(path.posix.normalize(path.posix.join('games',image.attrs.src)),reference.attrs.src);
 assert.equal(image.attrs.alt,reference.attrs.alt);
 assert.equal(image.attrs.width,'1200');
 assert.equal(image.attrs.height,'675');
 const cards=nodes.filter(n=>n.tag==='article'&&(n.attrs.class||'').split(/\s+/).includes('game-card'));
 assert.equal(cards.length,2);
 assert.deepEqual(nodes.filter(n=>n.tag==='a'&&n.attrs.href==='inutaro-mushi/').map(n=>n.attrs.class),['game-thumb','card-button']);
 const next=cards.find(n=>n.attrs.class.includes('is-coming'));
 assert.ok(!nodes.some(n=>n.tag==='a'&&n.start>next.start&&n.end<next.end),'Upcoming game remains non-interactive');
 const manifest=JSON.parse(await readFile(new URL('../config/home-performance-assets.json',import.meta.url),'utf8'));
 const built=applyStaticImageMetadata(applyAssetBindings(html,'games/index.html',bindingsForDocument(manifest,'games/index.html')),'games/index.html',manifest);
 const output=htmlNodes(built).find(n=>n.tag==='img'&&n.parent?.attrs.class==='game-thumb');
 assert.equal(path.posix.normalize(path.posix.join('games',output.attrs.src)),manifest.bindings['assets/games/inutaro-mushi/gameplay-preview.png']);
});

test('GAME-CARD-02: listing and TOP share card surface tokens; image proportions stay responsive',async()=>{
 const css=await readFile(new URL('../home.css',import.meta.url),'utf8');
 const game=css.slice(css.indexOf('body:not(.city-home) .game-card {'),css.indexOf('body:not(.city-home) .content-page {'));
 const top=css.slice(css.indexOf('body.city-home :is(.content-carousel-card, .character-card) {'),css.indexOf('body.city-home .content-card-media {'));
 for(const token of ['card-border','card-radius','card-shadow','card-padding']){
  assert.ok(game.includes(`var(--${token})`),token);
  assert.ok(top.includes(`var(--${token})`),token);
 }
 assert.ok(game.includes('aspect-ratio: 16 / 9;'));
 assert.ok(game.includes('object-fit: contain;'));
 assert.ok(!game.includes('190px'));
 assert.ok(css.includes('@media (max-width: 700px)'));
});
