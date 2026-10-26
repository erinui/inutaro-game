import test from 'node:test';import assert from 'node:assert/strict';
import {createSafeFetch,publicAddress,readLimited} from '../scripts/lib/safe-fetch.mjs';
import {validPublicUrl,validRemoteUrl} from '../scripts/lib/provider-url-policy.mjs';
test('Security: provider URLs reject confusing hosts, wrong owner, plaintext and credentials',()=>{
 for(const u of ['http://note.com/erinui/n/n123','https://note.com.evil.invalid/erinui/n/n123','https://note.com/other/n/n123','https://x:y@note.com/erinui/n/n123'])assert.equal(validPublicUrl(u,'note'),false,u);
 assert.equal(validPublicUrl('https://note.com/erinui/n/n123','note'),true);
 assert.equal(validRemoteUrl('https://example.invalid/a.png','noteImage'),false);
});
test('Security: IPv4, IPv6 and mapped internal destinations are denied',()=>{
 for(const ip of ['127.0.0.1','10.1.1.1','169.254.169.254','100.64.0.1','::1','fd00::1','::ffff:127.0.0.1','fe80::1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('8.8.8.8'),true);
});
test('Security: streamed body stops before buffering over the limit',async()=>{
 let pulled=0;async function* body(){for(let i=0;i<10;i++){pulled++;yield Buffer.alloc(6);}}
 await assert.rejects(readLimited(body(),10),/response-size-limit/);assert.equal(pulled,2);
});
test('Security: all DNS results are checked and redirect targets rechecked before requesting',async()=>{
 let requests=0,closed=0;const agent=()=>({close:async()=>closed++});
 const f=createSafeFetch({resolve:async()=>[{address:'127.0.0.1',family:4}],makeAgent:agent,request:async()=>{requests++;}});
 await assert.rejects(f('https://note.com/erinui/n/n123',{kind:'noteArticle'}),/non-public-address/);assert.equal(requests,0);
 const g=createSafeFetch({resolve:async()=>[{address:'8.8.8.8',family:4}],makeAgent:agent,request:async()=>{requests++;return new Response(null,{status:302,headers:{Location:'https://evil.invalid/a'}});}});
 await assert.rejects(g('https://note.com/erinui/n/n123',{kind:'noteArticle'}),/remote-url-policy/);assert.equal(requests,1);assert.equal(closed,1);
});
test('Security: credentialed API redirects never forward credentials',async()=>{
 let requests=0;const f=createSafeFetch({resolve:async()=>[{address:'8.8.8.8',family:4}],makeAgent:()=>({close:async()=>{}}),request:async()=>{requests++;return new Response(null,{status:302,headers:{Location:'https://suzuri.jp/api/v1/products'}});}});
 await assert.rejects(f('https://suzuri.jp/api/v1/products',{kind:'suzuriApi',headers:{Authorization:'Bearer dummy'}}),/redirect-policy/);assert.equal(requests,1);
});
