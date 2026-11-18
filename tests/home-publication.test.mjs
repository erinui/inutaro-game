import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcile,isDataPr,REPOSITORY} from '../scripts/reconcile-home-updates.mjs';
const base='a'.repeat(40),head='b'.repeat(40);
function fixture(options={}) {
 const pr={number:1,state:'open',draft:false,title:'Update validated home data',user:{login:'github-actions[bot]'},base:{ref:'main'},head:{sha:head,ref:'automation/home-latest-123',repo:{full_name:REPOSITORY}},changed_files:1,html_url:'https://github.com/erinui/inutaro-game/pull/1'};
 const mutations=[];
 const api=async(route,method='GET',body)=>{
  if(method!=='GET'){mutations.push({route,method,body});return route.endsWith('/merge')?{merged:true,sha:'merged'}:null;}
  if(route.startsWith('/pulls?'))return [options.foreign?{...pr,user:{login:'other'}}:pr];
  if(route==='/pulls/1')return {...pr,...options.pr};
  if(route==='/actions/runs/123')return {path:'.github/workflows/update-youtube-latest.yml',head_branch:'main',head_repository:{full_name:REPOSITORY},head_sha:base,event:'schedule',status:'completed',conclusion:'success',...options.source};
  if(route.includes('/commits?'))return [{sha:head,parents:[{sha:base}],...options.commit}];
  if(route.includes('/files?'))return [{filename:options.file||'assets/home-city/youtube-latest.json',status:options.fileStatus||'modified'}];
  if(route==='/branches/main')return {protected:options.protected!==false,commit:{sha:options.stale?'c'.repeat(40):base}};
  if(route.startsWith('/actions/runs?'))return {total_count:2,workflow_runs:['home-performance-check','dependency-audit'].map((w,i)=>({id:i+1,path:`.github/workflows/${w}.yml`,head_sha:head,head_branch:pr.head.ref,head_repository:{full_name:REPOSITORY},event:'pull_request',status:options.running?'in_progress':'completed',conclusion:options.approve?'action_required':options.failed?'failure':options.running?null:'success',...options.run}))};
  if(route.includes('/check-runs?'))return {total_count:2,check_runs:['verify','audit'].map((name,i)=>({id:i,name,app:{id:options.wrongApp?1:15368},status:'completed',conclusion:options.failedCheck?'failure':'success'}))};
  throw Error(`Unexpected ${route}`);
 };
 return {api,mutations,pr};
}
test('publication: merges only successful PR head using normal protected merge',async()=>{
 const f=fixture();await reconcile(f.api,()=>{});assert.deepEqual(f.mutations,[{route:'/pulls/1/merge',method:'PUT',body:{sha:head,merge_method:'merge'}}]);
});
test('publication: automatically starts actual PR verification and waits for completion',async()=>{
 const f=fixture({approve:true});await reconcile(f.api,()=>{});assert.deepEqual(f.mutations.map(m=>m.route),['/actions/runs/1/approve','/actions/runs/2/approve']);
 const running=fixture({running:true});await reconcile(running.api,()=>{});assert.equal(running.mutations.length,0);
});
test('publication: stale base is closed and recollected without force updating a reviewed head',async()=>{
 const f=fixture({stale:true});await reconcile(f.api,()=>{});assert.deepEqual(f.mutations,[{route:'/pulls/1',method:'PATCH',body:{state:'closed'}},{route:'/actions/workflows/update-youtube-latest.yml/dispatches',method:'POST',body:{ref:'main'}}]);
});
test('publication: rejects source edits, forged provenance, failed checks and missing protection before writes',async()=>{
 for(const options of [{file:'home.js'},{file:'tests/fixtures/evil.json'},{file:'assets/home-city/youtube-thumb-video-0123456789abcdef.webp',fileStatus:'removed'},{protected:false},{source:{conclusion:'failure'}},{source:{head_repository:{full_name:'attacker/repo'}}},{commit:{parents:[{sha:'c'.repeat(40)}]}},{wrongApp:true},{failed:true},{failedCheck:true},{run:{head_sha:'c'.repeat(40)}}]){
  const f=fixture(options);await assert.rejects(reconcile(f.api,()=>{}));assert.equal(f.mutations.length,0,JSON.stringify(options));
 }
});
test('publication: ignores other PR authors, repositories, titles and branches',async()=>{
 const f=fixture({foreign:true});await reconcile(f.api,()=>{});assert.equal(f.mutations.length,0);
 for(const p of [{...f.pr,title:'Source update'},{...f.pr,head:{...f.pr.head,ref:'codex/source'}},{...f.pr,base:{ref:'other'}},{...f.pr,head:{...f.pr.head,repo:{full_name:'other/repo'}}}])assert.equal(isDataPr(p),false);
});

test('publication workflow: privileged reconciliation uses main, no artifacts or candidate code',async()=>{
 const {readFile}=await import('node:fs/promises');
 const workflow=await readFile(new URL('../.github/workflows/reconcile-home-updates.yml',import.meta.url),'utf8');
 assert.match(workflow,/workflow_run:/);assert.match(workflow,/types: \[completed\]/);
 assert.match(workflow,/ref: main/);assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/actions: write/);assert.doesNotMatch(workflow,/download-artifact|npm |head_sha|pull_request_target/);
 const publisher=await readFile(new URL('../.github/workflows/update-youtube-latest.yml',import.meta.url),'utf8');
 assert.doesNotMatch(publisher,/actions:\s*write/);
});
