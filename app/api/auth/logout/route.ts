import { NextResponse } from 'next/server';
import { outreachSessionCookieName } from '@/lib/outreach/sessionAuth';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  response.cookies.set(outreachSessionCookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(0),
  });
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}
