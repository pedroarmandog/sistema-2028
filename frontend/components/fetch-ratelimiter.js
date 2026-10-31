/*
 Client-side fetch rate limiter
 - Limits requests per tab to a configurable RATE_PER_MIN (default 300/min)
 - Adds simple token-bucket + concurrency queue
 - Injected automatically by server middleware into <head>
*/
(function () {
  if (window.__fetchRateLimiterInstalled) return;
  window.__fetchRateLimiterInstalled = true;

  const ORIGINAL_FETCH =
    (window.fetch && window.fetch.bind(window)) ||
    function () {
      throw new Error("native fetch not available");
    };

  // Configurable via window.__CLIENT_RATE_LIMIT_PER_MIN (set before this script)
  const RATE_PER_MIN = Number(window.__CLIENT_RATE_LIMIT_PER_MIN || 300);
  const PER_SECOND = RATE_PER_MIN / 60;
  const MAX_BURST = Math.max(1, Math.floor(PER_SECOND * 2));
  const MAX_CONCURRENCY = 6;

  let tokens = MAX_BURST;
  let lastRefill = Date.now();
  const queue = [];
  let inFlight = 0;

  function refillTokens() {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1000;
    if (elapsed <= 0) return;
    const add = elapsed * PER_SECOND;
    if (add > 0) {
      tokens = Math.min(MAX_BURST, tokens + add);
      lastRefill = now;
    }
  }

  function runNext() {
    if (inFlight >= MAX_CONCURRENCY) return;
    refillTokens();
    if (queue.length === 0) return;
    if (tokens < 1) {
      // wait a bit for tokens to refill
      setTimeout(runNext, 200);
      return;
    }

    const item = queue.shift();
    tokens -= 1;
    inFlight += 1;

    Promise.resolve(ORIGINAL_FETCH(item.input, item.init))
      .then(function (res) {
        try {
          item.resolve(res);
        } catch (e) {
          // noop
        }
      })
      .catch(function (err) {
        try {
          item.reject(err);
        } catch (e) {}
      })
      .finally(function () {
        inFlight -= 1;
        if (window.__OUTGOING_REQUESTS_DEBUG) {
          console.debug(
            "[fetch-ratelimiter] completed; inFlight=",
            inFlight,
            "queue=",
            queue.length,
          );
        }
        // schedule next item immediately
        setTimeout(runNext, 0);
      });
  }

  // Replace global fetch with throttled version
  window.fetch = function (input, init) {
    init = init || {};
    if (!init.credentials)
      init = Object.assign({}, init, { credentials: "include" });

    return new Promise(function (resolve, reject) {
      queue.push({
        input: input,
        init: init,
        resolve: resolve,
        reject: reject,
      });
      if (queue.length > 80) {
        console.warn("[fetch-ratelimiter] queue length high:", queue.length);
      }
      runNext();
    });
  };

  Object.defineProperty(window, "__fetchRateLimiterStatus", {
    get: function () {
      refillTokens();
      return {
        ratePerMin: RATE_PER_MIN,
        perSecond: PER_SECOND,
        tokens: Math.floor(tokens),
        inFlight: inFlight,
        queueLength: queue.length,
      };
    },
  });

  console.info(
    `[fetch-ratelimiter] instalado — ${RATE_PER_MIN} req/min (~${PER_SECOND.toFixed(1)}/s), max concurrency ${MAX_CONCURRENCY}`,
  );
})();
