import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyStaticImageMetadata} from '../scripts/lib/home-image-html.mjs';
import {bindingsForDocument,applyAssetBindings} from '../scripts/lib/home-assets.mjs';

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
