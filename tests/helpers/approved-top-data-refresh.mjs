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
  // Only this recorded byte generation may cross into the older acceptance baseline.
  if (!entry || hash(source) !== entry.afterSha256) return source;
  assert.equal(hash(entry.after), entry.afterSha256, `${file}: data refresh registry after hash`);
  assert.equal(hash(entry.before), entry.beforeSha256, `${file}: data refresh registry before hash`);
  const before = JSON.parse(entry.before), after = JSON.parse(entry.after);
  assert.equal(typeof before.fetchedAt, 'string', `${file}: registry before fetchedAt`);
  assert.equal(typeof after.fetchedAt, 'string', `${file}: registry after fetchedAt`);
  delete before.fetchedAt;
  delete after.fetchedAt;
  assert.deepEqual(after, before, `${file}: registry must preserve payload values`);
  return entry.before;
}
