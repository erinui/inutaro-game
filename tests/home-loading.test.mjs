import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import { startJsonCacheServer } from "./helpers/json-cache-server.mjs";
import { startSiteServer } from "./helpers/site-server.mjs";
import { fileURLToPath } from "node:url";

const source = await readFile(new URL("../home.js", import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const jsonUrls = ["youtube-latest", "note-latest", "suzuri-latest", "line-stamps"].map(name => `assets/home-city/${name}.json`);
const apiUrl = "/api/latest-youtube?maxResults=6";
const valid = { ok: true, videos: [{ title: "固定データ", url: "https://www.youtube.com/watch?v=test" }] };
function loadHome(hostname, fetch, document = {}) {
  const context = vm.createContext({ window: { location: { hostname } }, document: { querySelector: () => null, querySelectorAll: () => [], ...document }, fetch, Intl, URLSearchParams });
  vm.runInContext(source, context);
  return context;
}
const response = data => ({ ok: true, json: async () => data });

for (const hostname of ["erinui.com", "localhost", "127.0.0.1", "erinui.github.io"]) {
  test(`D01: static first without API request on ${hostname}`, async () => {
    const calls = [];
    const home = loadHome(hostname, async url => { calls.push(url); return response(valid); });
    assert.deepEqual(await home.fetchYoutubeData(), valid);
    assert.deepEqual(calls, [jsonUrls[0]]);
  });
}

const failures = {
  http: async () => ({ ok: false }),
  network: async () => { throw new TypeError("Offline"); },
  json: async () => ({ ok: true, json: async () => { throw new SyntaxError("JSON"); } }),
  invalid: async () => response({ ok: false, videos: [] }),
  missingVideos: async () => response({ ok: true }),
};
for (const [name, fail] of Object.entries(failures)) {
  test(`D02/D03: ${name} failure tries the next candidate once`, async () => {
    for (const hostname of ["erinui.com", "api.example.com"]) {
      const calls = [];
      const home = loadHome(hostname, async url => { calls.push(url); return calls.length === 1 ? fail() : response(valid); });
      assert.deepEqual(await home.fetchYoutubeData(), valid);
      assert.deepEqual(calls, hostname === "erinui.com" ? [jsonUrls[0], apiUrl] : [apiUrl, jsonUrls[0]]);
    }
  });
}

test("D03/D04: API success, empty data and both failures preserve the contract", async () => {
  const calls = [];
  const api = loadHome("api.example.com", async url => { calls.push(url); return response(valid); });
  assert.deepEqual(await api.fetchYoutubeData(), valid);
  assert.deepEqual(calls, [apiUrl]);
  const empty = loadHome("erinui.com", async () => response({ ok: true, videos: [] }));
  assert.equal((await empty.fetchYoutubeData()).videos.length, 0);
  for (const hostname of ["erinui.com", "api.example.com", ""]) {
    let count = 0;
    const failed = loadHome(hostname, async () => { count++; throw new TypeError("Offline"); });
    assert.equal(await failed.fetchYoutubeData(), null);
    assert.equal(count, 2);
  }
});

test("C02: all static JSON uses no-cache and preserves Accept and URL", async () => {
  const calls = [];
  const home = loadHome("erinui.com", async (url, options) => { calls.push({ url, options }); return response(valid); });
  for (const url of jsonUrls) await home.fetchStaticData(url);
  assert.deepEqual(calls.map(call => call.url), jsonUrls);
  for (const { options } of calls) {
    assert.equal(options.cache, "no-cache");
    assert.equal(options.headers.Accept, "application/json");
  }
});

test("C01: actual browser revalidates 304 then renders updated 200 JSON", async () => {
  const server = await startJsonCacheServer();
  const browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
  try {
    const page = await browser.newPage();
    for (const url of jsonUrls) server.setData(`/${url}`, { ...valid, revision: 1 });
    await page.goto(server.url);
    const read = () => page.evaluate(async urls => {
      const data = await Promise.all(urls.map(url => fetchStaticData(url)));
      document.body.textContent = data.map(item => item.revision).join(",");
      return data;
    }, jsonUrls);
    await read();
    await read();
    assert.deepEqual(server.requests.map(req => req.status), [200, 200, 200, 200, 304, 304, 304, 304]);
    assert.ok(server.requests.slice(4).every(req => req.ifNoneMatch && req.bodyBytes === 0));
    for (const url of jsonUrls) server.setData(`/${url}`, { ...valid, revision: 2 });
    const data = await read();
    assert.ok(data.every(item => item.revision === 2));
    assert.equal(await page.locator("body").textContent(), "2,2,2,2");
    assert.ok(server.requests.slice(8).every(req => req.status === 200 && req.bodyBytes > 0));
    assert.ok(server.requests.every(req => req.accept === "application/json"));
  } finally { await browser.close(); await server.close(); }
});

test("I01: generated images receive lazy/async before src, placeholders stay intact", () => {
  const images = [];
  const document = { createElement: tag => {
    const node = { tag, children: [], append(child) { this.children.push(child); }, setAttribute() {} };
    if (tag === "img") {
      Object.defineProperty(node, "src", { set(value) { images.push({ value, loading: this.loading, decoding: this.decoding }); } });
    }
    return node;
  } };
  const home = loadHome("erinui.com", async () => response(valid), document);
  home.createLatestCard({ item: valid.videos[0], category: "YOUTUBE", thumbnailUrl: "test.jpg" });
  assert.deepEqual(images, [{ value: "test.jpg", loading: "lazy", decoding: "async" }]);
  const more = home.createLatestCard({ item: { title: "まだまだあるよ", url: "https://example.com" }, category: "AND MORE", isMore: true });
  assert.equal(more.children[0].tag, "div");
  assert.equal(more.children[0].textContent, "+");
});

test("I01/D04: only initial carousel images are lazy; JS-disabled cards and links remain", async () => {
  const server = await startSiteServer();
  const browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
  try {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.goto(server.url);
    const cards = page.locator(".character-card img, .content-carousel-card img");
    assert.equal(await cards.count(), 16);
    for (const image of await cards.all()) {
      assert.equal(await image.getAttribute("loading"), "lazy");
      assert.equal(await image.getAttribute("decoding"), "async");
    }
    const eager = page.locator(".site-header img, .map-stage img");
    assert.ok(await eager.count() > 0);
    assert.ok(await eager.evaluateAll(images => images.every(image => image.loading !== "lazy")));
    assert.equal(await page.locator(".character-card").first().getAttribute("href"), "pages/characters.html");
    await page.locator("#youtube-title").scrollIntoViewIfNeeded();
    assert.ok(await page.locator("[data-youtube-cards] img").first().evaluate(image => image.decode().then(() => image.naturalWidth > 0)));
  } finally { await browser.close(); await server.close(); }
});

test("I02/I03: native lazy images load at anchors and on carousel page two", async () => {
  const server = await startSiteServer();
  const browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin !== server.url) return route.abort();
      if (url.pathname.endsWith("youtube-latest.json")) {
        const data = { ok: true, videos: Array.from({ length: 6 }, (_, i) => ({ title: `動画${i + 1}`, url: `https://www.youtube.com/watch?v=${i}`, thumbnail: { url: `${server.url}/assets/home-city/youtube-thumb-${Math.min(i + 1, 5)}.jpg` } })) };
        return route.fulfill({ json: data });
      }
      return route.continue();
    });
    await page.goto(`${server.url}/?youtubePanel=0#youtube-title`);
    await page.waitForFunction(() => document.querySelectorAll("[data-youtube-cards] a").length === 6);
    const track = page.locator("[data-youtube-cards]");
    await track.scrollIntoViewIfNeeded();
    await track.locator("img").first().evaluate(image => image.decode());
    await page.locator(".youtube-section .content-carousel-next").click();
    await page.waitForTimeout(700);
    const more = track.locator(".content-card-more");
    assert.equal(await more.locator("h3").textContent(), "まだまだあるよ");
    await track.locator("img").nth(4).evaluate(image => image.decode());
    const box = await track.evaluate(node => ({ left: node.scrollLeft, max: node.scrollWidth - node.clientWidth }));
    assert.ok(Math.abs(box.left - box.max) <= 1);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of ["news", "character", "game", "youtube", "blog", "goods", "line-stamp"]) {
      await page.locator(`#${id}-title`).scrollIntoViewIfNeeded();
      const image = page.locator(`#${id}-title`).locator("..", {}).locator("..").locator("img").first();
      if (await image.count() && new URL(await image.getAttribute("src"), server.url).origin === server.url) await image.evaluate(node => node.decode());
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
});

