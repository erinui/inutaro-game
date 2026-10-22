import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,access,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const execute = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/deploy-cloudflare.sh', import.meta.url));

async function fakeTools(run) {
  const directory = await mkdtemp(path.join(tmpdir(), 'inutaro-runtime-test-'));
  const sentinel = path.join(directory, 'executed');
  const downloadSentinel = path.join(directory, 'downloaded');
  try {
    const tools = {
      curl: '#!/bin/bash\ntouch "$BOOTSTRAP_DOWNLOAD_SENTINEL"\nwhile [[ $# -gt 0 ]]; do if [[ "$1" == "--output" ]]; then printf corrupt > "$2"; exit 0; fi; shift; done\nexit 1\n',
      tar: '#!/bin/bash\ntouch "$BOOTSTRAP_SENTINEL"\nexit 1\n',
      node: '#!/bin/bash\ntouch "$BOOTSTRAP_SENTINEL"\nexit 1\n',
      npx: '#!/bin/bash\ntouch "$BOOTSTRAP_SENTINEL"\nexit 1\n',
    };
    for (const [name, source] of Object.entries(tools)) {
      await writeFile(path.join(directory, name), source);
      await chmod(path.join(directory, name), 0o700);
    }
    await run({env: {...process.env, PATH: directory + ':' + process.env.PATH, BOOTSTRAP_SENTINEL: sentinel, BOOTSTRAP_DOWNLOAD_SENTINEL: downloadSentinel}}, downloadSentinel);
    await assert.rejects(access(sentinel), {code: 'ENOENT'});
  } finally { await rm(directory, {recursive: true, force: true}); }
}

test('Runtime bootstrap rejects corrupt downloads before extraction or execution', async () => {
  await fakeTools(async options => {
    await assert.rejects(execute('bash', [script, '--verify-only'], options), error => {
      assert.match(error.stderr, /checksum mismatch/);
      return true;
    });
  });
});

test('Runtime bootstrap rejects all unexpected arguments before downloading or deploying', async () => {
  for (const args of [['--unknown'], ['--verify-only', '--unknown'], ['--preview', '--unknown'], ['', '--verify-only'], ['']]) {
    await fakeTools(async (options, downloadSentinel) => {
      await assert.rejects(execute('bash', [script, ...args], options), error => {
        assert.match(error.stderr, /Usage:/);
        return true;
      });
      await assert.rejects(access(downloadSentinel), {code: 'ENOENT'});
    });
  }
});
