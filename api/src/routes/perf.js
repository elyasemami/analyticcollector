// api/src/routes/perf.js
const { pool } = require('../config/db');
const { makeCrudRouter } = require('./_crud');

const COLUMNS = [
  'session_id', 'page', 'ts', 'started_at', 'ended_at',
  'total_ms', 'navigation_entry', 'timing',
];

const router = makeCrudRouter('perf_logs', COLUMNS);

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
      navigation_entry: b.navigationEntry || null,
      timing: b.timing || null,
    };
    const { rows } = await pool.query(
      `INSERT INTO perf_logs (${COLUMNS.join(', ')})
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      COLUMNS.map(c => doc[c]),
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
