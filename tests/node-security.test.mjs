import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assertNodeVersion} from '../scripts/check-node-version.mjs';
import {restoreNodeSecurityChanges} from './helpers/approved-node-security-changes.mjs';

test('Node security baseline accepts patched 24.x and rejects old or other release lines', () => {
  for (const version of ['20.20.2', '25.8.2', '24.22.0', '24.21.9', '22.23.4']) {
    assert.throws(() => assertNodeVersion(version), /Unsupported Node.js/);
  }
  for (const version of ['24.22.1', '24.22.2', '24.23.0']) assert.equal(assertNodeVersion(version), version);
});

test('Node security baseline rejects prerelease, malformed and unsafe numeric versions', () => {
  for (const version of ['24.23.0-rc.1', '24.23.0-extra', '24.23', '24.23.9007199254740992', 'v24.22.1']) {
    assert.throws(() => assertNodeVersion(version), /Unsupported Node.js/);
  }
});

test('Node security approval restores original source bytes and rejects additional changes', async () => {
  const registry = JSON.parse(await readFile(new URL('./fixtures/node-security-changes.json', import.meta.url), 'utf8'));
  for (const [file, expected] of Object.entries(registry.beforeHashes)) {
    const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    assert.equal(createHash('sha256').update(restoreNodeSecurityChanges(file, source)).digest('hex'), expected);
    const unknown = source + '\n// unrelated change';
    assert.equal(restoreNodeSecurityChanges(file, unknown), unknown);
  }
});
