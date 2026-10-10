import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { startSiteServer } from "../tests/helpers/site-server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const spec = JSON.parse(await readFile(new URL("../tests/fixtures/site-design.json", import.meta.url)));
const mapBaseline = JSON.parse(await readFile(new URL("../tests/fixtures/map-geometry.json", import.meta.url)));
const output = process.env.LAYOUT_TEST_OUTPUT;
const server = await startSiteServer();
let browser;
const results = [];

try {
  browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
  if (output) await mkdir(output, { recursive: true });
  const context = await browser.newContext();
  for (const width of spec.widths) {
    for (const item of spec.pages) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${server.url}${item.url}?youtubePanel=0`, { waitUntil: "domcontentloaded" });
      // Visit lazy images before full-layout proof; decode alone does not start deferred fetches.
      for (const image of await page.locator('img[loading="lazy"]').all()) await image.scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        for (const track of document.querySelectorAll(".content-carousel-track")) track.scrollLeft = 0;
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(100);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].filter(image => new URL(image.src).origin === location.origin).map(image => image.decode().catch(() => {})));
      });
      const layout = await page.evaluate(() => {
        const box = node => { const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }; };
        const header = document.querySelector(".site-header");
        const brand = header.querySelector(".brand");
        const label = brand.querySelector("span");
        const toggle = header.querySelector(".site-menu-toggle");
        const nav = header.querySelector(".site-nav");
        const h1 = document.querySelector("h1");
        const range = document.createRange(); range.selectNodeContents(h1);
        const spots = [...document.querySelectorAll(".map-guide-spots span")].map(n => ({ box: box(n), clipped: n.scrollWidth > n.clientWidth + 1 }));
        return {
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          brand: box(brand), clippedBrand: label.scrollWidth > label.clientWidth + 1,
          control: box(getComputedStyle(toggle).display === "none" ? nav : toggle),
          title: box(h1), titleText: box(range), spots,
          failedLocalImages: [...document.images].filter(n => new URL(n.src).origin === location.origin && (!n.complete || !n.naturalWidth)).map(n => n.src),
          carousels: [...document.querySelectorAll(".content-carousel-track")].map(track => ({ name: track.closest("section").getAttribute("aria-labelledby"), box: box(track), cards: [...track.children].slice(0, 3).map(box) })),
          arrows: [...document.querySelectorAll(".content-carousel-button")].map(button => { const b = box(button), i = box(button.querySelector("span")); return { x: (i.left + i.right - b.left - b.right) / 2, y: (i.top + i.bottom - b.top - b.bottom) / 2 }; }),
        };
      });
      assert.equal(layout.scrollWidth, width, `Horizontal page overflow ${width} ${item.url}`);
      assert.ok(!layout.clippedBrand, `Site name clipped ${width} ${item.url}`);
      assert.ok(layout.brand.right + 2 <= layout.control.left, `Header overlap ${width} ${item.url}`);
      assert.ok(layout.titleText.left >= -1 && layout.titleText.right <= width + 1, `Title clipped ${width} ${item.url}`);
      assert.deepEqual(layout.failedLocalImages, [], `Local images ${width} ${item.url}`);
      assert.deepEqual(errors, [], `Script errors ${width} ${item.url}`);
      for (const spot of layout.spots) assert.ok(!spot.clipped && spot.box.left >= -1 && spot.box.right <= width + 1, `Label clipped ${width}`);
      for (const carousel of layout.carousels) {
        if (width > 760 && carousel.cards.length === 3) assert.ok(carousel.cards[2].right <= carousel.box.right + 1, `Third card clipped ${width} ${carousel.name}`);
        if (width <= 760 && carousel.cards.length > 1) assert.ok(carousel.cards[1].left < carousel.box.right - 10, `SP next card hidden ${width} ${carousel.name}`);
      }
      for (const arrow of layout.arrows) assert.ok(Math.abs(arrow.x) <= 3 && Math.abs(arrow.y) <= 2, `Arrow off center ${width}`);
      const session = await context.newCDPSession(page);
      await session.send("DOM.enable"); await session.send("CSS.enable");
      const { root: dom } = await session.send("DOM.getDocument");
      const { nodeId } = await session.send("DOM.querySelector", { nodeId: dom.nodeId, selector: "h1" });
      const fonts = (await session.send("CSS.getPlatformFontsForNode", { nodeId })).fonts;
      assert.ok(fonts.some(font => /KeinannPOPjp/.test(font.familyName) && font.isCustomFont && font.glyphCount > 0), `JP font not rendered ${width} ${item.url}`);
      await session.detach();
      if (item.path === "index.html" && mapBaseline[width]) {
        const geometry = await page.evaluate(() => {
          const stage = document.querySelector(".map-stage").getBoundingClientRect();
          return [...document.querySelectorAll(".map-stage > .map-decoration, .map-stage > .map-card, .youtube-screen-background, .youtube-screen")]
            .filter(node => !node.classList.contains("map-decoration-bird"))
            .map(node => {
              const b = node.getBoundingClientRect();
              return { class: node.className, left: b.left - stage.left, top: b.top - stage.top, w: b.width, h: b.height };
            });
        });
        for (const expected of mapBaseline[width].filter(node => !node.class.includes("map-decoration-bird"))) {
          const actual = geometry.find(node => node.class === expected.class);
          assert.ok(actual, expected.class);
          for (const key of ["left", "top", "w", "h"]) assert.ok(Math.abs(actual[key] - expected[key]) <= 0.5, `Map geometry changed: ${width} ${expected.class} ${key}`);
        }
      }
      if (width <= 760) {
        await page.locator(".site-menu-toggle").click();
        await page.waitForFunction(() => document.querySelector(".site-menu-toggle").getAttribute("aria-expanded") === "true");
        await page.keyboard.press("Escape");
        assert.equal(await page.locator(".site-menu-toggle").getAttribute("aria-expanded"), "false");
      }
      if (output && [320, 390, 1440].includes(width)) await page.screenshot({ path: path.join(output, `after-${item.path.replaceAll("/", "-")}-${width}.png`), fullPage: true });
      results.push({ page: item.url, ...layout, fonts });
      await page.close();
    }
    console.log(`PASS ${width}px: 7 pages, headers, labels, carousels, JP font, menu`);
  }

  if (output) await writeFile(path.join(output, "layout-results.json"), JSON.stringify(results, null, 2));

  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${server.url}/?youtubePanel=0`);
  for (const carousel of await page.locator(".content-carousel").all()) {
    const next = carousel.locator(".content-carousel-next"), prev = carousel.locator(".content-carousel-prev"), track = carousel.locator(".content-carousel-track");
    for (let i = 0; i < 4 && await next.isEnabled(); i++) {
      await next.click();
      await page.waitForTimeout(700);
    }
    assert.ok(!await next.isEnabled(), "End control should be disabled");
    const end = await track.evaluate(n => ({ left: n.scrollLeft, max: n.scrollWidth - n.clientWidth }));
    assert.ok(Math.abs(end.left - end.max) <= 1);
    if (await prev.isEnabled()) { await prev.click(); await page.waitForTimeout(700); assert.ok(await next.isEnabled()); }
  }
  await page.locator(".map-decoration-bukurochan").click();
  await page.waitForFunction(() => document.querySelector(".map-decoration-bukurochan").classList.contains("is-questioning"));
  await page.locator(".map-decoration-sasuke").click();
  await page.waitForFunction(() => document.querySelector(".map-decoration-sasuke").classList.contains("is-walking"));
  await page.waitForFunction(() => !document.querySelector(".map-decoration-sasuke").classList.contains("is-walking") && !document.querySelector(".map-decoration-bukurochan").classList.contains("is-questioning"));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator(".site-menu-toggle").click();
  await page.setViewportSize({ width: 761, height: 900 });
  await page.waitForFunction(() => document.querySelector(".site-menu-toggle").getAttribute("aria-expanded") === "false");
  await page.close();

  const fallback = await browser.newContext();
  await fallback.route(/\/assets\/fonts\//, route => route.abort());
  for (const item of spec.pages) {
    const fallbackPage = await fallback.newPage();
    await fallbackPage.setViewportSize({ width: 320, height: 900 });
    await fallbackPage.goto(server.url + item.url);
    await fallbackPage.evaluate(() => document.fonts.ready);
    assert.ok(await fallbackPage.locator("h1").isVisible());
    assert.equal(await fallbackPage.evaluate(() => document.documentElement.scrollWidth), 320, `Fallback overflow ${item.url}`);
    await fallbackPage.close();
  }
  await fallback.close();

  const rotation = await context.newPage();
  await rotation.clock.install();
  await rotation.goto(server.url);
  await rotation.waitForFunction(() => document.querySelector(".youtube-stat-subscribers").textContent !== "取得中");
  for (const index of [1, 2, 3, 0]) {
    await rotation.clock.fastForward(10000);
    assert.equal(await rotation.locator(".map-link-youtube").evaluate(node => node.classList.contains("is-showing-stats")), index === 3);
    if (index < 3) assert.equal(await rotation.locator(".youtube-thumb.is-active").evaluate(node => [...node.parentElement.querySelectorAll(".youtube-thumb")].indexOf(node)), index);
  }
  await rotation.close();
  if (output) await writeFile(path.join(output, "layout-results.json"), JSON.stringify(results, null, 2));
  if (output) await writeFile(path.join(output, "interaction-results.json"), JSON.stringify({ carousels: "pass", decorations: "pass", menuResize: "pass", mapGeometryWidths: Object.keys(mapBaseline), fallbackCases: spec.pages.length, youtubeCycleMilliseconds: 10000, youtubePanels: [1, 2, 3, 0] }, null, 2));
  console.log(`PASS ${results.length} page/width cases, map geometry, interactions, 7 font fallback cases and YouTube rotation`);
} finally {
  await browser?.close();
  await server.close();
}
