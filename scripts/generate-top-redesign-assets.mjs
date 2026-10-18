import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {startSiteServer} from '../tests/helpers/site-server.mjs';
import {sha256, validateAssetManifest} from './lib/home-assets.mjs';
import {loadManifest, addOutput, refreshCodeAssets} from './lib/generate-home-code.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = process.argv[2];
if (!directory) throw new Error('Pass a local candidate directory; adoption requires --adopt after review');
const tileSource = 'assets/home-city/city-checker-tile.svg';
const tileHash = 'e838b97c659cc84a53aa49680ef35889ffdc86246695094388072914df1131e6';
const definitions = [
  {source:'assets/home-city/map_game.svg', width:640, height:640, kind:'map'},
  {source:'assets/home-city/map_goods.svg', width:640, height:640, kind:'map'},
  {source:tileSource, width:1920, height:768, kind:'pattern', quality:80},
  {source:'assets/characters/chara_inutaro_origin.png', width:282, height:524, kind:'top-character'},
  {source:'assets/characters/chara_inutaro_nuigurumi.png', width:551, height:524, kind:'top-character', quality:80},
  {source:'assets/characters/chara_erika-san.png', width:458, height:524, kind:'top-character'},
  {source:'assets/characters/chara_sasuke.png', width:408, height:524, kind:'top-character'},
  {source:'assets/characters/chara_bukuro.png', width:384, height:524, kind:'top-character'},
];

if (process.argv.includes('--adopt')) {
  const report = JSON.parse(await readFile(path.join(directory, 'candidates.json'), 'utf8'));
  if (report.assets.length !== definitions.length) throw new Error('Missing candidate');
  const manifest = await loadManifest(root);
  for (const definition of definitions) {
    const asset = report.assets.find(a => a.source === definition.source);
    if (!asset || asset.width !== definition.width || asset.height !== definition.height) throw new Error('Candidate dimensions changed');
    if (sha256(await readFile(asset.source)) !== asset.sourceSha256) throw new Error('Candidate original changed');
    const bytes = await readFile(asset.file);
    if (sha256(bytes) !== asset.sha256 || bytes.length > 120000) throw new Error('Candidate changed or exceeds budget');
    const stem = path.basename(asset.source, path.extname(asset.source)) + (definition.kind === 'top-character' ? '-top' : '');
    const file = await addOutput(root, manifest, stem, 'webp', bytes, {
      sources:{[asset.source]:asset.sourceSha256}, width:asset.width, height:asset.height,
      mime:'image/webp', kind:asset.kind, quality:definition.quality || 90, renderer:report.browser,
      review:{method:'full SVG rendering; TOP PC/SP screenshot comparison', date:'2026-10-18'},
    });
    if (definition.kind === 'top-character') {
      manifest.topImageBindings ||= {};
      manifest.topImageBindings[asset.source] = file;
    } else manifest.bindings[asset.source] = file;
  }
  await refreshCodeAssets(root, manifest);
  await validateAssetManifest(root, manifest);
  console.log('Added reviewed TOP candidates; retained all prior hashed outputs');
} else {
  await mkdir(directory, {recursive:true});
  const bytes = await readFile(tileSource);
  if (sha256(bytes) !== tileHash) throw new Error('Checker original differs from SDD');
  const {chromium} = createRequire(import.meta.url)('playwright');
  const sharp = createRequire(import.meta.url)('sharp');
  const server = await startSiteServer();
  const browser = await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report = {browser:browser.version(), cwebp:execFileSync('cwebp',['-version'],{encoding:'utf8'}).trim(), assets:[]};
  try {
    const page = await browser.newPage({viewport:{width:1920,height:1200}, deviceScaleFactor:1});
    for (const definition of definitions) {
      const {source, width, height, kind} = definition;
      const png = path.join(directory, path.basename(source,path.extname(source)) + '.png');
      if (kind === 'top-character') {
        await sharp(source).resize(width,height,{fit:'fill'}).png().toFile(png);
      } else {
        await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block}</style><img src="${server.url}/${source}" width="${width}" height="${height}">`);
        await page.locator('img').evaluate(n=>n.decode());
        await page.screenshot({path:png, omitBackground:true, clip:{x:0,y:0,width,height}});
      }
      const file = path.join(directory, path.basename(source,path.extname(source)) + '.webp');
      execFileSync('cwebp',['-quiet','-q',String(definition.quality || 90),png,'-o',file]);
      const encoded = await readFile(file);
      report.assets.push({source, width, height, kind, sourceSha256:sha256(await readFile(source)), file, sha256:sha256(encoded), bytes:encoded.length});
    }
    await writeFile(path.join(directory,'candidates.json'), JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  } finally { await browser.close(); await server.close(); }
}
