// Execute only trusted main code. Never checkout or execute a publication PR.
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export const REPOSITORY = 'erinui/inutaro-game';
const workflows = new Map([
 ['.github/workflows/home-performance-check.yml', 'verify'],
 ['.github/workflows/dependency-audit.yml', 'audit'],
]);
export function isDataPr(pr) {
 return pr.user?.login === 'github-actions[bot]' && pr.base?.ref === 'main' &&
  pr.head?.repo?.full_name === REPOSITORY && /^automation\/home-latest-\d+$/.test(pr.head.ref) &&
  pr.title === 'Update validated home data';
}
const allowed = p => /^assets\/home-city\/(?:(?:youtube|note|suzuri)-latest\.json|youtube-thumb-[1-5]\.jpg|youtube-thumb-[A-Za-z0-9_-]{1,80}-[a-f0-9]{16}\.webp|note-thumb-[1-6]\.(?:png|jpg|webp))$/.test(p) ||
 ['tests/fixtures/top-redesign-data-refresh.json','tests/fixtures/seo-performance-changes.json'].includes(p);
export async function reconcile(api, log = console.log) {
 const prs = await api('/pulls?state=open&base=main&per_page=100');
 if(prs.length >= 100) throw Error('Too many open PRs');
 for(const item of prs.filter(isDataPr)) {
  const pr = await api(`/pulls/${item.number}`);
  if(!isDataPr(pr) || pr.state !== 'open' || pr.draft) throw Error('Publication PR identity changed');
  const runId = pr.head.ref.split('-').at(-1);
  const source = await api(`/actions/runs/${runId}`);
  if(source.path !== '.github/workflows/update-youtube-latest.yml' || source.head_branch !== 'main' ||
     source.head_repository?.full_name !== REPOSITORY || !['schedule','workflow_dispatch'].includes(source.event) ||
     source.status !== 'completed' || source.conclusion !== 'success') throw Error('Unsuccessful or untrusted collection run');
  const commits = await api(`/pulls/${pr.number}/commits?per_page=100`);
  if(commits.length !== 1 || commits[0].sha !== pr.head.sha || commits[0].parents?.length !== 1 ||
     commits[0].parents[0].sha !== source.head_sha) throw Error('Publication commit provenance mismatch');
  const files = await api(`/pulls/${pr.number}/files?per_page=100`);
  if(!files.length || files.length >= 100 || files.length !== pr.changed_files || files.some(f => !allowed(f.filename) ||
     !['added','modified','removed'].includes(f.status) || f.previous_filename ||
     (f.status === 'removed' && /youtube-thumb-.*\.webp$/.test(f.filename)))) throw Error('Non-data publication diff denied');
  const branch = await api('/branches/main');
  if(!branch.protected) throw Error('Main protection is required');
  if(branch.commit.sha !== source.head_sha) {
   await api(`/pulls/${pr.number}`, 'PATCH', {state:'closed'});
   log(`Closed stale data PR ${pr.html_url}; collecting against current main`);
   await api('/actions/workflows/update-youtube-latest.yml/dispatches','POST',{ref:'main'});
   continue;
  }
  const result = await api(`/actions/runs?event=pull_request&head_sha=${pr.head.sha}&per_page=100`);
  if(result.total_count >= 100) throw Error('Too many verification runs');
  const latest = [];
  for(const workflow of workflows.keys()) {
   const matches = result.workflow_runs.filter(r => r.path === workflow && r.head_sha === pr.head.sha &&
    r.head_branch === pr.head.ref && r.head_repository?.full_name === REPOSITORY && r.event === 'pull_request');
   matches.sort((a,b) => b.id - a.id);
   const run = matches[0];
   if(!run) throw Error(`Missing PR verification: ${workflow}`);
   if(run.conclusion === 'action_required') {
    await api(`/actions/runs/${run.id}/approve`, 'POST');
    log(`Started ${workflow} for data PR #${pr.number}`);
   } else if(run.status === 'completed' && run.conclusion !== 'success') {
    throw Error(`Data PR #${pr.number}: ${workflow} ${run.conclusion}; production retained`);
   }
   latest.push(run);
  }
  if(latest.some(r => r.status !== 'completed' || r.conclusion !== 'success')) {
   log(`Data PR #${pr.number}: verification pending`); continue;
  }
  const checks = await api(`/commits/${pr.head.sha}/check-runs?per_page=100`);
  if(checks.total_count >= 100) throw Error('Too many checks');
  for(const name of workflows.values()) {
   const check = checks.check_runs.filter(c => c.name === name && c.app?.id === 15368).sort((a,b)=>b.id-a.id)[0];
   if(check?.status !== 'completed' || check.conclusion !== 'success') throw Error(`Required ${name} check is not successful`);
  }
  // GitHub also enforces current-base checks, reviews and conversations atomically.
  if((await api('/branches/main')).commit.sha !== source.head_sha) throw Error('Main advanced before merge; retry reconciliation');
  const merged = await api(`/pulls/${pr.number}/merge`, 'PUT', {sha:pr.head.sha,merge_method:'merge'});
  if(!merged.merged) throw Error('Protected merge did not complete');
  log(`Merged verified data PR ${pr.html_url}: ${merged.sha}`);
 }
}
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 if(process.env.GITHUB_REPOSITORY !== REPOSITORY || !process.env.GITHUB_TOKEN) throw Error('Invalid reconciliation context');
 const api = async(route,method='GET',data) => {
  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}${route}`, {
   method,headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},
   body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000),
  });
  if(!response.ok) throw Error(`GitHub API ${method} ${route}: ${response.status}`);
  return response.status===204?null:response.json();
 };
 const log = message => {console.log(message);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,`${message}\n`);};
 await reconcile(api, log);
}
