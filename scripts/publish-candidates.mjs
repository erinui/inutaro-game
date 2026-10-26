// Runs only from trusted workflow source; never execute code or native decoders from artifacts.
import {readFile,writeFile,copyFile,readdir,rm} from 'node:fs/promises';import path from 'node:path';
import {updateHomeLatest} from './update-home-latest.mjs';import {checkedFiles} from './process-update-candidates.mjs';
import {recordVerifiedData} from './record-verified-data.mjs';import {assertNodeVersion} from './check-node-version.mjs';
assertNodeVersion();
const root=process.cwd(),input=process.argv[2],repo=process.env.GITHUB_REPOSITORY,runId=process.env.GITHUB_RUN_ID,base=process.env.GITHUB_SHA;
if(!input||repo!=='erinui/inutaro-game'||!/^\d+$/.test(runId||'')||!/^\w{40}$/.test(base||''))throw new Error('Invalid publication context');
const token=process.env.GITHUB_TOKEN;if(!token)throw new Error('Publication token missing');
async function api(route,method='GET',data){
 const r=await fetch(`https://api.github.com/repos/${repo}${route}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error(`GitHub API failed (${r.status})`);return r.status===204?null:r.json();
}
const current=(await api('/git/ref/heads/main')).object.sha;
if(current!==base)throw new Error('Main advanced; discard stale candidate and rerun on current main');
let suzuriSkipped=false;
try{const files=await checkedFiles(path.join(input,'suzuri'),/^(?:_status\.json|suzuri-latest\.json)$/),status=JSON.parse(files.get('_status.json'));suzuriSkipped=status.provider==='suzuri'&&status.state==='skipped';}catch{}
const result=await updateHomeLatest({root,env:{INUTARO_NO_IMAGE_DECODE:'1',YOUTUBE_API_KEY:'candidate-only',SUZURI_ACCESS_TOKEN:suzuriSkipped?'':'candidate-only'},baseCommit:base,runCollector:async(provider,{stage})=>{
 const files=await checkedFiles(path.join(input,provider.id),/^(?:_status\.json|(?:youtube|note|suzuri)-latest\.json|youtube-thumb-[1-5]\.jpg|youtube-thumb-[A-Za-z0-9_-]{1,80}-[a-f0-9]{16}\.webp|note-thumb-[1-6]\.(?:jpg|png|webp))$/);
 const status=JSON.parse(files.get('_status.json'));if(status.provider!==provider.id||status.state!=='success')throw new Error('Provider not successful');
 for(const [name,bytes]of files)if(name!=='_status.json')await writeFile(path.join(stage,name),bytes,{flag:'wx'});
}});
console.log(JSON.stringify({providers:result.providers.map(p=>({id:p.id,status:p.status,reason:p.reason}))}));
const failed=result.providers.filter(p=>p.status==='failed');
if(!result.changes.length){console.log('No validated changes to save');if(failed.length)process.exitCode=1;}
else{
 await recordVerifiedData(root,base,runId);
 const changes=result.changes.map(c=>c.path).concat(['tests/fixtures/top-redesign-data-refresh.json','tests/fixtures/seo-performance-changes.json']);
 const entries=[];
 for(const file of changes){
  const change=result.changes.find(c=>c.path===file);
  if(change?.after===null){entries.push({path:file,mode:'100644',type:'blob',sha:null});continue;}
  const bytes=await readFile(path.join(root,file));const blob=await api('/git/blobs','POST',{content:bytes.toString('base64'),encoding:'base64'});entries.push({path:file,mode:'100644',type:'blob',sha:blob.sha});
 }
 const parent=await api(`/git/commits/${base}`),tree=await api('/git/trees','POST',{base_tree:parent.tree.sha,tree:entries});
 const commit=await api('/git/commits','POST',{message:'Update validated home data',tree:tree.sha,parents:[base]});
 const branch=`automation/home-latest-${runId}`;
 try{await api('/git/refs','POST',{ref:`refs/heads/${branch}`,sha:commit.sha});}catch{const ref=await api(`/git/ref/heads/${branch}`);if(ref.object.sha!==commit.sha)throw new Error('Existing publication branch differs; no overwrite');}
 const pr=await api('/pulls','POST',{title:'Update validated home data',head:branch,base:'main',body:`Validated provider data from workflow run ${runId}. Only provider output and exact data-acceptance metadata are included. Base ${base}.`});
 console.log(`Update PR: ${pr.html_url}`);
 // GITHUB_TOKEN-created PRs do not trigger pull_request workflows; dispatch explicitly.
 await api('/actions/workflows/home-performance-check.yml/dispatches','POST',{ref:branch});
 let verified=false;
 for(let attempt=0;attempt<30;attempt++){
  const runs=await api(`/actions/workflows/home-performance-check.yml/runs?branch=${encodeURIComponent(branch)}&event=workflow_dispatch&per_page=10`);
  const run=runs.workflow_runs.find(r=>r.head_sha===commit.sha);
  if(run?.status==='completed'){if(run.conclusion!=='success')throw new Error('Update verification failed; PR remains unmerged');verified=true;break;}
  await new Promise(resolve=>setTimeout(resolve,20000));
 }
 if(!verified)throw new Error('Update verification did not complete; PR remains unmerged');
 if((await api('/git/ref/heads/main')).object.sha!==base)throw new Error('Main advanced during verification; PR remains unmerged');
 const merged=await api(`/pulls/${pr.number}/merge`,'PUT',{sha:commit.sha,merge_method:'squash'});
 if(!merged.merged)throw new Error('Merge was not accepted');
 console.log(`Validated data merged: ${merged.sha}`);
 if(failed.length)process.exitCode=1;
}
