import {restoreHardeningChanges} from './approved-hardening-changes.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sha256} from '../../scripts/lib/home-assets.mjs';
const registry = JSON.parse(await readFile(new URL('../fixtures/node-security-changes.json', import.meta.url), 'utf8'));
export function restoreNodeSecurityChanges(file, source) {
  source=restoreHardeningChanges(file,source);
  if (sha256(source) !== registry.afterHashes[file]) return source;
  for (const change of registry.changes.filter(item => item.file === file)) {
    assert.equal(source.split(change.after).length - 1, change.count, `${file}: security fragment count`);
    source = source.replace(change.after, change.before);
  }
  assert.equal(sha256(source), registry.beforeHashes[file], `${file}: pre-security restoration`);
  return source;
}
