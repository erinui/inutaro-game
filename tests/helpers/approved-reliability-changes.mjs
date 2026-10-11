import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export const reliabilityChanges = JSON.parse(await readFile(new URL("../fixtures/site-reliability-changes.json", import.meta.url)));

export function restoreReliabilityChanges(file, source) {
  for (const change of reliabilityChanges.changes.filter(item => item.file === file)) {
    assert.equal(source.split(change.after).length - 1, change.count, `${file}: ${change.id} approved fragment count`);
    source = source.replaceAll(change.after, change.before);
  }
  return source;
}
