// GET /api/photo?id=… — one photo, for the guest download page.
const store = require('../lib/store');
const { json, query } = require('../lib/http');

module.exports = async (req, res) => {
  try {
    const photo = await store.get(query(req).get('id'));
    if (!photo) return json(res, 404, { error: 'Not found' });
    json(res, 200, photo);
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'Server error' });
  }
};
