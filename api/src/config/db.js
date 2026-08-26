// api/src/config/db.js
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/analytics';
const client = new MongoClient(uri, { maxPoolSize: 10 });

let db, Static, Perf, Activity;

async function connect() {
  await client.connect();
  db = client.db(); // db name from URI
  Static = db.collection('static_logs');
  Perf = db.collection('perf_logs');
  Activity = db.collection('activity_logs');
  await Promise.all([
    Static.createIndex({ session_id: 1, ts: -1 }),
    Perf.createIndex({ session_id: 1, ts: -1 }),
    Activity.createIndex({ session_id: 1, ts: -1 }),
  ]);
  return { db, Static, Perf, Activity };
}

async function close() {
  await client.close();
}

function collections() {
  return { db, Static, Perf, Activity };
}

module.exports = { client, connect, close, collections };
