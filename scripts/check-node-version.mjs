import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function assertNodeVersion(actual = process.versions.node) {
  const required = readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim();
  const parseStable = value => {
    if (typeof value !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) return null;
    const parts = value.split('.').map(Number);
    return parts.every(Number.isSafeInteger) ? parts : null;
  };
  const minimum = parseStable(required);
  if (!minimum) throw new Error('Invalid stable Node.js baseline in .node-version.');
  const current = parseStable(actual);
  if (!current) throw new Error(`Unsupported Node.js ${actual}. Use a stable release matching .node-version.`);
  const supported = current[0] === minimum[0] &&
    (current[1] > minimum[1] || (current[1] === minimum[1] && current[2] >= minimum[2]));
  if (!supported) throw new Error(`Unsupported Node.js ${actual}. Use Node.js ${required} or a newer patch/minor in the same major. See .node-version.`);
  return actual;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Node.js ${assertNodeVersion()} (security baseline verified)`);
}
