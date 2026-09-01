// api/src/config/db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST, // Resolves to 'database' inside the Docker network
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
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

async function connect({ retries = 10, delayMs = 1000 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query("SELECT 1");
      break;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.warn(
        `Postgres not ready (${attempt}/${retries}): ${err.message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function close() {
  await pool.end();
}

module.exports = { pool, connect, close, TABLES };
