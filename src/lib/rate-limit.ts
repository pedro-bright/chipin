/**
 * Simple in-memory rate limiter for Vercel serverless.
 *
 * Globals persist across warm invocations within the same instance,
 * so this provides meaningful protection without external infrastructure.
 * For production at scale, swap with Upstash Redis (@upstash/ratelimit).
 */

const ipRequests = new Map<string, { count: number; resetAt: number }>();

// Clean up stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, val] of ipRequests) {
    if (val.resetAt < now) ipRequests.delete(key);
  }
}

/**
 * Check if a request should be rate-limited.
 * @param ip - Client IP address
 * @param endpoint - Endpoint identifier (for separate limits per route)
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { limited: boolean, remaining: number }
 */
export function rateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): { limited: boolean; remaining: number } {
  cleanup();

  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const entry = ipRequests.get(key);

  if (!entry || entry.resetAt < now) {
    ipRequests.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0 };
  }

  return { limited: false, remaining: maxRequests - entry.count };
}

/** Get client IP from request headers (Vercel sets x-forwarded-for) */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
