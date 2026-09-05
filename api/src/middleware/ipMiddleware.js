const geoip = require("geoip-lite");

function trackAndLocateIp(req, res, next) {
  let ip = req.headers["cf-connecting-ip"] || req.ip;
  const geo = geoip.lookup(ip);

  req.geoInfo = geo.city || null;

  next();
}

module.exports = { trackAndLocateIp };
