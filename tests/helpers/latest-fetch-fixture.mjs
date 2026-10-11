const nativeTimeout = AbortSignal.timeout;
AbortSignal.timeout = milliseconds => {
  if (milliseconds !== 12000) throw new Error("Expected 12-second HTTP limit");
  return nativeTimeout(30);
};
globalThis.fetch = async (url, options = {}) => {
  if (process.env.LATEST_FIXTURE_HANG === "1") return new Promise((resolve, reject) => {
    options.signal?.addEventListener("abort", () => reject(options.signal.reason), { once: true });
    // Keep the child alive until its abort signal fires.
    const timer = setInterval(() => {}, 100);
    options.signal?.addEventListener("abort", () => clearInterval(timer), { once: true });
  });
  const pathname = new URL(url).pathname;
  const malformed = process.env.LATEST_FIXTURE_MALFORMED;
  if (malformed === "youtube" && pathname === "/youtube/v3/playlistItems") return Response.json({});
  if (malformed === "suzuri" && pathname === "/api/v1/products") return Response.json({});
  if (malformed === "note" && pathname === "/erinui/rss") return new Response("<html>Unavailable</html>");
  if (pathname === "/youtube/v3/channels") return Response.json({ items: [{ id: "fixture", snippet: { title: "fixture" }, contentDetails: { relatedPlaylists: { uploads: "fixture" } }, statistics: {} }] });
  if (pathname === "/youtube/v3/playlistItems") return Response.json({ items: [] });
  if (pathname === "/erinui/rss") return new Response('<rss><channel><item><title>Fixture</title><link>https://note.com/erinui/n/fixture</link><description>Fixture</description><pubDate>2026-10-11</pubDate></item></channel></rss>');
  if (pathname === "/erinui/n/fixture") return process.env.LATEST_FIXTURE_IMAGE === "1" ? new Response('<meta property="og:image" content="https://example.com/fixture.png">') : new Response("not found", { status: 404 });
  if (pathname === "/fixture.png") return new Response(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64"), { headers: { "Content-Type": "image/png" } });
  if (pathname === "/api/v1/products") return Response.json({ products: [{ id: 1, title: "Fixture", sampleUrl: "https://suzuri.jp/erikanuinui/1", sampleImageUrl: "https://example.com/fixture.jpg", priceWithTax: 100 }] });
  throw new Error("Unexpected fixture request");
};
