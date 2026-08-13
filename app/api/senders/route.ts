import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { toEmailSender } from '@/lib/outreach/senders';
import { isAllowedSenderEmail } from '@/lib/outreach/senderPolicy';

export const dynamic = 'force-dynamic';

export async function GET() {
  const senders = await prisma.emailSender.findMany({
    orderBy: [{ status: 'asc' }, { email: 'asc' }],
  });

  return NextResponse.json({ data: senders.filter((sender) => isAllowedSenderEmail(sender.email)).map(toEmailSender) });
}
