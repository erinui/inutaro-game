// One-time, read-only upstream conversion of the existing collected JSON.
// It does not query the YouTube API, change fetchedAt, stage, commit or push.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createYoutubeImage} from './lib/youtube-images.mjs';
import {updateHomeLatest} from './update-home-latest.mjs';
import {sha256} from './lib/home-assets.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const file=path.join(root,'assets/home-city/youtube-latest.json');
const original=await readFile(file),data=JSON.parse(original.toString());
if(data.schemaVersion===2)throw new Error('Already migrated; use the normal updater for future updates');
const result=await updateHomeLatest({root,only:['youtube'],env:{YOUTUBE_API_KEY:'local-image-migration'},runCollector:async(_provider,{stage})=>{
 const converted=structuredClone(data);converted.schemaVersion=2;
 await Promise.all(converted.videos.map(async(video,index)=>{
  if(!video.thumbnail)return;
  const url=new URL(video.thumbnail.url);
  if(url.origin!=='https://i.ytimg.com')throw new Error('Unexpected thumbnail origin');
  const response=await fetch(url,{headers:{Accept:'image/jpeg'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Thumbnail fetch failed');
  const bytes=Buffer.from(await response.arrayBuffer());
  video.localThumbnail=await createYoutubeImage({bytes,videoId:video.id,directory:stage});
  if(index<5){if(bytes[0]!==255||bytes[1]!==216)throw new Error('Legacy JPEG unavailable');await writeFile(path.join(stage,`youtube-thumb-${index+1}.jpg`),bytes);}
 }));
 if(sha256(await readFile(file))!==sha256(original))throw new Error('Source changed during conversion');
 await writeFile(path.join(stage,'youtube-latest.json'),JSON.stringify(converted,null,2)+'\n');
}});
await mkdir(path.join(root,'.performance-evidence/20261017'),{recursive:true});
await writeFile(path.join(root,'.performance-evidence/20261017/youtube-migration.json'),JSON.stringify({sourceSha256:sha256(original),...result},null,2));
if(result.providers.some(p=>p.status!=='success'))throw new Error('Migration failed; previous provider output retained');
console.log(`Converted ${data.videos.length} existing videos; fetchedAt preserved; no API or Git publication`);
