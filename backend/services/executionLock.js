/**
 * executionLock
 * Simple in-process global lock to prevent concurrent heavy jobs
 * (backup, cron tasks, queue processors) from running at the same time.
 */
const lock = {
  busy: false,
  owner: null,
  lastRunAt: {},
};

function tryAcquire(name) {
  if (lock.busy) return false;
  lock.busy = true;
  lock.owner = name;
  lock.lastRunAt[name] = Date.now();
  return true;
}

function release(name) {
  lock.busy = false;
  lock.owner = null;
  lock.lastRunAt[name] = Date.now();
}

function isBusy() {
  return lock.busy;
}

function lastRun(name) {
  return lock.lastRunAt[name] || 0;
}

async function withLock(name, fn, opts = {}) {
  const minInterval = opts.minIntervalMs || 0;
  const now = Date.now();
  if (
    minInterval > 0 &&
    lock.lastRunAt[name] &&
    now - lock.lastRunAt[name] < minInterval
  ) {
    return { skipped: true, reason: "minInterval" };
  }
  if (lock.busy) {
    return { skipped: true, reason: "busy", owner: lock.owner };
  }
  lock.busy = true;
  lock.owner = name;
  lock.lastRunAt[name] = now;
  try {
    const result = await fn();
    return { result, skipped: false };
  } finally {
    lock.busy = false;
    lock.owner = null;
  }
}

module.exports = {
  tryAcquire,
  release,
  isBusy,
  lastRun,
  withLock,
};
