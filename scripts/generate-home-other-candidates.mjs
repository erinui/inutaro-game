import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {sha256} from './lib/home-assets.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp');
const directory=process.env.HOME_OTHER_CANDIDATES;if(!directory)throw new Error('HOME_OTHER_CANDIDATES required');
await mkdir(directory,{recursive:true});
const choices=[
 ['assets/characters/chara_inutaro_origin.png',null,90],
 ['assets/characters/chara_inutaro_nuigurumi.png',{height:576},80],
 ['assets/characters/chara_erika-san.png',{height:576},90],
 ['assets/characters/chara_sasuke.png',null,90],
 ['assets/characters/chara_bukuro.png',null,90],
 ['assets/games/inutaro-mushi/gameplay-preview.png',{width:800},85],
 ['assets/icon-192.png',{width:96,height:96},90,'header-only'],
];
const report={sharp:sharp.versions,cwebp:execFileSync('cwebp',['-version'],{encoding:'utf8'}).trim(),assets:[]};
for(const [source,resize,quality,scope] of choices){
 const bytes=await readFile(source),name=path.basename(source,'.png'),png=path.join(directory,name+'.png'),file=path.join(directory,name+'.webp');
 let pipeline=sharp(bytes);if(resize)pipeline=pipeline.resize({...resize,withoutEnlargement:true});
 await pipeline.png().toFile(png);
 execFileSync('cwebp',['-quiet','-q',String(quality),'-metadata','none',png,'-o',file]);
 const encoded=await readFile(file),size=await sharp(encoded).metadata();
 report.assets.push({source,sourceSha256:sha256(bytes),sourceBytes:bytes.length,file,sha256:sha256(encoded),bytes:encoded.length,width:size.width,height:size.height,quality,scope:scope||'shared'});
}
await writeFile(path.join(directory,'candidates.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.assets.map(({source,sourceBytes,bytes,width,height})=>({source,sourceBytes,bytes,width,height}))));
