import {readFile,writeFile} from 'node:fs/promises';
import {assessPerformance} from './lib/home-performance-metrics.mjs';
const [beforeFile,afterFile,output]=process.argv.slice(2);if(!output)throw new Error('Usage: node scripts/summarize-home-performance.mjs before/runs.json after/runs.json result.json');
const before=JSON.parse(await readFile(beforeFile)),after=JSON.parse(await readFile(afterFile));
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]};
const group=runs=>{const result=new Map();for(const run of runs){const key=`${run.viewport.width}/${run.dpr}`;result.set(key,[...(result.get(key)||[]),run]);}return result};
const originals=group(before),groups=group(after),results=[];
if(originals.size!==4||groups.size!==4||['390/1','390/2','1440/1','1440/2'].some(k=>!originals.has(k)||!groups.has(k)))throw new Error('All four viewport/DPR conditions required');
const settings=JSON.stringify({browser:before[0].browser,network:before[0].network,elapsed:before[0].elapsed});
if([...before,...after].some(r=>JSON.stringify({browser:r.browser,network:r.network,elapsed:r.elapsed})!==settings))throw new Error('Measurement settings differ');
for(const [condition,runs] of groups){
 const baseline=originals.get(condition);if(!baseline||baseline.length<3||runs.length<3)throw new Error('Three before/after runs required per condition');
 const reduce=items=>Object.fromEntries(['lcp','cls','bodyBytes','fontBytes','imageBytes','maxImageBytes'].map(k=>[k,median(items.map(r=>r[k]))]));
 const previous=reduce(baseline),current={...reduce(runs),viewport:runs[0].viewport,unknown:runs.flatMap(r=>r.unknown),incomplete:runs.flatMap(r=>r.incomplete)};
 results.push({condition,samples:runs.length,before:previous,beforeBodyBytesAreLowerBounds:baseline.some(r=>r.unknown.length||r.incomplete.length),after:current,maximumBodyBytes:Math.max(...runs.map(r=>r.bodyBytes)),minimumConfirmedReduction:1-Math.max(...runs.map(r=>r.bodyBytes))/Math.min(...baseline.map(r=>r.bodyBytes)),assessment:assessPerformance({...current,...Object.fromEntries(['bodyBytes','fontBytes','maxImageBytes'].map(k=>[k,Math.max(...runs.map(r=>r[k]))]))},previous)});
}
await writeFile(output,JSON.stringify({passed:results.every(r=>r.assessment.passed),results},null,2)+'\n');
console.log(JSON.stringify(results.map(({condition,before,after,assessment})=>({condition,beforeLcp:before.lcp,lcp:after.lcp,cls:after.cls,bodyBytes:after.bodyBytes,fontBytes:after.fontBytes,passed:assessment.passed,failures:assessment.failures})),null,2));
