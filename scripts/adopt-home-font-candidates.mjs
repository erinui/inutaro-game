import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {sha256} from './lib/home-assets.mjs';
import {fontFacesCss} from './lib/home-fonts.mjs';
import {loadManifest,addOutput,refreshCodeAssets} from './lib/generate-home-code.mjs';
const root=process.cwd(),directory=process.argv[2];if(!directory)throw new Error('Pass reviewed candidates');
const report=JSON.parse(await readFile(path.join(directory,'font-report.json'),'utf8'));
const results=JSON.parse(await readFile(path.join(directory,'visual/results.json'),'utf8'));
if(!report.coverageMetricsOutlinesEqual||results.length!==4||results.some(r=>!r.layoutEqual||r.fontBytes>100000))throw new Error('Font evidence does not pass');
const source='assets/fonts/keinann-pop-jp.ttf';if(sha256(await readFile(source))!==report.sourceSha256)throw new Error('Font source changed');
const expectedCodePoints=report.groups.flatMap(g=>g.characters).sort((a,b)=>a-b);
const core=report.groups[0].characters;
const singleFaceSets=[core.filter(c=>c>=0x20&&c<0x530),core.filter(c=>(c>=0x3000&&c<0x3100)||(c>=0xff61&&c<0xffa0))];
const policy={version:1,sourceSha256:report.sourceSha256,fontTools:report.fontTools,layoutFeatures:report.layoutFeatures,expectedCodePoints,singleFaceSets,groups:report.groups.map(({name,characters,sha256})=>({name,characters,sha256}))};
const config='config/home-font-partitions.json',configBytes=Buffer.from(JSON.stringify(policy,null,2)+'\n');await writeFile(config,configBytes);
const manifest=await loadManifest(root),faces=[];
const previousFaces=new Set((manifest.fonts?.faces||[]).map(f=>f.file));
manifest.activeOutputs=manifest.activeOutputs.filter(file=>!previousFaces.has(file));
for(const group of report.groups){
 const bytes=await readFile(group.file);if(sha256(bytes)!==group.sha256)throw new Error('Font candidate changed');
 const file=await addOutput(root,manifest,'keinann-pop-jp-'+group.name,'woff2',bytes,{sources:{[source]:report.sourceSha256,[config]:sha256(configBytes)},kind:'font',mime:'font/woff2'});
 faces.push({file,characters:group.characters});
}
manifest.fonts={layoutFeatures:report.layoutFeatures,expectedCodePoints,singleFaceSets,faces};fontFacesCss(manifest.fonts);
manifest.activeOutputs=[...new Set([...manifest.activeOutputs,...faces.map(f=>f.file)])];
await refreshCodeAssets(root,manifest);console.log(`Adopted ${faces.length} full-coverage disjoint font faces; current TOP requests ${results[0].fontBytes} bytes`);
