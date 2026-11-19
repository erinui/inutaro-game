import { readFile } from 'node:fs/promises';
import { readLimited } from './lib/safe-fetch.mjs';

const root = new URL('../', import.meta.url);
const exactVersion = /^\d+\.\d+\.\d+$/;
const auditedPython = ['brotli', 'fonttools'];
const undiciRelease = 'https://github.com/nodejs/undici/releases/tag/v7.30.2';

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8');
}

function pythonTargets(requirements) {
  return auditedPython.map(name => {
    const pins = [...requirements.matchAll(new RegExp('^' + name + '==([^\\s]+)', 'gim'))];
    if (pins.length !== 1) throw new Error('Expected one exact pin for ' + name);
    return { name, version: pins[0][1], ecosystem: 'PyPI', location: 'font build' };
  });
}

async function undiciTargets() {
  const targets = [
    { name: 'undici', ecosystem: 'npm', version: process.versions.undici, location: 'Node.js builtin' },
  ];
  for (const directory of ['', 'tools/deploy/']) {
    const { packages } = JSON.parse(await read(directory + 'package-lock.json'));
    const locations = Object.keys(packages).filter(name => /(^|\/)node_modules\/undici$/.test(name));
    if (!locations.length) throw new Error('No Undici lock entries in ' + (directory || 'root'));
    for (const location of locations) {
      const { version } = JSON.parse(await read(directory + location + '/package.json'));
      if (version !== packages[location].version) throw new Error('Undici installation differs from lockfile');
      targets.push({ name: 'undici', ecosystem: 'npm', version, location: directory + location });
    }
  }
  return targets;
}

function officialUndiciFinding({ name, version }) {
  if (name !== 'undici') return [];
  const [major, minor, patch] = version.split('.').map(Number);
  const affected = (major === 7 && (minor < 30 || (minor === 30 && patch < 2))) ||
    (major === 8 && (minor < 12 || (minor === 12 && patch < 4)));
  return affected ? [{ source: undiciRelease, id: 'GHSA-9v6h-8rgp-m69f', fixed: major === 7 ? '7.30.2' : '8.12.4' }] : [];
}

async function queryOSV({ name, ecosystem, version }) {
  const response = await fetch('https://api.osv.dev/v1/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package: { name, ecosystem }, version }),
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('OSV HTTP ' + response.status);
  const result = JSON.parse((await readLimited(response.body, 2_097_152)).toString('utf8'));
  if (!result || typeof result !== 'object' || Array.isArray(result) ||
      Object.keys(result).some(key => key !== 'vulns') ||
      (Object.hasOwn(result, 'vulns') && (!Array.isArray(result.vulns) ||
        result.vulns.some(item => typeof item?.id !== 'string')))) {
    throw new Error('Unexpected OSV response');
  }
  return (result.vulns || []).filter(item => !item.withdrawn).map(item => ({ source: 'OSV', id: item.id }));
}

const targets = [...pythonTargets(await read('config/font-build-requirements.txt')), ...await undiciTargets()];
const queries = new Map();
for (const target of targets) {
  if (!exactVersion.test(target.version || '')) throw new Error('Invalid pinned version for ' + target.location);
  const findings = officialUndiciFinding(target);
  let unavailable;
  try {
    const key = JSON.stringify([target.name, target.ecosystem, target.version]);
    if (!queries.has(key)) queries.set(key, queryOSV(target));
    findings.push(...await queries.get(key));
  } catch (error) {
    unavailable = error.message;
  }
  const status = findings.length ? 'advisory-matched' : unavailable ? 'not-checked' : 'no-match';
  console.log(JSON.stringify({ ...target, status, findings, unavailable }));
  if (findings.length || unavailable) process.exitCode = 1;
}
