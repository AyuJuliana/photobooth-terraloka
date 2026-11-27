// Local server for running the booth without Vercel (offline / same Wi-Fi).
// It serves the same pages and /api handlers that Vercel runs.
const http = require('http');
const fs = require('fs');
const path = require('path');
const store = require('./lib/store');
const { baseUrl } = require('./lib/http');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const API = {
  photos: require('./api/photos'), upload: require('./api/upload'),
  photo: require('./api/photo'), qr: require('./api/qr'),
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

function sendFile(res, file, extra = {}) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, ...extra });
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer((req, res) => {
  const { pathname, searchParams } = new URL(req.url, 'http://x');
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts[0] === 'api' && API[parts[1]]) return API[parts[1]](req, res);
  if (pathname === '/') return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
  if (parts[0] === 'p' && parts.length === 2) return sendFile(res, path.join(PUBLIC_DIR, 'photo.html'));
  if (parts[0] === 'img' && parts.length === 2) {
    const p = store.validId(parts[1]) && store.bytes(parts[1]);
    if (!p) { res.writeHead(404); return res.end('This photo has expired'); }
    const extra = searchParams.has('download') ? { 'Content-Disposition': `attachment; filename="terraloka-${parts[1]}"` } : {};
    res.writeHead(200, { 'Content-Type': p.type, 'Content-Length': p.buf.length, 'Cache-Control': 'no-store', ...extra });
    return res.end(p.buf);
  }
  // Any other file inside public/ (no "..", so nothing outside the folder can be read).
  const file = path.join(PUBLIC_DIR, ...parts);
  if (parts.length && !parts.includes('..') && file.startsWith(PUBLIC_DIR + path.sep)) return sendFile(res, file);
  res.writeHead(404); res.end('Not found');
}).listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Terraloka Photobooth running`);
  console.log(`  Booth screen : http://localhost:${PORT}`);
  console.log(`  Guests reach : ${baseUrl({ headers: {} })}  (phones must be on the same Wi-Fi)`);
  console.log(`  Photos       : kept in memory only, deleted after ${store.TTL_MS / 1000}s\n`);
  if (process.argv.includes('--tunnel')) startTunnel();
});

// Free Cloudflare quick tunnel: gives a public https address so guests can scan the QR on mobile data.
function startTunnel() {
  const { spawn } = require('child_process');
  const cf = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`]);
  cf.on('error', () => console.log('  ! cloudflared not found. Install it with: brew install cloudflared'));
  const watch = (chunk) => {
    const m = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && process.env.PUBLIC_URL !== m[0]) {
      process.env.PUBLIC_URL = m[0];   // QR codes now point here
      console.log(`  Tunnel ready : ${m[0]}  (QR codes use this address; guests can use mobile data)\n`);
    }
  };
  cf.stdout.on('data', watch); cf.stderr.on('data', watch);
  const stop = () => { cf.kill(); process.exit(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
