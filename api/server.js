// /var/www/eemami.dev/api/server.js  (MongoDB-backed)
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// helpful to debug proxy paths
app.use((req, _res, next) => { console.log(req.method, req.url); next(); });

// ---- Mongo connection ----
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/analytics';
const client = new MongoClient(uri, { maxPoolSize: 10 });
let db, Static, Perf, Activity;
const oid = (id) => { try { return new ObjectId(id); } catch { return null; } };

async function init() {
  await client.connect();
  db = client.db(); // db name from URI
  Static = db.collection('static_logs');
  Perf = db.collection('perf_logs');
  Activity = db.collection('activity_logs');
  await Promise.all([
    Static.createIndex({ session_id: 1, ts: -1 }),
    Perf.createIndex({ session_id: 1, ts: -1 }),
    Activity.createIndex({ session_id: 1, ts: -1 }),
  ]);
}

// ---- routes (prefix included: /api/...) ----
app.get('/api/health', async (_req, res) => {
  try { await db.admin().command({ ping: 1 }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// STATIC
app.get('/api/static', async (_req, res, next) => {
  try { res.json(await Static.find().sort({ _id: -1 }).limit(1000).toArray()); }
  catch (e) { next(e); }
});
app.get('/api/static/:id', async (req, res) => {
  const _id = oid(req.params.id); if (!_id) return res.status(400).json({ error: 'bad_id' });
  const doc = await Static.findOne({ _id }); if (!doc) return res.status(404).json({ error: 'not_found' });
  res.json(doc);
});
app.post('/api/static', async (req, res, next) => {
  try {
    const b = req.body || {};
    const doc = {
      session_id: b.sessionId || null,
      page: b.page || null,
      ts: b.ts || Date.now(),
      ua: b.ua || null,
      language: b.language || null,
      cookies_enabled: !!b.cookiesEnabled,
      js_enabled: !!b.jsEnabled,
      images_allowed: !!b.imagesAllowed,
      css_allowed: !!b.cssAllowed,
      screen: b.screen || null,
      window: b.window || null,
      connection: b.connection || null,
    };
    const { insertedId } = await Static.insertOne(doc);
    res.status(201).json({ _id: insertedId, ...doc });
  } catch (e) { next(e); }
});
app.put('/api/static/:id', async (req, res) => {
  const _id = oid(req.params.id); if (!_id) return res.status(400).json({ error: 'bad_id' });
  await Static.updateOne({ _id }, { $set: req.body || {} });
  const doc = await Static.findOne({ _id }); if (!doc) return res.status(404).json({ error: 'not_found' });
  res.json(doc);
});
app.delete('/api/static/:id', async (req, res) => {
  const _id = oid(req.params.id); if (!_id) return res.status(400).json({ error: 'bad_id' });
  const { deletedCount } = await Static.deleteOne({ _id });
  if (!deletedCount) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// PERF
app.get('/api/perf', async (_req, res, next) => {
  try { res.json(await Perf.find().sort({ _id: -1 }).limit(1000).toArray()); }
  catch (e) { next(e); }
});
app.get('/api/perf/:id', async (req, res) => {
  const _id = oid(req.params.id); if (!_id) return res.status(400).json({ error: 'bad_id' });
  const doc = await Perf.findOne({ _id }); if (!doc) return res.status(404).json({ error: 'not_found' });
  res.json(doc);
});
app.post('/api/perf', async (req, res, next) => {
  try {
    const b = req.body || {};
    const doc = {
      session_id: b.sessionId || null,
      page: b.page || null,
      ts: b.ts || Date.now(),
      started_at: b.startedAt || null,
      ended_at: b.endedAt || null,
      total_ms: b.totalLoadMs || null,
      navigationEntry: b.navigationEntry || null,
      timing: b.timing || null,
    };
    const { insertedId } = await Perf.insertOne(doc);
    res.status(201).json({ _id: insertedId, ...doc });
  } catch (e) { next(e); }
});
app.put('/api/perf/:id', async (req, res) => {
  const _id = oid(req.params.id); if (!_id) return res.status(400).json({ error: 'bad_id' });
  await Perf.updateOne({ _id }, { $set: req.body || {} });
  const doc = await Perf.findOne({ _id }); if (!doc) return res.status(404).json({ error: 'not_found' });
  res.json(doc);
});
app.delete('/api/perf/:id', async (req, res) => {
  const _id = oid(req.params.id); if (!_id) return res.status(400).json({ error: 'bad_id' });
  const { deletedCount } = await Perf.deleteOne({ _id });
  if (!deletedCount) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// ACTIVITY (batch OK)
app.get('/api/activity', async (_req, res, next) => {
  try { res.json(await Activity.find().sort({ _id: -1 }).limit(1000).toArray()); }
  catch (e) { next(e); }
});
app.get('/api/activity/:id', async (req, res) => {
  const _id = oid(req.params.id); if (!_id) return res.status(400).json({ error: 'bad_id' });
  const doc = await Activity.findOne({ _id }); if (!doc) return res.status(404).json({ error: 'not_found' });
  res.json(doc);
});
app.post('/api/activity', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const docs = items.map(it => ({
      session_id: it.sessionId || null,
      page: it.page || null,
      ts: it.ts || Date.now(),
      kind: it.type || it.kind || 'event',
      payload: it,
    }));
    const result = await Activity.insertMany(docs, { ordered: false });
    res.status(201).json({ ok: true, n: result.insertedCount || docs.length, insertedIds: result.insertedIds });
  } catch (e) { next(e); }
});
app.put('/api/activity/:id', async (req, res) => {
  const _id = oid(req.params.id); if (!_id) return res.status(400).json({ error: 'bad_id' });
  await Activity.updateOne({ _id }, { $set: req.body || {} });
  const doc = await Activity.findOne({ _id }); if (!doc) return res.status(404).json({ error: 'not_found' });
  res.json(doc);
});
app.delete('/api/activity/:id', async (req, res) => {
  const _id = oid(req.params.id); if (!_id) return res.status(400).json({ error: 'bad_id' });
  const { deletedCount } = await Activity.deleteOne({ _id });
  if (!deletedCount) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// index
app.get('/api', (_req, res) => res.json({ ok: true, routes: ['GET/POST /static', 'GET/POST /perf', 'GET/POST /activity'] }));

// ---- start ----
const port = Number(process.env.PORT) || 3000;
init()
  .then(() => app.listen(port, '127.0.0.1', () => console.log(`API on http://127.0.0.1:${port}`)))
  .catch(err => { console.error('Mongo connect failed:', err); process.exit(1); });

process.on('SIGINT', async () => { try { await client.close(); } finally { process.exit(0); } });

