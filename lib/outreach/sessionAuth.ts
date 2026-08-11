import { createHmac, timingSafeEqual } from 'node:crypto';
import { outreachSessionCookieName, outreachSessionTtlSeconds } from './authConstants';

export { outreachSessionCookieName, outreachSessionTtlSeconds } from './authConstants';

export function createOutreachSession(secret: string, now = Date.now()): string {
  const expiresAt = String(Math.floor(now / 1000) + outreachSessionTtlSeconds);
  return `${expiresAt}.${sign(secret, expiresAt)}`;
}

export function isOutreachSessionValid(value: string | undefined, secret: string, now = Date.now()): boolean {
  if (!value) return false;
  const [expiresAt, signature, extra] = value.split('.');
  if (!expiresAt || !signature || extra) return false;

  const expiresAtSeconds = Number(expiresAt);
  if (!Number.isSafeInteger(expiresAtSeconds) || expiresAtSeconds <= Math.floor(now / 1000)) return false;
  return tokensMatch(sign(secret, expiresAt), signature);
}

export function readOutreachSessionCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === outreachSessionCookieName) return decodeURIComponent(rawValue.join('='));
  }
  return undefined;
}

export function tokensMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function sign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
