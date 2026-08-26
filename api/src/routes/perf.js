// api/src/routes/perf.js
const { collections } = require('../config/db');
const { makeCrudRouter } = require('./_crud');

const router = makeCrudRouter(() => collections().Perf);

router.post('/', async (req, res, next) => {
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
    const { insertedId } = await collections().Perf.insertOne(doc);
    res.status(201).json({ _id: insertedId, ...doc });
  } catch (e) { next(e); }
});

module.exports = router;
