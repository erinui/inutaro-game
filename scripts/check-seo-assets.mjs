import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { buildSite } from "./build-site.mjs";

const require = createRequire(import.meta.url);
const xml = require("xml-js");
const sharp = require("sharp");
const { chromium } = require("playwright");
const output = process.env.SEO_ASSET_OUTPUT;
if (!output) throw new Error("Set SEO_ASSET_OUTPUT to a new candidate evidence directory.");
await mkdir(output, { recursive: true });
const snapshot = path.join(output, "source");
const files = await buildSite(snapshot);
const imageFile = "assets/home-city/map_sns2.svg";
const original = await readFile(path.join(snapshot, imageFile), "utf8");
const doc = xml.xml2js(original);
const images = [];
function collect(node) {
  if (node.name === "image") images.push(node);
  for (const child of node.elements || []) collect(child);
}
collect(doc);
const embedded = images.find(image => (image.attributes?.["xlink:href"] || image.attributes?.href || "").startsWith("data:image/png;base64,"));
assert.ok(embedded, "Expected one PNG embedded in X SVG");
const attribute = embedded.attributes["xlink:href"] ? "xlink:href" : "href";
const beforeUri = embedded.attributes[attribute];
const png = Buffer.from(beforeUri.split(",")[1], "base64");
const webp = process.env.SEO_IMAGE_CANDIDATE_WEBP
  ? await readFile(process.env.SEO_IMAGE_CANDIDATE_WEBP)
  : await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
const afterUri = `data:image/webp;base64,${webp.toString("base64")}`;
assert.equal(original.split(beforeUri).length - 1, 1);
const candidate = original.replace(beforeUri, afterUri);
const candidateDoc = xml.xml2js(candidate);
embedded.attributes[attribute] = afterUri;
assert.deepEqual(candidateDoc, doc, "Only the embedded data URI may change");
const a = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const b = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
assert.deepEqual(a.info, b.info);
let alphaDifferences = 0, visibleDifferences = 0, transparentRgbDifferences = 0;
for (let i = 0; i < a.data.length; i += 4) {
  if (a.data[i + 3] !== b.data[i + 3]) alphaDifferences++;
  if (!a.data.subarray(i, i + 3).equals(b.data.subarray(i, i + 3))) {
    if (a.data[i + 3] > 0) visibleDifferences++;
    else transparentRgbDifferences++;
  }
}
assert.equal(alphaDifferences, 0);
assert.equal(visibleDifferences, 0);
await writeFile(path.join(output, "map_sns2-candidate.svg"), candidate);
const report = { pngBytes: png.length, webpBytes: webp.length, originalGzip: gzipSync(original).length, candidateGzip: gzipSync(candidate).length, dimensions: a.info, alphaDifferences, visibleDifferences, transparentRgbDifferences, browser: [], safari: "not verified" };
const fontFile = "assets/fonts/keinann-pop-jp.woff2";
const fontCandidate = process.env.SEO_FONT_CANDIDATE;
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const server = http.createServer(async (req, res) => {
  let relative = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/+/, "");
  if (!relative || relative.endsWith("/")) relative += "index.html";
  if (!files.includes(relative)) return res.writeHead(404).end();
  const mode = new URL(req.headers.referer || "http://localhost").searchParams.get("candidate");
  res.setHeader("Content-Type", mime[path.extname(relative)] || "application/octet-stream");
  if (["original", "image", "font"].includes(mode) && relative.endsWith(".js")) return res.end("");
  if (relative === imageFile && mode === "image") return res.end(candidate);
  if (relative === fontFile && mode === "font" && fontCandidate) return res.end(await readFile(fontCandidate));
  res.end(await readFile(path.join(snapshot, relative)));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
console.log(`Candidate server: ${url}`);
let browser;
try {
  browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
  for (const width of [390, 1440]) {
    for (const dpr of [1, 2]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr, javaScriptEnabled: false });
      const page = await context.newPage();
      const proofs = [];
      for (const [iteration, mode] of ["original", "original", "image"].entries()) {
        console.log(`Compare ${width}/${dpr}/${mode}`);
        await page.goto(`${url}/?youtubePanel=0&candidate=${mode}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => {
          const style = document.createElement("style");
          style.textContent = "*, *::before, *::after { animation: none !important; transition: none !important; }";
          document.head.append(style);
        });
        const link = page.locator(".map-link-sns");
        await page.mouse.move(0, 0);
        await link.scrollIntoViewIfNeeded();
        await link.locator("img").evaluate(image => image.decode());
        const box = await link.boundingBox();
        const clip = { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: box.width + 40, height: box.height + 40 };
        await page.mouse.move(0, 0);
        const normal = await page.screenshot({ clip });
        await link.hover();
        const hover = await page.screenshot({ clip });
        proofs.push({ normal, hover });
        await writeFile(path.join(output, `${mode}-${iteration}-${width}-${dpr}-normal.png`), normal);
        await writeFile(path.join(output, `${mode}-${iteration}-${width}-${dpr}-hover.png`), hover);
      }
      for (const state of ["normal", "hover"]) {
        const before = await sharp(proofs[1][state]).raw().toBuffer();
        const after = await sharp(proofs[2][state]).raw().toBuffer();
        const control = await sharp(proofs[0][state]).raw().toBuffer();
        let differences = 0, controlDifferences = 0;
        for (let i = 0; i < before.length; i++) { if (before[i] !== after[i]) differences++; if (before[i] !== control[i]) controlDifferences++; }
        report.browser.push({ width, dpr, state, differentBytes: differences, controlDifferentBytes: controlDifferences, sameDimensions: before.length === after.length });
      }
      await context.close();
    }
  }
  await writeFile(path.join(output, "asset-comparison.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (process.env.SEO_KEEP_CANDIDATE_SERVER === "1") await new Promise(() => {});
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
