import assert from "node:assert/strict";
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const driver = process.env.SAFARI_DRIVER_URL || "http://127.0.0.1:54621";
const site = process.env.SEO_CANDIDATE_URL;
const output = process.env.SEO_SAFARI_OUTPUT;
assert.ok(site && output, "Set SEO_CANDIDATE_URL and SEO_SAFARI_OUTPUT");
await mkdir(output, { recursive: true });
async function command(method, route, body) {
  const response = await fetch(driver + route, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok || data.value?.error) throw new Error(JSON.stringify(data));
  return data.value;
}
let session;
const report = [];
try {
  const created = await command("POST", "/session", { capabilities: { alwaysMatch: { browserName: "safari", pageLoadStrategy: "eager" } } });
  session = created.sessionId;
  const route = `/session/${session}`;
  const execute = script => command("POST", `${route}/execute/sync`, { script, args: [] });
  for (const requestedWidth of [390, 1440]) {
    await command("POST", `${route}/window/rect`, { width: requestedWidth, height: 1000 });
    for (const kind of ["image", "font"]) {
      const proofs = [];
      for (const mode of ["original", kind]) {
        await command("POST", `${route}/url`, { url: `${site}/?youtubePanel=0&candidate=${mode}` });
        await command("POST", `${route}/execute/async`, { script: "const done=arguments[arguments.length-1];document.fonts.ready.then(()=>done(true));", args: [] });
        await execute("const s=document.createElement('style');s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';document.head.append(s);");
        const selector = kind === "image" ? ".map-link-sns" : ".section-title";
        await execute(`document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'});`);
        await command("POST", `${route}/execute/async`, { script: "const done=arguments[arguments.length-1];requestAnimationFrame(()=>requestAnimationFrame(()=>done(true)));", args: [] });
        const geometry = await execute(`const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,innerWidth,innerHeight,dpr:devicePixelRatio};`);
        if (kind === "image") await command("POST", `${route}/execute/async`, { script: "const done=arguments[arguments.length-1];document.querySelector('.map-link-sns img').decode().then(()=>done(true),()=>done(false));", args: [] });
        const states = {};
        for (const state of ["normal", "hover"]) {
          await command("POST", `${route}/actions`, { actions: [{ type: "pointer", id: "mouse", parameters: { pointerType: "mouse" }, actions: [{ type: "pointerMove", duration: 0, x: state === "normal" ? 0 : Math.round(geometry.x + geometry.width / 2), y: state === "normal" ? 0 : Math.round(geometry.y + geometry.height / 2), origin: "viewport" }] }] });
          const screenshot = Buffer.from(await command("GET", `${route}/screenshot`), "base64");
          const info = await sharp(screenshot).metadata();
          const scale = info.width / geometry.innerWidth;
          const left = Math.max(0, Math.floor((geometry.x - 25) * scale));
          const top = Math.max(0, Math.floor((geometry.y - 25) * scale));
          const width = Math.min(info.width - left, Math.ceil((geometry.width + 50) * scale));
          const height = Math.min(info.height - top, Math.ceil((geometry.height + 50) * scale));
          states[state] = await sharp(screenshot).extract({ left, top, width, height }).png().toBuffer();
          await writeFile(path.join(output, `${kind}-${mode}-${requestedWidth}-${state}.png`), states[state]);
          if (kind === "image" && state === "normal") await writeFile(path.join(output, `context-${mode}-${requestedWidth}.png`), screenshot);
        }
        proofs.push({ geometry, states });
      }
      assert.deepEqual(proofs[0].geometry, proofs[1].geometry, "Candidate geometry must be unchanged");
      for (const state of ["normal", "hover"]) {
        const a = await sharp(proofs[0].states[state]).raw().toBuffer();
        const b = await sharp(proofs[1].states[state]).raw().toBuffer();
        let differentBytes = 0;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differentBytes++;
        report.push({ kind, requestedWidth, actualViewport: proofs[0].geometry, state, differentBytes, sameDimensions: a.length === b.length });
      }
    }
  }
  await writeFile(path.join(output, "safari-comparison.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  if (session) await command("DELETE", `/session/${session}`);
}
