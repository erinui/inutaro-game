import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {sha256} from './home-assets.mjs';
const execute=promisify(execFile);
const cache=new Map();
export async function currentFont(root) {
 const names=['scripts/build-current-font.py','assets/fonts/keinann-pop-jp.ttf','config/home-font-partitions.json',...['youtube-latest','note-latest','suzuri-latest','line-stamps'].map(n=>`assets/home-city/${n}.json`)];
 const key=sha256(Buffer.concat(await Promise.all(names.map(n=>readFile(path.join(root,n))))));
 if(!cache.has(key))cache.set(key,(async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'inutaro-font-'));
  try{
   const target=path.join(dir,'current.woff2');
   const {stdout}=await execute(process.env.INUTARO_FONT_PYTHON||'python3',[path.join(root,'scripts/build-current-font.py'),target],{timeout:120000,maxBuffer:1048576});
   const characters=JSON.parse(stdout),bytes=await readFile(target);
   if(!Array.isArray(characters)||!characters.length||characters.some(c=>!Number.isInteger(c)||c<0||c>0x10ffff))throw Error('Invalid current font coverage');
   const file=`assets/versioned/keinann-pop-jp-current.${sha256(bytes).slice(0,16)}.woff2`;
   // Later matching @font-face takes precedence. Original complete-coverage
   // faces remain available for fallback, other pages and text added later.
   const css=Buffer.from(`@font-face{font-family:"KeinannPop";font-style:normal;font-weight:400;font-display:swap;src:url("${path.posix.basename(file)}") format("woff2");unicode-range:${characters.map(c=>`U+${c.toString(16).toUpperCase()}`).join(',')};}\n`);
   return {file,bytes,css,cssFile:`assets/versioned/home-font-snapshot.${sha256(css).slice(0,16)}.css`};
  }finally{await rm(dir,{recursive:true,force:true});}
 })());
 return cache.get(key);
}
