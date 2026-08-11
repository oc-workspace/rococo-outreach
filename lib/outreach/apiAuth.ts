import { NextResponse } from 'next/server';
import { isOutreachSessionValid, readOutreachSessionCookie, tokensMatch } from './sessionAuth';

export async function authorizeDevOutreachToken(request: Request): Promise<NextResponse | null> {
  if (process.env.NEXT_PUBLIC_OUTREACH_ENV !== 'dev') return privateJson({ error: 'Not found' }, { status: 404 });
  const expectedToken = process.env.SMTP_TEST_API_TOKEN?.trim();
  if (!expectedToken) return privateJson({ error: 'Not found' }, { status: 404 });
  const authorization = request.headers.get('authorization');
  const providedToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const sessionCookie = readOutreachSessionCookie(request);
  if (!tokensMatch(expectedToken, providedToken) && !isOutreachSessionValid(sessionCookie, expectedToken)) {
    return privateJson({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

function privateJson(body: unknown, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, private');
  return NextResponse.json(body, { ...init, headers });
}
