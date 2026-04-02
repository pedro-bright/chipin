import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/* ── Edge-level rate limiting for API routes ────────────────────────── */
// This runs at the edge (before serverless functions), providing a first
// line of defense. It uses in-memory maps that persist across warm edge
// instances — not perfect, but significantly better than nothing.
// For true persistence, upgrade to Upstash Redis (@upstash/ratelimit).

const edgeRateLimits = new Map<string, { count: number; resetAt: number }>();
const EDGE_CLEANUP_INTERVAL = 60_000; // 1 min
let lastEdgeCleanup = Date.now();

function edgeCleanup() {
  const now = Date.now();
  if (now - lastEdgeCleanup < EDGE_CLEANUP_INTERVAL) return;
  lastEdgeCleanup = now;
  for (const [key, val] of edgeRateLimits) {
    if (val.resetAt < now) edgeRateLimits.delete(key);
  }
}

function checkEdgeRateLimit(
  ip: string,
  path: string,
  maxRequests: number,
  windowMs: number
): { limited: boolean; remaining: number } {
  edgeCleanup();
  const key = `${ip}:${path}`;
  const now = Date.now();
  const entry = edgeRateLimits.get(key);

  if (!entry || entry.resetAt < now) {
    edgeRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0 };
  }
  return { limited: false, remaining: maxRequests - entry.count };
}

// Rate limit configs per API route pattern
const API_RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/api/parse-receipt': { max: 8, windowMs: 60_000 },        // 8 per minute
  '/api/upload': { max: 10, windowMs: 60_000 },              // 10 per minute
  '/api/bills': { max: 15, windowMs: 60_000 },               // 15 per minute (creates)
  '/api/bills/*/contribute': { max: 10, windowMs: 60_000 },  // 10 per minute per IP
};

function getApiRateLimit(pathname: string): { max: number; windowMs: number } | null {
  // Exact matches first
  if (API_RATE_LIMITS[pathname]) return API_RATE_LIMITS[pathname];
  // Pattern matches
  if (pathname.match(/^\/api\/bills\/[^/]+\/contribute$/)) {
    return API_RATE_LIMITS['/api/bills/*/contribute'];
  }
  // Default: generous limit for other API routes
  if (pathname.startsWith('/api/')) {
    return { max: 60, windowMs: 60_000 };
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Edge rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const rateConfig = getApiRateLimit(pathname);
    if (rateConfig) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
      const { limited, remaining } = checkEdgeRateLimit(ip, pathname, rateConfig.max, rateConfig.windowMs);

      if (limited) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment and try again.' },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': String(rateConfig.max),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }

      // Continue with rate limit headers
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', String(rateConfig.max));
      response.headers.set('X-RateLimit-Remaining', String(remaining));
      return response;
    }

    return NextResponse.next();
  }

  // Supabase session handling for non-API routes
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
