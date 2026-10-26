import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimits } from '@/lib/ai/http';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits());

  it('allows up to the limit per window, then blocks with a retry hint', () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i += 1) expect(checkRateLimit('k', 3, 60000, t).ok).toBe(true);
    const blocked = checkRateLimit('k', 3, 60000, t + 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(59);
    expect(checkRateLimit('k', 3, 60000, t + 60000).ok).toBe(true);
  });

  it('keeps users independent', () => {
    expect(checkRateLimit('a', 1).ok).toBe(true);
    expect(checkRateLimit('b', 1).ok).toBe(true);
    expect(checkRateLimit('a', 1).ok).toBe(false);
  });
});
