// Release inventory/rollback gate. Never deploys or modifies a release directory.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {sha256} from './lib/home-assets.mjs';
import {verifyRequiredAssets} from './lib/home-recovery.mjs';
const [command,directory,...inventories]=process.argv.slice(2);
if(!['capture','verify'].includes(command)||!directory||!inventories.length)throw new Error('Usage: node scripts/check-home-recovery.mjs capture <built-site> <new-inventory.json> | verify <candidate-site> <inventory.json> [...]');
if(command==='capture'){
 if(inventories.length!==1)throw new Error('Capture requires one output');
 const assets={};
 async function walk(relative){for(const entry of await readdir(path.join(directory,relative),{withFileTypes:true})){
  const file=path.posix.join(relative,entry.name);if(entry.isDirectory())await walk(file);
  else if(entry.isFile()){if(/\.[a-f0-9]{16}\.(?:webp|woff2|css|js)$|youtube-thumb-[\w-]+-[a-f0-9]{16}\.webp$/.test(file))assets[file]=sha256(await readFile(path.join(directory,file)));}
  else throw new Error('Release inventory cannot contain symlinks');
 }}
 await walk('assets');
 await writeFile(inventories[0],JSON.stringify({version:1,assets},null,2)+'\n',{flag:'wx'});
 console.log(`Captured ${Object.keys(assets).length} required assets`);
}else{
 const required={};
 for(const inventory of inventories){const data=JSON.parse(await readFile(inventory,'utf8'));if(data.version!==1||!data.assets||Array.isArray(data.assets))throw new Error('Invalid inventory');
  for(const [file,hash] of Object.entries(data.assets)){
   if(required[file]&&required[file]!==hash)throw new Error('Conflicting immutable asset');required[file]=hash;
  }
 }
 const result=await verifyRequiredAssets(directory,required);console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
}
