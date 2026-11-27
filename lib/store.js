// Photo storage. On Vercel (BLOB_READ_WRITE_TOKEN set) photos live in Vercel Blob.
// On the booth laptop they live only in memory and disappear after PHOTO_TTL_SECONDS (default 60):
// nothing is written to disk, guests just scan the QR before it expires.
const crypto = require('crypto');

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const PREFIX = 'photos/';
const ID_RE = /^[\w.-]+\.(jpe?g|png|webp)$/i;
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const TTL_MS = (Number(process.env.PHOTO_TTL_SECONDS) || 60) * 1000;
const memory = new Map();   // id -> { buf, type, time }
function sweep() { const now = Date.now(); for (const [id, p] of memory) if (now - p.time >= TTL_MS) memory.delete(id); }
if (!useBlob) setInterval(sweep, 5000).unref();

const validId = (id) => typeof id === 'string' && ID_RE.test(id) && !id.startsWith('.');
// Random part makes links unguessable, so guests can't browse other people's photos.
const newId = (ext) => `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(5).toString('hex')}${ext}`;

const localPhoto = (id, time) => ({ id, time, expiresAt: time + TTL_MS, img: `/img/${encodeURIComponent(id)}`, download: `/img/${encodeURIComponent(id)}?download=1` });
const blobPhoto = (b) => ({ id: b.pathname.slice(PREFIX.length), time: new Date(b.uploadedAt).getTime(), img: b.url, download: b.downloadUrl });

async function save(buffer, ext = '.jpg') {
  ext = TYPES[ext.toLowerCase()] ? ext.toLowerCase() : '.jpg';
  const id = newId(ext);
  if (useBlob) {
    const { put } = require('@vercel/blob');
    const b = await put(PREFIX + id, buffer, { access: 'public', contentType: TYPES[ext], addRandomSuffix: false });
    return { id, time: Date.now(), img: b.url, download: b.downloadUrl };
  }
  const time = Date.now();
  memory.set(id, { buf: buffer, type: TYPES[ext], time });
  return localPhoto(id, time);
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
  sweep();
  return [...memory].map(([id, p]) => localPhoto(id, p.time)).sort((a, b) => b.time - a.time).slice(0, limit);
}

async function get(id) {
  if (!validId(id)) return null;
  if (useBlob) {
    const { list: blobList } = require('@vercel/blob');
    const r = await blobList({ prefix: PREFIX + id, limit: 5 });
    const b = r.blobs.find((x) => x.pathname === PREFIX + id);
    return b ? blobPhoto(b) : null;
  }
  sweep();
  const p = memory.get(id);
  return p ? localPhoto(id, p.time) : null;
}

// Delete one photo from storage (Vercel Blob or memory). Returns true if it existed.
async function remove(id) {
  if (!validId(id)) return false;
  if (useBlob) {
    const p = await get(id); if (!p) return false;
    const { del } = require('@vercel/blob');
    await del(p.img);
    return true;
  }
  return memory.delete(id);
}

// Raw bytes of an in-memory photo (local mode), or null once it has expired.
function bytes(id) { sweep(); return memory.get(id) || null; }

module.exports = { save, list, get, remove, bytes, validId, TYPES, useBlob, TTL_MS };
