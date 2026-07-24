import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toEmailSender } from '@/lib/outreach/senders';

export const dynamic = 'force-dynamic';

export async function GET() {
  const senders = await prisma.emailSender.findMany({
    orderBy: [{ status: 'asc' }, { email: 'asc' }],
  });

  return NextResponse.json({ data: senders.map(toEmailSender) });
}
