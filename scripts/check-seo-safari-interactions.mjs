import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const driver = process.env.SAFARI_DRIVER_URL || "http://127.0.0.1:54621";
const site = process.env.SEO_CANDIDATE_URL;
const output = process.env.SEO_SAFARI_OUTPUT;
assert.ok(site && output);
async function command(method, path, body) {
  const response = await fetch(driver + path, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok || data.value?.error) throw new Error(JSON.stringify(data));
  return data.value;
}
let id;
const report = [];
try {
  const session = await command("POST", "/session", { capabilities: { alwaysMatch: { browserName: "safari", pageLoadStrategy: "eager" } } });
  id = session.sessionId;
  const root = `/session/${id}`;
  const execute = script => command("POST", `${root}/execute/sync`, { script, args: [] });
  const click = async selector => {
    await execute(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'});`);
    await command("POST", `${root}/execute/async`, { script: "const done=arguments[arguments.length-1];requestAnimationFrame(()=>requestAnimationFrame(()=>done(true)));", args: [] });
    const element = await command("POST", `${root}/element`, { using: "css selector", value: selector });
    await command("POST", `${root}/element/${element["element-6066-11e4-a52e-4f735466cecf"]}/click`, {});
  };
  const wait = async script => { for (let attempt = 0; attempt < 60; attempt++) { if (await execute(script)) return; await new Promise(r => setTimeout(r, 100)); } throw new Error(`Condition timed out: ${script}`); };
  for (const width of [390, 1440]) {
    await command("POST", `${root}/window/rect`, { width, height: 1000 });
    await command("POST", `${root}/url`, { url: `${site}/?youtubePanel=0&candidate=interaction` });
    await wait("return document.querySelector('[data-youtube-cards] h3').textContent !== '最新動画';");
    if (width === 390) {
      await click(".site-menu-toggle");
      assert.equal(await execute("return document.querySelector('.site-menu-toggle').getAttribute('aria-expanded');"), "true");
      await click(".site-menu-toggle");
      assert.equal(await execute("return document.querySelector('.site-menu-toggle').getAttribute('aria-expanded');"), "false");
    } else {
      await click("[aria-labelledby='youtube-title'] .content-carousel-next");
      await wait("return document.querySelector('[data-youtube-cards]').scrollLeft > 0;");
    }
    await execute("document.querySelector('[data-youtube-cards]').scrollIntoView({behavior:'instant',block:'center'});");
    await wait("return [...document.querySelectorAll('[data-youtube-cards] img')].slice(0,3).every(i=>i.complete&&i.naturalWidth>0);");
    const geometry = await execute("return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,cards:document.querySelectorAll('[data-youtube-cards] > a').length, title:document.title};");
    assert.equal(geometry.overflow, false);
    report.push({ type: "home", requestedWidth: width, ...geometry, menuOrCarousel: "pass", localThumbnailDecode: "pass" });
    await writeFile(`${output}/interaction-home-${width}.png`, Buffer.from(await command("GET", `${root}/screenshot`), "base64"));
  }
  await command("POST", `${root}/window/rect`, { width: 1440, height: 1000 });
  await command("POST", `${root}/url`, { url: `${site}/games/inutaro-mushi/` });
  await wait("return document.querySelector('#start') !== null;");
  await click("#sound-toggle");
  await click("#start");
  await wait("return document.querySelector('.game-shell').classList.contains('is-playing') && Number(document.querySelector('#time').textContent)<40;");
  await command("POST", `${root}/actions`, { actions: [{ type: "key", id: "keyboard", actions: [{ type: "keyDown", value: " " }, { type: "keyUp", value: " " }] }] });
  const game = await execute("const c=document.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let opaque=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)opaque++;return {time:Number(document.querySelector('#time').textContent),opaquePixels:opaque,width:c.width,height:c.height};");
  assert.ok(game.opaquePixels > 10000);
  report.push({ type: "game", ...game, startTimerJump: "pass" });
  await writeFile(`${output}/interaction-game.png`, Buffer.from(await command("GET", `${root}/screenshot`), "base64"));
  await writeFile(`${output}/safari-interactions.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  if (id) await command("DELETE", `/session/${id}`);
}
