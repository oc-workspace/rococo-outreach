import { NextRequest, NextResponse } from 'next/server';
import { outreachSessionCookieName } from './lib/outreach/authConstants';

const publicPaths = new Set(['/login', '/api/auth/login', '/api/auth/logout']);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (publicPaths.has(pathname)) return NextResponse.next();

  const secret = process.env.SMTP_TEST_API_TOKEN?.trim();
  const isDev = process.env.NEXT_PUBLIC_OUTREACH_ENV === 'dev';
  const session = request.cookies.get(outreachSessionCookieName)?.value;
  const bearer = readBearerToken(request.headers.get('authorization'));
  const authorized = Boolean(
    isDev &&
    secret &&
    (await sessionIsValid(session, secret) || await stringsMatch(bearer, secret)),
  );

  if (authorized) return NextResponse.next();
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: isDev && secret ? 'Unauthorized' : 'Not found' },
      { status: isDev && secret ? 401 : 404, headers: { 'Cache-Control': 'no-store, private' } },
    );
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

function readBearerToken(authorization: string | null): string {
  return authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

async function sessionIsValid(value: string | undefined, secret: string): Promise<boolean> {
  if (!value) return false;
  const [expiresAt, signature, extra] = value.split('.');
  if (!expiresAt || !signature || extra) return false;

  const expiresAtSeconds = Number(expiresAt);
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds <= Math.floor(Date.now() / 1000)) return false;
  return stringsMatch(signature, await sign(secret, expiresAt));
}

async function sign(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function stringsMatch(left: string, right: string): Promise<boolean> {
  if (!left || !right) return false;
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}
