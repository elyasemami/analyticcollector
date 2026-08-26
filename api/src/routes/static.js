// api/src/routes/static.js
const { collections } = require('../config/db');
const { makeCrudRouter } = require('./_crud');

const router = makeCrudRouter(() => collections().Static);

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
    const { insertedId } = await collections().Static.insertOne(doc);
    res.status(201).json({ _id: insertedId, ...doc });
  } catch (e) { next(e); }
});

module.exports = router;
