const geoip = require("geoip-lite");

function trackAndLocateIp(req, res, next) {
  let ip = req.headers["cf-connecting-ip"] || req.ip;
  const geo = ip ? geoip.lookup(ip) : null;

  req.geoInfo = geo ? geo.city : null;

  next();
}

module.exports = { trackAndLocateIp };
