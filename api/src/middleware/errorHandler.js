// api/src/middleware/errorHandler.js
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  console.error(err);
  res.status(500).json({ error: err.message || 'internal_error' });
}

module.exports = { errorHandler };
