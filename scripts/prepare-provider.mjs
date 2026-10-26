import {mkdir,writeFile,rm} from 'node:fs/promises';import path from 'node:path';
import {runCollector} from './update-home-latest.mjs';import {assertNodeVersion} from './check-node-version.mjs';
assertNodeVersion();
const [id,output]=process.argv.slice(2);if(!['youtube','note','suzuri'].includes(id)||!output)throw new Error('Invalid provider');
await mkdir(output,{recursive:false});
let state='success';
try{
 if(id==='suzuri'&&!process.env.SUZURI_ACCESS_TOKEN)state='skipped';
 else await runCollector({id,script:`update-${id}-latest.mjs`},{root:process.cwd(),stage:output,env:{...process.env,INUTARO_FETCH_ONLY:'1'}});
}catch{state='failed';await rm(output,{recursive:true,force:true});await mkdir(output);}
await writeFile(path.join(output,'_status.json'),JSON.stringify({provider:id,state})+'\n');
console.log(`${id}: ${state}`);
