import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const registry=JSON.parse(await readFile(new URL('../fixtures/security-hardening-changes.json',import.meta.url),'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
export function restoreHardeningChanges(file,source){
 const entry=registry.files[file];
 if(!entry||hash(source)!==entry.afterSha256)return source;
 assert.equal(hash(entry.before),entry.beforeSha256,`${file}: hardening baseline`);
 return entry.before;
}
