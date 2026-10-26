// Test-only module instrumentation: keep real URL/size/redirect validation,
// replace only DNS, transport and connection lifecycle. Never used by workflows.
import {registerHooks} from 'node:module';
registerHooks({load(url,context,nextLoad){
 const result=nextLoad(url,context);
 if(url.endsWith('/scripts/lib/safe-fetch.mjs'))return {...result,source:result.source.toString().replace('export const safeFetch=createSafeFetch();', "export const safeFetch=createSafeFetch({resolve:async()=>[{address:'93.184.216.34',family:4}],request:(...args)=>globalThis.fetch(...args),makeAgent:()=>({close:async()=>{}})});")};
 return result;
}});
