import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createYoutubeImage} from '../scripts/lib/youtube-images.mjs';
import {validateOutput,updateHomeLatest} from '../scripts/update-home-latest.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp');
test('HP-T05: explicit local migration touches only the selected provider',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'erinui-selected-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'assets/home-city'),{recursive:true});
 const calls=[];
 const result=await updateHomeLatest({root,only:['youtube'],env:{YOUTUBE_API_KEY:'local-migration'},baseCommit:'a'.repeat(40),runCollector:async(p,c)=>{calls.push(p.id);await output(c.stage,0);}});
 assert.deepEqual(calls,['youtube']);assert.equal(result.providers.length,1);
 await assert.rejects(updateHomeLatest({root,only:['typo'],env:{},baseCommit:'a'.repeat(40)}),/provider/);
});
test('HP-YT-01: the actual collector emits schema v2 and converts the sixth video without a real API',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'erinui-collector-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const jpeg=await sharp({create:{width:1280,height:720,channels:3,background:'#ccffee'}}).jpeg().toBuffer();
 const root=fileURLToPath(new URL('../',import.meta.url));
 await promisify(execFile)(process.execPath,['--import',path.join(root,'tests/helpers/youtube-collector-fixture.mjs'),path.join(root,'scripts/update-youtube-latest.mjs')],{cwd:root,env:{...process.env,YOUTUBE_API_KEY:'fixture-key',HOME_LATEST_OUTPUT_DIR:directory,FIXTURE_JPEG_BASE64:jpeg.toString('base64')}});
 const data=JSON.parse(await readFile(path.join(directory,'youtube-latest.json'),'utf8'));
 assert.equal(data.schemaVersion,2);assert.equal(data.videos.length,6);
 for(const video of data.videos){assert.equal(video.localThumbnail.width,640);assert.ok(await readFile(path.join(directory,path.basename(video.localThumbnail.url))));}
 assert.equal((await validateOutput('youtube',directory)).size,12);
});
async function output(directory,count=6){
 const jpeg=await sharp({create:{width:80,height:45,channels:3,background:'#ffccee'}}).jpeg().toBuffer();
 const videos=[];
 for(let i=0;i<count;i++){
  const id=`video_${i}`,image=await createYoutubeImage({bytes:jpeg,videoId:id,directory});
  videos.push({id,title:`動画${i}`,url:`https://www.youtube.com/watch?v=${id}`,thumbnail:{url:'https://example.com/remote.jpg'},localThumbnail:image});
  if(i<5)await writeFile(path.join(directory,`youtube-thumb-${i+1}.jpg`),jpeg);
 }
 const data={schemaVersion:2,ok:true,fetchedAt:'2026-10-17T00:00:00.000Z',channel:{id:'one',title:'channel',url:'https://www.youtube.com/channel/one',statistics:{}},videos};
 await writeFile(path.join(directory,'youtube-latest.json'),JSON.stringify(data));return data;
}
test('HP-T04/T05: v2 validates all six local images and rejects identity or hash mismatch',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'erinui-output-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const data=await output(directory);
 const files=await validateOutput('youtube',directory);
 assert.equal(files.size,12);
 data.videos[5].localThumbnail.sha256='a'.repeat(64);await writeFile(path.join(directory,'youtube-latest.json'),JSON.stringify(data));
 await assert.rejects(validateOutput('youtube',directory));
});
test('HP-T05: promotion keeps historical hashed images for open old pages',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'erinui-v2-update-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const assets=path.join(root,'assets/home-city');await mkdir(assets,{recursive:true});
 const previous=await output(assets,1),historical=path.basename(previous.videos[0].localThumbnail.url);
 const bytes=await readFile(path.join(assets,historical));
 const result=await updateHomeLatest({root,env:{YOUTUBE_API_KEY:'fixture'},baseCommit:'a'.repeat(40),runCollector:async(provider,c)=>{
  if(provider.id==='youtube')await output(c.stage,0);
  else if(provider.id==='note')await writeFile(path.join(c.stage,'note-latest.json'),JSON.stringify({ok:true,fetchedAt:'2026-10-17T00:00:00.000Z',items:[]}));
 }});
 assert.equal(result.providers[0].status,'success');
 assert.deepEqual(await readFile(path.join(assets,historical)),bytes);
 assert.ok(!result.changes.some(c=>c.path.endsWith(historical)&&c.after===null));
 assert.ok(await readFile(path.join(assets,'youtube-thumb-1.jpg')));
});

test('HP-REVIEW-01: a v1 producer rollback retains hashed images still referenced by open v2 pages',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'erinui-v1-rollback-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const assets=path.join(root,'assets/home-city');await mkdir(assets,{recursive:true});
 const previous=await output(assets,1),historical=path.basename(previous.videos[0].localThumbnail.url),bytes=await readFile(path.join(assets,historical));
 const result=await updateHomeLatest({root,only:['youtube'],env:{YOUTUBE_API_KEY:'fixture'},baseCommit:'a'.repeat(40),runCollector:async(provider,c)=>{
  const data=await output(c.stage,0);data.schemaVersion=1;await writeFile(path.join(c.stage,'youtube-latest.json'),JSON.stringify(data));
 }});
 assert.equal(result.providers[0].status,'success');assert.deepEqual(await readFile(path.join(assets,historical)),bytes);
 assert.ok(!result.changes.some(c=>c.path.endsWith(historical)&&c.after===null));
 assert.equal(result.changes.some(c=>c.path.endsWith('youtube-thumb-1.jpg')&&c.after===null),true,'the old v1 legacy-JPG contract remains unchanged');
});
