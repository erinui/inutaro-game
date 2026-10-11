import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const moduleUrl = new URL("../scripts/update-home-latest.mjs", import.meta.url);
const exec = promisify(execFile);
let implementation;
try { implementation = await import(moduleUrl); } catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
const api = () => { assert.ok(implementation, "REL-DATA-01: isolated update coordinator must exist"); return implementation; };
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const jsonNames = { youtube: "youtube-latest.json", note: "note-latest.json", suzuri: "suzuri-latest.json" };
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9]);
const env = { YOUTUBE_API_KEY: "fixture-key", SUZURI_ACCESS_TOKEN: "fixture-token" };
const fetchedAt = "2026-10-11T00:00:00.000Z";
function payload(id) {
  const item = { title: id, url: `https://example.com/${id}`, publishedAt: fetchedAt };
  if (id === "youtube") return { ok: true, fetchedAt, channel: { id: "fixture", title: "fixture", url: "https://www.youtube.com/channel/fixture", statistics: {} }, videos: [{ ...item, id: "one", thumbnail: { url: "https://example.com/image.jpg" } }] };
  return { ok: true, fetchedAt, items: [{ ...item, ...(id === "suzuri" ? { thumbnailUrl: "https://example.com/product.jpg", priceWithTax: 100 } : {}) }] };
}
async function output(id, directory) {
  await writeFile(path.join(directory, jsonNames[id]), JSON.stringify(payload(id)));
  if (id === "youtube") await writeFile(path.join(directory, "youtube-thumb-1.jpg"), jpeg);
}
async function setup(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "erinui-update-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const assets = path.join(directory, "assets/home-city");
  await mkdir(assets, { recursive: true });
  for (const filename of [...Object.values(jsonNames), "youtube-thumb-1.jpg", "note-thumb-6.jpg", "city_user.png", "line-stamps.json"]) await writeFile(path.join(assets, filename), `old:${filename}`);
  return { directory, assets };
}
async function hashes(directory) {
  const files = await readdir(directory);
  return Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await readFile(path.join(directory, file)))])));
}
const options = directory => ({ root: directory, env, baseCommit: "a".repeat(40), runCollector: async (provider, context) => output(provider.id, context.stage) });

