// Packages the static export (out/) into an offline, self-contained preview zip:
//   preview/ks-experience-preview-<commit>.zip  →  unzip, then `node serve.mjs`, open http://localhost:4173
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync("out/index.html")) throw new Error("Run the static export first (STATIC_EXPORT=1 next build).");
const sha = (() => { try { return execSync("git rev-parse --short HEAD").toString().trim(); } catch { return "local"; } })();
const name = `ks-experience-preview-${sha}`;
const dir = `preview/${name}`;
rmSync("preview", { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
cpSync("out", `${dir}/site`, { recursive: true });

writeFileSync(`${dir}/serve.mjs`, `// Zero-dependency static server for the K's Experience offline preview.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(fileURLToPath(new URL(".", import.meta.url)), "site");
const port = Number(process.env.PORT ?? 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".png": "image/png", ".ico": "image/x-icon" };
createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([.][.][/\\\\])+/, "");
  let file = join(root, p);
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); } catch { file = join(root, "404.html"); res.statusCode = 404; }
  try { const body = await readFile(file); res.setHeader("content-type", types[extname(file)] ?? "application/octet-stream"); res.end(body); }
  catch { res.statusCode = 404; res.end("Not found"); }
}).listen(port, () => console.log("K's Experience preview → http://localhost:" + port));
`);

writeFileSync(`${dir}/README-PREVIEW.txt`, `K's Experience — offline preview (commit ${sha})

Requirements: Node.js 18+ (no install, no internet needed).

  1. Unzip this folder.
  2. In a terminal, inside the folder:   node serve.mjs
  3. Open http://localhost:4173

Notes
- Catalogue = SEED DATA (138 dishes), clearly labelled; not source-verified.
- No real HCMC establishments are verified yet, so dishes show
  "No verified HCMC establishment found". Settings → "Show sample venues"
  displays fictional, SAMPLE-labelled venues for interface review only.
- The Nearby map shows street tiles only when online (OpenFreeMap);
  offline it shows the HCMC boundary.
- Saved dishes / passport are stored in your browser (localStorage).
- Must be served from the site root (not file://) because the app uses absolute paths.
`);

execSync(`cd preview && python3 -c "import shutil; shutil.make_archive('${name}', 'zip', '.', '${name}')"`);
console.log(`✓ preview/${name}.zip`);
