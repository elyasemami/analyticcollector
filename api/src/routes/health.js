// api/src/routes/health.js
const { Router } = require('express');
const { pool } = require('../config/db');

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/', (_req, res) => {
  res.json({ ok: true, routes: ['GET/POST /static', 'GET/POST /perf', 'GET/POST /activity'] });
});

module.exports = router;
