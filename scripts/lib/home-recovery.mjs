import path from 'node:path';
import {readFile,writeFile,rename,lstat,realpath} from 'node:fs/promises';
import {sha256} from './home-assets.mjs';
import {htmlNodes} from './home-youtube-snapshot.mjs';
const canonicalFiles=new Set(['youtube-latest','note-latest','suzuri-latest','line-stamps'].map(n=>`assets/home-city/${n}.json`).concat('data/news.json'));
export function normalizeDataRecovery(settings){
 if(settings?.version!==1||!settings.routes||Array.isArray(settings.routes)||typeof settings.routes!=='object')throw new Error('Invalid recovery routes');
 const routes={},seen=new Set();
 for(const [canonical,value] of Object.entries(settings.routes)){
  if(!canonicalFiles.has(canonical)||!Array.isArray(value?.aliases)||!value.aliases.length||!value.aliases.includes(value.active))throw new Error('Invalid recovery route');
  const prefix=canonical.slice(0,-5)+'.recovery-';
  for(const alias of value.aliases){
   if(typeof alias!=='string'||!alias.startsWith(prefix)||!/^\d{8}-[a-z0-9-]{1,32}\.json$/.test(alias.slice(prefix.length))||seen.has(alias))throw new Error('Invalid recovery alias');
   seen.add(alias);
  }
  routes[canonical]={active:value.active,aliases:[...value.aliases]};
 }
 return routes;
}
export async function loadDataRecovery(root){
 try{return normalizeDataRecovery(JSON.parse(await readFile(path.join(root,'config/home-data-recovery.json'),'utf8')));}
 catch(error){if(error.code==='ENOENT')return {};throw error;}
}
export async function writeDataAliases(directory,routes){
 routes=normalizeDataRecovery({version:1,routes});const files=[];
 for(const [canonical,route] of Object.entries(routes)){
  const bytes=await readFile(path.join(directory,canonical));JSON.parse(bytes.toString());
  for(const alias of route.aliases){
   const filename=path.join(directory,alias);
   await writeFile(filename+'.tmp',bytes);await rename(filename+'.tmp',filename);files.push(alias);
  }
 }
 return files;
}
export function applyDataRoutes(html,routes){
 routes=normalizeDataRecovery({version:1,routes});
 if(!Object.keys(routes).length)return html;
 const nodes=htmlNodes(html),head=nodes.find(n=>n.tag==='head');
 if(!head||nodes.some(n=>n.attrs.id==='home-data-routes'))throw new Error('Invalid recovery bootstrap');
 const mapping=Object.fromEntries(Object.entries(routes).map(([key,value])=>[key,value.active]));
 const json=JSON.stringify(mapping).replace(/</g,'\\u003c');
 return html.slice(0,head.endStart)+`<script type="application/json" id="home-data-routes">${json}</script>`+html.slice(head.endStart);
}
export async function verifyRequiredAssets(directory,required){
 const failures=[],base=await realpath(directory);
 for(const [file,hash] of Object.entries(required)){
  if(!file.startsWith('assets/')||path.posix.normalize(file)!==file||file.includes('\\')||file.split('/').some(s=>s.startsWith('.'))||!/^[a-f0-9]{64}$/.test(hash))throw new Error('Invalid recovery asset path or hash');
  try{
   const filename=path.join(directory,file);
   if(!(await lstat(filename)).isFile()||!(await realpath(filename)).startsWith(base+path.sep))throw new Error('not-file');
   if(sha256(await readFile(filename))!==hash)failures.push({file,reason:'hash-mismatch'});
  }catch{failures.push({file,reason:'missing-or-unreadable'});}
 }
 return {passed:!failures.length,failures};
}