test("U01: all valid providers update, unrelated assets stay intact", async t => {
  const { directory, assets } = await setup(t);
  const before = await hashes(assets);
  const result = await api().updateHomeLatest(options(directory));
  assert.deepEqual(result.providers.map(p => p.status), ["success", "success", "success"]);
  for (const filename of Object.values(jsonNames)) assert.notEqual((await hashes(assets))[filename], before[filename]);
  for (const filename of ["city_user.png", "line-stamps.json"]) assert.equal((await hashes(assets))[filename], before[filename]);
  assert.ok(!("note-thumb-6.jpg" in await hashes(assets)));
  assert.equal(result.providers[0].previousFiles["youtube-latest.json"], before["youtube-latest.json"]);
});
for (const failure of ["youtube", "note", "suzuri"]) {
  test(`U02/U04: ${failure} partial failure preserves its entire file set`, async t => {
    const { directory, assets } = await setup(t);
    const before = await hashes(assets);
    const called = [];
    const result = await api().updateHomeLatest({ ...options(directory), runCollector: async (p, c) => {
      called.push(p.id); await output(p.id, c.stage);
      if (p.id === failure) throw new Error("fixture-secret must not enter report");
    } });
    assert.deepEqual(called, ["youtube", "note", "suzuri"]);
    const after = await hashes(assets);
    for (const filename of Object.keys(before).filter(f => f.startsWith(failure + "-"))) assert.equal(after[filename], before[filename]);
    assert.equal(result.providers.find(p => p.id === failure).status, "failed");
    assert.ok(!JSON.stringify(result).includes("fixture-secret"));
  });
}
test("U03: all failures change nothing; missing SUZURI secret skips only SUZURI", async t => {
  const { directory, assets } = await setup(t);
  const before = await hashes(assets);
  const result = await api().updateHomeLatest({ ...options(directory), runCollector: async () => { throw new Error("failed"); } });
  assert.deepEqual(await hashes(assets), before);
  assert.equal(result.changes.length, 0);
  const skipped = await api().updateHomeLatest({ ...options(directory), env: { YOUTUBE_API_KEY: "fixture" } });
  assert.equal(skipped.providers[2].status, "skipped");
  assert.equal((await hashes(assets))["suzuri-latest.json"], before["suzuri-latest.json"]);
});
for (const invalid of ["json", "missing-image", "foreign-file", "unsafe-path", "symlink"]) {
  test(`U06: reject ${invalid} without publishing partial output`, async t => {
    const { directory, assets } = await setup(t);
    const before = await hashes(assets);
    const result = await api().updateHomeLatest({ ...options(directory), runCollector: async (p, c) => {
      await output(p.id, c.stage);
      if (p.id !== "youtube") return;
      if (invalid === "json") await writeFile(path.join(c.stage, jsonNames.youtube), "{invalid");
      if (invalid === "missing-image") await rm(path.join(c.stage, "youtube-thumb-1.jpg"));
      if (invalid === "foreign-file") await writeFile(path.join(c.stage, "city_user.png"), "unapproved");
      if (invalid === "unsafe-path") { const data = payload("youtube"); data.videos[0].thumbnail.url = "javascript:alert(1)"; await writeFile(path.join(c.stage, jsonNames.youtube), JSON.stringify(data)); }
      if (invalid === "symlink") { await rm(path.join(c.stage, "youtube-thumb-1.jpg")); await symlink(path.join(assets, "city_user.png"), path.join(c.stage, "youtube-thumb-1.jpg")); }
    } });
    assert.equal(result.providers[0].status, "failed");
    assert.equal((await hashes(assets))[jsonNames.youtube], before[jsonNames.youtube]);
  });
}
test("U06: empty arrays are valid, not retrieval failures", async t => {
  const { directory } = await setup(t);
  const result = await api().updateHomeLatest({ ...options(directory), runCollector: async (p, c) => {
    const data = payload(p.id); data[p.id === "youtube" ? "videos" : "items"] = [];
    await writeFile(path.join(c.stage, jsonNames[p.id]), JSON.stringify(data));
  } });
  assert.ok(result.providers.every(p => p.status === "success"));
});
test("U08: promotion failure restores all old bytes including deletions", async t => {
  const { directory, assets } = await setup(t);
  const before = await hashes(assets);
  let writes = 0;
  await assert.rejects(api().updateHomeLatest({ ...options(directory), write: async (...args) => {
    if (++writes === 2) throw new Error("disk write failure");
    return writeFile(...args);
  } }), /promotion/);
  assert.deepEqual(await hashes(assets), before);
});
test("U07: timed-out collector is killed and rejects without leaking stderr", async t => {
  const { directory } = await setup(t);
  await mkdir(path.join(directory, "scripts"));
  await writeFile(path.join(directory, "scripts/update-youtube-latest.mjs"), "setInterval(() => {}, 1000);");
  const started = Date.now();
  await assert.rejects(api().runCollector({ id: "youtube", script: "update-youtube-latest.mjs" }, { root: directory, env, stage: directory, timeoutMs: 80 }), /collector/);
  assert.ok(Date.now() - started < 2000);
});
test("U09: allowlisted staging detects new/deleted files, no-change and push conflict", async t => {
  const { directory } = await setup(t);
  await exec("git", ["init", "-q"], { cwd: directory });
  await exec("git", ["add", "."], { cwd: directory });
  await exec("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-qm", "baseline"], { cwd: directory });
  const baseCommit = (await exec("git", ["rev-parse", "HEAD"], { cwd: directory })).stdout.trim();
  const result = await api().updateHomeLatest({ ...options(directory), baseCommit });
  await writeFile(path.join(directory, "assets/home-city/city_new.png"), "unrelated");
  await assert.rejects(api().publishUpdate(result, { root: directory }), /git/);
  const commit = (await exec("git", ["show", "--pretty=", "--name-only", "HEAD"], { cwd: directory })).stdout;
  assert.ok(commit.includes("note-thumb-6.jpg"));
  assert.ok(!commit.includes("city_new.png"));
  assert.equal(await api().publishUpdate({ ...result, changes: [] }, { root: directory }), "unchanged");
  await assert.rejects(api().publishUpdate({ ...result, changes: [{ path: "assets/home-city/city_new.png", after: sha("unrelated") }] }, { root: directory }), /path/);
});
test("U09/U10: workflow preserves cadence, reports after save, no broad staging or forced push", async () => {
  const source = await readFile(path.join(root, ".github/workflows/update-youtube-latest.yml"), "utf8");
  assert.match(source, /10 \*\/4 \* \* \*/);
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /cancel-in-progress: false/);
  assert.match(source, /timeout-minutes: 15/);
  assert.ok(source.indexOf("--finish") > source.indexOf("--publish"));
  assert.ok(!source.includes("git add -A -- assets/home-city"));
  assert.ok(!source.includes("--force"));
});
test("U05/U07: real collectors use isolated output, OGP fallback and HTTP abort", async t => {
  api();
  const { directory } = await setup(t);
  const fixture = fileURLToPath(new URL("./helpers/latest-fetch-fixture.mjs", import.meta.url));
  for (const provider of ["youtube", "note", "suzuri"]) {
    const stage = path.join(directory, provider); await mkdir(stage);
    await exec(process.execPath, ["--import", fixture, path.join(root, `scripts/update-${provider}-latest.mjs`)], {
      cwd: root, env: { ...process.env, ...env, HOME_LATEST_OUTPUT_DIR: stage }, timeout: 5000,
    });
    await api().validateOutput(provider, stage);
  }
  await assert.rejects(exec(process.execPath, ["--import", fixture, path.join(root, "scripts/update-youtube-latest.mjs")], {
    cwd: root, env: { ...process.env, ...env, HOME_LATEST_OUTPUT_DIR: path.join(directory, "youtube"), LATEST_FIXTURE_HANG: "1" }, timeout: 2000,
  }), error => error.killed === false && /TimeoutError|AbortError/.test(error.stderr));
  await exec(process.execPath, ["--import", fixture, path.join(root, "scripts/update-note-latest.mjs")], {
    cwd: root, env: { ...process.env, ...env, HOME_LATEST_OUTPUT_DIR: path.join(directory, "note"), LATEST_FIXTURE_IMAGE: "1", PATH: "/nonexistent" }, timeout: 5000,
  });
  const note = JSON.parse(await readFile(path.join(directory, "note/note-latest.json")));
  assert.equal(note.items[0].thumbnailUrl, "assets/home-city/note-thumb-1.png");
  assert.equal((await readFile(path.join(directory, "note/note-thumb-1.png"))).toString("base64"), "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==");
  await api().validateOutput("note", path.join(directory, "note"));
});
for (const provider of ["youtube", "note", "suzuri"]) {
  test(`U06: malformed upstream ${provider} must not become a valid empty feed`, async t => {
    api();
    const { directory } = await setup(t);
    const stage = path.join(directory, provider); await mkdir(stage);
    const fixture = fileURLToPath(new URL("./helpers/latest-fetch-fixture.mjs", import.meta.url));
    await assert.rejects(exec(process.execPath, ["--import", fixture, path.join(root, `scripts/update-${provider}-latest.mjs`)], {
      cwd: root, env: { ...process.env, ...env, HOME_LATEST_OUTPUT_DIR: stage, LATEST_FIXTURE_MALFORMED: provider }, timeout: 5000,
    }));
    assert.deepEqual(await readdir(stage), []);
  });
}
test("U09: final report distinguishes partial publication, skips and save failures", () => {
  const result = { version: 1, providers: [{ id: "youtube", status: "failed" }, { id: "note", status: "success" }, { id: "suzuri", status: "skipped" }] };
  assert.equal(api().updateSummary(result, "success").failed, true);
  assert.match(api().updateSummary(result, "success").markdown, /saved \(or unchanged\)/);
  assert.match(api().updateSummary(result, "failure").markdown, /save failed/);
  result.providers[0].status = "success";
  assert.equal(api().updateSummary(result, "success").failed, false);
  assert.equal(api().updateSummary(result, "skipped").failed, true);
});
