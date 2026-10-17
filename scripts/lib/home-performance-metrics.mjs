// Pure measurement and acceptance functions; shared by the lab runner and tests.
export function cumulativeLayoutShift(shifts) {
  let maximum = 0, sum = 0, start = -Infinity, previous = -Infinity;
  for (const shift of [...shifts].sort((a,b) => a.startTime-b.startTime)) {
    if (shift.hadRecentInput) continue;
    if (shift.startTime - previous >= 1000 || shift.startTime - start >= 5000) {
      sum = 0; start = shift.startTime;
    }
    sum += shift.value;
    previous = shift.startTime;
    maximum = Math.max(maximum, sum);
  }
  return maximum;
}

export function assessPerformance(current, baseline, {mode = 'final', stage} = {}) {
  if (!['stage','final'].includes(mode)) throw new Error('Unknown mode');
  if (mode === 'stage' && !['P0','P1','P2','P3a','P3b','P4','P5','P6'].includes(stage)) throw new Error('Unknown stage');
  const failures = [];
  const check = (condition, name) => { if (!condition) failures.push(name); };
  for (const name of ['lcp','cls','bodyBytes','fontBytes','imageBytes','maxImageBytes']) check(Number.isFinite(current[name]) && current[name] >= 0, `missing-${name}`);
  check(Array.isArray(current.unknown) && current.unknown.length === 0, 'unknown-bytes');
  check(Array.isArray(current.incomplete) && current.incomplete.length === 0, 'incomplete-requests');
  if (baseline && stage !== 'P0') {
    check(current.lcp <= baseline.lcp, 'lcp-regression');
    check(current.cls <= baseline.cls, 'cls-regression');
  }
  if (mode === 'final') {
    if(!current.viewport||current.viewport.width<=430)check(current.bodyBytes < 1000000, 'total-budget');
    check(current.fontBytes <= 100000, 'font-budget');
    check(current.maxImageBytes <= 100000, 'image-budget');
    check(current.lcp <= 2500, 'lcp-target');
    check(current.cls <= .1, 'cls-target');
  } else if (['P2','P5'].includes(stage)) {
    check((current.adoptedImageBytes??current.imageBytes) < (baseline?.adoptedImageBytes??baseline?.imageBytes), 'image-reduction');
    check((current.adoptedMaxImageBytes??current.maxImageBytes) <= 100000, 'image-budget');
  } else if (stage === 'P3b') {
    check(current.fontBytes <= 100000, 'font-budget');
    check(current.fontBytes < baseline?.fontBytes, 'font-reduction');
  }
  return {mode, stage, passed: failures.length === 0, failures};
}
