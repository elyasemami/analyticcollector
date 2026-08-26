// api/src/routes/activity.js
const { collections } = require('../config/db');
const { makeCrudRouter } = require('./_crud');

const router = makeCrudRouter(() => collections().Activity);

// batch OK: body may be a single event or an array of events
router.post('/', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const docs = items.map(it => ({
      session_id: it.sessionId || null,
      page: it.page || null,
      ts: it.ts || Date.now(),
      kind: it.type || it.kind || 'event',
      payload: it,
    }));
    const result = await collections().Activity.insertMany(docs, { ordered: false });
    res.status(201).json({ ok: true, n: result.insertedCount || docs.length, insertedIds: result.insertedIds });
  } catch (e) { next(e); }
});

module.exports = router;
