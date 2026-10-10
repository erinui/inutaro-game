import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = process.env.LAYOUT_TEST_OUTPUT;
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const server = http.createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, relative);
    if (!file.startsWith(root) || !/^(index\.html|home\.(css|js)|site-nav\.js|assets\/)/.test(relative)) {
      res.writeHead(404).end();
      return;
    }
    const bytes = await readFile(file);
    res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});

let browser;
const results = [];
try {
  if (output) await mkdir(output, { recursive: true });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  browser = await puppeteer.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width <= 430, hasTouch: width <= 430 });
    await page.goto(`http://127.0.0.1:${server.address().port}/?youtubePanel=0`, { waitUntil: "networkidle0" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    });
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      failedImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
      tracks: [...document.querySelectorAll(".content-carousel-track")].map(track => {
        const box = track.getBoundingClientRect();
        const first = track.children[0].getBoundingClientRect();
        const second = track.children[1]?.getBoundingClientRect();
        return { name: track.closest("section").getAttribute("aria-labelledby"), width: box.width, cardWidth: first.width, rightRoom: box.right - first.right, nextPeek: second ? box.right - second.left : null };
      }),
    }));
    assert.equal(layout.scrollWidth, width, `Page overflow at ${width}`);
    assert.deepEqual(layout.failedImages, [], `Image load at ${width}`);
    assert.deepEqual(errors, [], `JavaScript errors at ${width}`);
    for (const track of layout.tracks) {
      assert.ok(track.rightRoom >= 5, `Card shadow clipped: ${width} ${track.name}`);
      if (width <= 430 && track.nextPeek !== null) assert.ok(track.nextPeek >= 16, `Next card hidden: ${width} ${track.name}`);
    }
    const tracks = await page.$$(".content-carousel-track");
    const ends = [];
    for (const track of tracks) {
      await track.evaluate(t => { t.style.scrollBehavior = "auto"; t.scrollLeft = t.scrollWidth; });
      await page.waitForFunction(t => Math.abs(t.scrollLeft - (t.scrollWidth - t.clientWidth)) <= 1, {}, track);
      // The scroll handler updates disabled controls on the following frame.
      await page.waitForFunction(t => t.closest(".content-carousel").querySelector(".content-carousel-next").disabled, {}, track);
      const end = await track.evaluate(t => ({ name: t.closest("section").getAttribute("aria-labelledby"), left: t.scrollLeft, max: t.scrollWidth - t.clientWidth }));
      assert.ok(Math.abs(end.left - end.max) <= 1);
      ends.push(end);
    }
    results.push({ ...layout, ends });
    if (output) await page.screenshot({ path: path.join(output, `end-${width}.png`), fullPage: true });
    console.log(`PASS ${width}px: ${layout.tracks.length} carousels, images, overflow, end controls`);
    await page.close();
  }
  if (output) await writeFile(path.join(output, "layout-results.json"), JSON.stringify(results, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
