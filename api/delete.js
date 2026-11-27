// POST /api/delete?id=… — remove a photo from storage (the booth calls this on "Take new photos").
const store = require('../lib/store');
const { json, query, boothAllowed } = require('../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  if (!boothAllowed(req)) return json(res, 401, { error: 'Booth key required' });
  try {
    json(res, 200, { deleted: await store.remove(query(req).get('id')) });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'Delete failed' });
  }
};
