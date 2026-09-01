// api/server.js  (entrypoint — deployed as /var/www/eemami.dev/api/server.js)
require("dotenv").config();
import pg from "pg";
import rateLimit from "express-rate-limit";
import { UAParser } from "ua-parser-js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const app = require("./src/app");
const { connect, close } = require("./src/config/db");

const port = 3000;

connect()
  .then(() =>
    app.listen(port, () => console.log(`API on http://localhost:${port}`)),
  )
  .catch((err) => {
    console.error("Postgres connect failed:", err);
    process.exit(1);
  });

process.on("SIGINT", async () => {
  try {
    await close();
  } finally {
    process.exit(0);
  }
});
