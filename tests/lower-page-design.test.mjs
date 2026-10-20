import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {htmlNodes} from '../scripts/lib/home-youtube-snapshot.mjs';
import {restoreTopRedesignChanges} from './helpers/approved-top-redesign-changes.mjs';

const spec=JSON.parse(await readFile(new URL('./fixtures/lower-page-design.json',import.meta.url),'utf8'));
for(const [file,label] of Object.entries(spec.removedEyebrows)){
 test(`LOWER-01: remove only redundant labels and retain all other body markup: ${file}`,async()=>{
  const source=await readFile(new URL('../'+file,import.meta.url),'utf8');
  const baseline=restoreTopRedesignChanges(file,source);
  const expected=baseline.replace('<img src="../assets/icon-192.png?v=20260616-icon" alt="" />','<img src="../assets/characters/chara_inutaro_origin.png" width="465" height="868" alt="" />')
   .replace(`        <p class="eyebrow">${label}</p>\n`,'')
   .replace('              <span class="thumb-badge">あそべる</span>\n','')
   .replace('              <div class="game-meta">\n                <span>Coming soon</span>\n              </div>\n','')
   .replace('              <img src="../assets/icon-192.png?v=20260616-icon" alt="" />','              <img src="../assets/games/inutaro-mushi/gameplay-preview.png?v=20260804-gameplay" width="1200" height="675" alt="犬タローが虫さんを捕まえようとジャンプしているゲーム画面" decoding="async" />');
  assert.equal(source,expected);
  const nodes=htmlNodes(source);
  assert.equal(nodes.filter(n=>(n.attrs.class||'').split(/\s+/).some(c=>['eyebrow','thumb-badge'].includes(c))).length,0);
  assert.equal(nodes.filter(n=>n.tag==='h1').length,1);
  if(file==='games/index.html'){
   assert.ok(source.includes('<p class="game-status">公開中</p>'));
   assert.ok(source.includes('<p class="game-status">準備中</p>'));
   assert.ok(!source.includes('Coming soon'));
  }
 });
}
test('LOWER-02: no circular backgrounds or decorative rotation remain in lower-page rules',async()=>{
 const css=await readFile(new URL('../home.css',import.meta.url),'utf8');
 const lower=css.slice(css.indexOf('body:not(.city-home) {'),css.indexOf('/* TOP v2 content'));
 assert.ok(!lower.includes('radial-gradient('));
 assert.ok(!lower.includes('rotate('));
 assert.ok(!lower.includes('.eyebrow'));
 assert.ok(!lower.includes('.thumb-badge'));
 assert.ok(lower.includes('background: var(--profile-bg);'));
 assert.ok(css.includes('body:not(.city-home)::before {'));
 assert.ok(css.includes(`background: url("${spec.pattern}") 0 0 / ${spec.patternSize} repeat;`));
});
