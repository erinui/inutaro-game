// Scheduled update signal. New versions require review, never automatic execution.
import {readFile} from 'node:fs/promises';import {readLimited} from './lib/safe-fetch.mjs';
const browser=JSON.parse(await readFile(new URL('../config/test-browser.json',import.meta.url))),native=JSON.parse(await readFile(new URL('../config/native-security-baselines.json',import.meta.url))),node=(await readFile(new URL('../.node-version',import.meta.url),'utf8')).trim();
async function text(url){const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/json','User-Agent':'inutaro-security-audit'}});if(!r.ok)throw new Error(`Official release source unavailable (${r.status})`);return (await readLimited(r.body,1048576)).toString('utf8');}
const results=[];
const c=JSON.parse(await text('https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json'));results.push({component:'Chrome for Testing',pinned:browser.version,current:c.channels.Stable.version});
const hashes=await text('https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt'),n=/node-v(24\.[0-9]+\.[0-9]+)-linux-x64\.tar\.xz/.exec(hashes);if(!n)throw new Error('Unexpected official Node.js index');results.push({component:'Node.js 24 LTS',pinned:node,current:n[1]});
const m=JSON.parse(await text('https://api.github.com/repos/ImageMagick/ImageMagick6/releases/latest'));if(!/^6\.9\.13-\d+$/.test(m.tag_name))throw new Error('Unexpected ImageMagick release');results.push({component:'ImageMagick 6',pinned:native.imagemagick.version,current:m.tag_name});
for(const r of results){console.log(JSON.stringify({...r,reviewRequired:r.pinned!==r.current}));if(r.pinned!==r.current)process.exitCode=1;}
