// Child-process fixture; no external network and no real credential is used.
import {appendFileSync} from 'node:fs';
const base='a'.repeat(40),head='b'.repeat(40);
globalThis.fetch=async(url,options={})=>{
 const u=new URL(url);if(u.origin!=='https://api.github.com')throw new Error('Unexpected network');
 const route=u.pathname.replace('/repos/erinui/inutaro-game','');
 const body=options.body?JSON.parse(options.body):null;
 appendFileSync(process.env.PUBLISH_FIXTURE_LOG,JSON.stringify({route,method:options.method||'GET',...(route.endsWith('/merge')?{body}:{}),...(route==='/git/trees'?{paths:body.tree.map(e=>e.path)}:{})})+'\n');
 const json=data=>Response.json(data);
 if(route==='/git/ref/heads/main')return json({object:{sha:process.env.PUBLISH_FIXTURE_MODE==='stale'?'c'.repeat(40):base}});
 if(route==='/git/blobs')return json({sha:'d'.repeat(40)});
 if(route===`/git/commits/${base}`)return json({tree:{sha:'e'.repeat(40)}});
 if(route==='/git/trees')return json({sha:'f'.repeat(40)});
 if(route==='/git/commits')return json({sha:head});
 if(route==='/git/refs')return json({object:{sha:head}});
 if(route==='/pulls')return json({number:999,html_url:'https://github.com/erinui/inutaro-game/pull/999'});
 if(route.endsWith('/dispatches'))return new Response(null,{status:204});
 if(route.endsWith('/runs'))return json({workflow_runs:[{head_sha:head,status:'completed',conclusion:process.env.PUBLISH_FIXTURE_MODE==='failed'?'failure':'success'}]});
 if(route==='/pulls/999/merge')return json({merged:true,sha:head});
 throw new Error(`Unexpected fixture API ${route}`);
};
