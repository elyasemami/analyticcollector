// api/src/routes/_crud.js
// Shared GET list / GET :id / PUT :id / DELETE :id — identical across
// static/perf/activity in the original monolithic server.js. Each resource
// router plugs this in and adds its own POST handler (field shaping differs).
const { Router } = require('express');
const { oid } = require('../utils/oid');

function makeCrudRouter(getCollection) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const rows = await getCollection().find().sort({ _id: -1 }).limit(1000).toArray();
      res.json(rows);
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res) => {
    const _id = oid(req.params.id);
    if (!_id) return res.status(400).json({ error: 'bad_id' });
    const doc = await getCollection().findOne({ _id });
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  });

  router.put('/:id', async (req, res) => {
    const _id = oid(req.params.id);
    if (!_id) return res.status(400).json({ error: 'bad_id' });
    await getCollection().updateOne({ _id }, { $set: req.body || {} });
    const doc = await getCollection().findOne({ _id });
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  });

  router.delete('/:id', async (req, res) => {
    const _id = oid(req.params.id);
    if (!_id) return res.status(400).json({ error: 'bad_id' });
    const { deletedCount } = await getCollection().deleteOne({ _id });
    if (!deletedCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  });

  return router;
}

module.exports = { makeCrudRouter };
