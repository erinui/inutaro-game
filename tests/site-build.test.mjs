import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { root } from "./helpers/site-server.mjs";
import { sha256,bindingsForDocument } from '../scripts/lib/home-assets.mjs';
import {htmlNodes,attrs} from '../scripts/lib/home-youtube-snapshot.mjs';

function withoutSnapshotSlots(html) {
  const nodes=htmlNodes(html),edits=[];
  for(const node of nodes) {
    if('data-latest-video-index' in node.attrs||node.attrs.id==='home-youtube-snapshot-data')edits.push({start:node.start,end:node.end,value:''});
    else if((node.attrs.class||'').split(/\s/).some(c=>c==='youtube-stat-subscribers'||c==='youtube-stat-videos'))edits.push({start:node.openEnd,end:node.endStart,value:''});
  }
  for(const e of edits.sort((a,b)=>b.start-a.start))html=html.slice(0,e.start)+e.value+html.slice(e.end);
  return html.replace(/ data-youtube-snapshot="[a-f0-9]{64}"/,'');
}

test("SEO-PUBLISH-01: deploy output contains only approved public files", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "erinui-build-test-"));
  const output = path.join(temp, "dist");
  try {
    const { buildSite } = await import("../scripts/build-site.mjs");
    const files = await buildSite(output);
    const spec = JSON.parse(await readFile(path.join(root, "tests/fixtures/seo.json")));
    let manifest;
    try { manifest=JSON.parse(await readFile(path.join(root,'config/home-performance-assets.json'),'utf8')); } catch(error){if(error.code!=='ENOENT')throw error;}
    const normalize=(html,document)=>{
      const edits=htmlNodes(html).filter(n=>n.tag==='img').map(n=>{
        const values={...n.attrs};
        const headerCharacter=manifest?.topImageBindings?.['assets/characters/chara_inutaro_origin.png'];
        if(n.parent?.attrs.class==='brand'&&headerCharacter&&new URL(values.src,new URL(document,'https://fixture.invalid/')).pathname==='/'+headerCharacter){
          values.src=path.posix.relative(path.posix.dirname(document),'assets/characters/chara_inutaro_origin.png');
        }
        return {start:n.start,end:n.openEnd,value:'<img '+Object.entries(values).filter(([k])=>!['width','height','decoding'].includes(k)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+JSON.stringify(k==='src'&&/icon-192\.png/.test(v)?v.split('?')[0]:v)).join(' ')+' />'};
      });
      for(const e of edits.reverse())html=html.slice(0,e.start)+e.value+html.slice(e.end);
      html=html.replace(/\n    <link rel="preload" as="image" href="assets\/home-city\/map_bg\.svg\?v=20261010-city-name" fetchpriority="high" \/>/,'');
      const pattern=manifest?.bindings['assets/home-city/city-checker-tile.svg'];
      if(document==='index.html'&&pattern)html=html.replace(`\n    <link rel="preload" as="image" href="${pattern}" fetchpriority="high" />`,'');
      html=html.replace(/<link[^>]+href=["'][^"']*keinann-pop-jp\.woff2[^"']*["'][^>]*>\s*/g,'');
      if(manifest?.headerLogo)html=html.replaceAll(manifest.headerLogo.file,'assets/icon-192.png');
      return html.replace(/\b(src|href)=(["'])([^"'<>]+)\2/g,(original,name,q,url)=>{
      const resolved=new URL(url,new URL(document,'https://fixture.invalid/'));
      if(resolved.origin!=='https://fixture.invalid')return original;
      const pathname=resolved.pathname.slice(1);
      const binding=Object.entries(manifest?bindingsForDocument(manifest,document):{}).find(([source,target])=>source===pathname||target===pathname);
      return binding?`${name}=${q}approved:${binding[0]}${q}`:original;
    });
    };
    for (const item of spec.pages) {
      const actual=await readFile(path.join(output,item.file),'utf8'),source=await readFile(path.join(root,item.file),'utf8');
      const clean=value=>item.file==='index.html'?withoutSnapshotSlots(normalize(value,item.file)):normalize(value,item.file);
      assert.equal(clean(actual),clean(source),'Only approved asset URLs and explicit YouTube slots can change');
    }
    for(const entry of manifest?.outputs||[]) {
      assert.ok(files.includes(entry.file));
      assert.equal(sha256(await readFile(path.join(output,entry.file))),entry.sha256);
    }
    const assets = execFileSync("git", ["ls-files", "-z", "--", "assets"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
    for (const file of assets) assert.deepEqual(await readFile(path.join(output, file)), await readFile(path.join(root, file)), file);
    assert.ok(files.includes("data/news.json"));
    assert.ok(files.every(file => /^(assets\/|pages\/[\w-]+\.html$|games\/(index\.html|inutaro-mushi\/(index\.html|style\.css|game\.js))$|data\/news\.json$|index\.html$|home\.(css|js)$|site-(nav|migration)\.js$|robots\.txt$|sitemap\.xml$|_headers$)/.test(file)), "No source, secrets, drafts, docs or tests in deployed output");
    assert.deepEqual((await readdir(output)).sort(), ["_headers", "assets", "data", "games", "home.css", "home.js", "index.html", "pages", "robots.txt", "site-migration.js", "site-nav.js", "sitemap.xml"].sort());
    await assert.rejects(buildSite(output), /already exists/, "Do not silently delete or overwrite an existing directory");
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("SEO-PREVIEW-01: preview headers are host-scoped, not global noindex", async () => {
  const headers = await readFile(path.join(root, "_headers"), "utf8");
  assert.match(headers, /https:\/\/inutaro-game\.erikanuinui\.workers\.dev\/\*\s+X-Robots-Tag: noindex/);
  assert.match(headers, /https:\/\/:version-inutaro-game\.erikanuinui\.workers\.dev\/\*\s+X-Robots-Tag: noindex/);
  assert.ok(!headers.includes("erinui.com"));
  assert.ok(!/^\/\*\s+X-Robots-Tag:\s*noindex/m.test(headers));
});

test('HP-REVIEW-02: a generated file changed while copying must not become a valid immutable release',async()=>{
 const {copyFile,writeFile}=await import('node:fs/promises');
 const {buildSite}=await import('../scripts/build-site.mjs');
 const manifest=JSON.parse(await readFile(path.join(root,'config/home-performance-assets.json'),'utf8'));
 const target=manifest.bindings['home.js'];
 const temp=await mkdtemp(path.join(os.tmpdir(),'erinui-copy-race-'));
 try{
  await assert.rejects(buildSite(path.join(temp,'site'),{copy:async(source,destination)=>{await copyFile(source,destination);if(destination.endsWith(target))await writeFile(destination,'changed during copy');}}),/Generated asset changed/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
