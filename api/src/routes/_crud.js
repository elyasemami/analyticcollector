// api/src/routes/_crud.js
// Shared GET list / GET :id / PUT :id / DELETE :id — identical across
// static/perf/activity in the original monolithic server.js. Each resource
// router plugs this in and adds its own POST handler (field shaping differs).
const { Router } = require('express');
const { pool } = require('../config/db');
const { toId } = require('../utils/id');

// `table` and `allowedColumns` are fixed per-resource (defined in each route
// file, not derived from request input) — table name is safe to interpolate.
// PUT still whitelists against allowedColumns so a request body can't smuggle
// arbitrary column identifiers into the UPDATE statement.
function makeCrudRouter(table, allowedColumns) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1000`);
      res.json(rows);
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = toId(req.params.id);
      if (!id) return res.status(400).json({ error: 'bad_id' });
      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      if (!rows[0]) return res.status(404).json({ error: 'not_found' });
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const id = toId(req.params.id);
      if (!id) return res.status(400).json({ error: 'bad_id' });

      const body = req.body || {};
      const keys = Object.keys(body).filter(k => allowedColumns.includes(k));
      if (keys.length) {
        const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
        const values = keys.map(k => body[k]);
        await pool.query(`UPDATE ${table} SET ${setClause} WHERE id = $1`, [id, ...values]);
      }

      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      if (!rows[0]) return res.status(404).json({ error: 'not_found' });
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const id = toId(req.params.id);
      if (!id) return res.status(400).json({ error: 'bad_id' });
      const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      if (!rowCount) return res.status(404).json({ error: 'not_found' });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { makeCrudRouter };
