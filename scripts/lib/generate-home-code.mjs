import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fontFacesCss,validateFontPolicy } from './home-fonts.mjs';
import { sha256, rewriteCss, rewriteJsAssetUrls } from './home-assets.mjs';

export async function loadManifest(root) {
  try { return JSON.parse(await readFile(path.join(root,'config/home-performance-assets.json'),'utf8')); }
  catch(error) { if(error.code!=='ENOENT')throw error; return {version:1,bindings:{},activeOutputs:[],outputs:[]}; }
}
export async function addOutput(root, manifest, name, extension, bytes, details) {
  const hash=sha256(bytes), file=`assets/versioned/${name}.${hash.slice(0,16)}.${extension}`;
  await mkdir(path.join(root,'assets/versioned'),{recursive:true});
  try { const existing=await readFile(path.join(root,file)); if(!existing.equals(bytes))throw new Error('Hash collision'); }
  catch(error) { if(error.code!=='ENOENT')throw error; await writeFile(path.join(root,file),bytes,{flag:'wx'}); }
  const entry={file,sha256:hash,bytes:bytes.length,...details};
  const old=manifest.outputs.find(e=>e.file===file);
  if(old && old.sha256!==hash)throw new Error('Hash collision');
  manifest.outputs=manifest.outputs.filter(e=>e.file!==file).concat(entry);
  return file;
}
export async function saveManifest(root,manifest) {
  await mkdir(path.join(root,'config'),{recursive:true});
  const filename=path.join(root,'config/home-performance-assets.json');
  await writeFile(filename+'.tmp',JSON.stringify(manifest,null,2)+'\n');
  await rename(filename+'.tmp',filename);
}
export async function renderCodeAssets(root,manifest){
  const code=[];
  for(const source of ['home.js','site-nav.js','site-migration.js','home.css']) {
    const bytes=await readFile(path.join(root,source));
    const extension=path.extname(source).slice(1), name=path.basename(source,'.'+extension);
    let contents=bytes.toString();
    if(extension==='css') {
      if(manifest.fonts)validateFontPolicy(contents,manifest.fonts);
      contents=rewriteCss(contents,source,'assets/versioned/placeholder.css',manifest.bindings);
      if(manifest.fonts){
        const faces=[...contents.matchAll(/@font-face\s*\{[^}]*\}/g)].map(m=>m[0]).filter(face=>face.includes('KeinannPop')&&face.includes('keinann-pop-jp.woff2'));
        if(faces.length!==1)throw new Error('Missing or ambiguous JP font face');
        contents=contents.replace(faces[0],fontFacesCss(manifest.fonts));
      }
    } else contents=rewriteJsAssetUrls(contents,manifest.bindings);
    code.push({source,bytes,contents,extension,name});
  }
  return code;
}
export async function validateCodeAssets(root,manifest){
  for(const {source,contents} of await renderCodeAssets(root,manifest)){
    const target=manifest.bindings[source];
    if(!target||sha256(await readFile(path.join(root,target)))!==sha256(contents))throw new Error(`Code asset stale: ${source}; refresh code assets`);
  }
}
export async function refreshCodeAssets(root,manifest=undefined) {
  manifest ||= await loadManifest(root);
  for(const {source,bytes,contents,extension,name} of await renderCodeAssets(root,manifest)) {
    const output=await addOutput(root,manifest,name,extension,Buffer.from(contents),{sources:{[source]:sha256(bytes)},kind:extension,mime:extension==='css'?'text/css':'text/javascript'});
    manifest.bindings[source]=output;
  }
  await saveManifest(root,manifest);
  return manifest;
}
