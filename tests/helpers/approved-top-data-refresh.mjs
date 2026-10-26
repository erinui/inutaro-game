import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const topDataRefresh = JSON.parse(await readFile(new URL('../fixtures/top-redesign-data-refresh.json', import.meta.url), 'utf8'));
const hash = source => createHash('sha256').update(source).digest('hex');
const dataFiles = new Set([
  'assets/home-city/youtube-latest.json',
  'assets/home-city/note-latest.json',
  'assets/home-city/suzuri-latest.json',
]);

export function restoreVerifiedTopDataRefresh(file, source, registry = topDataRefresh) {
  if (!dataFiles.has(file)) return source;
  const entry = registry.files[file];
  const digest=hash(source);
  const generation=registry.verifiedGenerations?.[file]?.find(item=>item.sha256===digest);
  // Accept only recorded byte generations; never normalize arbitrary live data.
  if (!entry || (digest !== entry.afterSha256 && !generation)) return source;
  assert.equal(hash(entry.after), entry.afterSha256, `${file}: data refresh registry after hash`);
  assert.equal(hash(entry.before), entry.beforeSha256, `${file}: data refresh registry before hash`);
  const before = JSON.parse(entry.before), after = JSON.parse(source);
  if(generation){
    assert.match(generation.commit,/^[a-f0-9]{40}$/);
    assert.equal(after.fetchedAt,generation.fetchedAt,`${file}: recorded acquisition timestamp`);
    for(const change of generation.reviewedPayloadChanges||[]){
      const allowed=file.includes('youtube')?[['videos'],['channel','statistics']]:[['items']];
      assert.ok(allowed.some(p=>JSON.stringify(p)===JSON.stringify(change.path)),`${file}: explicit upstream payload only`);
      let a=after,b=before;for(const key of change.path.slice(0,-1)){a=a[key];b=b[key];}const key=change.path.at(-1);
      assert.deepEqual(b[key],change.before,`${file}: reviewed upstream before`);
      assert.deepEqual(a[key],change.after,`${file}: reviewed upstream after`);
      a[key]=structuredClone(change.before);
    }
    if(generation.youtubeViewCount){
      assert.equal(file,'assets/home-city/youtube-latest.json');
      const count=generation.youtubeViewCount;
      assert.ok(Number.isSafeInteger(count.after)&&count.after>=count.before,`${file}: reviewed view count`);
      assert.equal(before.channel.statistics.viewCount,count.before,`${file}: reviewed view count before`);
      assert.equal(after.channel.statistics.viewCount,count.after,`${file}: reviewed view count after`);
      after.channel.statistics.viewCount=count.before;
    }
  }
  assert.equal(typeof before.fetchedAt, 'string', `${file}: registry before fetchedAt`);
  assert.equal(typeof after.fetchedAt, 'string', `${file}: registry after fetchedAt`);
  delete before.fetchedAt;
  delete after.fetchedAt;
  assert.deepEqual(after, before, `${file}: registry must preserve payload values`);
  return entry.before;
}
