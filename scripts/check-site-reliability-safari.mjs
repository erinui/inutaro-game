import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { startSiteServer } from "../tests/helpers/site-server.mjs";

const driver = process.env.SAFARI_DRIVER_URL || "http://127.0.0.1:54621";
const output = process.env.RELIABILITY_TEST_OUTPUT;
assert.ok(output, "RELIABILITY_TEST_OUTPUT is required");
await mkdir(output, { recursive: true });
const server = await startSiteServer();
const report = [];
let session;
async function command(method, path, body) {
  const response = await fetch(driver + path, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok || data.value?.error) throw new Error(JSON.stringify(data));
  return data.value;
}
try {
  session = (await command("POST", "/session", { capabilities: { alwaysMatch: { browserName: "safari", pageLoadStrategy: "eager" } } })).sessionId;
  const base = `/session/${session}`;
  const execute = script => command("POST", `${base}/execute/sync`, { script, args: [] });
  const wait = async script => {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (await execute(script)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Condition timed out: ${script}`);
  };
  const click = async selector => {
    await execute(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'});`);
    const element = await command("POST", `${base}/element`, { using: "css selector", value: selector });
    await command("POST", `${base}/element/${element["element-6066-11e4-a52e-4f735466cecf"]}/click`, {});
  };
  const key = (value, shift = false) => command("POST", `${base}/actions`, { actions: [{ type: "key", id: "keyboard", actions: [
    ...(shift ? [{ type: "keyDown", value: "\uE008" }] : []),
    { type: "keyDown", value }, { type: "keyUp", value },
    ...(shift ? [{ type: "keyUp", value: "\uE008" }] : []),
  ] }] });
  const screenshot = async name => writeFile(`${output}/${name}.png`, Buffer.from(await command("GET", `${base}/screenshot`), "base64"));
  for (const width of [390, 760, 761, 1440]) {
    await command("POST", `${base}/window/rect`, { width, height: 1000 });
    await command("POST", `${base}/url`, { url: server.url + "/games/" });
    await wait("return document.querySelector('.site-menu-toggle') && document.readyState === 'complete';");
    await wait("return document.querySelector('.site-nav').inert === matchMedia('(max-width: 760px)').matches;");
    await command("POST", `${base}/execute/async`, { script: "const done=arguments[arguments.length-1];requestAnimationFrame(()=>requestAnimationFrame(()=>done(true)));", args: [] });
    const actualWidth = await execute("return innerWidth;");
    const mobile = await execute("return matchMedia('(max-width: 760px)').matches;");
    if (mobile) {
      await click(".site-menu-toggle");
      await execute("document.querySelector('.site-nav a').focus();");
      await key("\uE00C");
      assert.equal(await execute("return document.activeElement.className;"), "site-menu-toggle");
      assert.equal(await execute("return document.querySelector('.site-nav').inert;"), true);
      await click(".site-menu-toggle");
      await execute("document.querySelector('.brand').focus();");
      await key("\uE00C");
      assert.equal(await execute("return document.querySelector('.site-menu-toggle').getAttribute('aria-expanded');"), "true");
      await click(".site-menu-toggle");
    } else {
      await execute("document.querySelector('.site-nav a').focus();");
      const href = await execute("return document.activeElement.href;");
      await key("\uE00C");
      assert.equal(await execute("return document.activeElement.href;"), href);
      assert.equal(await execute("return document.querySelector('.site-nav').inert;"), false);
    }
    assert.equal(await execute("return document.documentElement.scrollWidth > innerWidth;"), false);
    report.push({ case: "N01/N02", requestedWidth: width, actualWidth, mobile, result: "pass" });
  }
  await command("POST", `${base}/url`, { url: server.url + "/games/inutaro-mushi/" });
  await wait("return document.querySelector('#howto-open') && document.readyState === 'complete';");
  for (const method of ["\uE00C", "\uE007", " ", "click", "backdrop"]) {
    await click("#howto-open");
    for (const shift of [false, true]) {
      await key("\uE004", shift);
      assert.equal(await execute("return document.activeElement.id;"), "howto-close");
    }
    assert.equal(await execute("return [...document.querySelector('.game-shell').children].filter(e=>e.id!=='howto-panel').every(e=>e.inert);"), true);
    await key("\uE012");
    assert.equal(await execute("return state.keys.size;"), 0);
    if (method === "click") await click("#howto-close");
    else if (method === "backdrop") await execute("document.querySelector('#howto-panel').click();");
    else await key(method);
    await wait("return document.querySelector('#howto-panel').hidden;");
    assert.equal(await execute("return document.activeElement.id;"), "howto-open");
    assert.equal(await execute("return document.querySelector('#start').closest('[inert]') === null;"), true);
    report.push({ case: "G01/G02/G03/G04", method, result: "pass" });
  }
  await click("#howto-open"); await screenshot("safari-dialog"); await key("\uE00C");
  await click("#sound-toggle"); await click("#start");
  await wait("return state.running && Number(document.querySelector('#time').textContent)<40;");
  await key(" ");
  assert.equal(await execute("return state.running && document.querySelector('canvas').width > 0;"), true);
  report.push({ case: "G05", timerJump: "pass" });
  await command("POST", `${base}/url`, { url: server.url + "/?youtubePanel=0" });
  await wait("return document.querySelector('[data-youtube-cards] h3').textContent !== '最新動画';");
  await execute("document.querySelector('[data-youtube-cards]').scrollIntoView({behavior:'instant',block:'center'});");
  await wait("return [...document.querySelectorAll('[data-youtube-cards] img')].slice(0,3).every(i=>i.complete&&i.naturalWidth>0);");
  await screenshot("safari-home-normal");
  await execute("document.querySelector('[data-youtube-cards]').replaceChildren(createLatestCard({item:{title:'Fixture',url:'https://example.com'},category:'YOUTUBE',thumbnailUrl:'/missing-fixture.jpg'}));");
  await wait("return document.querySelector('[data-youtube-cards] .content-card-media-placeholder');");
  await execute("document.querySelector('[data-note-cards]').replaceChildren(createLatestCard({item:{title:'Fixture',url:'https://example.com'},category:'NOTE',thumbnailUrl:'/missing-fixture.jpg'}));document.querySelector('[data-note-cards]').scrollIntoView({behavior:'instant',block:'center'});");
  await wait("return document.querySelector('[data-note-cards] img.content-card-media-note')?.naturalWidth>0;");
  const geometry = await execute("const b=document.querySelector('[data-note-cards] .content-card-media').getBoundingClientRect();return {width:b.width,height:b.height,overflow:document.documentElement.scrollWidth>innerWidth};");
  assert.ok(Math.abs(geometry.width / geometry.height - 16/9) < 0.01);
  assert.equal(geometry.overflow, false);
  await screenshot("safari-image-fallback");
  report.push({ case: "I02/I04", ...geometry, result: "pass" });
  await writeFile(`${output}/safari-reliability.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} finally {
  if (session) await command("DELETE", `/session/${session}`);
  await server.close();
}
