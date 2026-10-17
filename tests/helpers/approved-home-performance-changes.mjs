import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sha256} from '../../scripts/lib/home-assets.mjs';
export const homePerformanceChanges=JSON.parse(await readFile(new URL('../fixtures/home-performance-changes.json',import.meta.url),'utf8'));
export function restoreHomePerformanceChanges(file,source){
  if(sha256(source)!==homePerformanceChanges.afterHashes[file])return source;
  for(const change of homePerformanceChanges.changes.filter(c=>c.file===file)){
    assert.equal(source.split(change.after).length-1,change.count,`${file}: approved performance fragment count`);
    source=source.replace(change.after,change.before);
  }
  assert.equal(sha256(source),homePerformanceChanges.beforeHashes[file],`${file}: P0 restoration`);
  return source;
}
