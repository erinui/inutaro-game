import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../fixtures/seo-performance-changes.json", import.meta.url)));

export function approvedUpstreamHash(file, previousHash) {
  const change = manifest.acceptedUpstreamData?.files[file];
  if (!change) return previousHash;
  assert.equal(change.previous, previousHash, `${file}: upstream must preserve the baseline history`);
  assert.match(manifest.acceptedUpstreamData.commit, /^[a-f0-9]{40}$/);
  return change.accepted;
}

export function restoreApprovedSeoChanges(file, source) {
  for (const change of manifest.changes.filter(item => item.file === file)) {
    const count = source.split(change.after).length - 1;
    assert.equal(count, change.count, `${file}: ${change.id} approved fragment count`);
    source = source.replaceAll(change.after, change.before);
  }
  return source;
}
