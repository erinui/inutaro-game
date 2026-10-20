import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {htmlNodes} from '../scripts/lib/home-youtube-snapshot.mjs';

const read = file => readFile(new URL('../'+file,import.meta.url),'utf8');
const removed = ['game-meta','game-status','character-profile-tags'];

test('LABEL-01: remove supplemental and status badges from lower-page source and keep meaningful content',async()=>{
 for(const file of ['games/index.html','pages/characters.html']){
  const source=await read(file),nodes=htmlNodes(source);
  assert.equal(nodes.filter(n=>(n.attrs.class||'').split(/\s+/).some(c=>removed.includes(c))).length,0,file);
  assert.equal(nodes.filter(n=>n.tag==='h1').length,1,file);
 }
 const games=await read('games/index.html');
 assert.ok(games.includes('40秒のアクションゲームです。'));
 assert.ok(games.includes('公開されたらここから選べるようになります。'));
 assert.equal(htmlNodes(games).filter(n=>n.tag==='a'&&n.attrs.href==='inutaro-mushi/').length,2);
 const characters=htmlNodes(await read('pages/characters.html'));
 assert.equal(characters.filter(n=>n.tag==='article'&&n.attrs.id?.startsWith('character-')).length,5);
 assert.equal(characters.filter(n=>n.tag==='h2').length,5);
});

test('LABEL-02: remove obsolete badge styles but retain TOP news category labels',async()=>{
 const css=await read('home.css');
 for(const name of removed)assert.ok(!css.includes('.'+name),name);
 assert.ok(css.includes('body.city-home .content-card-kicker {'));
 const nodes=htmlNodes(await read('index.html'));
 const labels=nodes.filter(n=>(n.attrs.class||'').split(/\s+/).includes('content-card-kicker'));
 assert.equal(labels.length,3);
 for(const label of labels){
  let section=label.parent;
  while(section&&section.tag!=='section')section=section.parent;
  assert.ok(section?.attrs.class?.split(/\s+/).includes('news-section'));
 }
 const js=await read('home.js');
 assert.ok(js.includes('showCategory:true'));
 assert.ok(js.includes('showCategory = false'));
});
