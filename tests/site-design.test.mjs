import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { root, startSiteServer } from "./helpers/site-server.mjs";
import { restoreApprovedSeoChanges, approvedUpstreamHash } from "./helpers/approved-seo-changes.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const xml = require("xml-js");
const spec = JSON.parse(await readFile(new URL("./fixtures/site-design.json", import.meta.url)));
const seo = JSON.parse(await readFile(new URL("./fixtures/seo.json", import.meta.url)));
const baseline = JSON.parse(await readFile(new URL("./fixtures/site-design-baseline.json", import.meta.url)));
const normalize = text => text.replace(/\s/g, "");
let server, browser;

before(async () => {
  server = await startSiteServer();
  browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
});
after(async () => { await browser?.close(); await server?.close(); });

for (const item of spec.pages) {
  test(`SDD copy, metadata, font and preserved links: ${item.url}`, async () => {
    const page = await browser.newPage({ javaScriptEnabled: false });
    try {
      await page.goto(server.url + item.url, { waitUntil: "domcontentloaded" });
      const metadata = seo.pages.find(node => node.file === item.path);
      assert.equal(await page.title(), metadata.title);
      assert.equal(await page.locator("h1").innerText(), item.h1);
      assert.equal(await page.locator(".brand span").innerText(), spec.siteName);
      assert.equal(await page.locator(".brand").getAttribute("aria-label"), `${spec.siteName} トップへ`);
      assert.equal(await page.locator('meta[property="og:site_name"]').getAttribute("content"), spec.siteName);
      const shareTitle = metadata.title;
      for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) assert.equal(await page.locator(selector).getAttribute("content"), shareTitle);
      assert.ok((await page.locator('link[rel="preload"][as="font"]').getAttribute("href")).endsWith(spec.fontFile));
      assert.ok((await page.locator('link[rel="stylesheet"]').getAttribute("href")).endsWith(`?v=${spec.cssVersion}`));
      for (const [selector, expected] of Object.entries(item.copy)) assert.equal(normalize(await page.locator(selector).innerText()), normalize(expected), selector);
      const source = await readFile(path.join(root, item.path), "utf8");
      assert.ok(!source.includes("えりぬいシティ"));
      const links = await page.locator("a").evaluateAll(nodes => nodes.map(a => a.getAttribute("href")));
      assert.deepEqual(links, baseline.links[item.path]);
      if (item.path === "pages/blog.html") {
        assert.equal(await page.locator("form").count(), 0);
        assert.equal(await page.locator(".card-button").getAttribute("href"), "https://note.com/erinui");
      }
      if (item.path === "index.html") {
        assert.deepEqual(await page.locator(".map-guide-spots span").allTextContents(), ["ゲーム開発会社", "めちゃデカCM看板", "ピクニック広場", "大型ショッピング施設"]);
        assert.equal(await page.locator(".content-carousel-controls").first().getAttribute("aria-label"), "ニュースの表示切り替え");
        assert.equal(await page.locator(".character-card").first().getAttribute("href"), "pages/characters.html");
      }
    } finally { await page.close(); }
  });
}

test("NAME-04: map letters changed, ground and road preserved", async () => {
  const svg = xml.xml2js(await readFile(path.join(root, "assets/home-city/map_bg.svg"), "utf8")).elements[0];
  assert.deepEqual(svg.attributes, baseline.mapAttributes);
  assert.deepEqual(svg.elements.filter(node => ["path", "mask", "g"].includes(node.name) && !node.attributes?.["data-road-name"]), baseline.mapGround);
  const letters = svg.elements.find(node => node.attributes?.["data-road-name"] === spec.siteName);
  assert.ok(letters, "Road asset must contain the new approved outline group");
  assert.ok(!svg.elements.some(node => node.name === "path" && node.attributes?.fill === "white"));
});

