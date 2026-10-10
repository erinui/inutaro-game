import http from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

export async function startJsonCacheServer() {
  const script = await readFile(new URL("../../home.js", import.meta.url));
  const values = new Map();
  const requests = [];
  const setData = (url, data) => {
    const body = Buffer.from(JSON.stringify(data));
    values.set(url, { body, etag: `"${createHash("sha256").update(body).digest("hex")}"` });
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost").pathname;
    if (url === "/") return res.writeHead(200, { "Content-Type": "text/html" }).end('<!doctype html><html><head><script src="/home.js"></script></head><body></body></html>');
    if (url === "/home.js") return res.writeHead(200, { "Content-Type": "text/javascript" }).end(script);
    const value = values.get(url);
    if (!value) return res.writeHead(404).end();
    const status = req.headers["if-none-match"] === value.etag ? 304 : 200;
    requests.push({ url, status, ifNoneMatch: req.headers["if-none-match"], accept: req.headers.accept, bodyBytes: status === 200 ? value.body.length : 0 });
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "public, max-age=0, must-revalidate", ETag: value.etag });
    res.end(status === 200 ? value.body : undefined);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, setData, requests, close: () => new Promise(resolve => server.close(resolve)) };
}
