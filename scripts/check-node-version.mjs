import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function assertNodeVersion(actual = process.versions.node) {
  const required = readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim();
  const minimum = required.split('.').map(Number);
  const current = actual.split('.').map(Number);
  const supported = current[0] === minimum[0] &&
    (current[1] > minimum[1] || (current[1] === minimum[1] && current[2] >= minimum[2]));
  if (!supported) throw new Error(`Unsupported Node.js ${actual}. Use Node.js ${required} or a newer patch/minor in the same major. See .node-version.`);
  return actual;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Node.js ${assertNodeVersion()} (security baseline verified)`);
}
