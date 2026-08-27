// api/src/config/db.js
const { Pool } = require("pg");

const connectionString =
  process.env.DATABASE_URL || "postgresql://database:5432/analytics_db";
const pool = new Pool({
  connectionString,
  max: 10,
  host: "database",
  port: 5432,
});

const TABLES = {
  static: "static_logs",
  perf: "perf_logs",
  activity: "activity_logs",
};

async function connect() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS static_logs (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT,
      page TEXT,
      ts BIGINT,
      ua TEXT,
      language TEXT,
      cookies_enabled BOOLEAN,
      js_enabled BOOLEAN,
      images_allowed BOOLEAN,
      css_allowed BOOLEAN,
      screen JSONB,
      window JSONB,
      connection TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS static_logs_session_ts_idx ON static_logs (session_id, ts DESC);

    CREATE TABLE IF NOT EXISTS perf_logs (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT,
      page TEXT,
      ts BIGINT,
      started_at DOUBLE PRECISION,
      ended_at DOUBLE PRECISION,
      total_ms INTEGER,
      navigation_entry JSONB,
      timing JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS perf_logs_session_ts_idx ON perf_logs (session_id, ts DESC);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT,
      page TEXT,
      ts BIGINT,
      kind TEXT,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS activity_logs_session_ts_idx ON activity_logs (session_id, ts DESC);
  `);
  return pool;
}

async function close() {
  await pool.end();
}

module.exports = { pool, connect, close, TABLES };
