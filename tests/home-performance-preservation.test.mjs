import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {sha256} from '../scripts/lib/home-assets.mjs';
import {homePerformanceChanges,restoreHomePerformanceChanges} from './helpers/approved-home-performance-changes.mjs';
test('HP-REG-01: approved fragments restore every changed source to P0 without replacing old baselines',async()=>{
 for(const [file,hash] of Object.entries(homePerformanceChanges.beforeHashes)){
  const source=await readFile(new URL('../'+file,import.meta.url),'utf8');
  assert.equal(sha256(source),homePerformanceChanges.afterHashes[file],file);
  assert.equal(sha256(restoreHomePerformanceChanges(file,source)),hash,file);
 }
});
