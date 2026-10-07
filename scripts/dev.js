// Dev server tĩnh: node scripts/dev.js -> http://localhost:3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

// Áp dụng header bảo mật trong vercel.json (CSP…) giống khi deploy
const SEC_HEADERS = Object.fromEntries(
  (JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).headers?.[0]?.headers || []).map((h) => [h.key, h.value]),
);
delete SEC_HEADERS['Strict-Transport-Security']; // localhost là http

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p;
  try {
    p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  } catch {
    return res.writeHead(400).end('Bad request'); // URL mã hóa sai (vd /%E0%A4%A) — không để sập server
  }
  // Windows: path.normalize('/') = '\' → xét dấu "/" trên URL gốc chứ không phải đường dẫn đã chuẩn hóa
  if (url.pathname.endsWith('/')) p = path.join(p, 'index.html');
  const file = path.join(root, p);
  // không phục vụ file ẩn (.env.local…) hay thư mục nội bộ
  if (/(^|[/\\])\.|^[/\\]?(scripts|tests|node_modules)[/\\]/.test(p)) return res.writeHead(404).end('Not found');
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('Not found');
  res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log(`http://localhost:${process.env.PORT || 3000}`));