test("LAYOUT-01: guide city name stays together on narrow screens", async () => {
  const page = await browser.newPage();
  try {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(server.url);
      await page.evaluate(() => document.fonts.ready);
      const name = page.locator(".map-guide-city-name");
      assert.equal(await name.count(), 1);
      assert.equal(await name.innerText(), spec.siteName);
      const geometry = await name.evaluate(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        const rects = [...range.getClientRects()];
        const title = node.parentElement.getBoundingClientRect();
        return { lines: rects.length, right: rects[0].right, titleRight: title.right };
      });
      assert.equal(geometry.lines, 1);
      assert.ok(geometry.right <= geometry.titleRight + 1);
    }
  } finally { await page.close(); }
});

test("LAYOUT-01: TOP title fits a single line at the smallest supported width", async () => {
  const page = await browser.newPage();
  try {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(server.url);
    await page.evaluate(() => document.fonts.ready);
    const lines = await page.locator("#hero-title").evaluate(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      return range.getClientRects().length;
    });
    assert.equal(lines, 1);
  } finally { await page.close(); }
});

test("FNT-01: privacy title keeps the reference single line at 390px", async () => {
  const page = await browser.newPage();
  try {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(server.url + "/pages/privacy.html");
    await page.evaluate(() => document.fonts.ready);
    const lines = await page.locator("h1").evaluate(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      return range.getClientRects().length;
    });
    assert.equal(lines, 1);
  } finally { await page.close(); }
});

test("FNT-01: original JP TTF is distributed without alterations", async () => {
  const bytes = await readFile(path.join(root, "assets/fonts/keinann-pop-jp.ttf"));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "b67ac7a23d5237b05cc5ffc2e5882bc3f49c02dea82ea0e7b9a17ae7169f3425");
  const css = await readFile(path.join(root, "home.css"), "utf8");
  assert.ok(css.includes('url("assets/fonts/keinann-pop-jp.woff2")'));
  assert.ok(css.includes('url("assets/fonts/keinann-pop-jp.ttf")'));
  assert.ok((await readFile(path.join(root, "assets/fonts/OFL.txt"), "utf8")).includes("SIL OPEN FONT LICENSE"));
});

test("Preserve dynamic data, map assets, scripts and game implementation", async () => {
  for (const [file, expected] of Object.entries(baseline.hashes)) {
    const accepted = approvedUpstreamHash(file, expected);
    if (accepted === null) {
      await assert.rejects(readFile(path.join(root, file)), { code: "ENOENT" }, `${file}: approved upstream deletion`);
      continue;
    }
    let bytes = await readFile(path.join(root, file));
    if (file === "home.js") bytes = Buffer.from(restoreApprovedSeoChanges(file, bytes.toString()));
    // SEO-SHARE-01 allows only the public URL constant; retain the original game baseline.
    if (file === "games/inutaro-mushi/game.js") {
      bytes = Buffer.from(bytes.toString().replace('const siteUrl = "https://erinui.com/games/inutaro-mushi/";', 'const siteUrl = "https://erinui.github.io/inutaro-game/games/inutaro-mushi/";'));
    }
    // SEO-URL-01/02 and SEO-MOVE-01 change only the game's head metadata.
    if (file === "games/inutaro-mushi/index.html") {
      const source = restoreApprovedSeoChanges(file, bytes.toString());
      const boundary = source.indexOf("<body");
      const oldHead = source.slice(0, boundary)
        .replace('    <link rel="canonical" href="https://erinui.com/games/inutaro-mushi/" />\n', "")
        .replaceAll("https://erinui.com/", "https://erinui.github.io/inutaro-game/")
        .replace('    <script src="../../site-migration.js" defer></script>\n', "");
      bytes = Buffer.from(oldHead + source.slice(boundary));
    }
    assert.equal(createHash("sha256").update(bytes).digest("hex"), accepted, file);
  }
  for (const [file, expected] of Object.entries(baseline.localOnlyHashes || {})) {
    try {
      const bytes = await readFile(path.join(root, file));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), expected, file);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
});
