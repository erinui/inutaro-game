import {brotliCompressSync} from 'node:zlib';
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".ttf": "font/ttf" };

export async function startSiteServer({directory=root,files,compressed=false,headers={}}={}) {
  const servingRoot=path.resolve(directory);
  if(servingRoot!==root&&!Array.isArray(files))throw new Error('Built preview requires an explicit public file list');
  const requests=[];
  const server = http.createServer(async (req, res) => {
    try {
      requests.push(req.url);
      let relative = decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(/^\/+/, "");
      if (!relative || relative.endsWith("/")) relative += "index.html";
      if (files ? !files.includes(relative) : !/^(index\.html$|home\.(css|js)$|site-(nav|migration|url-policy)\.js$|robots\.txt$|sitemap\.xml$|pages\/[\w-]+\.html$|games\/(index\.html$|inutaro-mushi\/(index\.html|style\.css|game\.js)$)|assets\/)/.test(relative)) {
        res.writeHead(404).end();
        return;
      }
      const file = path.resolve(servingRoot, relative);
      if (!file.startsWith(servingRoot + path.sep)) {
        res.writeHead(404).end();
        return;
      }
      const bytes = await readFile(file);
      for(const [name,value]of Object.entries(headers))res.setHeader(name,value);
      res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
      if(files)res.setHeader('Cache-Control',relative.startsWith('assets/versioned/')?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate');
      if(compressed&&/text\/|json|xml|svg/.test(mime[path.extname(file)]||'')&&/br/.test(req.headers['accept-encoding']||'')){
        const encoded=brotliCompressSync(bytes);res.setHeader('Content-Encoding','br');res.setHeader('Vary','Accept-Encoding');res.setHeader('Content-Length',encoded.length);res.end(encoded);
      }else {res.setHeader('Content-Length',bytes.length);res.end(bytes);}
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { requests, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }) };
}
