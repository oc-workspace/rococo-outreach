import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export function authorizeDevOutreachToken(request: Request): NextResponse | null {
  if (process.env.NEXT_PUBLIC_OUTREACH_ENV !== 'dev') return privateJson({ error: 'Not found' }, { status: 404 });
  const expectedToken = process.env.SMTP_TEST_API_TOKEN?.trim();
  if (!expectedToken) return privateJson({ error: 'Not found' }, { status: 404 });
  const authorization = request.headers.get('authorization');
  const providedToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!providedToken || !tokensMatch(expectedToken, providedToken)) return privateJson({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

function tokensMatch(expected: string, provided: string): boolean {
  const expectedDigest = createHash('sha256').update(expected).digest();
  const providedDigest = createHash('sha256').update(provided).digest();
  return timingSafeEqual(expectedDigest, providedDigest);
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
