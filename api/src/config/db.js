// api/src/config/db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PGPOOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// A dropped connection on an idle pooled client is emitted here, not on a
// query — without this listener it becomes an uncaught exception.
pool.on("error", (err) => console.error("idle pg client error:", err));

const TABLES = {
  static: "static_logs",
  perf: "perf_logs",
  activity: "activity_logs",
};

/**
 * schema initialization this is temp
 * should be done via an ORM
 *
 * Column order is deliberate: fixed-width types (int8/float8/int4/bool) first,
 * variable-width (text/jsonb) last, so Postgres wastes no alignment padding
 * per row. Every statement is idempotent.
 */
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS static_logs (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts              BIGINT      NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    cookies_enabled BOOLEAN     NOT NULL DEFAULT false,
    js_enabled      BOOLEAN     NOT NULL DEFAULT false,
    images_allowed  BOOLEAN     NOT NULL DEFAULT false,
    css_allowed     BOOLEAN     NOT NULL DEFAULT false,
    session_id      TEXT        NOT NULL,
    page            TEXT,
    ua              TEXT,
    language        TEXT,
    connection      TEXT,
    screen          JSONB,
    viewport        JSONB
  );

  CREATE INDEX IF NOT EXISTS static_logs_session_ts_idx
    ON static_logs (session_id, ts DESC);
  CREATE INDEX IF NOT EXISTS static_logs_created_at_brin
    ON static_logs USING BRIN (created_at) WITH (pages_per_range = 32);

  CREATE TABLE IF NOT EXISTS perf_logs (
    id               BIGINT           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts               BIGINT           NOT NULL,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT now(),
    started_at       DOUBLE PRECISION,
    ended_at         DOUBLE PRECISION,
    total_ms         INTEGER,
    session_id       TEXT             NOT NULL,
    page             TEXT,
    navigation_entry JSONB,
    timing           JSONB
  );

  CREATE INDEX IF NOT EXISTS perf_logs_session_ts_idx
    ON perf_logs (session_id, ts DESC);
  CREATE INDEX IF NOT EXISTS perf_logs_created_at_brin
    ON perf_logs USING BRIN (created_at) WITH (pages_per_range = 32);

  CREATE TABLE IF NOT EXISTS activity_logs (
    id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts         BIGINT      NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    session_id TEXT        NOT NULL,
    page       TEXT,
    kind       TEXT        NOT NULL DEFAULT 'event',
    payload    JSONB
  );

  CREATE INDEX IF NOT EXISTS activity_logs_session_ts_idx
    ON activity_logs (session_id, ts DESC);
  CREATE INDEX IF NOT EXISTS activity_logs_kind_ts_idx
    ON activity_logs (kind, ts DESC);
  CREATE INDEX IF NOT EXISTS activity_logs_created_at_brin
    ON activity_logs USING BRIN (created_at) WITH (pages_per_range = 32);
`;

// Arbitrary but fixed: every API replica takes the same lock, so two of them
// booting at once can't race each other inside CREATE ... IF NOT EXISTS.
const SCHEMA_LOCK_KEY = 8127344512001n;

async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [SCHEMA_LOCK_KEY.toString()]);
    await client.query(SCHEMA_SQL);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Wait for Postgres (compose starts it alongside us), then ensure the schema. */
async function connect({ retries = 10, delayMs = 1000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query("SELECT 1");
      break;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.warn(`Postgres not ready (${attempt}/${retries}): ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  await initializeSchema();
}

async function close() {
  await pool.end();
}

module.exports = { pool, connect, close, initializeSchema, TABLES };
