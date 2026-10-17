import { createHash } from 'node:crypto';
import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function rewriteJsAssetUrls(source,bindings={}){
  return source.replace(/(["'])(assets\/[^"'\n]+)\1/g,(original,quote,url)=>{
    const target=bindings[url.split(/[?#]/)[0]];
    return target?quote+target+quote:original;
  });
}
const safePath = file => typeof file === 'string' && !file.includes('\\') && !path.posix.isAbsolute(file) && path.posix.normalize(file) === file && !file.split('/').some(p => !p || p === '..' || p.startsWith('.'));
function resolveReference(url, sourceFile) {
  if (/^(?:[a-z]+:|\/\/|#|\/)/i.test(url)) return null;
  const [file] = url.split(/[?#]/);
  return path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile),file));
}
export function rewriteCss(source, sourceFile, outputFile, bindings = {}) {
  return source.replace(/url\(\s*(["']?)([^\s"')]+)\1\s*\)/g,(original,quote,url)=>{
    const resolved=resolveReference(url,sourceFile);
    if (!resolved) return original;
    const bound=bindings[resolved];
    const suffix=bound?'':url.slice(url.split(/[?#]/)[0].length);
    return `url(${quote}${path.posix.relative(path.posix.dirname(outputFile),bound||resolved)}${suffix}${quote})`;
  });
}
export async function validateAssetManifest(root, manifest) {
  if(manifest?.version!==1 || !Array.isArray(manifest.outputs) || !manifest.bindings || typeof manifest.bindings!=='object') throw new Error('Invalid asset manifest');
  const selected=new Set([...Object.values(manifest.bindings),...(manifest.activeOutputs||[])]);
  const files=new Set();
  for(const [file,metadata] of Object.entries(manifest.imageDimensions||{})){
    if(!safePath(file)||!Number.isInteger(metadata.width)||!Number.isInteger(metadata.height)||metadata.width<1||metadata.height<1)throw new Error('Invalid image metadata');
    if(sha256(await readFile(path.join(root,file)))!==metadata.sha256)throw new Error(`Image metadata stale: ${file}`);
  }
  for(const entry of manifest.outputs) {
    if(!safePath(entry.file)||!entry.file.startsWith('assets/versioned/')||!/^\w[\w.-]*\.[a-f0-9]{16}\.[a-z0-9]+$/.test(path.posix.basename(entry.file))) throw new Error('Invalid asset path');
    if(files.has(entry.file)) throw new Error('Duplicate asset path');
    files.add(entry.file);
    let bytes;
    try {
      const filename=path.join(root,entry.file);
      if(!(await lstat(filename)).isFile()) throw new Error('not-file');
      bytes=await readFile(filename);
    } catch { throw new Error(`Asset missing or not a regular file: ${entry.file}`); }
    if(sha256(bytes)!==entry.sha256 || !entry.file.includes(`.${entry.sha256.slice(0,16)}.`)) throw new Error(`Asset hash mismatch: ${entry.file}`);
    if(selected.has(entry.file)) for(const [file,hash] of Object.entries(entry.sources||{})) {
      if(!safePath(file)) throw new Error('Invalid source path');
      if(sha256(await readFile(path.join(root,file)))!==hash) throw new Error(`Asset stale: ${entry.file} (${file})`);
    }
  }
  for(const [source,file] of Object.entries(manifest.bindings)) if(!safePath(source)||!files.has(file)) throw new Error('Invalid binding path or missing output');
  for(const file of selected) if(!files.has(file)) throw new Error('Missing active output');
  return [...files];
}
export function applyAssetBindings(html, htmlFile, bindings) {
  return html.replace(/\b(src|href)=(['"])([^'"<>]+)\2/g,(original,attribute,quote,url)=>{
    const target=bindings[resolveReference(url,htmlFile)];
    return target ? `${attribute}=${quote}${path.posix.relative(path.posix.dirname(htmlFile),target)}${quote}` : original;
  });
}
