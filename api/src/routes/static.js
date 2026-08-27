// api/src/routes/static.js
const { pool } = require('../config/db');
const { makeCrudRouter } = require('./_crud');

const COLUMNS = [
  'session_id', 'page', 'ts', 'ua', 'language',
  'cookies_enabled', 'js_enabled', 'images_allowed', 'css_allowed',
  'screen', 'window', 'connection',
];

const router = makeCrudRouter('static_logs', COLUMNS);

router.post('/', async (req, res, next) => {
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
    const { rows } = await pool.query(
      `INSERT INTO static_logs (${COLUMNS.join(', ')})
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      COLUMNS.map(c => doc[c]),
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
