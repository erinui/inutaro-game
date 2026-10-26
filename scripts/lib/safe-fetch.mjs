import {lookup} from 'node:dns/promises';
import {fetch,Agent} from 'undici';
import ipaddr from 'ipaddr.js';
import {validRemoteUrl} from './provider-url-policy.mjs';
export function publicAddress(address){try{return ipaddr.process(address).range()==='unicast';}catch{return false;}}
export async function readLimited(body,maximum){
 const chunks=[];let size=0;
 try{for await(const chunk of body){size+=chunk.byteLength;if(size>maximum)throw new Error('response-size-limit');chunks.push(Buffer.from(chunk));}}
 catch(error){try{await body.cancel?.();}catch{}throw error;}
 return Buffer.concat(chunks,size);
}
export function createSafeFetch({resolve=lookup,request=fetch,makeAgent=options=>new Agent(options)}={}){
 return async function safeFetch(value,{kind,headers={},signal,maximum,timeoutMs=12000}={}){
  const limit=maximum??(/Image$/.test(kind||'')?10000000:kind==='noteFeed'||kind==='noteArticle'?2097152:1048576);
  const deadline=AbortSignal.timeout(timeoutMs),abort=signal?AbortSignal.any([signal,deadline]):deadline;
  let url=value;
  for(let redirects=0;redirects<=3;redirects++){
   if(!validRemoteUrl(url,kind))throw new Error('remote-url-policy');
   const host=new URL(url).hostname;
   let onAbort;
   const records=await Promise.race([resolve(host,{all:true,verbatim:true}),new Promise((_,reject)=>{onAbort=()=>reject(new Error('request-timeout'));if(abort.aborted)onAbort();else abort.addEventListener('abort',onAbort,{once:true});})]).finally(()=>abort.removeEventListener('abort',onAbort));
   if(!records.length||records.some(r=>!publicAddress(r.address)))throw new Error('non-public-address');
   const agent=makeAgent({connect:{lookup:(_host,options,callback)=>{const selected=options.family?records.filter(r=>r.family===options.family):records;if(!selected.length)return callback(new Error('address-family'));if(options.all)callback(null,selected);else callback(null,selected[0].address,selected[0].family);}}});
   try{
    const response=await request(url,{headers,signal:abort,redirect:'manual',dispatcher:agent});
    if([301,302,303,307,308].includes(response.status)){
     await response.body?.cancel();
     if(redirects===3||['youtubeApi','suzuriApi'].includes(kind)||headers.Authorization||headers.authorization||!response.headers.get('location'))throw new Error('redirect-policy');
     url=new URL(response.headers.get('location'),url).href;continue;
    }
    const length=response.headers.get('content-length');
    if(length!==null&&(!/^\d+$/.test(length)||Number(length)>limit)){await response.body?.cancel();throw new Error('response-size-limit');}
    const bytes=await readLimited(response.body||[],limit);
    return {ok:response.status>=200&&response.status<300,status:response.status,headers:response.headers,url,
     text:async()=>bytes.toString('utf8'),json:async()=>JSON.parse(bytes.toString('utf8')),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
   }finally{await agent.close();}
  }
  throw new Error('redirect-policy');
 };
}
export const safeFetch=createSafeFetch();
