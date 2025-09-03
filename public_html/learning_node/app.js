const http = require('http');
const path = require('path');

//importing costume modules
const {getCurrentDate, formatCurrency} = require('./utils');
const Logger = require('./logger');

//create a logger instance
const logger = new Logger('App');

//create server
const server = http.createServer((req, res) => {
  try {
    logger.log(`Request received for ${req.url}`);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write(`<h1>Welcome to our app!</h1>`);
    res.write(`<p>Current date: ${getCurrentDate()}</p>`);
    res.write(`<p>Formatted amount: ${formatCurrency(99.99)}</p>`);
    res.end();
  } catch (error) {
    logger.error(error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
	logger.log(`Server running at http://localhost:${PORT}`);
});

