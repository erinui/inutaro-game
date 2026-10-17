// Optional lab audit. Install Lighthouse separately; it is never a build dependency.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {startSiteServer} from '../tests/helpers/site-server.mjs';
const cli=process.env.HOME_LIGHTHOUSE_CLI,output=process.env.HOME_LIGHTHOUSE_OUTPUT;
if(!cli||!output)throw new Error('HOME_LIGHTHOUSE_CLI and fresh HOME_LIGHTHOUSE_OUTPUT required');
await mkdir(output,{recursive:false});const results=[];
for(const mode of ['before','after']){
 const evidence=process.env[mode==='before'?'HOME_LIGHTHOUSE_BEFORE':'HOME_LIGHTHOUSE_AFTER'];if(!evidence)throw new Error('Before/after evidence directories required');
 const directory=path.resolve(evidence,'site'),files=Object.keys(JSON.parse(await readFile(path.join(evidence,'source-hashes.json'))));
 const server=await startSiteServer({directory,files,compressed:true});
 try{
  const prefix=path.resolve(output,mode);
  await promisify(execFile)(process.execPath,[cli,server.url,'--quiet','--only-categories=performance','--chrome-flags=--headless','--output=html','--output=json',`--output-path=${prefix}`],{env:{...process.env,CHROME_PATH:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'},timeout:120000,maxBuffer:2000000});
  const report=JSON.parse(await readFile(prefix+'.report.json'));
  results.push({mode,version:report.lighthouseVersion,settings:report.configSettings,performance:report.categories.performance.score,lcp:report.audits['largest-contentful-paint'].numericValue,cls:report.audits['cumulative-layout-shift'].numericValue,runtimeError:report.runtimeError||null,warnings:report.runWarnings});
 }finally{await server.close();}
}
await writeFile(path.join(output,'summary.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.map(({settings,...result})=>result),null,2));
