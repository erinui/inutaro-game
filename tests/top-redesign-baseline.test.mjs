import {restoreNodeSecurityChanges} from './helpers/approved-node-security-changes.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {topDataRefresh, restoreVerifiedTopDataRefresh} from './helpers/approved-top-data-refresh.mjs';
import {htmlNodes} from '../scripts/lib/home-youtube-snapshot.mjs';
import {topRedesignChanges, restoreTopRedesignChanges} from './helpers/approved-top-redesign-changes.mjs';

const hash = source => createHash('sha256').update(source).digest('hex');
const performance = JSON.parse(await readFile(new URL('./fixtures/home-performance-changes.json', import.meta.url), 'utf8'));
const baseline = JSON.parse(await readFile(new URL('./fixtures/top-redesign-baseline.json', import.meta.url), 'utf8'));
const sourceFile = file => new URL('../' + file, import.meta.url);

for (const [file, entry] of Object.entries(topDataRefresh.files)) {
  test(`TOP-W01: verified data refresh restores the exact prior acceptance bytes: ${file}`, () => {
    assert.equal(entry.beforeSha256, performance.afterHashes[file]);
    assert.equal(hash(entry.before), entry.beforeSha256);
    assert.equal(hash(entry.after), entry.afterSha256);
    assert.equal(restoreVerifiedTopDataRefresh(file, entry.after), entry.before);
    assert.equal(restoreVerifiedTopDataRefresh(file, entry.before), entry.before);
  });
}

test('TOP-W01: unrecorded generations and payload edits are never normalized', () => {
  for (const [file, entry] of Object.entries(topDataRefresh.files)) {
    const payload = JSON.parse(entry.after);
    payload.ok = false;
    const edited = JSON.stringify(payload, null, 2) + '\n';
    assert.equal(restoreVerifiedTopDataRefresh(file, edited), edited);
    assert.notEqual(hash(edited), entry.beforeSha256);
    payload.ok = true;
    payload.fetchedAt = '2099-01-01T00:00:00Z';
    const newer = JSON.stringify(payload, null, 2) + '\n';
    assert.equal(restoreVerifiedTopDataRefresh(file, newer), newer);
  }
  assert.equal(restoreVerifiedTopDataRefresh('home.js', 'unapproved edit'), 'unapproved edit');
});

test('TOP-W01: a corrupt registry cannot bypass the existing whole-file hashes', () => {
  const file = 'assets/home-city/youtube-latest.json';
  const registry = structuredClone(topDataRefresh);
  registry.files[file].before += ' ';
  assert.throws(() => restoreVerifiedTopDataRefresh(file, registry.files[file].after, registry), /registry/);
});

test('TOP-W01: recorded upstream acquisition generations retain the exact prior payload',()=>{
  for(const [file,generations] of Object.entries(topDataRefresh.verifiedGenerations||{})){
    const entry=topDataRefresh.files[file],oldDate=JSON.parse(entry.after).fetchedAt;
    for(const generation of generations){
      let source=entry.after.replace(JSON.stringify(oldDate),JSON.stringify(generation.fetchedAt));
      if(generation.youtubeViewCount){
        const value=JSON.parse(source);
        assert.equal(value.channel.statistics.viewCount,generation.youtubeViewCount.before);
        value.channel.statistics.viewCount=generation.youtubeViewCount.after;
        source=JSON.stringify(value,null,2)+'\n';
      }
      assert.equal(hash(source),generation.sha256,file);
      assert.equal(restoreVerifiedTopDataRefresh(file,source),entry.before,file);
    }
  }
});

test('TOP-W01: even a rehashed upstream acquisition record cannot authorize payload edits',()=>{
  for(const [file,generations] of Object.entries(topDataRefresh.verifiedGenerations||{})){
    if(!generations.length)continue;
    const registry=structuredClone(topDataRefresh),generation=registry.verifiedGenerations[file][0];
    const value=JSON.parse(registry.files[file].after);
    value.fetchedAt=generation.fetchedAt;
    value.ok=!value.ok;
    const source=JSON.stringify(value,null,2)+'\n';
    generation.sha256=hash(source);
    assert.throws(()=>restoreVerifiedTopDataRefresh(file,source,registry),/preserve payload/);
  }
});

test('TOP-W01: recorded view-count changes cannot authorize other counts or fields',()=>{
  const file='assets/home-city/youtube-latest.json';
  const generation=topDataRefresh.verifiedGenerations[file].find(item=>item.youtubeViewCount);
  assert.ok(generation,'reviewed upstream count generation');
  for(const mutation of ['viewCount','subscriberCount']){
    const registry=structuredClone(topDataRefresh);
    const record=registry.verifiedGenerations[file].find(item=>item.youtubeViewCount);
    const value=JSON.parse(registry.files[file].after);
    value.fetchedAt=record.fetchedAt;
    value.channel.statistics.viewCount=record.youtubeViewCount.after;
    value.channel.statistics[mutation]++;
    const source=JSON.stringify(value,null,2)+'\n';
    record.sha256=hash(source);
    assert.throws(()=>restoreVerifiedTopDataRefresh(file,source,registry),/reviewed view count|preserve payload/);
  }
});

