import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { startSiteServer } from "./helpers/site-server.mjs";
import { reliabilityChanges, restoreReliabilityChanges } from "./helpers/approved-reliability-changes.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const homeSource = await readFile(new URL("../home.js", import.meta.url), "utf8");
test("D01: approved fragments restore the complete pre-change source hashes", async () => {
  assert.equal(reliabilityChanges.baselineCommit, "ecf9af55da6af3bea347648d01c09fb5b3817d74");
  for (const [file, expected] of Object.entries(reliabilityChanges.beforeHashes)) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.equal(createHash("sha256").update(restoreReliabilityChanges(file, source)).digest("hex"), expected, file);
  }
});
let server, browser;
before(async () => {
  server = await startSiteServer();
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
});
after(async () => { await browser?.close(); await server?.close(); });
async function pageFor(t, url = "/games/inutaro-mushi/", width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  t.after(() => page.close());
  await page.route("**/*", route => new URL(route.request().url()).origin === server.url ? route.continue() : route.abort());
  await page.goto(server.url + url);
  return page;
}
test("G01/G03: modal traps Tab both ways and makes only background siblings inert", async t => {
  const page = await pageFor(t);
  await page.locator("#sound-toggle").evaluate(node => node.inert = true);
  await page.locator("#howto-open").click();
  for (const key of ["Tab", "Shift+Tab", "Tab"]) {
    await page.keyboard.press(key);
    assert.equal(await page.evaluate(() => document.activeElement.id), "howto-close");
  }
  assert.equal(await page.locator("#howto-panel").evaluate(n => n.inert), false);
  assert.ok(await page.locator(".game-shell > :not(#howto-panel)").evaluateAll(nodes => nodes.every(n => n.inert)));
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#sound-toggle").evaluate(n => n.inert), true);
  assert.equal(await page.locator(".start-actions").evaluate(n => n.inert), false);
});
for (const method of ["Escape", "Enter", "Space", "click", "backdrop"]) {
  test(`G02/G05: ${method} closes modal and restores focus`, async t => {
    const page = await pageFor(t);
    await page.locator("#howto-open").click();
    if (method === "click") await page.locator("#howto-close").click();
    else if (method === "backdrop") await page.locator("#howto-panel").click({ position: { x: 2, y: 2 } });
    else await page.keyboard.press(method);
    assert.equal(await page.locator("#howto-panel").isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), "howto-open");
    assert.equal(await page.locator("#howto-open").getAttribute("aria-expanded"), "false");
  });
}
test("G04/G05: dialog input cannot leave movement keys stuck; game still runs", async t => {
  const page = await pageFor(t);
  await page.locator("#sound-toggle").click();
  await page.keyboard.down("ArrowRight");
  await page.locator("#howto-open").click();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("PageDown");
  assert.equal(await page.evaluate(() => state.keys.size), 0);
  await page.keyboard.press("Escape");
  await page.keyboard.up("ArrowRight");
  await page.locator("#start").click();
  assert.equal(await page.evaluate(() => state.running), true);
  await page.waitForFunction(() => Number(document.querySelector("#time").textContent) < 40);
  await page.keyboard.press("Space");
  assert.ok(await page.locator("canvas").evaluate(c => c.width > 0 && c.height > 0));
});
const pages = ["/", "/games/", "/pages/characters.html", "/pages/blog.html", "/pages/illustrations.html", "/pages/terms.html", "/pages/privacy.html"];
for (const url of pages) {
  test(`N01: menu link Escape restores toggle on ${url}`, async t => {
    const page = await pageFor(t, url + "?youtubePanel=0", 390);
    await page.locator(".site-menu-toggle").click();
    await page.locator(".site-nav a").first().focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".site-menu-toggle").getAttribute("aria-expanded"), "false");
    assert.equal(await page.evaluate(() => document.activeElement.className), "site-menu-toggle");
  });
}
test("N02/N03: Escape does not steal outside/PC focus; resizing preserves visible link", async t => {
  const page = await pageFor(t, "/games/", 760);
  await page.locator(".site-menu-toggle").click();
  await page.locator(".brand").focus();
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.activeElement.className), "brand");
  assert.equal(await page.locator(".site-menu-toggle").getAttribute("aria-expanded"), "true");
  await page.locator(".site-nav a").first().focus();
  await page.setViewportSize({ width: 761, height: 900 });
  await page.waitForTimeout(50);
  const href = await page.evaluate(() => document.activeElement.getAttribute("href"));
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute("href")), href);
  await page.setViewportSize({ width: 760, height: 900 });
  await page.waitForFunction(() => matchMedia("(max-width: 760px)").matches && document.querySelector(".site-nav").inert);
  await page.locator(".site-menu-toggle").focus();
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.closest(".site-nav") === null), true);
});

