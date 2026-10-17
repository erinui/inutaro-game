import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256,validateAssetManifest} from './lib/home-assets.mjs';
import {loadManifest,addOutput,refreshCodeAssets} from './lib/generate-home-code.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const candidateDir=process.argv[2];
if(!candidateDir)throw new Error('Pass the reviewed candidate directory');
const candidates=JSON.parse(await readFile(path.join(candidateDir,'candidates.json'),'utf8'));
const visual=JSON.parse(await readFile(path.join(candidateDir,'visual/results.json'),'utf8'));
if(visual.length!==4||visual.some(r=>!r.geometryEqual))throw new Error('Missing Chrome geometry evidence');
const manifest=await loadManifest(root);
for(const asset of candidates.assets){
 if(sha256(await readFile(path.join(root,asset.source)))!==asset.sourceSha256)throw new Error('Source changed since comparison');
 const chosen=asset.candidates.find(c=>c.quality==='90');
 const bytes=await readFile(chosen.file);
 if(sha256(bytes)!==chosen.sha256||bytes.length>100000)throw new Error('Candidate changed or exceeds image budget');
 const name=path.basename(asset.source,'.svg');
 const file=await addOutput(root,manifest,name,'webp',bytes,{sources:{[asset.source]:asset.sourceSha256},width:asset.width,height:asset.height,mime:'image/webp',kind:'map',quality:90,renderer:candidates.browser,cwebp:candidates.cwebp,review:{chrome:'PC/SP DPR1/2 geometry and visual comparison',safari:'unverified'}});
 manifest.bindings[asset.source]=file;
}
await refreshCodeAssets(root,manifest);
await validateAssetManifest(root,manifest);
console.log('Local map candidates adopted; Safari and release acceptance still required');
