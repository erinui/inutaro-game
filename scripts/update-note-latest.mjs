import { execFile } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const FEED_URL = process.env.NOTE_RSS_URL || "https://note.com/erinui/rss";
const MAX_RESULTS = clampNumber(Number(process.env.NOTE_MAX_RESULTS || 6), 1, 10);
const OUT_DIR = path.join("assets", "home-city");
const OUT_FILE = path.join(OUT_DIR, "note-latest.json");
const NOTE_ORIGIN = "https://note.com/";
const execFileAsync = promisify(execFile);

const response = await fetchWithTimeout(FEED_URL, {
  headers: {
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

if (!response.ok) {
  throw new Error(`Failed to fetch note RSS: ${response.status}`);
}

const feed = await response.text();
const feedItems = getTagValues(feed, "item")
  .map(parseItem)
  .filter((item) => item.title && item.url)
  .slice(0, MAX_RESULTS);

await mkdir(OUT_DIR, { recursive: true });
const items = await Promise.all(
  feedItems.map(async (item, index) => {
    const thumbnail = await fetchArticleThumbnail(item.url);
    if (!thumbnail) return item;

    const filename = `note-thumb-${index + 1}.${thumbnail.extension}`;
    await saveThumbnail(path.join(OUT_DIR, filename), thumbnail.bytes);
    return {
      ...item,
      thumbnailUrl: `assets/home-city/${filename}`,
    };
  }),
);

await removeStaleThumbnails(items);
await writeFile(
  OUT_FILE,
  `${JSON.stringify({ ok: true, fetchedAt: new Date().toISOString(), sourceUrl: FEED_URL, items }, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      fetchedAt: new Date().toISOString(),
      articles: items.length,
      thumbnails: items.filter((item) => item.thumbnailUrl).length,
    },
    null,
    2,
  ),
);

function parseItem(itemXml) {
  const title = decodeXml(getFirstTagValue(itemXml, "title"));
  const description = stripHtml(decodeXml(getFirstTagValue(itemXml, "description")));
  const url = decodeXml(getFirstTagValue(itemXml, "link"));
  const publishedAt = decodeXml(getFirstTagValue(itemXml, "pubDate"));

  return {
    title,
    excerpt: description.slice(0, 96),
    url,
    publishedAt,
  };
}

async function saveThumbnail(outputPath, bytes) {
  const sourcePath = `${outputPath}.source`;
  await writeFile(sourcePath, bytes);

  try {
    // noteのOGPには上下の黒帯が含まれるため、外周色だけをトリミングして保存する。
    await execFileAsync("convert", [sourcePath, "-trim", "+repage", outputPath], { timeout: 12_000 });
  } catch (_error) {
    // 画像処理環境が利用できない場合も、記事画像の表示自体は維持する。
    await writeFile(outputPath, bytes);
  } finally {
    await rm(sourcePath, { force: true });
  }
}

async function fetchArticleThumbnail(articleUrl) {
  if (!articleUrl.startsWith(NOTE_ORIGIN)) return null;

  try {
    const articleResponse = await fetchWithTimeout(articleUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!articleResponse.ok) return null;

    const imageUrl = getOgImage(await articleResponse.text());
    if (!imageUrl || !imageUrl.startsWith("https://")) return null;

    const imageResponse = await fetchWithTimeout(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!imageResponse.ok) return null;

    const contentType = imageResponse.headers.get("content-type") || "";
    const extension = imageExtension(contentType, imageUrl);
    if (!extension) return null;

    return {
      bytes: Buffer.from(await imageResponse.arrayBuffer()),
      extension,
    };
  } catch (_error) {
    // An individual article image should not block the latest-news update.
    return null;
  }
}

function getOgImage(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const property = readAttribute(tag, "property") || readAttribute(tag, "name");
    if (property?.toLowerCase() === "og:image") {
      return decodeXml(readAttribute(tag, "content") || "");
    }
  }
  return "";
}

function readAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] || match?.[2] || match?.[3] || "";
}

function imageExtension(contentType, imageUrl) {
  const normalizedType = contentType.toLowerCase().split(";", 1)[0];
  const typeExtensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (typeExtensions[normalizedType]) return typeExtensions[normalizedType];

  const pathname = new URL(imageUrl).pathname.toLowerCase();
  const matched = pathname.match(/\.(jpe?g|png|webp)$/);
  return matched ? matched[1].replace("jpeg", "jpg") : "";
}

async function removeStaleThumbnails(items) {
  const currentFiles = new Set(
    items
      .map((item) => item.thumbnailUrl?.split("/").pop())
      .filter(Boolean),
  );
  const files = await readdir(OUT_DIR);
  await Promise.all(
    files
      .filter((file) => /^note-thumb-\d+\.(?:jpe?g|png|webp)$/i.test(file) && !currentFiles.has(file))
      .map((file) => rm(path.join(OUT_DIR, file))),
  );
}

async function fetchWithTimeout(url, options, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getTagValues(xml, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  return [...xml.matchAll(pattern)].map((match) => match[1]);
}

function getFirstTagValue(xml, tagName) {
  const values = getTagValues(xml, tagName);
  return values[0] || "";
}

function stripHtml(value) {
  return value
    .replace(/\$\$\{\\textit\{([^}]*)\}\}\$\$/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/続きをみる/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value) {
  return value
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
