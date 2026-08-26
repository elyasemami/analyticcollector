// api/src/utils/oid.js
const { ObjectId } = require('mongodb');

function oid(id) {
  try { return new ObjectId(id); } catch { return null; }
}

module.exports = { oid };
