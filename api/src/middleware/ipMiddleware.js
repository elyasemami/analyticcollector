const geoip = require("geoip-lite");

function trackAndLocateIp(req, res, next) {
  let ip = req.ip;
  const geo = geoip.lookup(ip);

  req.geoInfo = geo || null;

  next();
}

module.exports = { trackAndLocateIp };
