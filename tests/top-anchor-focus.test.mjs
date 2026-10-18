import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateCodeAssets } from '../scripts/lib/generate-home-code.mjs';

const root = new URL('../', import.meta.url);

test('TOP anchor headings suppress focus outlines without removing keyboard link and button indicators', async () => {
  const css = await readFile(new URL('home.css', root), 'utf8');
  assert.match(css, /body\.city-home \.section-title:focus\s*\{\s*outline:\s*none;\s*\}/);
  assert.match(css, /body\.city-home :is\(a, button\):focus-visible\s*\{\s*outline: 3px solid #1664a8; outline-offset: 5px;\s*\}/);
  const js = await readFile(new URL('home.js', root), 'utf8');
  assert.ok(js.includes("target.setAttribute('tabindex', '-1')"));
  assert.ok(js.includes('target.focus({preventScroll:true})'));
});

test('TOP anchor focus correction is included in the hashed production stylesheet', async () => {
  const manifest = JSON.parse(await readFile(new URL('config/home-performance-assets.json', root), 'utf8'));
  const css = await readFile(new URL(manifest.bindings['home.css'], root), 'utf8');
  assert.match(css, /body\.city-home \.section-title:focus\s*\{\s*outline:\s*none;\s*\}/);
  await validateCodeAssets(fileURLToPath(root), manifest);
});
