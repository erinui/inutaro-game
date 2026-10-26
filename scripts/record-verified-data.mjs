import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function recordVerifiedData(root,baseCommit,runId){
 const file=path.join(root,'tests/fixtures/top-redesign-data-refresh.json'),registry=JSON.parse(await readFile(file,'utf8'));
 for(const [name,entry]of Object.entries(registry.files)){
  const bytes=await readFile(path.join(root,name)),after=JSON.parse(bytes),before=JSON.parse(entry.before),id=name.includes('youtube')?'youtube':name.includes('note')?'note':'suzuri';
  const generation={sha256:hash(bytes),commit:baseCommit,fetchedAt:after.fetchedAt,runId:String(runId||''),origin:'Validated provider collection; commit identifies trusted workflow base, not a self-referencing data commit.'};
  const changes=[];
  for(const key of id==='youtube'?['videos','channel.statistics']:['items']){
   const keys=key.split('.');let a=after,b=before;for(const k of keys.slice(0,-1)){a=a[k];b=b[k];}const k=keys.at(-1);
   if(JSON.stringify(a[k])!==JSON.stringify(b[k]))changes.push({path:keys,before:b[k],after:a[k]});
  }
  if(changes.length)generation.reviewedPayloadChanges=changes;
  const normalized=structuredClone(after);for(const c of changes){let n=normalized;for(const k of c.path.slice(0,-1))n=n[k];n[c.path.at(-1)]=c.before;}
  delete normalized.fetchedAt;const old=structuredClone(before);delete old.fetchedAt;
  if(!isDeepStrictEqual(normalized,old))throw new Error('Unapproved data structure change');
  const generations=registry.verifiedGenerations[name]||=[];if(!generations.some(g=>g.sha256===generation.sha256))generations.push(generation);
 }
 await writeFile(file,JSON.stringify(registry,null,2)+'\n');
 const f=path.join(root,'tests/fixtures/seo-performance-changes.json'),seo=JSON.parse(await readFile(f,'utf8'));
 for(const [name,entry]of Object.entries(seo.acceptedUpstreamData.files))if(/^assets\/home-city\/youtube-thumb-[1-5]\.jpg$/.test(name))entry.accepted=hash(await readFile(path.join(root,name)));
 await writeFile(f,JSON.stringify(seo,null,2)+'\n');
}
