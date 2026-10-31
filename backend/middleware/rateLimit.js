/**
 * Robust in-memory rate limiter middleware.
 * Supports two calling styles:
 *  - rateLimit(ms)  -> legacy cooldown: max=1 per `ms`
 *  - rateLimit({ windowMs, max }) -> up to `max` requests per `windowMs` milliseconds
 *
 * Logs a warning when the limit is hit and returns 429.
 * Note: in-memory store — suitable for single instance deployments.
 */

const buckets = new Map();
let cleanupTimer = null;

function startCleanup(windowMs) {
  if (cleanupTimer) return;
  const interval = Math.max(60000, windowMs || 60000);
  cleanupTimer = setInterval(() => {
    try {
      const now = Date.now();
      for (const [k, arr] of buckets) {
        if (!Array.isArray(arr) || arr.length === 0) {
          buckets.delete(k);
          continue;
        }
        // prune very old entries (older than 2x largest window seen)
        const pruned = arr.filter((ts) => ts > now - 2 * (windowMs || 60000));
        if (pruned.length === 0) buckets.delete(k);
        else buckets.set(k, pruned);
      }
    } catch (e) {
      // noop
    }
  }, interval);
}

module.exports = function rateLimit(windowMsOrOptions = {}) {
  let windowMs = 3000;
  let max = 1;

  if (typeof windowMsOrOptions === "number") {
    windowMs = windowMsOrOptions;
    max = 1;
  } else if (typeof windowMsOrOptions === "object") {
    windowMs = Number(windowMsOrOptions.windowMs) || windowMs;
    if (typeof windowMsOrOptions.max === "number") {
      max = Math.max(1, Math.floor(windowMsOrOptions.max));
    }
  }

  startCleanup(windowMs);

  return (req, res, next) => {
    try {
      const route = req.baseUrl || req.originalUrl || req.path || "/";
      const userId = req.user && (req.user.id || req.user.userId);
      const ip = (req.headers["x-forwarded-for"] || req.ip || "")
        .toString()
        .split(",")[0]
        .trim();
      const key = userId ? `u:${userId}:${route}` : `ip:${ip}:${route}`;

      const now = Date.now();
      const windowStart = now - windowMs;

      const arr = buckets.get(key) || [];
      // keep only timestamps inside window
      const pruned = arr.filter((ts) => ts > windowStart);
      pruned.push(now);
      buckets.set(key, pruned);

      if (pruned.length > max) {
        // log for observability
        try {
          const who = userId ? `user:${userId}` : `ip:${ip}`;
          console.warn(
            `[rateLimit] 429 — route=${route} key=${who} count=${pruned.length} max=${max} windowMs=${windowMs}`,
          );
        } catch (e) {}
        // Informative headers for monitoring/clients
        try {
          res.setHeader("X-RateLimit-Limit", String(max));
          res.setHeader("X-RateLimit-Remaining", String(0));
          const resetSec =
            Math.ceil((pruned[0] + windowMs - now) / 1000) ||
            Math.ceil(windowMs / 1000);
          res.setHeader("X-RateLimit-Reset", String(resetSec));
        } catch (e) {}
        return res
          .status(429)
          .json({ error: "Too many requests. Try again later." });
      }

      // Set headers to help observability in normal responses
      try {
        const remaining = Math.max(0, max - pruned.length);
        const resetSec =
          Math.ceil(((pruned[0] || now) + windowMs - now) / 1000) ||
          Math.ceil(windowMs / 1000);
        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(remaining));
        res.setHeader("X-RateLimit-Reset", String(resetSec));
      } catch (e) {}

      return next();
    } catch (e) {
      return next();
    }
  };
};
