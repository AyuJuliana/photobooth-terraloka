// POST /api/delete?id=… — remove a photo from storage. Called by the booth on "Take new photos" and by the
// guest page right after the guest downloads it. The photo id is long and random, so knowing it is the permission.
const store = require('../lib/store');
const { json, query } = require('../lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  try {
    json(res, 200, { deleted: await store.remove(query(req).get('id')) });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'Delete failed' });
  }
};
