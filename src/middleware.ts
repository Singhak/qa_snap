import { NextRequest, NextResponse } from 'next/server';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const API_MUTATION_LIMIT = 120;
const API_MUTATION_WINDOW_MS = 60 * 1000;
const apiBuckets = new Map<string, RateLimitEntry>();

const allowedOrigins = (process.env.APP_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return withSecurityHeaders(NextResponse.next());
  }

  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return withCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  if (isMutation(request.method)) {
    const limited = checkRateLimit(request);

    if (limited) {
      return withCorsHeaders(withSecurityHeaders(limited), origin);
    }
  }

  return withCorsHeaders(withSecurityHeaders(NextResponse.next()), origin);
}

function checkRateLimit(request: NextRequest) {
  const now = Date.now();
  const key = `${clientIp(request)}:${request.nextUrl.pathname}`;
  const current = apiBuckets.get(key);

  if (!current || current.resetAt <= now) {
    apiBuckets.set(key, {
      count: 1,
      resetAt: now + API_MUTATION_WINDOW_MS,
    });
    return null;
  }

  if (current.count >= API_MUTATION_LIMIT) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment and try again.',
        },
      },
      {
        status: 429,
        headers: {
          'retry-after': String(Math.ceil((current.resetAt - now) / 1000)),
        },
      }
    );
  }

  current.count += 1;
  return null;
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('x-dns-prefetch-control', 'off');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

function withCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('access-control-allow-origin', origin);
    response.headers.set('vary', appendVary(response.headers.get('vary'), 'Origin'));
    response.headers.set('access-control-allow-credentials', 'true');
  }

  response.headers.set('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.headers.set('access-control-allow-headers', 'Content-Type, Authorization');
  response.headers.set('access-control-max-age', '86400');

  return response;
}

function isAllowedOrigin(origin: string) {
  if (!allowedOrigins.length) {
    return false;
  }

  return allowedOrigins.includes(origin);
}

function isMutation(method: string) {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function clientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function appendVary(current: string | null, value: string) {
  if (!current) {
    return value;
  }

  const existing = current.split(',').map((item) => item.trim().toLowerCase());
  return existing.includes(value.toLowerCase()) ? current : `${current}, ${value}`;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
