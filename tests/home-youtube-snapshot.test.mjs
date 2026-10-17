import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createYoutubeSnapshot} from '../scripts/lib/home-youtube-snapshot.mjs';
const fixture=`<!doctype html><html><head><script type="application/ld+json">{"name":"preserved"}</script></head><body>
<a class="map-link-youtube" href="https://www.youtube.com/channel/original"><img data-latest-video-index="0" class="youtube-thumb is-active" src="old-1.jpg"><img data-latest-video-index="1" class="youtube-thumb" src="old-2.jpg"></a>
<div data-youtube-cards><a data-latest-video-index="0" href="old"><img class="content-card-media" src="old.jpg"><h3>旧題名</h3></a><a data-latest-video-index="1" href="old"><img src="old-2.jpg"><h3>旧題名</h3></a></div>
<p id="preserved">本文 &amp; 固定文言</p></body></html>`;
const data={schemaVersion:2,ok:true,channel:{statistics:{}},videos:[0,1].map(i=>({id:`v${i}`,title:i?'次の動画':'題名 <script>alert(1)</script> "引用"',url:`https://www.youtube.com/watch?v=v${i}`,localThumbnail:{url:`assets/home-city/youtube-thumb-v${i}-${'a'.repeat(16)}.webp`,sha256:'a'.repeat(64),width:640,height:360}}))};
test('HP-T07: snapshot uses matching local images, escapes text and keeps the map channel link',()=>{
 const result=createYoutubeSnapshot(fixture,data);
 assert.match(result,/data-youtube-snapshot="[a-f0-9]{64}"/);
 assert.ok(result.includes('href="https://www.youtube.com/channel/original"'));
 assert.ok(result.includes('題名 &lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(!result.includes('<script>alert(1)</script>'));
 assert.ok(result.includes('<p id="preserved">本文 &amp; 固定文言</p>'));
 assert.ok(result.includes('data-src="assets/home-city/youtube-thumb-v1-'));
 assert.ok(!result.includes('src="old'));
});
test('HP-T07: unknown video/image identity is rejected instead of reusing an unrelated thumbnail',()=>{
 const bad=structuredClone(data);bad.videos[0].localThumbnail.url='assets/home-city/youtube-thumb-v1-'+ 'a'.repeat(16)+'.webp';
 assert.throws(()=>createYoutubeSnapshot(fixture,bad),/thumbnail/i);
});
test('HP-T07: empty snapshots keep a generic channel link and do not label stale images as current videos',()=>{
 const result=createYoutubeSnapshot(fixture,{...data,videos:[]});
 assert.ok(!result.includes('old.jpg'));assert.ok(!result.includes('旧題名'));
 assert.ok(result.includes('YouTubeでみる'));
});

test('HP-T07: zero/one/three/five/six snapshots expose only available static cards',async()=>{
 const {readFile}=await import('node:fs/promises');const {htmlNodes}=await import('../scripts/lib/home-youtube-snapshot.mjs');
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 for(const count of [0,1,3,5,6]){
  const videos=Array.from({length:count},(_,i)=>({...data.videos[0],id:`v${i}`,url:`https://www.youtube.com/watch?v=v${i}`,localThumbnail:{...data.videos[0].localThumbnail,url:`assets/home-city/youtube-thumb-v${i}-${'a'.repeat(16)}.webp`}}));
  const nodes=htmlNodes(createYoutubeSnapshot(html,{...data,videos})),track=nodes.find(n=>'data-youtube-cards' in n.attrs);
  assert.equal(nodes.filter(n=>n.tag==='a'&&n.parent===track).length,Math.max(1,Math.min(3,count)),`static count ${count}`);
 }
});

test('HP-REVIEW-03: v2 image metadata is required for videos beyond the three static slots too',()=>{
 const videos=Array.from({length:6},(_,i)=>({...data.videos[0],id:`v${i}`,url:`https://www.youtube.com/watch?v=v${i}`,localThumbnail:{...data.videos[0].localThumbnail,url:`assets/home-city/youtube-thumb-v${i}-${'a'.repeat(16)}.webp`}}));
 videos[5].thumbnail={url:'https://i.ytimg.com/v6.jpg'};delete videos[5].localThumbnail;
 assert.throws(()=>createYoutubeSnapshot(fixture,{...data,videos}),/Missing local thumbnail/);
});
