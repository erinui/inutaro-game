import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { root, startSiteServer } from "./helpers/site-server.mjs";
import { restoreApprovedSeoChanges } from "./helpers/approved-seo-changes.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const xml = require("xml-js");
const spec = JSON.parse(await readFile(new URL("./fixtures/seo.json", import.meta.url)));
const hash = text => createHash("sha256").update(text).digest("hex");
let server, browser;

before(async () => {
  server = await startSiteServer();
  browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
});
after(async () => { await browser?.close(); await server?.close(); });

for (const item of spec.pages) {
  test(`SEO-META-01/OGP-02: approved metadata in initial HTML: ${item.file}`, async () => {
    const page = await browser.newPage({ javaScriptEnabled: false });
    try {
      await page.goto(server.url + item.previewPath + "?youtubePanel=0#metadata");
      const values = {
        "title": item.title,
        'meta[name="description"]': item.description,
        'meta[property="og:title"]': item.title,
        'meta[name="twitter:title"]': item.title,
        'meta[property="og:description"]': item.description,
        'meta[name="twitter:description"]': item.description,
        'meta[property="og:site_name"]': spec.website.name,
        'meta[name="twitter:card"]': "summary",
      };
      for (const [selector, expected] of Object.entries(values)) {
        const node = page.locator(selector);
        assert.equal(await node.count(), 1, selector);
        assert.equal(selector === "title" ? await node.textContent() : await node.getAttribute("content"), expected, selector);
      }
    } finally { await page.close(); }
  });
}

test("SEO-DATA-01: one static WebSite on TOP only", async () => {
  for (const item of spec.pages) {
    const page = await browser.newPage({ javaScriptEnabled: false });
    try {
      await page.goto(server.url + item.previewPath);
      const nodes = page.locator('script[type="application/ld+json"]');
      assert.equal(await nodes.count(), item.file === "index.html" ? 1 : 0, item.file);
      if (item.file === "index.html") {
        assert.equal(await page.locator('head script[type="application/ld+json"]').count(), 1);
        assert.deepEqual(JSON.parse(await nodes.textContent()), spec.website);
      }
    } finally { await page.close(); }
  }
});

for (const item of spec.pages) {
  test(`SEO-URL-01/02: canonical and sharing metadata without visible changes: ${item.file}`, async () => {
    const page = await browser.newPage({ javaScriptEnabled: false });
    try {
      await page.goto(`${server.url}${item.previewPath}?release=test&youtubePanel=0#test`);
      const canonical = page.locator('link[rel="canonical"]');
      assert.equal(await canonical.count(), 1);
      assert.equal(await canonical.getAttribute("href"), spec.origin + item.canonicalPath);
      assert.equal(await page.locator('meta[property="og:url"]').getAttribute("content"), spec.origin + item.canonicalPath);
      for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
        assert.equal(await page.locator(selector).getAttribute("content"), spec.image);
      }
      assert.ok(await page.locator('meta[name="robots"]').evaluateAll(nodes => nodes.every(node => !/noindex/i.test(node.content))));
      const source = await readFile(path.join(root, item.file), "utf8");
      const preserved = item.file === "index.html" ? restoreApprovedSeoChanges(item.file, source) : source;
      assert.equal(hash(preserved.slice(preserved.indexOf("<body"))), item.bodySha256, "Existing visible markup and navigation must stay unchanged");
      assert.ok(!source.slice(0, source.indexOf("<body")).includes(spec.oldOrigin));
      assert.equal(await page.locator('script[src$="site-migration.js"]').count(), 1);
    } finally { await page.close(); }
  });
}

test("SEO-SITEMAP-01: valid XML with exactly the production canonical URLs", async () => {
  const response = await fetch(server.url + "/sitemap.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /xml/);
  const doc = xml.xml2js(await response.text(), { compact: true });
  assert.equal(doc.urlset._attributes.xmlns, "http://www.sitemaps.org/schemas/sitemap/0.9");
  const urls = doc.urlset.url.map(node => node.loc._text);
  assert.deepEqual(urls.sort(), spec.pages.map(item => spec.origin + item.canonicalPath).sort());
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(!doc.urlset.url.some(node => node.lastmod || node.priority || node.changefreq));
});

test("SEO-ROBOTS-01: sitemap discoverable without blocking public search", async () => {
  const response = await fetch(server.url + "/robots.txt");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/plain/);
  const lines = (await response.text()).split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#"));
  assert.ok(lines.includes(`Sitemap: ${spec.origin}/sitemap.xml`));
  assert.ok(!lines.some(line => /^disallow:\s*\/$/i.test(line)));
  for (const forbidden of ["/.env", "/.git/config", "/docs/seo-improvement-plan.md", "/not-a-page"]) {
    assert.equal((await fetch(server.url + forbidden)).status, 404, forbidden);
  }
});

test("SEO-SHARE-01: only the game's public share URL changes", async () => {
  const code = await readFile(path.join(root, "games/inutaro-mushi/game.js"), "utf8");
  const newDeclaration = `const siteUrl = "${spec.origin}/games/inutaro-mushi/";`;
  const oldDeclaration = `const siteUrl = "${spec.oldOrigin}${spec.oldBasePath}/games/inutaro-mushi/";`;
  assert.ok(code.includes(newDeclaration));
  assert.equal(hash(code.replace(newDeclaration, oldDeclaration)), spec.gameCodeBefore);
});

test("SEO-MOVE-01: notices use the matching canonical and preserve valid character anchors", async () => {
  for (const item of spec.pages) {
    const page = await browser.newPage();
    try {
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin !== spec.oldOrigin) return route.abort();
        const relative = url.pathname.slice(spec.oldBasePath.length);
        if (relative.endsWith(".js") && !relative.endsWith("site-migration.js")) return route.fulfill({ contentType: "text/javascript", body: "" });
        const response = await fetch(server.url + relative);
        await route.fulfill({ status: response.status, contentType: response.headers.get("content-type"), body: Buffer.from(await response.arrayBuffer()) });
      });
      const fragment = item.file === "pages/characters.html" ? "#character-bukuro" : "";
      await page.goto(spec.oldOrigin + spec.oldBasePath + item.previewPath + fragment);
      const notice = page.locator("#site-migration-notice");
      assert.equal(await notice.count(), 1);
      assert.equal(await notice.locator("a").getAttribute("href"), spec.origin + item.canonicalPath + fragment);
      assert.equal(new URL(page.url()).origin, spec.oldOrigin, "No unapproved automatic redirect");
    } finally { await page.close(); }
  }
});

test("SEO-MOVE-01: notices do not appear on production, local, preview or unrelated GitHub paths", async () => {
  for (const originPath of ["https://erinui.com/", "http://127.0.0.1/", "https://example.workers.dev/", "https://erinui.github.io/other-site/"]) {
    const page = await browser.newPage();
    try {
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (!url.pathname.endsWith("site-migration.js") && route.request().resourceType() !== "document") return route.abort();
        const file = url.pathname.endsWith("site-migration.js") ? "site-migration.js" : "index.html";
        await route.fulfill({ contentType: file.endsWith(".js") ? "text/javascript" : "text/html", body: await readFile(path.join(root, file)) });
      });
      await page.goto(originPath);
      assert.equal(await page.locator("#site-migration-notice").count(), 0, originPath);
    } finally { await page.close(); }
  }
});
