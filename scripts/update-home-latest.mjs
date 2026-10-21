import {assertNodeVersion} from './check-node-version.mjs';
import { mkdtemp, mkdir, readdir, lstat, readFile, writeFile, rm, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { promisify, parseArgs } from "node:util";
import { validateYoutubeImage } from './lib/youtube-images.mjs';

const rootDirectory = fileURLToPath(new URL("../", import.meta.url));
const exec = promisify(execFile);
const providers = [
  { id: "youtube", script: "update-youtube-latest.mjs", secret: "YOUTUBE_API_KEY", json: "youtube-latest.json", pattern: /^(youtube-latest\.json|youtube-thumb-[1-5]\.jpg|youtube-thumb-[A-Za-z0-9_-]{1,80}-[a-f0-9]{16}\.webp)$/ },
  { id: "note", script: "update-note-latest.mjs", json: "note-latest.json", pattern: /^(note-latest\.json|note-thumb-[1-6]\.(png|jpg|webp))$/ },
  { id: "suzuri", script: "update-suzuri-latest.mjs", secret: "SUZURI_ACCESS_TOKEN", json: "suzuri-latest.json", pattern: /^suzuri-latest\.json$/ },
];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const validUrl = value => {
  try { const url = new URL(value); return typeof value === "string" && ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
};
function ensure(condition, code = "invalid-output") {
  if (!condition) throw Object.assign(new Error(code), { code });
}
async function fileSet(directory, pattern) {
  const files = new Map();
  for (const name of await readdir(directory)) {
    if (!pattern.test(name)) continue;
    const filename = path.join(directory, name);
    ensure((await lstat(filename)).isFile());
    files.set(name, await readFile(filename));
  }
  return files;
}
export async function validateOutput(id, directory) {
  const provider = providers.find(p => p.id === id);
  ensure(provider);
  ensure((await readdir(directory)).every(name => provider.pattern.test(name)));
  const files = await fileSet(directory, provider.pattern);
  ensure(files.has(provider.json));
  const data = JSON.parse(files.get(provider.json).toString());
  if(id==='youtube')ensure(data.schemaVersion===undefined||data.schemaVersion===1||data.schemaVersion===2);
  ensure(data.ok === true && typeof data.fetchedAt === "string" && Number.isFinite(Date.parse(data.fetchedAt)));
  const items = id === "youtube" ? data.videos : data.items;
  ensure(Array.isArray(items) && items.length <= 6);
  if (id === "youtube") ensure(data.channel && typeof data.channel.id === "string" && typeof data.channel.title === "string" && validUrl(data.channel.url) && data.channel.statistics && typeof data.channel.statistics === "object");
  const referenced = new Set([provider.json]);
  for (const [index, item] of items.entries()) {
    ensure(item && typeof item.title === "string" && item.title.length > 0 && validUrl(item.url));
    if (id === "youtube" && item.thumbnail) {
      ensure(validUrl(item.thumbnail.url));
      if (index < 5) referenced.add(`youtube-thumb-${index + 1}.jpg`);
      if(data.schemaVersion===2) {
        await validateYoutubeImage(item.localThumbnail,item.id,directory);
        referenced.add(path.basename(item.localThumbnail.url));
      }
    }
    if(id==='youtube'&&!item.thumbnail)ensure(!item.localThumbnail);
    if (id === "note" && item.thumbnailUrl) {
      ensure(/^assets\/home-city\/note-thumb-[1-6]\.(png|jpg|webp)$/.test(item.thumbnailUrl));
      referenced.add(path.basename(item.thumbnailUrl));
    }
    if (id === "suzuri") {
      ensure(!item.thumbnailUrl || validUrl(item.thumbnailUrl));
      ensure(item.priceWithTax === null || (Number.isFinite(item.priceWithTax) && item.priceWithTax >= 0));
    }
  }
  ensure([...referenced].every(name => files.has(name)));
  ensure([...files.keys()].every(name => referenced.has(name)));
  for (const [name, bytes] of files) {
    if (name.endsWith(".json")) continue;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    ensure(name.endsWith(".png") ? png : name.endsWith(".jpg") ? jpg : webp);
  }
  return files;
}
export function runCollector(provider, { root, stage, env, timeoutMs = 180000 }) {
  return new Promise((resolve, reject) => {
    const grouped = process.platform !== "win32";
    const child = spawn(process.execPath, [path.join(root, "scripts", provider.script)], {
      cwd: root, env: { ...env, HOME_LATEST_OUTPUT_DIR: stage }, stdio: "ignore", detached: grouped,
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { if (grouped) process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); } catch { /* The collector may have exited just before its deadline. */ }
    }, timeoutMs);
    child.on("error", () => { clearTimeout(timer); reject(Object.assign(new Error("collector spawn failed"), { code: "collector-spawn" })); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code === 0 && !timedOut) resolve();
      else reject(Object.assign(new Error("collector failed"), { code: timedOut ? "collector-timeout" : "collector-failed" }));
    });
  });
}
async function git(args, root) {
  try { const result = await exec("git", args, { cwd: root }); return { code: 0, stdout: result.stdout }; }
  catch (error) { return { code: typeof error.code === "number" ? error.code : -1, stdout: "" }; }
}
export async function updateHomeLatest({ root = rootDirectory, env = process.env, baseCommit, runCollector: collect = runCollector, write = writeFile, only } = {}) {
  if(only!==undefined)ensure(Array.isArray(only)&&only.length>0&&new Set(only).size===only.length&&only.every(id=>providers.some(p=>p.id===id)), 'invalid-provider-selection');
  const selectedProviders=only===undefined?providers:providers.filter(p=>only.includes(p.id));
  const assets = path.join(root, "assets/home-city");
  const workspace = await mkdtemp(path.join(tmpdir(), "erinui-home-update-"));
  const result = { version: 1, baseCommit: baseCommit || (await git(["rev-parse", "HEAD"], root)).stdout.trim(), providers: [], changes: [], promoted: false };
  const snapshots = new Map();
  const replacements = new Map();
  try {
    for (const provider of selectedProviders) snapshots.set(provider.id, await fileSet(assets, provider.pattern));
    for (const provider of selectedProviders) {
      const record = { id: provider.id, status: "failed", reason: "missing-secret", previousFiles: Object.fromEntries([...snapshots.get(provider.id)].map(([name, bytes]) => [name, hash(bytes)])) };
      result.providers.push(record);
      if (provider.secret && !env[provider.secret]) {
        if (provider.id === "suzuri") record.status = "skipped";
        continue;
      }
      const stage = path.join(workspace, provider.id);
      await mkdir(stage);
      try {
        await collect(provider, { root, stage, env });
        replacements.set(provider.id, await validateOutput(provider.id, stage));
        record.status = "success";
        record.reason = "validated";
      } catch (error) {
        record.reason = ["collector-timeout", "collector-spawn", "collector-failed"].includes(error.code) ? error.code : "invalid-output-or-collector-failure";
      }
    }
    const operations = [];
    for (const [id, next] of replacements) {
      const previous = snapshots.get(id);
      for (const name of new Set([...previous.keys(), ...next.keys()])) {
        const before = previous.get(name), after = next.get(name);
        const retainingYoutubeImages=id==='youtube'&&JSON.parse(next.get('youtube-latest.json').toString()).schemaVersion===2;
        const historicalHashedImage=id==='youtube'&&/^youtube-thumb-[A-Za-z0-9_-]{1,80}-[a-f0-9]{16}\.webp$/.test(name);
        if(before&&!after&&(historicalHashedImage||(retainingYoutubeImages&&!name.endsWith('.json'))))continue;
        if (before && after && before.equals(after)) continue;
        operations.push({ name, before, after });
      }
    }
    const touched = [];
    try {
      for (const operation of operations.sort((a,b)=>Number(a.name.endsWith('.json'))-Number(b.name.endsWith('.json')))) {
        touched.push(operation);
        const target = path.join(assets, operation.name);
        if (operation.after) await write(target, operation.after);
        else await rm(target);
      }
    } catch {
      let restored = true;
      for (const operation of touched.reverse()) {
        try {
          const target = path.join(assets, operation.name);
          if (operation.before) await writeFile(target, operation.before);
          else await rm(target, { force: true });
        } catch { restored = false; }
      }
      throw new Error(restored ? "promotion failed; previous files restored" : "promotion failed; restoration incomplete");
    }
    result.changes = operations.map(op => ({ path: `assets/home-city/${op.name}`, before: op.before ? hash(op.before) : null, after: op.after ? hash(op.after) : null }));
    result.promoted = true;
    return result;
  } finally { await rm(workspace, { recursive: true, force: true }); }
}
export async function publishUpdate(result, { root = rootDirectory, runGit = args => git(args, root) } = {}) {
  ensure(result?.version === 1 && result.promoted === true && Array.isArray(result.changes), "invalid-report");
  for (const change of result.changes) {
    ensure(typeof change.path === "string" && change.path.startsWith("assets/home-city/") && providers.some(p => p.pattern.test(change.path.slice(17))) && !change.path.slice(17).includes("/"), "invalid-path");
    const filename = path.join(root, change.path);
    if (change.after === null) await assertMissing(filename);
    else ensure((await lstat(filename)).isFile() && hash(await readFile(filename)) === change.after, "changed-output");
  }
  if (!result.changes.length) return "unchanged";
  const run = async args => { const outcome = await runGit(args); ensure(outcome.code === 0, "git-operation-failed"); return outcome.stdout; };
  ensure((await run(["rev-parse", "HEAD"])).trim() === result.baseCommit, "git-base-changed");
  ensure((await run(["diff", "--cached", "--name-only"])).trim() === "", "git-index-not-empty");
  await run(["add", "-A", "--", ...result.changes.map(c => c.path)]);
  const diff = await runGit(["diff", "--cached", "--quiet"]);
  if (diff.code === 0) return "unchanged";
  ensure(diff.code === 1, "git-diff-failed");
  await run(["-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "-m", "Update home latest data"]);
  await run(["push", "origin", "HEAD:main"]);
  return "pushed";
}
async function assertMissing(filename) {
  try { await lstat(filename); } catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error("changed-output");
}
export function updateSummary(result, saved) {
  ensure(result?.version === 1 && Array.isArray(result.providers), "invalid-report");
  const lines = ["## Home latest update", "", "| Provider | Retrieval | Files |", "| --- | --- | --- |"];
  for (const p of result.providers) {
    ensure(providers.some(provider => provider.id === p.id) && ["success", "failed", "skipped"].includes(p.status), "invalid-report");
    const files = p.status === "success" ? (saved === "success" ? "saved (or unchanged)" : "save failed") : "previous files retained";
    lines.push(`| ${p.id} | ${p.status} | ${files} |`);
  }
  return { markdown: lines.join("\n") + "\n", failed: saved !== "success" || result.providers.some(p => p.status === "failed") };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertNodeVersion();
  const { values } = parseArgs({ options: { report: { type: "string", default: path.join(tmpdir(), `erinui-home-result-${process.pid}.json`) }, publish: { type: "boolean" }, finish: { type: "boolean" }, saved: { type: "string", default: "success" } } });
  try {
    if (values.finish) {
      const summary = updateSummary(JSON.parse(await readFile(values.report, "utf8")), values.saved);
      if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary.markdown);
      process.stdout.write(summary.markdown);
      if (summary.failed) process.exitCode = 1;
    } else if (values.publish) {
      const saved = await publishUpdate(JSON.parse(await readFile(values.report, "utf8")));
      process.stdout.write(`Home data: ${saved}\n`);
    } else {
      const result = await updateHomeLatest();
      await writeFile(values.report, JSON.stringify(result, null, 2) + "\n");
      process.stdout.write(`Home update report: ${values.report}\n`);
    }
  } catch {
    // Do not forward subprocess stderr or API responses containing credentials.
    process.stderr.write("Home update failed. Check the retrieval/save step and its result report.\n");
    process.exitCode = 1;
  }
}
