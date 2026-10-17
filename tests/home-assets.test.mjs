import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sha256, rewriteCss, rewriteJsAssetUrls, validateAssetManifest, applyAssetBindings } from '../scripts/lib/home-assets.mjs';

test('HP-BUILD-01: JS cards use the same static optimized image URL as initial HTML',()=>{
 const source='const image="assets/games/preview.png?v=old"; const data="assets/home-city/youtube-latest.json";';
 assert.equal(rewriteJsAssetUrls(source,{'assets/games/preview.png':'assets/versioned/preview.aaaaaaaaaaaaaaaa.webp'}),'const image="assets/versioned/preview.aaaaaaaaaaaaaaaa.webp"; const data="assets/home-city/youtube-latest.json";');
});

test('HP-BUILD-01: moving CSS preserves relative images and rewrites only selected images', () => {
  const css='a{background:url("assets/home-city/map_bg.svg?v=old")} @font-face{src:url(assets/fonts/font.woff2)}';
  assert.equal(rewriteCss(css,'home.css','assets/versioned/home.hash.css',{'assets/fonts/font.woff2':'assets/versioned/font.hash.woff2'}),
    'a{background:url("../home-city/map_bg.svg?v=old")} @font-face{src:url(font.hash.woff2)}');
});
test('HP-BUILD-01: document-relative bindings work under pages, game and GitHub subpaths', () => {
  const source='<link href="../home.css?v=old"><img src="../assets/old.png" width="1">';
  assert.equal(applyAssetBindings(source,'pages/a.html',{'home.css':'assets/versioned/home.hash.css','assets/old.png':'assets/versioned/new.hash.webp'}),
    '<link href="../assets/versioned/home.hash.css"><img src="../assets/versioned/new.hash.webp" width="1">');
});

test('HP-BUILD-01: missing, corrupt and stale outputs fail; retained old assets do not require current source hashes', async t => {
  const root=await mkdtemp(path.join(os.tmpdir(),'erinui-assets-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(path.join(root,'assets/versioned'),{recursive:true});
  await writeFile(path.join(root,'home.js'),'new source');
  const bytes=Buffer.from('generated'); const hash=sha256(bytes);
  const file=`assets/versioned/home.${hash.slice(0,16)}.js`;
  await writeFile(path.join(root,file),bytes);
  const entry={file,sha256:hash,sources:{'home.js':sha256('new source')}};
  const manifest={version:1,bindings:{'home.js':file},outputs:[entry]};
  assert.deepEqual(await validateAssetManifest(root,manifest),[file]);
  await writeFile(path.join(root,'home.js'),'changed source');
  await assert.rejects(validateAssetManifest(root,manifest),/stale/);
  assert.deepEqual(await validateAssetManifest(root,{...manifest,bindings:{}}),[file]);
  await writeFile(path.join(root,file),'tampered');
  await assert.rejects(validateAssetManifest(root,manifest),/hash/);
  await rm(path.join(root,file));
  await assert.rejects(validateAssetManifest(root,manifest),/missing/);
});
test('HP-BUILD-01: manifests cannot select secrets or escape the versioned directory', async () => {
  for(const file of ['.env.local','../secret','assets/versioned/../../.env.local']) {
    await assert.rejects(validateAssetManifest('.', {version:1,bindings:{},outputs:[{file,sha256:'a'.repeat(64),sources:{}}]}),/path/);
  }
});
