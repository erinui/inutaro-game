import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {createYoutubeImage,validateYoutubeImage} from '../scripts/lib/youtube-images.mjs';
import {sha256} from '../scripts/lib/home-assets.mjs';
const require=createRequire(import.meta.url),sharp=require('sharp');

test('HP-YT-01: thumbnails preserve ratio, avoid upscaling and encode identity plus actual bytes',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'erinui-youtube-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const bytes=await sharp({create:{width:1280,height:720,channels:3,background:'#ffcc44'}}).jpeg().toBuffer();
 const image=await createYoutubeImage({bytes,videoId:'test_one-2',directory});
 assert.equal(image.width,640);assert.equal(image.height,360);
 assert.match(image.url,/^assets\/home-city\/youtube-thumb-test_one-2-[a-f0-9]{16}\.webp$/);
 assert.equal(image.sha256,sha256(await readFile(path.join(directory,path.basename(image.url)))));
 assert.equal(await validateYoutubeImage(image,'test_one-2',directory),true);
 const small=await createYoutubeImage({bytes:await sharp(bytes).resize(160,90).toBuffer(),videoId:'small',directory});
 assert.equal(small.width,160);assert.equal(small.height,90);
 await assert.rejects(createYoutubeImage({bytes,videoId:'../escape',directory}),/video/);
});
test('HP-YT-01: corrupt content, mismatched dimensions and cross-video aliases are rejected',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'erinui-youtube-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const bytes=await sharp({create:{width:40,height:20,channels:3,background:'#caffee'}}).jpeg().toBuffer();
 const image=await createYoutubeImage({bytes,videoId:'one',directory});
 await assert.rejects(validateYoutubeImage({...image,width:999},'one',directory));
 await assert.rejects(validateYoutubeImage(image,'two',directory));
 await writeFile(path.join(directory,path.basename(image.url)),'broken');
 await assert.rejects(validateYoutubeImage(image,'one',directory));
 await assert.rejects(createYoutubeImage({bytes:Buffer.from('not an image'),videoId:'one',directory}));
});
