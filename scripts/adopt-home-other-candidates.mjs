import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {sha256} from './lib/home-assets.mjs';
import {htmlNodes} from './lib/home-youtube-snapshot.mjs';
import {loadManifest,addOutput,refreshCodeAssets} from './lib/generate-home-code.mjs';
const root=process.cwd(),directory=process.argv[2];if(!directory)throw new Error('Pass reviewed candidates');
const require=createRequire(import.meta.url),sharp=require('sharp');
const report=JSON.parse(await readFile(path.join(directory,'candidates.json'),'utf8'));
const results=JSON.parse(await readFile(path.join(directory,'visual/results.json'),'utf8'));
if(results.length!==8||results.some(r=>!r.withinRoundingTolerance||!Number.isFinite(r.maxGeometryDeltaCssPx)||r.maxGeometryDeltaCssPx>0.25))throw new Error('Visual geometry evidence missing');
const manifest=await loadManifest(root);
for(const asset of report.assets){
 if(sha256(await readFile(asset.source))!==asset.sourceSha256)throw new Error('Source changed');
 const bytes=await readFile(asset.file);if(sha256(bytes)!==asset.sha256||bytes.length>100000)throw new Error('Invalid candidate');
 const file=await addOutput(root,manifest,path.basename(asset.source,'.png')+(asset.scope==='header-only'?'-header':''),'webp',bytes,{sources:{[asset.source]:asset.sourceSha256},width:asset.width,height:asset.height,mime:'image/webp',kind:'static-image',quality:asset.quality});
 if(asset.scope==='header-only'){manifest.activeOutputs=manifest.activeOutputs.filter(file=>file!==manifest.headerLogo?.file);manifest.headerLogo={file,width:asset.width,height:asset.height};manifest.activeOutputs=[...new Set([...manifest.activeOutputs,file])];}
 else manifest.bindings[asset.source]=file;
}
manifest.imageDimensions={};
for(const document of ['index.html','games/index.html',...['characters','blog','illustrations','terms','privacy'].map(n=>`pages/${n}.html`)]){
 for(const node of htmlNodes(await readFile(document,'utf8')).filter(n=>n.tag==='img')){
  const url=node.attrs.src;if(!url||/^(?:[a-z]+:|\/)/i.test(url))continue;
  const file=path.posix.normalize(path.posix.join(path.posix.dirname(document),url.split(/[?#]/)[0]));
  if(/(?:youtube|note)-thumb/.test(file))continue;
  const bytes=await readFile(file);const size=await sharp(bytes).metadata();
  manifest.imageDimensions[file]={width:size.width,height:size.height,sha256:sha256(bytes)};
 }
}
await refreshCodeAssets(root,manifest);
console.log('Other image candidates adopted locally');
