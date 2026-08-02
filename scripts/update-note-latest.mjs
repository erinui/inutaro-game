import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const FEED_URL = process.env.NOTE_RSS_URL || "https://note.com/erinui/rss";
const MAX_RESULTS = clampNumber(Number(process.env.NOTE_MAX_RESULTS || 6), 1, 10);
const OUT_FILE = path.join("assets", "home-city", "note-latest.json");

const response = await fetch(FEED_URL, {
  headers: {
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

if (!response.ok) {
  throw new Error(`Failed to fetch note RSS: ${response.status}`);
}

const feed = await response.text();
const items = getTagValues(feed, "item")
  .map(parseItem)
  .filter((item) => item.title && item.url)
  .slice(0, MAX_RESULTS);

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(
  OUT_FILE,
  `${JSON.stringify({ ok: true, fetchedAt: new Date().toISOString(), sourceUrl: FEED_URL, items }, null, 2)}\n`,
);

console.log(JSON.stringify({ fetchedAt: new Date().toISOString(), articles: items.length }, null, 2));

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
