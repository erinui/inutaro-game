import {readFile,writeFile,rm,lstat} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {sha256} from './home-assets.mjs';
const execute=promisify(execFile);
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id);
export function imageDimensions(bytes) {
 if(bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
 if(bytes.length>12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
  if(bytes.readUInt32LE(4)+8!==bytes.length)throw new Error('Invalid WebP length');
  for(let offset=12;offset+8<=bytes.length;){
   const tag=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),at=offset+8;
   if(at+length>bytes.length)throw new Error('Invalid WebP chunk');
   if(tag==='VP8X'&&length>=10)return {width:1+bytes.readUIntLE(at+4,3),height:1+bytes.readUIntLE(at+7,3)};
   if(tag==='VP8 '&&length>=10)return {width:bytes.readUInt16LE(at+6)&0x3fff,height:bytes.readUInt16LE(at+8)&0x3fff};
   if(tag==='VP8L'&&length>=5&&bytes[at]===0x2f){const bits=bytes.readUInt32LE(at+1);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};}
   offset=at+length+(length%2);
  }
 }
 if(bytes.length>4&&bytes[0]===255&&bytes[1]===216){
  for(let pos=2;pos+4<bytes.length;){
   if(bytes[pos++]!==255)throw new Error('Invalid JPEG marker');
   while(bytes[pos]===255)pos++;
   const marker=bytes[pos++];
   if(marker===0xd9||marker===0xda)break;
   if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
   const length=bytes.readUInt16BE(pos);
   if(length<2||pos+length>bytes.length)throw new Error('Invalid JPEG length');
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=7)return {width:bytes.readUInt16BE(pos+5),height:bytes.readUInt16BE(pos+3)};
   pos+=length;
  }
 }
 throw new Error('Unsupported or corrupt image');
}
export async function createYoutubeImage({bytes,videoId,directory}) {
 if(!validId(videoId))throw new Error('Invalid video ID');
 if(!Buffer.isBuffer(bytes)||bytes.length>10000000)throw new Error('Invalid image bytes');
 const size=imageDimensions(bytes);
 if(!size.width||!size.height||size.width*size.height>40000000)throw new Error('Invalid image dimensions');
 const token=randomUUID(),source=path.join(directory,`.source-${token}`),candidate=path.join(directory,`.encoded-${token}.webp`);
 try {
  await writeFile(source,bytes,{flag:'wx'});
  const options=['-quiet','-q','82','-metadata','none'];
  if(size.width>640)options.push('-resize','640','0');
  await execute(process.env.CWEBP_BINARY||'cwebp',[...options,source,'-o',candidate],{timeout:12000});
  const encoded=await readFile(candidate),hash=sha256(encoded),dimensions=imageDimensions(encoded);
  const name=`youtube-thumb-${videoId}-${hash.slice(0,16)}.webp`,filename=path.join(directory,name);
  try{await writeFile(filename,encoded,{flag:'wx'});}catch(error){if(error.code!=='EEXIST'||!(await readFile(filename)).equals(encoded))throw error;}
  const image={url:`assets/home-city/${name}`,...dimensions,sha256:hash};
  await validateYoutubeImage(image,videoId,directory);
  return image;
 }finally{await rm(source,{force:true});await rm(candidate,{force:true});}
}
export async function validateYoutubeImage(image,videoId,directory,{decode=true}={}) {
 if(!validId(videoId)||!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<=0||image.height<=0||! /^[a-f0-9]{64}$/.test(image.sha256||''))throw new Error('Invalid local thumbnail');
 const name=`youtube-thumb-${videoId}-${image.sha256.slice(0,16)}.webp`;
 if(image.url!==`assets/home-city/${name}`)throw new Error('Thumbnail identity mismatch');
 const filename=path.join(directory,name);
 if(!(await lstat(filename)).isFile())throw new Error('Thumbnail must be a regular file');
 const bytes=await readFile(filename),size=imageDimensions(bytes);
 if(sha256(bytes)!==image.sha256||size.width!==image.width||size.height!==image.height)throw new Error('Thumbnail hash or dimensions mismatch');
 if(decode)await execute(process.env.DWEBP_BINARY||'dwebp',['-quiet',filename,'-o',process.platform==='win32'?'NUL':'/dev/null'],{timeout:12000});
 return true;
}
