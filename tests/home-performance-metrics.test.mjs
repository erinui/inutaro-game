import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cumulativeLayoutShift, assessPerformance } from '../scripts/lib/home-performance-metrics.mjs';

test('HP-MEASURE-01: CLS uses the largest session, excludes recent input, and splits at one second', () => {
  const shifts = [
    { startTime: 100, value: .03 }, { startTime: 500, value: .04 },
    { startTime: 600, value: .8, hadRecentInput: true },
    { startTime: 1500, value: .05 }, { startTime: 1600, value: .06 },
  ];
  assert.equal(cumulativeLayoutShift(shifts), .11);
  assert.equal(cumulativeLayoutShift(Array.from({length: 8}, (_, i) => ({startTime: i * 800, value: .01}))).toFixed(2), '0.07');
});

const original = { lcp: 800, cls: .04, bodyBytes: 7100000, fontBytes: 1635088, imageBytes: 4300000, maxImageBytes: 1800000, unknown: [], incomplete: [] };
test('HP-T11: map stage can pass before the font and total budgets, final cannot', () => {
  const map = { ...original, bodyBytes: 3000000, imageBytes: 190000, maxImageBytes: 50000 };
  assert.equal(assessPerformance(map, original, {mode:'stage', stage:'P2'}).passed, true);
  const final = assessPerformance(map, original, {mode:'final'});
  assert.equal(final.passed, false);
  assert.ok(final.failures.includes('total-budget'));
  assert.ok(final.failures.includes('font-budget'));
});
test('HP-T11: unknown bytes, incomplete requests and regressions cannot pass', () => {
  const current = { ...original, lcp: 900, unknown: ['https://external/image'], incomplete: ['pending'] };
  const result = assessPerformance(current, original, {mode:'stage', stage:'P3a'});
  assert.equal(result.passed, false);
  for (const failure of ['lcp-regression','unknown-bytes','incomplete-requests']) assert.ok(result.failures.includes(failure));
});
test('HP-T11: swap has no capacity requirement, partitioning does', () => {
  assert.equal(assessPerformance(original, original, {mode:'stage',stage:'P3a'}).passed, true);
  assert.equal(assessPerformance(original, original, {mode:'stage',stage:'P3b'}).passed, false);
  assert.throws(() => assessPerformance(original, original, {mode:'stage',stage:'typo'}), /stage/);
});
test('HP-T11: image stage budgets apply to adopted images instead of unrelated legacy resources',()=>{
 const current={...original,adoptedImageBytes:200000,adoptedMaxImageBytes:50000};
 const baseline={...original,adoptedImageBytes:4300000,adoptedMaxImageBytes:1800000};
 assert.equal(assessPerformance(current,baseline,{mode:'stage',stage:'P2'}).passed,true);
});
test('HP-T11: the one-megabyte initial budget is a mobile gate, desktop remains reported',()=>{
 const current={...original,viewport:{width:1440},lcp:600,cls:0.01,bodyBytes:1100000,fontBytes:80000,imageBytes:900000,maxImageBytes:90000};
 assert.equal(assessPerformance(current,original).passed,true);
 assert.equal(assessPerformance({...current,viewport:{width:390}},original).passed,false);
});
