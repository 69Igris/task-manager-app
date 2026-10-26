import { describe, expect, it } from 'vitest';
import { daysBetween, isValidIsoDate, resolveDueDate, todayIn } from '@/lib/ai/dates';

// 2026-10-26 is a Monday.
const MONDAY = '2026-10-26';

describe('resolveDueDate', () => {
  it.each([
    ['today', '2026-10-26'],
    ['tomorrow', '2026-10-27'],
    ['friday', '2026-10-30'],
    ['by Friday', '2026-10-30'],
    ['monday', '2026-10-26'],
    ['next monday', '2026-11-02'],
    ['next friday', '2026-11-06'],
    ['next week', '2026-11-02'],
    ['in 3 days', '2026-10-29'],
    ['in 2 weeks', '2026-11-09'],
    ['end of week', '2026-10-30'],
    ['end of month', '2026-10-31'],
    ['2026-12-01', '2026-12-01'],
  ])('%s → %s', (expr, expected) => {
    expect(resolveDueDate(expr, MONDAY)).toEqual({ date: expected });
  });

  it('resolves "next friday" from a Saturday into the following week', () => {
    expect(resolveDueDate('next friday', '2026-10-31').date).toBe('2026-11-06');
  });

  it('rejects impossible and unknown dates instead of guessing', () => {
    expect(resolveDueDate('2026-02-30', MONDAY).error).toMatch(/not a real calendar date/);
    expect(resolveDueDate('sometime soon', MONDAY).error).toMatch(/Could not interpret/);
  });

  it('returns null for empty input', () => {
    expect(resolveDueDate(undefined, MONDAY)).toEqual({ date: null });
  });
});

describe('todayIn', () => {
  it('uses the configured timezone, not UTC', () => {
    const instant = new Date('2026-10-26T23:30:00Z');
    expect(todayIn('UTC', instant)).toBe('2026-10-26');
    expect(todayIn('Asia/Kolkata', instant)).toBe('2026-10-27');
    expect(todayIn('America/Los_Angeles', instant)).toBe('2026-10-26');
  });
});

describe('helpers', () => {
  it('computes whole-day differences', () => {
    expect(daysBetween('2026-10-26', '2026-10-30')).toBe(4);
    expect(daysBetween('2026-10-30', '2026-10-26')).toBe(-4);
  });
  it('validates ISO dates', () => {
    expect(isValidIsoDate('2026-10-26')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
  });
});
