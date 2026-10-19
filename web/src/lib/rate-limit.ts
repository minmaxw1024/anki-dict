/**
 * Fixed-window rate limiter kept in memory.
 *
 * Each server instance keeps its own counters, so on serverless hosting this
 * is a best-effort guard; move the counters to a shared store (e.g. Redis)
 * once the app runs on more than one instance.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { start: number; used: number }>();

  return {
    /** Records `cost` units for `key`; returns how long to wait if over the limit. */
    take(key: string, cost = 1, now = Date.now()): { ok: true } | { ok: false; retryAfterMs: number } {
      let window = windows.get(key);
      if (!window || now - window.start >= windowMs) {
        window = { start: now, used: 0 };
        windows.set(key, window);
      }

      if (window.used + cost > limit) {
        return { ok: false, retryAfterMs: window.start + windowMs - now };
      }

      window.used += cost;

      // Drop expired windows so the map doesn't grow without bound.
      if (windows.size > 10_000) {
        for (const [k, w] of windows) {
          if (now - w.start >= windowMs) windows.delete(k);
        }
      }

      return { ok: true };
    },
  };
}

/** Runs `fn` over `items` with at most `concurrency` calls in flight. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}
