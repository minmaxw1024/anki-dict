import { describe, expect, it } from "vitest";
import { createRateLimiter, mapWithConcurrency } from "../web/src/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit within a window, per key", () => {
    const limiter = createRateLimiter({ limit: 10, windowMs: 1000 });

    expect(limiter.take("a", 6, 0)).toEqual({ ok: true });
    expect(limiter.take("a", 4, 100)).toEqual({ ok: true });
    expect(limiter.take("a", 1, 200)).toEqual({ ok: false, retryAfterMs: 800 });
    expect(limiter.take("b", 10, 200)).toEqual({ ok: true });
  });

  it("resets once the window has passed", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });

    expect(limiter.take("a", 1, 0).ok).toBe(true);
    expect(limiter.take("a", 1, 999).ok).toBe(false);
    expect(limiter.take("a", 1, 1000).ok).toBe(true);
  });
});

describe("mapWithConcurrency", () => {
  it("keeps result order and never exceeds the concurrency", async () => {
    let inFlight = 0;
    let peak = 0;

    const results = await mapWithConcurrency([5, 1, 4, 2, 3], 2, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, n));
      inFlight--;
      return n * 10;
    });

    expect(results).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });
});
