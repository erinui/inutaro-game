import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require("sharp");
const url = process.env.SEO_CANDIDATE_URL;
const output = process.env.SEO_FONT_LAYOUT_OUTPUT;
assert.ok(url && output, "Set SEO_CANDIDATE_URL and SEO_FONT_LAYOUT_OUTPUT");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE });
const report = [];
try {
  for (const width of [390, 1440]) {
    for (const pagePath of ["/", "/pages/characters.html", "/games/"]) {
      for (const dpr of pagePath === "/" ? [1, 2] : [1]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr });
        const page = await context.newPage();
        const captures = [];
        for (const [iteration, mode] of ["original", "original", "font"].entries()) {
          await page.goto(`${url}${pagePath}?candidate=${mode}&youtubePanel=0`, { waitUntil: "domcontentloaded" });
          await page.evaluate(() => { const style = document.createElement("style"); style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}"; document.head.append(style); });
          for (const image of await page.locator("img").all()) await image.scrollIntoViewIfNeeded();
          await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); window.scrollTo(0, 0); });
          await page.mouse.move(0, 0);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const layout = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,p,.brand span,.map-guide-spots span")].map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent, x: r.x, y: r.y, w: r.width, h: r.height }; }));
          const image = await page.screenshot({ fullPage: true });
          const name = pagePath === "/" ? "top" : pagePath.includes("characters") ? "characters" : "games";
          await writeFile(path.join(output, `${name}-${width}-${dpr}-${mode}-${iteration}.png`), image);
          captures.push({ layout, image });
        }
        assert.deepEqual(captures[1].layout, captures[2].layout, "Text positions and wrapping must be unchanged");
        const a = await sharp(captures[1].image).raw().toBuffer();
        const b = await sharp(captures[2].image).raw().toBuffer();
        const control = await sharp(captures[0].image).raw().toBuffer();
        let differences = 0, controlDifferences = 0;
        for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) differences++; if (a[i] !== control[i]) controlDifferences++; }
        report.push({ pagePath, width, dpr, differentBytes: differences, controlDifferentBytes: controlDifferences, sameDimensions: a.length === b.length, equalTextLayout: true });
        console.log(JSON.stringify(report.at(-1)));
        await context.close();
      }
    }
  }
  await writeFile(path.join(output, "font-layout.json"), JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
