import http from "node:http";
import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildSite } from "./build-site.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const output = process.env.SEO_PERFORMANCE_OUTPUT;
if (!output) throw new Error("Set SEO_PERFORMANCE_OUTPUT to a new evidence directory.");
await mkdir(output, { recursive: true });
const snapshot = path.join(output, "source");
const files = await buildSite(snapshot);
const hashes = {};
for (const file of files) hashes[file] = createHash("sha256").update(await readFile(path.join(snapshot, file))).digest("hex");
await writeFile(path.join(output, "source-hashes.json"), JSON.stringify(hashes, null, 2));
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const server = http.createServer(async (req, res) => {
  let relative = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/+/, "");
  if (!relative || relative.endsWith("/")) relative += "index.html";
  if (!files.includes(relative)) return res.writeHead(404).end();
  res.setHeader("Content-Type", mime[path.extname(relative)] || "application/octet-stream");
  res.end(await readFile(path.join(snapshot, relative)));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = process.env.SEO_PERFORMANCE_URL || `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
try {
  browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      await session.send("Network.enable");
      await session.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 6000000 / 8, uploadThroughput: 1500000 / 8 });
      await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.addInitScript(() => {
        window.seoMetrics = { lcp: 0, cls: 0 };
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.seoMetrics.lcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.seoMetrics.cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(`${url}/?youtubePanel=0`, { waitUntil: "commit" });
      await page.waitForFunction(() => performance.now() >= 30000, null, { timeout: 45000 });
      const initial = await page.evaluate(() => ({
        ...window.seoMetrics,
        elapsed: performance.now(),
        sameOriginBytes: performance.getEntriesByType("resource").filter(e => new URL(e.name).origin === location.origin).reduce((total, e) => total + e.encodedBodySize, 0),
        externalTimingUnknown: performance.getEntriesByType("resource").filter(e => new URL(e.name).origin !== location.origin && e.encodedBodySize === 0).map(e => e.name),
        incompleteImages: [...document.images].filter(img => !img.complete && img.loading !== "lazy").map(img => img.src),
        imageCount: document.images.length,
        lazyImages: [...document.images].filter(img => img.loading === "lazy").length,
      }));
      if (run === 1) {
        await page.evaluate(async () => {
          await document.fonts.ready;
          for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = 0; }
        });
        await page.screenshot({ path: path.join(output, `initial-${viewport.width}.png`) });
        for (const section of await page.locator(".content-carousel").all()) {
          await section.scrollIntoViewIfNeeded();
          for (const image of await section.locator("img").all()) await image.scrollIntoViewIfNeeded();
          await section.locator(".content-carousel-track").evaluate(track => { track.scrollLeft = 0; });
        }
        // Scrolling must trigger native lazy loading before taking the full-page proof.
        await page.evaluate(async () => {
          for (const img of document.images) {
            if (new URL(img.src).origin === location.origin) await img.decode().catch(() => {});
          }
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(output, `full-${viewport.width}.png`), fullPage: true });
      }
      results.push({ url, viewport, run, browser: browser.version(), initial });
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
  }
  await writeFile(path.join(output, "performance.json"), JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
