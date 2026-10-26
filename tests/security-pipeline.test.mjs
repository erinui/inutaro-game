import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink,copyFile} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
import {collectorEnvironment} from '../scripts/update-home-latest.mjs';
import {checkedFiles,validateImage,processCandidates} from '../scripts/process-update-candidates.mjs';
const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
async function temp(t){const p=await mkdtemp(path.join(os.tmpdir(),'inutaro-security-'));t.after(()=>rm(p,{recursive:true,force:true}));return p;}
test('Security: collectors receive only their own dummy API secret and no execution injection',()=>{
 const env={PATH:'/trusted/bin',YOUTUBE_API_KEY:'youtube-dummy',SUZURI_ACCESS_TOKEN:'suzuri-dummy',GITHUB_TOKEN:'github-dummy',NODE_OPTIONS:'--import=evil',ACTIONS_RUNTIME_TOKEN:'artifact-dummy'};
 for(const id of ['youtube','note','suzuri']){const e=collectorEnvironment(id,env,'/output');assert.equal(e.HOME_LATEST_OUTPUT_DIR,'/output');assert.equal(e.GITHUB_TOKEN,undefined);assert.equal(e.NODE_OPTIONS,undefined);assert.equal(e.ACTIONS_RUNTIME_TOKEN,undefined);assert.equal(e.YOUTUBE_API_KEY,id==='youtube'?env.YOUTUBE_API_KEY:undefined);assert.equal(e.SUZURI_ACCESS_TOKEN,id==='suzuri'?env.SUZURI_ACCESS_TOKEN:undefined);}
});
test('Security: artifacts reject symlinks, code, excessive files and oversized JSON before reading',async t=>{
 const p=await temp(t),d=path.join(p,'input');await mkdir(d);const pattern=/^.*\.json$/;
 await symlink('/etc/hosts',path.join(d,'a.json'));await assert.rejects(checkedFiles(d,pattern),/file denied/);await rm(path.join(d,'a.json'));
 await writeFile(path.join(d,'payload.mjs'),'throw 0');await assert.rejects(checkedFiles(d,pattern),/path denied/);await rm(path.join(d,'payload.mjs'));
 await writeFile(path.join(d,'a.json'),Buffer.alloc(1048577));await assert.rejects(checkedFiles(d,pattern),/file denied/);await rm(path.join(d,'a.json'));
 for(let i=0;i<21;i++)await writeFile(path.join(d,`${i}.json`),'{}');await assert.rejects(checkedFiles(d,pattern),/file count/);
});
test('Security: invalid/animated images are rejected; untrusted programs are never executed',async t=>{
 assert.throws(()=>validateImage(Buffer.from('<svg/>')));
 const png=Buffer.alloc(40);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(2,16);png.writeUInt32BE(2,20);png.write('acTL',26);assert.throws(()=>validateImage(png),/Animated/);
 png.writeUInt32BE(10000,16);png.writeUInt32BE(10000,20);assert.throws(()=>validateImage(png),/dimension/);
 const p=await temp(t),input=path.join(p,'raw');await mkdir(input);
 for(const id of ['youtube','note','suzuri']){const d=path.join(input,id);await mkdir(d);await writeFile(path.join(d,'_status.json'),JSON.stringify({provider:id,state:'success'}));await writeFile(path.join(d,'payload.mjs'),`require('fs').writeFileSync(${JSON.stringify(path.join(p,'executed'))},'bad')`);}
 await processCandidates(input,path.join(p,'processed'));
 await assert.rejects(readFile(path.join(p,'executed')),{code:'ENOENT'});
 for(const id of ['youtube','note','suzuri'])assert.equal(JSON.parse(await readFile(path.join(p,'processed',id,'_status.json'))).state,'failed');
});
async function publication(t,mode){
 const p=await temp(t),input=path.join(p,'candidates');await mkdir(input);await mkdir(path.join(p,'assets/home-city'),{recursive:true});await mkdir(path.join(p,'tests/fixtures'),{recursive:true});
 for(const name of ['top-redesign-data-refresh.json','seo-performance-changes.json'])await copyFile(path.join(root,'tests/fixtures',name),path.join(p,'tests/fixtures',name));
 const original=new Map();
 for(const id of ['youtube','note','suzuri']){
  const d=path.join(input,id);await mkdir(d);const dataName=`${id}-latest.json`,bytes=await readFile(path.join(root,'assets/home-city',dataName));original.set(dataName,bytes);await writeFile(path.join(p,'assets/home-city',dataName),bytes);
  const data=JSON.parse(bytes);data.fetchedAt='2026-10-27T08:00:00.000Z';await writeFile(path.join(d,dataName),JSON.stringify(data,null,2)+'\n');await writeFile(path.join(d,'_status.json'),JSON.stringify({provider:id,state:'success'}));
  const images=id==='youtube'?[...data.videos.filter(v=>v.localThumbnail).map(v=>path.basename(v.localThumbnail.url)),...Array.from({length:5},(_,i)=>`youtube-thumb-${i+1}.jpg`)]:id==='note'?data.items.filter(v=>v.thumbnailUrl).map(v=>path.basename(v.thumbnailUrl)):[];
  for(const image of new Set(images))await copyFile(path.join(root,'assets/home-city',image),path.join(d,image));
 }
 const log=path.join(p,'api.jsonl');await writeFile(log,'');let outcome;
 try{outcome=await exec(process.execPath,['--import',path.join(root,'tests/helpers/publisher-api-fixture.mjs'),path.join(root,'scripts/publish-candidates.mjs'),input],{cwd:p,env:{...process.env,GITHUB_REPOSITORY:'erinui/inutaro-game',GITHUB_RUN_ID:'123',GITHUB_SHA:'a'.repeat(40),GITHUB_TOKEN:'dummy-only',PUBLISH_FIXTURE_MODE:mode,PUBLISH_FIXTURE_LOG:log},timeout:20000});}catch(e){outcome=e;}
 return {p,outcome,requests:(await readFile(log,'utf8')).trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)),original};
}
test('Security: publication checks base, validates passive data, verifies exact head and merges via PR',async t=>{
 const {outcome,requests}=await publication(t,'success');assert.equal(outcome.code,undefined,outcome.stderr);
 const tree=requests.find(r=>r.route==='/git/trees');assert.ok(tree);assert.ok(tree.paths.every(p=>p.startsWith('assets/home-city/')||['tests/fixtures/top-redesign-data-refresh.json','tests/fixtures/seo-performance-changes.json'].includes(p)));
 const merge=requests.find(r=>r.route.endsWith('/merge'));assert.deepEqual(merge.body,{sha:'b'.repeat(40),merge_method:'squash'});assert.ok(requests.findIndex(r=>r.route.endsWith('/runs'))<requests.indexOf(merge));
});
test('Security: failed verification leaves the data PR unmerged',async t=>{
 const {outcome,requests}=await publication(t,'failed');assert.equal(outcome.code,1);assert.ok(requests.some(r=>r.route==='/pulls'));assert.ok(!requests.some(r=>r.route.endsWith('/merge')));
});
test('Security: stale workflow base stops before touching files or creating a PR',async t=>{
 const {p,outcome,requests,original}=await publication(t,'stale');assert.equal(outcome.code,1);assert.ok(!requests.some(r=>r.method!=='GET'));
 for(const [name,bytes]of original)assert.deepEqual(await readFile(path.join(p,'assets/home-city',name)),bytes);
});
