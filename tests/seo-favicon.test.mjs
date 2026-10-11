import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { root, startSiteServer } from "./helpers/site-server.mjs";
import { faviconChanges, restoreApprovedFaviconChanges } from "./helpers/approved-favicon-changes.mjs";
import { buildSite } from "../scripts/build-site.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const spec = JSON.parse(await readFile(new URL("./fixtures/seo.json", import.meta.url)));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const icons = [
  { rel: "icon", sizes: "32x32", file: "favicon.png", side: 32 },
  { rel: "apple-touch-icon", sizes: "180x180", file: "apple-touch-icon.png", side: 180 },
  { rel: "icon", sizes: "192x192", file: "icon-192.png", side: 192 },
];
const pngSize = bytes => {
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  assert.equal(bytes.toString("ascii", 12, 16), "IHDR");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};
let server, browser;
before(async () => {
  server = await startSiteServer();
  browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
});
after(async () => { await browser?.close(); await server?.close(); });

for (const item of spec.pages) {
  test(`F01: all three static icon declarations and PNG responses on ${item.file}`, async () => {
    const page = await browser.newPage({ javaScriptEnabled: false });
    try {
      await page.goto(server.url + item.previewPath);
      assert.equal(await page.locator('head link[rel="icon"], head link[rel="apple-touch-icon"]').count(), 3);
      for (const icon of icons) {
        const link = page.locator(`head link[rel="${icon.rel}"][sizes="${icon.sizes}"]`);
        assert.equal(await link.count(), 1);
        if (icon.rel === "icon") assert.equal(await link.getAttribute("type"), "image/png");
        const href = await link.getAttribute("href");
        assert.ok(!href.startsWith("/"), "Keep file preview and GitHub subpath support");
        const url = new URL(href, page.url());
        assert.equal(url.pathname, "/assets/" + icon.file);
        assert.equal(url.search, "?v=20260616-icon");
        const response = await fetch(url);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /^image\/png/);
        assert.ok(!/noindex/i.test(response.headers.get("x-robots-tag") || ""));
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.deepEqual(pngSize(bytes), [icon.side, icon.side]);
        assert.equal(hash(bytes), faviconChanges.assetHashes["assets/" + icon.file]);
        await page.evaluate(async url => {
          const image = new Image(); image.src = url; await image.decode();
          if (image.naturalWidth !== image.naturalHeight) throw new Error("Non-square icon");
        }, url.href);
      }
    } finally { await page.close(); }
  });
}
test("F02: existing game icon bytes and square dimensions are unchanged", async () => {
  for (const icon of icons) {
    const file = "assets/" + icon.file;
    const bytes = await readFile(path.join(root, file));
    assert.equal(hash(bytes), faviconChanges.assetHashes[file]);
    assert.deepEqual(pngSize(bytes), [icon.side, icon.side]);
  }
  const robots = await readFile(path.join(root, "robots.txt"), "utf8");
  assert.match(robots, /User-agent: \*\s+Allow: \//);
  assert.ok(!/^Disallow:/mi.test(robots));
});
test("F03: production clean/HTML URLs, local, GitHub and file refs resolve to the same icons", async () => {
  for (const item of spec.pages) {
    const source = await readFile(path.join(root, item.file), "utf8");
    const page = await browser.newPage({ javaScriptEnabled: false });
    try {
      await page.setContent(source);
      const refs = await page.locator('head link[rel="icon"], head link[rel="apple-touch-icon"]').evaluateAll(ns => ns.map(n => n.getAttribute("href")));
      assert.equal(refs.length, 3, item.file);
      for (const [base, expected] of [
        [spec.origin + item.canonicalPath, spec.origin + "/assets/"],
        [spec.origin + item.previewPath, spec.origin + "/assets/"],
        [server.url + item.previewPath, server.url + "/assets/"],
        [spec.oldOrigin + spec.oldBasePath + item.previewPath, spec.oldOrigin + spec.oldBasePath + "/assets/"],
        [new URL(item.file, "file:///site/").href, "file:///site/assets/"],
      ]) {
        for (const href of refs) {
          const url = new URL(href, base);
          assert.ok(url.href.startsWith(expected), item.file + ": " + base);
          assert.ok(icons.some(icon => url.pathname.endsWith("/" + icon.file)));
        }
      }
    } finally { await page.close(); }
  }
});
test("F04: approved icon fragments restore full original HTML hashes", async () => {
  assert.equal(faviconChanges.baselineCommit, "645f972c78e66f7df750566dd16416cac3da91a9");
  assert.equal(faviconChanges.changes.length, 5);
  for (const [file, expected] of Object.entries(faviconChanges.beforeHashes)) {
    assert.equal(hash(restoreApprovedFaviconChanges(file, await readFile(path.join(root, file), "utf8"))), expected, file);
  }
});
test("F05: clean release contains identical HTML and icons, not verification material", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "erinui-favicon-build-"));
  try {
    const output = path.join(temp, "dist");
    const files = await buildSite(output);
    assert.ok(!files.some(file => /^(tests|scripts|docs|drafts)\//.test(file)));
    for (const file of [...Object.keys(faviconChanges.beforeHashes), ...Object.keys(faviconChanges.assetHashes)]) {
      assert.ok(files.includes(file));
      assert.deepEqual(await readFile(path.join(output, file)), await readFile(path.join(root, file)), file);
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
});
