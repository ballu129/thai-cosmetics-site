import "server-only";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  options: {
    limit: number;
    windowMs: number;
  },
) {
  const now = Date.now();
  const existing = attempts.get(key);

  if (!existing || existing.resetAt <= now) {
    attempts.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return true;
  }

  if (existing.count >= options.limit) {
    return false;
  }

  existing.count += 1;
  return true;
}
