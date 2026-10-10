import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { root } from "./helpers/site-server.mjs";

test("SEO-PUBLISH-01: deploy output contains only approved public files", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "erinui-build-test-"));
  const output = path.join(temp, "dist");
  try {
    const { buildSite } = await import("../scripts/build-site.mjs");
    const files = await buildSite(output);
    const spec = JSON.parse(await readFile(path.join(root, "tests/fixtures/seo.json")));
    for (const item of spec.pages) assert.deepEqual(await readFile(path.join(output, item.file)), await readFile(path.join(root, item.file)));
    const assets = execFileSync("git", ["ls-files", "-z", "--", "assets"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
    for (const file of assets) assert.deepEqual(await readFile(path.join(output, file)), await readFile(path.join(root, file)), file);
    assert.ok(files.includes("data/news.json"));
    assert.ok(files.every(file => /^(assets\/|pages\/[\w-]+\.html$|games\/(index\.html|inutaro-mushi\/(index\.html|style\.css|game\.js))$|data\/news\.json$|index\.html$|home\.(css|js)$|site-(nav|migration)\.js$|robots\.txt$|sitemap\.xml$|_headers$)/.test(file)), "No source, secrets, drafts, docs or tests in deployed output");
    assert.deepEqual((await readdir(output)).sort(), ["_headers", "assets", "data", "games", "home.css", "home.js", "index.html", "pages", "robots.txt", "site-migration.js", "site-nav.js", "sitemap.xml"].sort());
    await assert.rejects(buildSite(output), /already exists/, "Do not silently delete or overwrite an existing directory");
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test("SEO-PREVIEW-01: preview headers are host-scoped, not global noindex", async () => {
  const headers = await readFile(path.join(root, "_headers"), "utf8");
  assert.match(headers, /https:\/\/inutaro-game\.erikanuinui\.workers\.dev\/\*\s+X-Robots-Tag: noindex/);
  assert.match(headers, /https:\/\/:version-inutaro-game\.erikanuinui\.workers\.dev\/\*\s+X-Robots-Tag: noindex/);
  assert.ok(!headers.includes("erinui.com"));
  assert.ok(!/^\/\*\s+X-Robots-Tag:\s*noindex/m.test(headers));
});
