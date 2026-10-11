import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { startSiteServer } from "../tests/helpers/site-server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require("sharp");
const output = process.env.RELIABILITY_TEST_OUTPUT;
const beforeRoot = process.env.RELIABILITY_BEFORE_ROOT;
assert.ok(output && beforeRoot, "RELIABILITY_TEST_OUTPUT and RELIABILITY_BEFORE_ROOT are required");
await mkdir(output, { recursive: true });
const { startSiteServer: startBefore } = await import(pathToFileURL(path.join(beforeRoot, "tests/helpers/site-server.mjs")));
const servers = [await startBefore(), await startSiteServer()];
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: ["--disable-gpu"] });
const fixture = await readFile(new URL("../assets/home-city/youtube-thumb-1.jpg", import.meta.url));
const results = [];
try {
  for (const width of [320, 390, 1440]) {
    for (const url of ["/", "/games/", "/pages/characters.html", "/pages/blog.html", "/pages/illustrations.html", "/pages/terms.html", "/pages/privacy.html"]) {
      const shots = [];
      for (const [index, server] of servers.entries()) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.clock.install({ time: new Date("2026-10-11T00:00:00Z") });
        await page.clock.pauseAt(new Date("2026-10-11T00:00:01Z"));
        await page.route("**/*", route => {
          const url = new URL(route.request().url());
          if (url.origin === server.url) return route.continue();
          return route.request().resourceType() === "image" ? route.fulfill({ contentType: "image/jpeg", body: fixture }) : route.abort();
        });
        await page.goto(server.url + url + "?youtubePanel=0");
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;scroll-behavior:auto!important;}" });
        for (const image of await page.locator('img[loading="lazy"]').all()) await image.scrollIntoViewIfNeeded();
        await page.evaluate(async () => {
          await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
          for (const track of document.querySelectorAll(".content-carousel-track")) track.scrollLeft = 0;
          window.scrollTo(0, 0);
        });
        // Allow the decoded images to receive their final high-quality paint before freezing CSS.
        await page.clock.runFor(200);
        await page.evaluate(() => { for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = 0; } });
        shots.push(await page.screenshot({ path: path.join(output, `${index ? "after" : "before"}-${url.replaceAll("/", "_")}-${width}.png`), fullPage: true }));
        await page.close();
      }
      const before = await sharp(shots[0]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const after = await sharp(shots[1]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.deepEqual(before.info, after.info, `${url} ${width}: dimensions`);
      let changedPixels = 0;
      for (let pixel = 0; pixel < before.data.length; pixel += 4) {
        if (!before.data.subarray(pixel, pixel + 4).equals(after.data.subarray(pixel, pixel + 4))) changedPixels++;
      }
      results.push({ page: url, width, changedPixels, pixels: before.info.width * before.info.height });
      console.log(url, width, changedPixels);
      await writeFile(path.join(output, "pixel-results.json"), JSON.stringify({ externalMediaFixture: "youtube-thumb-1.jpg", results }, null, 2) + "\n");
      assert.equal(changedPixels, 0, `${url} ${width}: normal design changed`);
    }
  }
} finally {
  await browser.close();
  for (const server of servers) await server.close();
}
