import { mkdir, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicFiles = [
  "index.html", "home.css", "home.js", "site-nav.js", "site-migration.js",
  "robots.txt", "sitemap.xml", "_headers", "data/news.json",
  "games/index.html", "games/inutaro-mushi/index.html",
  "games/inutaro-mushi/style.css", "games/inutaro-mushi/game.js",
  ...["characters", "blog", "illustrations", "terms", "privacy"].map(name => `pages/${name}.html`),
];

export async function buildSite(output) {
  // Only versioned assets belong in a release, not local drafts or downloaded originals.
  const assets = execFileSync("git", ["ls-files", "-z", "--", "assets"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const files = [...publicFiles, ...assets];
  try { await mkdir(output); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error(`Build output already exists: ${output}. Use a fresh directory.`);
    throw error;
  }
  for (const file of files) {
    const target = path.join(output, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, file), target);
  }
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await buildSite(path.join(root, "dist"));
  process.stdout.write(`Built ${files.length} public files in dist/\n`);
}
