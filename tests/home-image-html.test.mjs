import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyStaticImageMetadata} from '../scripts/lib/home-image-html.mjs';
test('HP-IMG-02: header-only logo never changes favicon or share-image references',()=>{
 const html='<html><head><link rel="icon" href="../assets/icon-192.png"><meta content="https://erinui.com/assets/icon-192.png"></head><body><a class="brand"><img src="../assets/icon-192.png"></a><img src="../assets/portrait.png"></body></html>';
 const manifest={headerLogo:{file:'assets/versioned/header.aaaaaaaaaaaaaaaa.webp',width:96,height:96},outputs:[{file:'assets/versioned/header.aaaaaaaaaaaaaaaa.webp',width:96,height:96}],imageDimensions:{'assets/portrait.png':{width:650,height:816}}};
 const output=applyStaticImageMetadata(html,'pages/characters.html',manifest);
 assert.ok(output.includes('href="../assets/icon-192.png"'));
 assert.ok(output.includes('content="https://erinui.com/assets/icon-192.png"'));
 assert.match(output,/<img(?=[^>]*src="\.\.\/assets\/versioned\/header\.aaaaaaaaaaaaaaaa\.webp")(?=[^>]*width="96")(?=[^>]*height="96")/);
 assert.match(output,/<img[^>]+src="\.\.\/assets\/portrait\.png"[^>]+width="650"[^>]+height="816"/);
});
