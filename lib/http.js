// Small helpers that work both on Vercel functions and the local Node server.
const os = require('os');

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
const query = (req) => new URL(req.url, 'http://x').searchParams;

function readBody(req, max = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) { reject(new Error('too large')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Optional BOOTH_KEY: when set, only the booth (which knows the key) can list or upload photos.
function boothAllowed(req) {
  const key = process.env.BOOTH_KEY;
  return !key || req.headers['x-booth-key'] === key;
}

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) return a.address;
  }
  return 'localhost';
}
// Address the QR code points to.
function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  if (process.env.VERCEL) return `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  return `http://${lanAddress()}:${process.env.PORT || 3000}`;
}

module.exports = { json, query, readBody, boothAllowed, baseUrl };
