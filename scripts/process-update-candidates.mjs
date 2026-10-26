import {readFile,writeFile,readdir,mkdir,lstat,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {imageDimensions,createYoutubeImage} from './lib/youtube-images.mjs';
import {validPublicUrl,validThumbnail} from './lib/provider-url-policy.mjs';
import {validateOutput} from './update-home-latest.mjs';import {assertNodeVersion} from './check-node-version.mjs';
const execute=promisify(execFile);
export function validateImageSandbox({platform,uid,status,interfaces,routes}){
 if(platform!=='linux'||uid===0||!/^NoNewPrivs:\s+1$/m.test(status)||!/^CapEff:\s+0+$/m.test(status)||interfaces.some(n=>n!=='lo')||routes.trim().split('\n').length>1)throw new Error('Image sandbox requirements not met');
}
export function validateImage(bytes){
 if(bytes.length>10000000)throw new Error('Image size limit');
 const size=imageDimensions(bytes);
 if(!size.width||!size.height||size.width*size.height>40000000)throw new Error('Image dimension limit');
 if((bytes[0]===137&&bytes.includes(Buffer.from('acTL')))||(bytes.toString('ascii',0,4)==='RIFF'&&bytes.includes(Buffer.from('ANIM'))))throw new Error('Animated image denied');
 return bytes[0]===137?'PNG':bytes[0]===255?'JPEG':'WEBP';
}
export async function checkedFiles(directory,pattern){
 const result=new Map();let total=0;
 const names=await readdir(directory);if(names.length>20)throw new Error('Artifact file count');
 for(const name of names){if(!pattern.test(name))throw new Error('Artifact path denied');const p=path.join(directory,name),stat=await lstat(p);if(!stat.isFile()||stat.size>(name.endsWith('.json')?1048576:10000000))throw new Error('Artifact file denied');total+=stat.size;if(total>80*1024*1024)throw new Error('Artifact total size');result.set(name,await readFile(p));}
 return result;
}
export async function processCandidates(input,output){
 await mkdir(output,{recursive:false});
 for(const id of ['youtube','note','suzuri']){
  const target=path.join(output,id);await mkdir(target);let state='failed';
  try{
   const source=path.join(input,id);const files=await checkedFiles(source,/^(?:_status\.json|(?:youtube|note|suzuri)-latest\.json|youtube-raw-[A-Za-z0-9_-]{1,80}\.jpg|youtube-thumb-[1-5]\.jpg|note-thumb-[1-6]\.(?:png|jpg|webp))$/);
   const status=JSON.parse(files.get('_status.json'));if(status.provider!==id||!['success','failed','skipped'].includes(status.state))throw new Error('Invalid provider status');state=status.state;
   if(state==='success'){
    const name=`${id}-latest.json`,data=JSON.parse(files.get(name));
    if(data.ok!==true||!Array.isArray(data.videos||data.items)||(data.videos||data.items).length>6)throw new Error('Invalid candidate');
    for(const item of data.videos||data.items){
     if(!validPublicUrl(item.url,id))throw new Error('Invalid item destination');
     if(id==='youtube'&&item.thumbnail){
      if(!/^[A-Za-z0-9_-]{1,80}$/.test(item.id)||item.rawThumbnail!==`youtube-raw-${item.id}.jpg`||!validThumbnail(item.thumbnail.url,id))throw new Error('Invalid raw image');
      const bytes=files.get(item.rawThumbnail);validateImage(bytes);
      item.localThumbnail=await createYoutubeImage({bytes,videoId:item.id,directory:target});delete item.rawThumbnail;
     }
     if(id==='note'&&item.thumbnailUrl){
      if(!/^assets\/home-city\/note-thumb-[1-6]\.(png|jpg|webp)$/.test(item.thumbnailUrl))throw new Error('Invalid note image');
      const name=path.basename(item.thumbnailUrl),bytes=files.get(name),format=validateImage(bytes),raw=path.join(target,'.input');
      await writeFile(raw,bytes,{flag:'wx'});
      try{await execute('convert',['-limit','memory','256MiB','-limit','map','512MiB','-limit','disk','1GiB','-limit','thread','2','-limit','time','12',`${format}:${raw}`,'-trim','+repage',`${format}:${path.join(target,name)}`],{timeout:12000,env:{PATH:process.env.PATH,HOME:process.env.HOME,MAGICK_CONFIGURE_PATH:process.env.MAGICK_CONFIGURE_PATH}});}finally{await rm(raw,{force:true});}
      validateImage(await readFile(path.join(target,name)));
     }
    }
    if(id==='youtube')for(const [name,bytes]of files)if(/^youtube-thumb-[1-5]\.jpg$/.test(name)){validateImage(bytes);await writeFile(path.join(target,name),bytes);}
    await writeFile(path.join(target,name),JSON.stringify(data,null,2)+'\n');
    await validateOutput(id,target);
   }
  }catch(error){console.error(`${id}: candidate rejected (${error.code||error.name})`);state='failed';await rm(target,{recursive:true,force:true});await mkdir(target);}
  await writeFile(path.join(target,'_status.json'),JSON.stringify({provider:id,state})+'\n');console.log(`${id}: ${state}`);
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){assertNodeVersion();if(process.env.INUTARO_SANDBOX_REQUIRED==='1'){
 validateImageSandbox({platform:process.platform,uid:process.getuid(),status:await readFile('/proc/self/status','utf8'),interfaces:await readdir('/sys/class/net'),routes:await readFile('/proc/net/route','utf8')});console.log('Image sandbox verified: non-root, no-new-privileges, zero effective capabilities, no external network interface or route');
 }await processCandidates(...process.argv.slice(2));}
