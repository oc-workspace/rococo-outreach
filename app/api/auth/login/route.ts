import { NextResponse } from 'next/server';
import { createOutreachSession, outreachSessionCookieName, outreachSessionTtlSeconds, tokensMatch } from '@/lib/outreach/sessionAuth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  const providedToken = typeof body?.token === 'string' ? body.token.trim() : '';
  const expectedToken = process.env.SMTP_TEST_API_TOKEN?.trim();
  const isDev = process.env.NEXT_PUBLIC_OUTREACH_ENV === 'dev';

  if (!isDev || !expectedToken) return privateJson({ error: 'Login is not configured.' }, { status: 404 });
  if (!providedToken || !tokensMatch(expectedToken, providedToken)) {
    return privateJson({ error: 'Invalid operator token.' }, { status: 401 });
  }

  const response = privateJson({ data: { authenticated: true } });
  response.cookies.set(outreachSessionCookieName, createOutreachSession(expectedToken), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: outreachSessionTtlSeconds,
  });
  return response;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
