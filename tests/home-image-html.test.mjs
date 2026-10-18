import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyStaticImageMetadata} from '../scripts/lib/home-image-html.mjs';
import {bindingsForDocument,applyAssetBindings} from '../scripts/lib/home-assets.mjs';
import {readFile} from 'node:fs/promises';
import {htmlNodes} from '../scripts/lib/home-youtube-snapshot.mjs';

function gameImages(html) {
 const nodes=htmlNodes(html);
 const map=nodes.find(n=>n.tag==='a'&&(n.attrs.class||'').split(/\s+/).includes('map-link-game'));
 const card=nodes.find(n=>n.tag==='h3'&&html.slice(n.openEnd,n.endStart)==='ゲームをえらぶ')?.parent;
 assert.ok(map&&card);
 return {map:nodes.find(n=>n.tag==='img'&&n.parent===map),card:nodes.find(n=>n.tag==='img'&&n.parent===card)};
}

test('TOP game selection card uses the same source artwork as the map game link',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const images=gameImages(html);
 assert.equal(images.card.attrs.src,images.map.attrs.src);
 assert.ok(images.card.attrs.src.startsWith('assets/home-city/map_game.svg'));
 assert.equal(images.card.parent.attrs.href,'games/');
});

test('TOP built game selection card shares the map optimized image and keeps lazy loading',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../config/home-performance-assets.json',import.meta.url),'utf8'));
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const output=applyStaticImageMetadata(applyAssetBindings(html,'index.html',bindingsForDocument(manifest,'index.html')),'index.html',manifest);
 const images=gameImages(output);
 assert.equal(images.card.attrs.src,manifest.bindings['assets/home-city/map_game.svg']);
 assert.equal(images.card.attrs.src,images.map.attrs.src);
 assert.equal(images.card.attrs.loading,'lazy');
 assert.equal(images.card.attrs.width,images.map.attrs.width);
 assert.equal(images.card.attrs.height,images.map.attrs.height);
});

test('TOP-W07: TOP-sized character variants never replace lower-page or shared references',()=>{
 const source='assets/characters/chara_inutaro_origin.png',large='assets/versioned/large.aaaaaaaaaaaaaaaa.webp',small='assets/versioned/small.bbbbbbbbbbbbbbbb.webp';
 const manifest={bindings:{[source]:large},topImageBindings:{[source]:small}};
 const top='<img src="'+source+'">',lower='<img src="../'+source+'">';
 assert.equal(applyAssetBindings(top,'index.html',bindingsForDocument(manifest,'index.html')),'<img src="'+small+'">');
 assert.equal(applyAssetBindings(lower,'pages/characters.html',bindingsForDocument(manifest,'pages/characters.html')),'<img src="../'+large+'">');
 assert.equal(manifest.bindings[source],large);
});
test('HP-IMG-02: header-only logo never changes favicon or share-image references',()=>{
 const html='<html><head><link rel="icon" href="../assets/icon-192.png"><meta content="https://erinui.com/assets/icon-192.png"></head><body><a class="brand"><img src="../assets/icon-192.png"></a><img src="../assets/portrait.png"></body></html>';
 const manifest={headerLogo:{file:'assets/versioned/header.aaaaaaaaaaaaaaaa.webp',width:96,height:96},outputs:[{file:'assets/versioned/header.aaaaaaaaaaaaaaaa.webp',width:96,height:96}],imageDimensions:{'assets/portrait.png':{width:650,height:816}}};
 const output=applyStaticImageMetadata(html,'pages/characters.html',manifest);
 assert.ok(output.includes('href="../assets/icon-192.png"'));
 assert.ok(output.includes('content="https://erinui.com/assets/icon-192.png"'));
 assert.match(output,/<img(?=[^>]*src="\.\.\/assets\/versioned\/header\.aaaaaaaaaaaaaaaa\.webp")(?=[^>]*width="96")(?=[^>]*height="96")/);
 assert.match(output,/<img[^>]+src="\.\.\/assets\/portrait\.png"[^>]+width="650"[^>]+height="816"/);
});
