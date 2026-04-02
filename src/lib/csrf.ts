import { NextRequest, NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

/**
 * Verify that a mutation request (POST/PATCH/DELETE) originated from our app
 * by checking the Origin or Referer header against the app's domain.
 * Returns a NextResponse with 403 if the check fails, or null if the request is valid.
 */
export function checkCsrf(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Determine allowed origins
  const allowedOrigins = new Set<string>();
  if (APP_URL) {
    try {
      allowedOrigins.add(new URL(APP_URL).origin);
    } catch {
      // invalid URL, skip
    }
  }
  // Always allow the request's own host (for preview deployments, localhost, etc.)
  try {
    const requestOrigin = new URL(request.url).origin;
    allowedOrigins.add(requestOrigin);
  } catch {
    // ignore
  }
  // Allow localhost during development
  allowedOrigins.add('http://localhost:3000');

  // Check Origin header first (most reliable)
  if (origin) {
    if (allowedOrigins.has(origin)) return null;
    return NextResponse.json(
      { error: 'Forbidden: cross-origin request' },
      { status: 403 }
    );
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.has(refererOrigin)) return null;
    } catch {
      // malformed referer
    }
    return NextResponse.json(
      { error: 'Forbidden: cross-origin request' },
      { status: 403 }
    );
  }

  // If neither header is present, allow the request.
  // Some legitimate clients (curl, Postman, mobile apps) don't send Origin/Referer.
  // The risk is low since we require specific body data for mutations anyway.
  return null;
}
