// Photo storage. On Vercel (BLOB_READ_WRITE_TOKEN set) photos live in Vercel Blob;
// locally they live in ./photos so the booth also works offline.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const PHOTO_DIR = path.join(__dirname, '..', 'photos');
const PREFIX = 'photos/';
const ID_RE = /^[\w.-]+\.(jpe?g|png|webp)$/i;
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const validId = (id) => typeof id === 'string' && ID_RE.test(id) && !id.startsWith('.');
// Random part makes links unguessable, so guests can't browse other people's photos.
const newId = (ext) => `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(5).toString('hex')}${ext}`;

const localPhoto = (id, time) => ({ id, time, img: `/img/${encodeURIComponent(id)}`, download: `/img/${encodeURIComponent(id)}?download=1` });
const blobPhoto = (b) => ({ id: b.pathname.slice(PREFIX.length), time: new Date(b.uploadedAt).getTime(), img: b.url, download: b.downloadUrl });

async function save(buffer, ext = '.jpg') {
  ext = TYPES[ext.toLowerCase()] ? ext.toLowerCase() : '.jpg';
  const id = newId(ext);
  if (useBlob) {
    const { put } = require('@vercel/blob');
    const b = await put(PREFIX + id, buffer, { access: 'public', contentType: TYPES[ext], addRandomSuffix: false });
    return { id, time: Date.now(), img: b.url, download: b.downloadUrl };
  }
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  fs.writeFileSync(path.join(PHOTO_DIR, id), buffer);
  return localPhoto(id, Date.now());
}

// Newest first.
async function list(limit = 30) {
  if (useBlob) {
    const { list: blobList } = require('@vercel/blob');
    const all = [];
    let cursor;
    for (let page = 0; page < 10; page++) {
      const r = await blobList({ prefix: PREFIX, limit: 1000, cursor });
      all.push(...r.blobs);
      if (!r.hasMore) break;
      cursor = r.cursor;
    }
    return all.map(blobPhoto).filter((p) => validId(p.id)).sort((a, b) => b.time - a.time).slice(0, limit);
  }
  if (!fs.existsSync(PHOTO_DIR)) return [];
  return fs.readdirSync(PHOTO_DIR).filter(validId)
    .map((id) => localPhoto(id, fs.statSync(path.join(PHOTO_DIR, id)).mtimeMs))
    .sort((a, b) => b.time - a.time).slice(0, limit);
}

async function get(id) {
  if (!validId(id)) return null;
  if (useBlob) {
    const { list: blobList } = require('@vercel/blob');
    const r = await blobList({ prefix: PREFIX + id, limit: 5 });
    const b = r.blobs.find((x) => x.pathname === PREFIX + id);
    return b ? blobPhoto(b) : null;
  }
  const file = path.join(PHOTO_DIR, id);
  return fs.existsSync(file) ? localPhoto(id, fs.statSync(file).mtimeMs) : null;
}

module.exports = { save, list, get, validId, PHOTO_DIR, TYPES, useBlob };
