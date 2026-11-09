/**
 * Small in-memory sliding-window limiter for the public community endpoints.
 * Counters live in process memory (same pattern as the vocabulary test store),
 * which is enough to stop form spam on a single server.
 */

const buckets = new Map();
const MAX_BUCKETS = 5000;

function prune(now) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

/**
 * @returns {{ allowed: boolean, retryAfterSeconds: number }}
 */
export function hit(key, limit, windowMs) {
  const now = Date.now();
  prune(now);

  const entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function reset(keyPrefix) {
  for (const key of buckets.keys()) {
    if (key.startsWith(keyPrefix)) buckets.delete(key);
  }
}

/** Honeypot + minimum fill time: bots post instantly and fill hidden fields. */
export function looksLikeSpam(body, { minSeconds = 2 } = {}) {
  if (body?.website || body?.honeypot || body?.company) return true;

  const startedAt = Number(body?.formStartedAt);
  if (Number.isFinite(startedAt) && startedAt > 0) {
    const elapsed = (Date.now() - startedAt) / 1000;
    if (elapsed < minSeconds) return true;
  }
  return false;
}
