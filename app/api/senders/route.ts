import { NextResponse } from 'next/server';
import { allowedSenders } from '@/lib/outreach/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ data: allowedSenders });
}
