import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sha256} from '../../scripts/lib/home-assets.mjs';

export const topRedesignChanges = JSON.parse(await readFile(new URL('../fixtures/top-redesign-changes.json',import.meta.url),'utf8'));
export function restoreTopRedesignChanges(file, source, registry = topRedesignChanges) {
  if (sha256(source) !== registry.afterHashes[file]) return source;
  for (const change of registry.changes.filter(c => c.file === file)) {
    assert.equal(source.split(change.after).length - 1, change.count, `${file}: reviewed TOP fragment count`);
    source = source.replace(change.after, change.before);
  }
  assert.equal(sha256(source), registry.beforeHashes[file], `${file}: pre-TOP restoration`);
  return source;
}
