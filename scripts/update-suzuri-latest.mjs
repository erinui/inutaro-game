import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_URL = "https://suzuri.jp/api/v1/products";
const SHOP_URL = process.env.SUZURI_SHOP_URL || "https://suzuri.jp/erikanuinui";
const USER_NAME = process.env.SUZURI_USER_NAME || "erikanuinui";
const MAX_RESULTS = clampNumber(Number(process.env.SUZURI_MAX_RESULTS || 6), 1, 10);
const OUT_FILE = path.join("assets", "home-city", "suzuri-latest.json");
const token = process.env.SUZURI_ACCESS_TOKEN;

if (!token) {
  throw new Error("SUZURI_ACCESS_TOKEN is required.");
}

const params = new URLSearchParams({ userName: USER_NAME, limit: String(MAX_RESULTS) });
const response = await fetch(`${API_URL}?${params.toString()}`, {
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  },
});
const data = await response.json();

if (!response.ok) {
  throw new Error(data?.error?.message || `SUZURI API request failed: ${response.status}`);
}

const items = (data.products || []).filter((product) => product.published !== false).map(normalizeProduct);
await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(
  OUT_FILE,
  `${JSON.stringify({ ok: true, fetchedAt: new Date().toISOString(), shopUrl: SHOP_URL, items }, null, 2)}\n`,
);

console.log(JSON.stringify({ fetchedAt: new Date().toISOString(), products: items.length }, null, 2));

function normalizeProduct(product) {
  return {
    id: product.id || null,
    title: product.title || product.item?.humanizeName || "SUZURIのグッズ",
    url: product.sampleUrl || product.url || SHOP_URL,
    thumbnailUrl: product.sampleImageUrl || product.imageUrl || "",
    priceWithTax: toNumberOrNull(product.discountedPriceWithTax ?? product.priceWithTax),
    publishedAt: product.publishedAt || "",
  };
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
