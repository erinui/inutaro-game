import {restoreHomePerformanceChanges} from './approved-home-performance-changes.mjs';
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export const faviconChanges = JSON.parse(await readFile(new URL("../fixtures/seo-favicon-changes.json", import.meta.url)));

export function restoreApprovedFaviconChanges(file, source) {
  source=restoreHomePerformanceChanges(file,source);
  for (const change of faviconChanges.changes.filter(item => item.file === file)) {
    assert.equal(source.split(change.after).length - 1, change.count, `${file}: ${change.id} approved fragment count`);
    source = source.replaceAll(change.after, change.before);
  }
  return source;
}