test('TOP-W01: recorded data refreshes alter only fetchedAt and root serialization order', () => {
  assert.equal(Object.keys(topDataRefresh.files).length, 3);
  for (const entry of Object.values(topDataRefresh.files)) {
    const before = JSON.parse(entry.before), after = JSON.parse(entry.after);
    assert.match(before.fetchedAt, /^2026-10-17T/);
    assert.match(after.fetchedAt, /^2026-10-(17|18)T/);
    assert.notEqual(before.fetchedAt, after.fetchedAt);
    delete before.fetchedAt;
    delete after.fetchedAt;
    assert.deepEqual(after, before);
  }
});

test('TOP-W01: even a rehashed registry cannot authorize changed content', () => {
  const file = 'assets/home-city/youtube-latest.json';
  const registry = structuredClone(topDataRefresh);
  const entry = registry.files[file], payload = JSON.parse(entry.before);
  payload.ok = false;
  entry.before = JSON.stringify(payload, null, 2) + '\n';
  entry.beforeSha256 = hash(entry.before);
  assert.throws(() => restoreVerifiedTopDataRefresh(file, entry.after, registry), /preserve payload/);
});

test('TOP-W01: pre-redesign source hashes require explicit adoption before any source edit', async () => {
  assert.equal(baseline.baselineCommit, '8f7563cfcefe7109a1e915fd3d0cf55eb6d34f61');
  assert.equal(Object.keys(baseline.sourceHashes).length, 8);
  for (const [file, expected] of Object.entries(baseline.sourceHashes)) {
    assert.equal(hash(restoreTopRedesignChanges(file,await readFile(sourceFile(file),'utf8'))), expected, file);
  }
});

test('TOP-W01/08: only the exact reviewed TOP generation crosses the previous acceptance boundary', async () => {
  for (const [file,expected] of Object.entries(topRedesignChanges.beforeHashes)) {
    const source = await readFile(sourceFile(file),'utf8');
    assert.equal(hash(restoreTopRedesignChanges(file,source)),expected,file);
    const unknown = source + '\n/* unknown change */';
    assert.equal(restoreTopRedesignChanges(file,unknown),unknown);
    const broken = structuredClone(topRedesignChanges);
    broken.beforeHashes[file] = '0'.repeat(64);
    assert.throws(()=>restoreTopRedesignChanges(file,source,broken),/restoration/);
  }
});

test('TOP-W01: lower pages, game, collectors and deployment contracts remain protected', async () => {
  assert.equal(Object.keys(baseline.protectedHashes).length, 19);
  for (const [file, expected] of Object.entries(baseline.protectedHashes)) {
    const bytes=await readFile(sourceFile(file));
    const secured=restoreNodeSecurityChanges(file,bytes.toString());
    const restored=file.endsWith('.html')?restoreTopRedesignChanges(file,secured):secured;
    assert.equal(hash(restored), expected, file);
  }
});

test('TOP-W01: original art, icons and original font bytes remain unchanged', async () => {
  assert.equal(Object.keys(baseline.originalAssetHashes).length, 28);
  for (const [file, expected] of Object.entries(baseline.originalAssetHashes)) {
    assert.equal(hash(await readFile(sourceFile(file))), expected, file);
  }
});

test('TOP-W01: all prior generated outputs remain available under their original hashes', async () => {
  const manifest = JSON.parse(await readFile(sourceFile('config/home-performance-assets.json'), 'utf8'));
  const outputs = new Map(manifest.outputs.map(entry => [entry.file, entry.sha256]));
  assert.equal(Object.keys(baseline.retainedOutputHashes).length, 168);
  for (const [file, expected] of Object.entries(baseline.retainedOutputHashes)) {
    assert.equal(outputs.get(file), expected, file + ': retained manifest entry');
    assert.equal(hash(await readFile(sourceFile(file))), expected, file);
  }
});

test('TOP-W01: deterministic data fixtures retain five providers without freezing future live data', () => {
  assert.equal(Object.keys(baseline.dataFixtures).length, 5);
  for (const [file, fixture] of Object.entries(baseline.dataFixtures)) {
    assert.match(fixture.sourceSha256, /^[a-f0-9]{64}$/, file);
    assert.equal(hash(JSON.stringify(fixture.data)), fixture.canonicalSha256, file);
  }
  assert.equal(baseline.dataFixtures['assets/home-city/youtube-latest.json'].data.schemaVersion, 2);
  assert.equal(baseline.dataFixtures['assets/home-city/youtube-latest.json'].data.videos.length, 6);
});

test('TOP-W01: six adopted destinations already have unique H2 targets; original eight links are recorded', async () => {
  const nodes = htmlNodes(await readFile(sourceFile('index.html'), 'utf8'));
  assert.equal(Object.keys(baseline.targetMapLinks).length, 6);
  assert.equal(baseline.originalMapLinks.length, 8);
  for (const [name, target] of Object.entries(baseline.targetMapLinks)) {
    assert.equal(nodes.filter(n => n.tag === 'h2' && n.attrs.id === target).length, 1, target);
    assert.equal(nodes.filter(n => n.tag === 'a' && (n.attrs.class || '').split(/\s/).includes(name)).length, 1, name);
  }
  assert.equal(baseline.goodsPositionDecision.humanChoice, 'PC main frame');
  assert.equal(baseline.goodsPositionDecision.liveSynced, false);
});
