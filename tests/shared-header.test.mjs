import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {htmlNodes} from '../scripts/lib/home-youtube-snapshot.mjs';
import {applyAssetBindings,bindingsForDocument} from '../scripts/lib/home-assets.mjs';
import {applyStaticImageMetadata} from '../scripts/lib/home-image-html.mjs';

const spec=JSON.parse(await readFile(new URL('./fixtures/site-design.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('../config/home-performance-assets.json',import.meta.url),'utf8'));
function brandImage(html){
 const nodes=htmlNodes(html),brand=nodes.find(n=>n.tag==='a'&&n.attrs.class==='brand');
 return nodes.find(n=>n.tag==='img'&&n.parent===brand);
}
for(const {path:file} of spec.pages){
 test(`HEADER-01: shared source and built logo: ${file}`,async()=>{
  const html=await readFile(new URL('../'+file,import.meta.url),'utf8'),image=brandImage(html);
  assert.ok(image);
  assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(file),image.attrs.src)),'assets/characters/chara_inutaro_origin.png');
  assert.equal(image.attrs.width,'465');
  assert.equal(image.attrs.height,'868');
  assert.equal(image.attrs.alt,'');
  const output=applyStaticImageMetadata(applyAssetBindings(html,file,bindingsForDocument(manifest,file)),file,manifest);
  const built=brandImage(output);
  assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(file),built.attrs.src)),manifest.topImageBindings['assets/characters/chara_inutaro_origin.png']);
  if(file==='pages/characters.html'){
   const nodes=htmlNodes(output),profile=nodes.find(n=>n.tag==='img'&&n.attrs.alt==='犬タロー オリジン');
   assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(file),profile.attrs.src)),manifest.bindings['assets/characters/chara_inutaro_origin.png']);
   assert.notEqual(profile.attrs.src,built.attrs.src,'The full character profile keeps the large image');
  }
 });
}
test('HEADER-02: header geometry and mobile overrides are shared, not TOP-only',async()=>{
 const css=await readFile(new URL('../home.css',import.meta.url),'utf8');
 const shared=css.slice(css.indexOf('/* Shared site header:'));
 assert.ok(shared.startsWith('/* Shared site header:'));
 for(const selector of ['.site-header','.brand','.brand img','.site-nav','.site-nav a']){
  assert.ok(shared.includes(`body.city-home ${selector},\nbody:not(.city-home) ${selector} {`),selector);
 }
 assert.ok(shared.includes('height: 72px;'));
 assert.ok(shared.includes('@media (max-width: 760px)'));
 assert.ok(shared.includes('height: 64px;'));
});
