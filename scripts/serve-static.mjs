// Serves the static export with the same zero-dependency server shipped in the offline preview.
//   node scripts/serve-static.mjs [dir=out] [port=4173]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
const root = resolve(process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? process.env.PORT ?? 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".png": "image/png" };
createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, p);
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); } catch { file = join(root, "404.html"); res.statusCode = 404; }
  try { res.setHeader("content-type", types[extname(file)] ?? "application/octet-stream"); res.end(await readFile(file)); }
  catch { res.statusCode = 404; res.end("Not found"); }
}).listen(port, () => console.log(`static preview → http://localhost:${port}`));
