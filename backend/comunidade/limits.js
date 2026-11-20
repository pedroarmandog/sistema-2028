"use strict";
const net = require("node:net");
function requestIP(req, env) {
  if (env.COMMUNITY_PROXY_HOPS === "1") {
    const last = (req.get("X-Forwarded-For") || "").split(",").at(-1)?.trim();
    if (net.isIP(last)) return last;
  }
  return req.socket?.remoteAddress || req.ip || "unknown";
}
function limiter(env) {
  const map = new Map();
  let nextClean = 0;
  return (req, res, next) => {
    const time = Date.now(),
      identity = requestIP(req, env);
    if (time > nextClean) {
      for (const [k, v] of map) if (v.until <= time) map.delete(k);
      nextClean = time + 60000;
    }
    let row = map.get(identity);
    if (!row || row.until <= time) {
      row = { until: time + 60000, count: 0 };
      map.set(identity, row);
    }
    row.count++;
    if (row.count > 240)
      return res
        .status(429)
        .json({ erro: "Muitas requisições. Aguarde um minuto." });
    next();
  };
}
module.exports = { requestIP, limiter };