test("D04/I03: failed JSON and images preserve fallback links, geometry and file preview", async () => {
  const server = await startSiteServer();
  const browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith(".json") || url.pathname.startsWith("/api/") || route.request().resourceType() === "image") return route.abort();
      return route.continue();
    });
    await page.goto(`${server.url}/?youtubePanel=0#youtube-title`);
    assert.equal(await page.locator("[data-youtube-cards] > a").count(), 3);
    assert.equal(await page.locator(".character-card").first().getAttribute("href"), "pages/characters.html");
    const geometry = await page.locator("[data-youtube-cards] img").first().boundingBox();
    assert.ok(geometry.width > 100 && Math.abs(geometry.width / geometry.height - 16 / 9) < 0.01);
    await page.locator("[data-youtube-cards]").evaluate(track => {
      track.scrollLeft = track.scrollWidth - track.clientWidth;
    });
    await page.waitForFunction(() => document.querySelector("[data-youtube-cards]").scrollLeft > 1);
    assert.deepEqual(errors, []);
    const file = await browser.newPage();
    const fileErrors = [];
    file.on("pageerror", error => fileErrors.push(error.message));
    await file.goto(`file://${fileURLToPath(new URL("../index.html", import.meta.url))}?youtubePanel=0`);
    assert.equal(await file.locator(".character-card").count(), 5);
    assert.equal(await file.locator("[data-youtube-cards] > a").count(), 3);
    assert.deepEqual(fileErrors, []);
  } finally { await browser.close(); await server.close(); }
});
