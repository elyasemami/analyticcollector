// api/server.js  (entrypoint — deployed as /var/www/eemami.dev/api/server.js)
require('dotenv').config();

const app = require('./src/app');
const { connect, close } = require('./src/config/db');

const port = Number(process.env.PORT) || 3000;

connect()
  .then(() => app.listen(port, '127.0.0.1', () => console.log(`API on http://127.0.0.1:${port}`)))
  .catch(err => { console.error('Mongo connect failed:', err); process.exit(1); });

process.on('SIGINT', async () => { try { await close(); } finally { process.exit(0); } });
