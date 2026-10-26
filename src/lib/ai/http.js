/**
 * Request guards for the AI endpoints: authentication, rate limiting, size
 * limits and a consistent structured error shape.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export function aiError(code, message, status, extra = {}) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

/**
 * Fixed-window, per-process rate limiter. Good enough for a single Node
 * instance; a multi-instance deployment should back this with a shared store.
 */
const buckets = new Map();

export function checkRateLimit(key, limit, windowMs = 60000, now = Date.now()) {
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.start + windowMs - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

export function resetRateLimits() {
  buckets.clear();
}

/** Authenticate and rate-limit. Returns { user } or { response }. */
export async function guardAiRequest(request, { scope, limit }) {
  const auth = await requireAuth(request);
  if (auth.error) return { response: aiError('unauthorized', auth.error, auth.status) };
  const rl = checkRateLimit(`${scope}:${auth.user.id}`, limit);
  if (!rl.ok) {
    const res = aiError('rate_limited', 'Too many requests. Please wait a moment and try again.', 429);
    res.headers.set('Retry-After', String(rl.retryAfterSeconds));
    return { response: res };
  }
  return { user: auth.user };
}

/** Parse a JSON body no larger than `maxBytes`. Returns { body } or { response }. */
export async function readJsonBody(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return { response: aiError('payload_too_large', 'Request body is too large.', 413) };
  let raw;
  try {
    raw = await request.text();
  } catch {
    return { response: aiError('invalid_body', 'Could not read the request body.', 400) };
  }
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) return { response: aiError('payload_too_large', 'Request body is too large.', 413) };
  if (!raw) return { body: {} };
  try {
    return { body: JSON.parse(raw) };
  } catch {
    return { response: aiError('invalid_json', 'Request body must be valid JSON.', 400) };
  }
}

export function zodMessage(error) {
  return error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
}
