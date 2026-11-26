// POST /api/upload — raw image body from the booth camera.
const path = require('path');
const store = require('../lib/store');
const { json, readBody, boothAllowed } = require('../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!boothAllowed(req)) return json(res, 401, { error: 'Booth key required' });
  try {
    const ext = path.extname(String(req.headers['x-filename'] || 'photo.jpg'));
    const body = await readBody(req);
    if (!body.length) return json(res, 400, { error: 'Empty upload' });
    json(res, 200, await store.save(body, ext));
  } catch (e) {
    console.error(e);
    json(res, e.message === 'too large' ? 413 : 500, { error: 'Upload failed' });
  }
};
