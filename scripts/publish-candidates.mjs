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
if(!(await api('/branches/main')).protected)throw new Error('Main protection is required; no publication PR was created');
const open=await api('/pulls?state=open&base=main&per_page=100');
if(open.length>=100)throw new Error('Too many open PRs to safely identify a pending update');
const pending=open.find(pr=>pr.user?.login==='github-actions[bot]'&&pr.head?.repo?.full_name===repo&&/^automation\/home-latest-\d+$/.test(pr.head.ref)&&pr.title==='Update validated home data');
if(pending){console.log(`Pending data PR: ${pending.html_url}; review it before collecting another publication candidate.`);process.exit(0);}
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
 // GITHUB_TOKEN PR workflows require a human approval. Dispatch checks do not
 // satisfy protected-branch requirements, so leave validation and merge gated by PR.
 console.log('Publication pending: approve PR workflows, confirm required verify success, then merge the PR normally. No direct merge is performed.');
 if(failed.length)process.exitCode=1;
}
