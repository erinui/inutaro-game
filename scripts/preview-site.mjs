import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {startSiteServer} from '../tests/helpers/site-server.mjs';
import {buildSite} from './build-site.mjs';
let temporary,options;
if(process.argv.includes('--built')){
 temporary=await mkdtemp(path.join(os.tmpdir(),'erinui-preview-'));
 const directory=path.join(temporary,'site'),files=await buildSite(directory);options={directory,files};
}
const server=await startSiteServer(options);
console.log(`Local ${temporary?'built':'source'} preview: ${server.url}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();if(temporary)await rm(temporary,{recursive:true,force:true});process.exit(0)});
