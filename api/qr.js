// GET /api/qr?id=… — QR code (SVG) linking to the guest download page.
const QRCode = require('qrcode');
const store = require('../lib/store');
const { query, baseUrl } = require('../lib/http');

module.exports = async (req, res) => {
  const id = query(req).get('id');
  if (!store.validId(id)) { res.writeHead(404); return res.end('Not found'); }
  const svg = await QRCode.toString(`${baseUrl(req)}/p/${encodeURIComponent(id)}`, {
    type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#2a1c14', light: '#ffffff' },
  });
  res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
  res.end(svg);
};
