import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {sha256} from '../scripts/lib/home-assets.mjs';
const root = new URL('../', import.meta.url);
test('TOP-W06: production pattern retains all ten original images and one logical period', async () => {
  const bytes = await readFile(new URL('assets/home-city/city-checker-tile.svg',root));
  assert.equal(sha256(bytes), 'e838b97c659cc84a53aa49680ef35889ffdc86246695094388072914df1131e6');
  const svg = bytes.toString();
  const images = [...svg.matchAll(/<image id="IMG_(\d+)_/g)].map(m=>m[1]);
  assert.equal(images.length,20);
  assert.equal(new Set(images).size,10);
  for (const id of new Set(images)) assert.equal(images.filter(value=>value===id).length,2);
  const css = await readFile(new URL('home.css',root),'utf8');
  assert.ok(css.includes('/ 960px 384px repeat'));
  assert.ok(css.includes('opacity: 0.07'));
  assert.ok(css.includes('opacity: 0.11'));
});
test('TOP-W07: enlarged map assets meet capped DPR2 size and retain old outputs', async () => {
  const manifest = JSON.parse(await readFile(new URL('config/home-performance-assets.json',root),'utf8'));
  const baseline = JSON.parse(await readFile(new URL('tests/fixtures/top-redesign-baseline.json',root),'utf8'));
  const sources = [['game',235.269089],['goods',245.031296]];
  for (const [name,width] of sources) {
    const asset = manifest.outputs.find(e=>e.file===manifest.bindings[`assets/home-city/map_${name}.svg`]);
    assert.ok(asset.width >= Math.ceil(width / 780 * 960 * 2));
    assert.equal(sha256(await readFile(new URL(asset.file,root))), asset.sha256);
  }
  const pattern = manifest.outputs.find(e=>e.file===manifest.bindings['assets/home-city/city-checker-tile.svg']);
  assert.equal(pattern.width,1920); assert.equal(pattern.height,768);
  for (const [file,hash] of Object.entries(baseline.retainedOutputHashes)) {
    assert.equal(manifest.outputs.find(e=>e.file===file)?.sha256,hash);
    assert.equal(sha256(await readFile(new URL(file,root))),hash);
  }
});

test('TOP-W07: all five TOP character variants meet DPR2 height without changing shared bindings', async () => {
  const manifest = JSON.parse(await readFile(new URL('config/home-performance-assets.json',root),'utf8'));
  assert.equal(Object.keys(manifest.topImageBindings).length,5);
  for (const [source,file] of Object.entries(manifest.topImageBindings)) {
    const asset = manifest.outputs.find(e=>e.file===file);
    assert.equal(asset.kind,'top-character');
    assert.equal(asset.height,524);
    assert.ok(asset.bytes<100000);
    assert.equal(asset.sources[source],sha256(await readFile(new URL(source,root))));
    assert.equal(sha256(await readFile(new URL(file,root))),asset.sha256);
    assert.notEqual(manifest.bindings[source],file);
    assert.equal(manifest.outputs.find(e=>e.file===manifest.bindings[source]).kind,'static-image');
  }
});