async function imagePage(t, mode, noteFallbackFails = false) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  t.after(() => page.close());
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== server.url) return route.abort();
    if (url.pathname.endsWith(".json") || url.pathname.startsWith("/api/")) return route.abort();
    if (url.pathname === "/broken.jpg" || (noteFallbackFails && url.pathname.endsWith("map_blog.png"))) {
      if (mode === "abort") return route.abort();
      return route.fulfill({ status: mode === "invalid" ? 200 : 404, contentType: "image/jpeg", body: "broken" });
    }
    return route.continue();
  });
  await page.goto(server.url + "/?youtubePanel=0");
  assert.equal(await page.evaluate(() => typeof bindCardImageFallback), "function", "REL-IMAGE-01: card image failure handler must exist");
  return page;
}
for (const mode of ["404", "abort", "invalid"]) {
  test(`I02: ${mode} becomes placeholder without changing the card`, async t => {
    const page = await imagePage(t, mode);
    await page.evaluate(() => {
      const track = document.querySelector("[data-youtube-cards]");
      track.replaceChildren(createLatestCard({ item: { title: "Fixture", url: "https://example.com/video" }, category: "YOUTUBE", thumbnailUrl: "/broken.jpg", mediaMode: "cover" }));
    });
    await page.locator("[data-youtube-cards]").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector("[data-youtube-cards] .content-card-media-placeholder"));
    assert.equal(await page.locator("[data-youtube-cards] a").getAttribute("href"), "https://example.com/video");
    assert.equal(await page.locator("[data-youtube-cards] h3").textContent(), "Fixture");
    const box = await page.locator("[data-youtube-cards] .content-card-media").boundingBox();
    assert.ok(Math.abs(box.width / box.height - 16 / 9) < 0.01);
  });
}
for (const fail of [false, true]) {
  test(`I04/I05: note fallback fails=${fail}, retries once and preserves focus/scroll`, async t => {
    const page = await imagePage(t, "404", fail);
    let fallbackRequests = 0;
    page.on("request", request => { if (new URL(request.url()).pathname.endsWith("map_blog.png")) fallbackRequests++; });
    await page.evaluate(() => {
      const track = document.querySelector("[data-note-cards]");
      track.replaceChildren(...Array.from({ length: 6 }, (_, i) => createLatestCard({ item: { title: `Fixture ${i}`, url: "https://example.com/article" }, category: "NOTE", thumbnailUrl: "/broken.jpg", mediaMode: "cover" })));
      track.style.scrollBehavior = "auto";
      track.scrollLeft = track.scrollWidth - track.clientWidth;
      track.lastElementChild.focus({ preventScroll: true });
      window.imageScrollBefore = track.scrollLeft;
    });
    await page.locator("[data-note-cards]").scrollIntoViewIfNeeded();
    await page.waitForFunction(failed => {
      const last = document.querySelector("[data-note-cards]").lastElementChild;
      return failed ? last.querySelector(".content-card-media-placeholder") : last.querySelector("img.content-card-media-note")?.naturalWidth > 0;
    }, fail);
    assert.ok(fallbackRequests <= 6, "cached fallback may require no new request; retries must stay bounded");
    if (!fail) assert.ok((await page.locator("[data-note-cards] img").last().getAttribute("src")).endsWith("map_blog.png"));
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector("[data-note-cards]").lastElementChild), true);
    assert.ok(await page.evaluate(() => Math.abs(document.querySelector("[data-note-cards]").scrollLeft - window.imageScrollBefore) <= 1));
  });
}
test("I03: pre-handler failure in initial HTML is caught, repeated binding is inert", async t => {
  const page = await browser.newPage(); t.after(() => page.close());
  await page.route("**/*", route => route.abort());
  await page.setContent('<div class="content-carousel-card"><img class="content-card-media" src="https://example.com/broken.jpg"><p class="content-card-kicker">GAME</p><h3>Fixture</h3></div>');
  await page.waitForFunction(() => document.querySelector("img").complete);
  await page.addScriptTag({ content: homeSource });
  await page.waitForFunction(() => document.querySelector(".content-card-media-placeholder"));
  await page.evaluate(() => { document.querySelectorAll(".content-carousel-card img.content-card-media").forEach(bindCardImageFallback); });
  assert.equal(await page.locator(".content-card-media-placeholder").count(), 1);
});
