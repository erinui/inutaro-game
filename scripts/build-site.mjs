import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateAssetManifest, applyAssetBindings, sha256 } from './lib/home-assets.mjs';
import { createYoutubeSnapshot, youtubeThumbnail } from './lib/home-youtube-snapshot.mjs';
import {validateCodeAssets} from './lib/generate-home-code.mjs';
import {applyStaticImageMetadata} from './lib/home-image-html.mjs';
import { imageDimensions } from './lib/youtube-images.mjs';
import { loadDataRecovery, normalizeDataRecovery, writeDataAliases, applyDataRoutes, verifyRequiredAssets } from './lib/home-recovery.mjs';

const root = fileURLToPath(new URL("../", import.meta.url));
const publicFiles = [
  "index.html", "home.css", "home.js", "site-nav.js", "site-migration.js",
  "robots.txt", "sitemap.xml", "_headers", "data/news.json",
  "games/index.html", "games/inutaro-mushi/index.html",
  "games/inutaro-mushi/style.css", "games/inutaro-mushi/game.js",
  ...["characters", "blog", "illustrations", "terms", "privacy"].map(name => `pages/${name}.html`),
];

export async function buildSite(output, {recovery,copy=copyFile}={}) {
  const dataRoutes=recovery ? normalizeDataRecovery(recovery) : await loadDataRecovery(root);
  // Only versioned assets belong in a release, not local drafts or downloaded originals.
  const assets = execFileSync("git", ["ls-files", "-z", "--", "assets"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  let manifest;
  try { manifest = JSON.parse(await readFile(path.join(root,'config/home-performance-assets.json'),'utf8')); }
  catch(error) { if(error.code !== 'ENOENT') throw error; }
  // Explicit, hash-verified generated files are allowed before staging; arbitrary
  // untracked assets and private configuration are never copied.
  const generated = manifest ? await validateAssetManifest(root,manifest) : [];
  if(manifest)await validateCodeAssets(root,manifest);
  const youtubeBytes=await readFile(path.join(root,'assets/home-city/youtube-latest.json'));
  const youtube=JSON.parse(youtubeBytes.toString());
  const thumbnails=[];
  for(const video of youtube.videos||[])if(video.localThumbnail){
    const image=youtubeThumbnail(video,youtube.schemaVersion),bytes=await readFile(path.join(root,image.url));
    const size=imageDimensions(bytes);
    if(sha256(bytes)!==image.sha256||size.width!==image.width||size.height!==image.height)throw new Error('Snapshot thumbnail hash or dimensions mismatch');
    thumbnails.push(image.url);
  }
  const files = [...new Set([...publicFiles, ...assets, ...generated, ...thumbnails])];
  try { await mkdir(output); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error(`Build output already exists: ${output}. Use a fresh directory.`);
    throw error;
  }
  for (const file of files) {
    const target = path.join(output, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copy(path.join(root, file), target);
    if(file.endsWith('.html')) {
      const html=await readFile(target,'utf8');
      let bound=manifest?applyStaticImageMetadata(applyAssetBindings(html,file,manifest.bindings),file,manifest):html;
      if(file==='index.html'&&manifest)bound=bound.replace('<head>','<head>\n    <link rel="preload" as="image" href="assets/home-city/map_bg.svg?v=20261010-city-name" fetchpriority="high" />');
      if(manifest?.fonts)bound=bound.replace(/<link[^>]+href=["'][^"']*keinann-pop-jp\.woff2[^"']*["'][^>]*>\s*/g,'');
      await writeFile(target,file==='index.html'?applyDataRoutes(createYoutubeSnapshot(bound,youtube),dataRoutes):bound);
    }
  }
  if(sha256(await readFile(path.join(output,'assets/home-city/youtube-latest.json')))!==sha256(youtubeBytes))throw new Error('Copied YouTube source differs from snapshot');
  files.push(...await writeDataAliases(output,dataRoutes));
  if(sha256(await readFile(path.join(root,'assets/home-city/youtube-latest.json')))!==sha256(youtubeBytes))throw new Error('YouTube source changed during build');
  for(const video of youtube.videos||[])if(video.localThumbnail){
    if(sha256(await readFile(path.join(output,video.localThumbnail.url)))!==video.localThumbnail.sha256)throw new Error('YouTube image changed during build');
  }
  if(manifest){
    const verified=await verifyRequiredAssets(output,Object.fromEntries(manifest.outputs.map(e=>[e.file,e.sha256])));
    if(!verified.passed)throw new Error('Generated asset changed during build: '+verified.failures.map(f=>f.file).join(', '));
  }
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await buildSite(path.join(root, "dist"));
  process.stdout.write(`Built ${files.length} public files in dist/\n`);
}
