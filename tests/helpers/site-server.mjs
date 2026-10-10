import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ttf": "font/ttf" };

export async function startSiteServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let relative = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/+/, "");
      if (!relative || relative.endsWith("/")) relative += "index.html";
      if (!/^(index\.html$|home\.(css|js)$|site-(nav|migration)\.js$|robots\.txt$|sitemap\.xml$|pages\/[\w-]+\.html$|games\/(index\.html$|inutaro-mushi\/(index\.html|style\.css|game\.js)$)|assets\/)/.test(relative)) {
        res.writeHead(404).end();
        return;
      }
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(404).end();
        return;
      }
      const bytes = await readFile(file);
      res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
      res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}
