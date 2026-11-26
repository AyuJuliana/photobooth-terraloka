// GET /api/photos — recent photos for the booth screen.
const store = require('../lib/store');
const { json, boothAllowed } = require('../lib/http');

module.exports = async (req, res) => {
  if (!boothAllowed(req)) return json(res, 401, { error: 'Booth key required' });
  try {
    json(res, 200, { photos: await store.list(30) });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'Could not list photos' });
  }
};
