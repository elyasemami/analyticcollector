// api/src/routes/activity.js
const { pool } = require('../config/db');
const { makeCrudRouter } = require('./_crud');

const COLUMNS = ['session_id', 'page', 'ts', 'kind', 'payload'];

const router = makeCrudRouter('activity_logs', COLUMNS);

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

    const values = [];
    const placeholders = docs.map((d, i) => {
      const offset = i * COLUMNS.length;
      values.push(...COLUMNS.map(c => d[c]));
      return `(${COLUMNS.map((_, j) => `$${offset + j + 1}`).join(', ')})`;
    }).join(', ');

    const { rows } = await pool.query(
      `INSERT INTO activity_logs (${COLUMNS.join(', ')}) VALUES ${placeholders} RETURNING id`,
      values,
    );
    res.status(201).json({ ok: true, n: rows.length, ids: rows.map(r => r.id) });
  } catch (e) { next(e); }
});

module.exports = router;
